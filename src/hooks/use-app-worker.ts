/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef } from "react";
import AppWorker, { type api as WorkerApi } from "../workers/app.worker";
import { type Remote, wrap } from "comlink";
import {
	type SuccessMessageType,
	type KinshipMessagePayload,
	type PathMessagePayload,
	type WorkerMessages,
	type Params,
	type DownloadMessagePayload,
	type Callbacks,
	isAsyncSuccessMessage,
	type ErrorMessageType,
	type GeneratorMessagePayload,
	type ValidationMessagePayload,
} from "../workers/types";
import omit from "lodash/omit";
import { saveAs } from "file-saver";
import uniqueId from "lodash/uniqueId";
import { getInstance } from "../utils/indexed-db-manager";

const MESSAGE_DELAY = 100;
const MESSAGE_BANDWIDTH = 3;

const USE_CACHE = true;

const caches: Partial<{
	[K in keyof SuccessMessageType]: Record<string, SuccessMessageType[K]>;
}> = {
	path: {},
	kinship: {},
	download: {},
	generator: {},
};

const kinshipDb = getInstance<SuccessMessageType["kinship"]>(
	"ftv",
	"Main",
	"kinship"
);
const pathDb = getInstance<SuccessMessageType["path"]>("ftv", "Main", "path");

const workerLog = (...args: any[]) => {
	if ((window as any).workerLogEnabled) {
		console.log(...args);
	}
};

const getCache = async <K extends keyof SuccessMessageType>(
	payload: WorkerMessages[K]["payload"],
	type: K
) => {
	if (!USE_CACHE) {
		return;
	}

	const key = JSON.stringify(omit(payload, "raw"));

	if (!caches[type]) {
		caches[type] = {};
	}

	const localCache = caches[type]![key];

	if (localCache) {
		return localCache as SuccessMessageType[K];
	}

	if (type === "kinship") {
		const storageCache = await kinshipDb.getItem(key);

		if (storageCache) {
			caches.kinship![key] = storageCache;
		}

		return storageCache as SuccessMessageType[K];
	}

	if (type === "path") {
		const storageCache = await pathDb.getItem(key);

		if (storageCache) {
			caches.path![key] = storageCache;
		}

		return storageCache as SuccessMessageType[K];
	}
};

const setCache = async <K extends keyof SuccessMessageType>(
	payload: WorkerMessages[K]["payload"],
	value: SuccessMessageType[K],
	type: K
) => {
	if (!USE_CACHE) {
		return;
	}

	const key = JSON.stringify(omit(payload, "raw"));

	if (!caches[type]) {
		caches[type] = {};
	}

	if (type === "kinship") {
		await kinshipDb.setItem(key, value as SuccessMessageType["kinship"]);
		caches.kinship![key] = value as SuccessMessageType["kinship"];
	}

	if (type === "path") {
		await pathDb.setItem(key, value as SuccessMessageType["path"]);
		caches.path![key] = value as SuccessMessageType["path"];
	}
};

const parseMessage = (message: string) => {
	const payload = JSON.parse(message ?? "{}");

	return payload as
		| SuccessMessageType[keyof SuccessMessageType]
		| ErrorMessageType[keyof ErrorMessageType];
};

const receiveMessage = (
	message: MessageEvent<{ value: string } | string>,
	callbacks?: Callbacks
) => {
	const data =
		typeof message.data === "string" ? message.data : message.data.value;

	const payload = parseMessage(data);

	if (isAsyncSuccessMessage("aborted", payload)) {
		workerLog(
			"[AppWorker][path] aborted message back",
			message,
			payload,
			callbacks
		);
		callbacks?.aborted?.(payload.response.data);

		return true;
	}

	if (isAsyncSuccessMessage("completed", payload)) {
		workerLog(
			"[AppWorker][path] completed message back",
			message,
			payload,
			callbacks
		);
		callbacks?.completed?.(payload.response.data);

		return true;
	}

	if (isAsyncSuccessMessage("part-completed", payload)) {
		workerLog(
			"[AppWorker][path] part-completed message back",
			message,
			payload,
			callbacks
		);

		callbacks?.["part-completed"]?.(payload.response.data);

		return;
	}

	if (isAsyncSuccessMessage("progress", payload)) {
		workerLog(
			"[AppWorker][path] progress message back",
			message,
			payload,
			callbacks
		);

		callbacks?.progress?.(payload.response.data);

		return;
	}

	workerLog(
		"[AppWorker][path] async message back",
		message,
		payload,
		callbacks
	);
};

const queue: Record<string, { attempt: number; request: Promise<string> }> = {};
const lastMessages: Record<string, boolean> = {};
const useQueue = false;

const queueMessage = async (api: Remote<typeof WorkerApi>, message: string) => {
	if (!useQueue) {
		return await api.createMessage(message);
	}

	const messageId = uniqueId();
	const nrMessageId = Number(messageId);
	queue[messageId] = {
		attempt: 0,
		request: new Promise<string>((resolve, reject) => {
			const requestInterval = setInterval(
				() => {
					queue[messageId].attempt++;
					for (let i = 0; i < MESSAGE_BANDWIDTH; i++) {
						if (
							Object.keys(lastMessages).length <
								MESSAGE_BANDWIDTH &&
							!lastMessages[messageId] &&
							messageId === Object.keys(queue)[i]
						) {
							lastMessages[messageId] = true;
							api.createMessage(message)
								.then((value) => {
									delete lastMessages[messageId];
									delete queue[messageId];

									clearInterval(requestInterval);

									resolve(value);
								})
								.catch((reason) => {
									delete lastMessages[messageId];
									delete queue[messageId];
									clearInterval(requestInterval);

									reject(reason);
								});
						}
					}
				},
				nrMessageId && nrMessageId % 10 === 0
					? MESSAGE_DELAY * 5
					: MESSAGE_DELAY
			);
		}),
	};

	return await queue[messageId].request;
};

const useAppWorker = () => {
	const worker = useRef<Worker>();
	const api = useRef<Remote<typeof WorkerApi>>();
	const getWorker = useCallback((terminate?: boolean) => {
		if (!worker.current || terminate) {
			worker.current?.terminate();
			api.current = undefined;
			const w = new AppWorker();

			workerLog("[AppWorker] instance", w);

			worker.current = w;
		}

		return worker.current;
	}, []);

	const getApi = useCallback(
		(terminate?: boolean) => {
			if (!api.current || terminate) {
				api.current = wrap<typeof WorkerApi>(getWorker(terminate));
			}

			return api.current;
		},
		[getWorker]
	);

	useEffect(() => {
		getApi();
	}, [getApi]);

	const sendValidationMessage = useCallback(
		async (data: ValidationMessagePayload) => {
			const cache = await getCache(data, "validation");
			if (cache) {
				return await Promise.resolve(cache);
			}
			return await new Promise<SuccessMessageType["validation"]>(
				(resolve, reject) => {
					queueMessage(
						getApi(),
						JSON.stringify({ type: "validation", payload: data })
					)
						.then((message: string) => {
							const payload = parseMessage(message);
							workerLog(
								"[AppWorker][validation] message back",
								payload
							);

							if (
								payload?.type === "validation" &&
								payload?.response.status === "ok"
							) {
								setCache(
									data,
									payload as SuccessMessageType["validation"],
									"validation"
								);

								resolve(
									payload as SuccessMessageType["validation"]
								);
							} else {
								reject(payload);
							}
						})
						.catch(reject);
				}
			);
		},
		[getApi]
	);

	const sendPathMessage = useCallback(
		async (data: PathMessagePayload) => {
			const cache = await getCache(data, "path");
			if (cache) {
				return await Promise.resolve(cache);
			}
			return await new Promise<SuccessMessageType["path"]>(
				(resolve, reject) => {
					queueMessage(
						getApi(),
						JSON.stringify({ type: "path", payload: data })
					)
						.then((message: string) => {
							const payload = parseMessage(message);
							workerLog(
								"[AppWorker][path] message back",
								payload
							);

							if (
								payload?.type === "path" &&
								payload?.response.status === "ok"
							) {
								setCache(
									data,
									payload as SuccessMessageType["path"],
									"path"
								);

								resolve(payload as SuccessMessageType["path"]);
							} else {
								reject(payload);
							}
						})
						.catch(reject);
				}
			);
		},
		[getApi]
	);

	const sendKinshipMessage = useCallback(
		async (data: KinshipMessagePayload) => {
			const cache = await getCache(data, "kinship");
			if (cache) {
				return await Promise.resolve(cache);
			}

			return await new Promise<SuccessMessageType["kinship"]>(
				(resolve, reject) => {
					queueMessage(
						getApi(),
						JSON.stringify({
							type: "kinship",
							payload: data,
						})
					)
						.then((message: string) => {
							const payload = parseMessage(message);
							workerLog(
								"[AppWorker][kinship]  message back",
								payload
							);

							if (
								payload?.type === "kinship" &&
								payload?.response.status === "ok"
							) {
								setCache(
									data,
									payload as SuccessMessageType["kinship"],
									"kinship"
								);

								resolve(
									payload as SuccessMessageType["kinship"]
								);
							} else {
								reject(payload);
							}
						})
						.catch(reject);
				}
			);
		},
		[getApi]
	);

	const sendGeneratorMessage = useCallback(
		async (data: GeneratorMessagePayload) => {
			const cache = await getCache(data, "generator");
			if (cache) {
				return await Promise.resolve(cache);
			}

			return await new Promise<SuccessMessageType["generator"]>(
				(resolve, reject) => {
					queueMessage(
						getApi(true),
						JSON.stringify({
							type: "generator",
							payload: data,
						})
					)
						.then((message: string) => {
							const payload = parseMessage(message);
							workerLog(
								"[AppWorker][generator]  message back",
								payload
							);

							if (
								payload?.type === "generator" &&
								payload?.response.status === "ok"
							) {
								setCache(
									data,
									payload as SuccessMessageType["generator"],
									"generator"
								);

								resolve(
									payload as SuccessMessageType["generator"]
								);
							} else {
								reject(payload);
							}
						})
						.catch(reject);
				}
			);
		},
		[getApi]
	);

	const sendAsyncDownloadMessage = useCallback(
		<T extends Params>(
			type: keyof T,
			data: DownloadMessagePayload<T, keyof T>
		) => {
			const downloadWorker = getWorker(true);
			const callbacks = data.callbacks;
			const onMessage =
				callbacks &&
				((message: MessageEvent<{ value: string }>) => {
					if (!callbacks) {
						return;
					}

					const settled = receiveMessage(message, callbacks);

					if (settled) {
						workerLog("[AppWorker][settled]");
						onMessage &&
							downloadWorker.removeEventListener(
								"message",
								onMessage
							);
					}
				});

			if (onMessage) {
				downloadWorker.addEventListener("message", onMessage);
			}

			queueMessage(
				getApi(),
				JSON.stringify({
					type: "download",
					method: type,
					payload: omit(data, "callbacks"),
				})
			);

			return {
				cancel: () => {
					getApi().createMessage(
						JSON.stringify({
							type: "download",
							method: type,
							payload: { action: "cancel" },
						})
					);
				},
			};
		},
		[getApi, getWorker]
	);

	const sendDownloadMessage = useCallback(
		async <T extends Params>(
			type: keyof T,
			data: DownloadMessagePayload<T, keyof T>
		) => {
			return await new Promise<SuccessMessageType["download"]>(
				(resolve, reject) => {
					queueMessage(
						getApi(true),
						JSON.stringify({
							type: "download",
							method: type,
							payload: data,
						})
					)
						.then((message: string) => {
							const payload = parseMessage(message);
							workerLog(
								"[AppWorker][download]  message back",
								payload
							);

							if (
								payload?.type === "download" &&
								payload?.response.status === "ok" &&
								payload?.response.data.url
							) {
								saveAs(
									payload.response.data.url,
									payload.response.data.name
								);

								resolve(
									payload as SuccessMessageType["download"]
								);
							} else {
								reject(payload);
							}
						})
						.catch(reject);
				}
			);
		},
		[getApi]
	);

	return {
		worker,
		api,
		sendKinshipMessage,
		sendPathMessage,
		sendDownloadMessage,
		sendAsyncDownloadMessage,
		sendGeneratorMessage,
		sendValidationMessage,
	};
};

export default useAppWorker;
