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
	sendPasswordResetEmail,
} from "firebase/auth";
import { config } from "../configs/firebase.config";
import { actions, type State } from "../store/main/reducers";
import omit from "lodash/omit";
import pick from "lodash/pick";
import { type DebugState } from "../store/debug/reducers";
import { debounce } from "lodash";
import { dynamicStore } from "../store/dynamic-store";

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

export const addChunkMarker = (
	string: string,
	total: number,
	current: number,
	id: string | number
) => {
	const isFirst = current === 0;
	const isLast = current >= total - 1;

	let markedString = `${isFirst ? "START" : "CHUNK"} ${id}>>>${string}`;

	if (isLast) {
		markedString = `${markedString}<<<${id} END`;
	}

	return markedString;
};

export const parseChunks = <T>(
	chunks: Record<number, string> | string[]
): T => {
	const chunkString = Object.values(chunks).join("");

	const chunkId = chunkString.match(/START\s(?<id>\d+)>>>/)?.groups?.id as
		| string
		| undefined;

	const rawString = chunkString
		.replace(new RegExp(`^.*START ${chunkId}>>>`), "")
		.replace(new RegExp(`<<<${chunkId} END.*$`), "")
		.replace(new RegExp(`CHUNK ${chunkId}>>>`), "");

	return JSON.parse(rawString) as T;
};

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

export const deleteStates = (
	userId?: string,
	callback?: () => void,
	constraints?: QueryConstraint[]
) => {
	if (userId) {
		const q = query(
			collection(db, "state_chunks"),
			where("userId", "==", userId),
			...(constraints ?? [])
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

const _setThrottledDoc = debounce((...args: Parameters<typeof setDoc>) => {
	setDoc(...args);
}, 3000);

const saveTimeouts: { main?: NodeJS.Timeout; sub: NodeJS.Timeout[] } = {
	sub: [],
};
const saveRawTimeouts: { main?: NodeJS.Timeout; sub: NodeJS.Timeout[] } = {
	sub: [],
};
const clearSaveTimeouts = (
	directory: typeof saveRawTimeouts | typeof saveRawTimeouts
) => {
	clearTimeout(directory.main);
	directory.sub.forEach((timeout) => {
		clearTimeout(timeout);
	});

	directory.main = undefined;
	directory.sub = [];
};
const setSaveTimeout = (
	directory: typeof saveRawTimeouts | typeof saveRawTimeouts,
	timeout: NodeJS.Timeout,
	type: "main" | "sub" = "main"
) => {
	if (type === "main") {
		directory.main = timeout;
	} else {
		directory.sub.push(timeout);
	}
};
export const saveState = (
	docObj: State,
	before?: () => void,
	after?: () => void
) => {
	const asd = false;
	if (!docObj.snapshotId || asd) {
		return;
	}

	const obj = JSON.parse(JSON.stringify(docObj)) as State;
	Object.entries(obj.treeState).forEach(([id, treeState]) => {
		if (!treeState.settings.cloudSync && id) {
			delete obj.treeState[id];
			return;
		}
		if (id === "") {
			obj.treeState.default = obj.treeState[id];
			delete obj.treeState[id];
		}

		delete treeState.raw;
	});
	const compressed = compress(obj) as State;
	const objWithoutRaw = omit(
		compressed,
		"logoutState",
		"clouding",
		"loading",
		"loadingTime"
	);
	const { userId, snapshotId } = objWithoutRaw;

	if (userId) {
		clearSaveTimeouts(saveTimeouts);
		setSaveTimeout(
			saveTimeouts,
			setTimeout(() => {
				before?.();
				if (userId) {
					const chunks = chunkRaw(JSON.stringify(objWithoutRaw));

					const lastActionTime = Date.now();
					chunks?.forEach((chunk, index) => {
						setSaveTimeout(
							saveTimeouts,
							setTimeout(() => {
								const isLast = index >= chunks.length - 1;
								setDoc(
									doc(
										db,
										"state_chunks",
										`${userId}_${index}`
									),
									{
										index,
										total: chunks.length,
										chunk: addChunkMarker(
											chunk,
											chunks.length,
											index,
											lastActionTime
										),
										userId,
										snapshotId,
										lastActionTime,
									}
								).then(() => {
									if (isLast) {
										deleteStates(userId, undefined, [
											where(
												"lastActionTime",
												"!=",
												lastActionTime
											),
										]);
										after?.();
									}
								});
							}, 1000 * index),
							"sub"
						);
					});
				} else {
					console.error("Id must be provided");
				}
			}, 3000)
		);
	}
};

export const deleteRawStates = (
	userId?: string,
	callback?: () => void,
	constraints?: QueryConstraint[]
) => {
	if (userId) {
		const q = query(
			collection(db, "raw"),
			where("userId", "==", userId),
			...(constraints ?? [])
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

export const saveRawState = (
	docObj: State,
	before?: () => void,
	after?: () => void
) => {
	const asd = false;
	if (!docObj.rawSnapshotId || asd) {
		return;
	}
	const rawObj = pick(
		JSON.parse(JSON.stringify(docObj)),
		"treeState",
		"userId",
		"rawSnapshotId"
	) as Pick<State, "treeState" | "userId" | "rawSnapshotId">;
	const { userId } = rawObj;
	clearSaveTimeouts(saveRawTimeouts);

	setSaveTimeout(
		saveRawTimeouts,
		setTimeout(() => {
			before?.();

			if (userId) {
				const newRaws: Record<string, string | undefined> = {};
				Object.entries(rawObj.treeState).forEach(([id, treeState]) => {
					if (!treeState.settings.cloudSync && id) {
						return;
					}
					newRaws[id] = treeState.raw;
				});
				const raws = chunkRaw(JSON.stringify(newRaws));

				const lastActionTime = Date.now();
				raws?.forEach((raw, index) => {
					setSaveTimeout(
						saveRawTimeouts,
						setTimeout(() => {
							const isLast = index >= raws.length - 1;
							setDoc(doc(db, "raw", `${userId}_${index}`), {
								...omit(rawObj, "treeState"),
								index,
								total: raws.length,
								raw: addChunkMarker(
									raw,
									raws.length,
									index,
									lastActionTime
								),
								lastActionTime,
							}).then(() => {
								if (isLast) {
									deleteRawStates(userId, undefined, [
										where(
											"lastActionTime",
											"!=",
											lastActionTime
										),
									]);
									after?.();
								}
							});
						}, 1000 * index)
					);
				});
			}
		}, 1000)
	);
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
	successCode?: string;
	errorCode?: string;
	errorMessage?: string;
}

export const doResetPassword = async (email: string) => {
	const authState: AuthState = {};
	await sendPasswordResetEmail(auth, email)
		.then(() => {
			authState.successCode = "auth/reset-email-sent";
		})
		.catch((error) => {
			authState.errorCode = error.code;
			authState.errorMessage = error.message;
		});

	return authState;
};

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

export const saveStateWithClouding = (state: State) => {
	saveState(
		state,
		() => {
			dynamicStore().then((s) => {
				s.dispatch?.(
					actions.setClouding({
						state: true,
						fullscreen: false,
					})
				);
			});
		},
		() => {
			setTimeout(() => {
				dynamicStore().then((s) => {
					s.dispatch?.(
						actions.setClouding({
							state: false,
						})
					);
				});
			}, 3000);
		}
	);
};
