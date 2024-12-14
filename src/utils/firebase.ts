import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
	getFirestore,
	collection,
	setDoc,
	doc,
	query,
	onSnapshot,
	type QueryConstraint,
	where,
	deleteDoc,
	and,
} from "firebase/firestore";
import {
	type UserCredential,
	createUserWithEmailAndPassword,
	getAuth,
	signInWithEmailAndPassword,
} from "firebase/auth";
import { config } from "../configs/firebase.config";
import { type State } from "../store/main/reducers";
import omit from "lodash/omit";
import pick from "lodash/pick";
import { type DebugState } from "../store/debug/reducers";
import { throttle } from "lodash";

type SnapshotState<S> = S & { lastActionTime: number };

// Initialize Firebase
const app = initializeApp(config);
getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const getToken = async () => {
	await auth.authStateReady();

	const token = await auth.currentUser?.getIdToken(true);

	if (token) {
		return token;
	}

	throw new Error("Unable to retrieve token");
};

const compressMap = {
	lines: "l",
	common: "c",
	color: "c2",
	id: "i",
	scale: "s",
	time: "t",
	position: "p",
	indis: "i2",
	interaction: "i3",
	add: "a",
	remove: "r",
	size: "s2",
};

const decompressMap = Object.entries(compressMap).reduce<
	Record<string, string>
>((acc, [key, value]) => {
	acc[value] = key;

	return acc;
}, {});

const chunkRaw = (raw?: string, size = 900000) => {
	const parts = [];
	let last = raw ?? "";
	while (last) {
		const part = last.substring(0, size);
		last = last.substring(size);

		parts.push(part);
	}

	return parts;
};

export const compress = (state: State) => {
	const rawState = JSON.stringify(state);
	let newState = rawState;
	Object.entries(compressMap).forEach(([key, value]) => {
		newState = newState.replaceAll(`"${key}"`, `"${value}"`);
	});

	return JSON.parse(newState);
};

export const decompress = <T extends object>(state: T) => {
	const rawState = JSON.stringify(state);
	let newState = rawState;
	Object.entries(decompressMap).forEach(([key, value]) => {
		newState = newState.replaceAll(`"${key}"`, `"${value}"`);
	});

	return JSON.parse(newState) as T;
};

export const deleteStates = (docObj: State, callback?: () => void) => {
	const { userId } = docObj;
	if (userId) {
		const q = query(collection(db, "state"), where("userId", "==", userId));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			Promise.all(
				snapshot.docs.map(async (doc) => {
					await deleteDoc(doc.ref);
				})
			).then(() => {
				unsubscribe();

				callback?.();
			});
		});
	}
};

export const saveState = (docObj: State) => {
	if (!docObj.snapshotId) {
		return;
	}

	const obj = JSON.parse(JSON.stringify(docObj)) as State;
	Object.entries(obj.treeState).forEach(([id, treeState]) => {
		if (!treeState.settings.cloudSync) {
			delete obj.treeState[id];
			return;
		}
		if (treeState.type !== "manual") {
			treeState.stage.lines = {};
			treeState.stage.indis = {};
		}
		delete treeState.raw;
	});
	const compressed = compress(obj) as State;
	const objWithoutRaw = omit(compressed, "loading", "loadingTime");
	const { userId } = objWithoutRaw;
	throttle(() => {
		if (userId) {
			setDoc(doc(db, "state", userId), {
				...objWithoutRaw,
				lastActionTime: Date.now(),
			});
		} else {
			console.error("Id must be provided");
		}
	}, 5000);
};

export const deleteRawStates = (docObj: State, callback?: () => void) => {
	const { userId } = docObj;
	if (userId) {
		const q = query(collection(db, "raw"), where("userId", "==", userId));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			Promise.all(
				snapshot.docs.map(async (doc) => {
					await deleteDoc(doc.ref);
				})
			).then(() => {
				unsubscribe();

				callback?.();
			});
		});
	}
};

export const saveRawState = (docObj: State) => {
	if (!docObj.rawSnapshotId) {
		return;
	}
	const rawObj = pick(
		JSON.parse(JSON.stringify(docObj)),
		"treeState",
		"userId",
		"rawSnapshotId"
	) as Pick<State, "treeState" | "userId" | "rawSnapshotId">;
	const { userId } = rawObj;
	deleteRawStates(docObj, () => {
		if (userId) {
			const newRaws: Record<string, string | undefined> = {};
			Object.entries(rawObj.treeState).forEach(([id, treeState]) => {
				if (!treeState.settings.cloudSync) {
					return;
				}
				newRaws[id] = treeState.raw;
			});
			const raws = chunkRaw(JSON.stringify(newRaws));
			raws?.forEach((raw, index) => {
				setDoc(doc(db, "raw", `${userId}_${index}`), {
					...omit(rawObj, "treeState"),
					index,
					total: raws.length,
					raw,
					lastActionTime: Date.now(),
				});
			});
		} else {
			console.error("Id must be provided");
		}
	});
};

export const deleteDebugState = (docObj: DebugState, callback?: () => void) => {
	const { userId, docId } = docObj;
	if (userId && docId) {
		const q = query(
			collection(db, "debug"),
			and(where("userId", "==", userId), where("docId", "==", docId))
		);

		const unsubscribe = onSnapshot(q, (snapshot) => {
			Promise.all(
				snapshot.docs.map(async (doc) => {
					await deleteDoc(doc.ref);
				})
			).then(() => {
				unsubscribe();

				callback?.();
			});
		});
	}
};

export const saveDebugState = (docObj: DebugState) => {
	const rawObj = JSON.parse(JSON.stringify(docObj)) as DebugState;
	const { userId, docId } = rawObj;

	if (userId && docId) {
		setDoc(doc(db, "debug", `${userId}_${docId}`), {
			...rawObj,
			lastActionTime: Date.now(),
		});
	} else {
		console.error("Id must be provided");
	}
};

export interface AuthState {
	user?: UserCredential["user"];
	errorCode?: string;
	errorMessage?: string;
}

export const doAuth = async (email: string, password: string) => {
	const authState: AuthState = {};
	await signInWithEmailAndPassword(auth, email, password)
		.then((userCredential) => {
			authState.user = userCredential.user;
		})
		.catch((error) => {
			authState.errorCode = error.code;
			authState.errorMessage = error.message;
		});

	return authState;
};

export const createAuth = async (email: string, password: string) => {
	const authState: AuthState = {};
	await createUserWithEmailAndPassword(auth, email, password)
		.then((userCredential) => {
			authState.user = userCredential.user;
		})
		.catch((error) => {
			authState.errorCode = error.code;
			authState.errorMessage = error.message;
		});

	return authState;
};

export const subscribe = <S>(
	collectionId: string,
	onChanged: (newData: S[]) => void,
	constraints?: QueryConstraint[]
) => {
	const q = query(collection(db, collectionId), ...(constraints ?? []));

	const unsubscribe = onSnapshot(q, (snapshot) => {
		const data: Array<SnapshotState<S>> = [];
		snapshot.forEach((docData) => {
			data.push(docData.data() as SnapshotState<S>);
		});
		onChanged(data);
	});
	return unsubscribe;
};

export const fetchApi = async (
	method: "generateTree" | "generateGenealogy",
	body: Record<string, unknown>
) => {
	return await fetch(
		`http://127.0.0.1:5001/family-tree-a31ba/us-central1/${method}`,
		{
			method: "POST",
			mode: "cors",
			cache: "no-cache",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json",
			},
			redirect: "follow",
			referrerPolicy: "no-referrer",
			body: JSON.stringify(body),
		}
	);
};
