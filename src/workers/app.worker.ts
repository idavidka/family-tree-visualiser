import {
	type MessageType,
	type WorkerMessage,
	isPathMessagePayload,
	type KinshipWorkerMessage,
	type PathWorkerMessage,
	isKinshipMessagePayload,
	isDownloadMessagePayload,
	type DownloadWorkerMessage,
	type Params,
	type OriginalParams,
	type Callback,
	type SuccessMessageType,
	type ErrorMessageType,
	type GeneratorWorkerMessage,
	isGeneratorMessagePayload,
	type ValidationWorkerMessage,
	isValidationMessagePayload,
} from "./types";
import GedcomTree from "../utils/parser";
import { pdfi } from "../utils/pdfi";
import { expose } from "comlink";
import { book } from "../utils/book";
import { docx } from "../utils/docx";
import { type ZipFile, zip } from "../utils/zip";
import { type IndexedDbType, getInstance } from "../utils/indexed-db-manager";
import { setGenealogyUtil } from "../utils/tree/set-genealogy";
import { setLinesUtil } from "../utils/tree/set-lines";
import { type IndiDimensionDictionary } from "../store/main/reducers";
import { setTreeUtil } from "../utils/tree/set-tree";
import { startPositionFixer } from "../utils/tree/position-fixer";
import { isStageValid } from "../utils/indis-on-stage";
import { setGenealogyUtilLegacy } from "../utils/tree/set-genealogy-legacy";

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export default {} as typeof Worker & (new () => Worker);

console.log("[AppWorker] running");

const db = (type: IndexedDbType) => getInstance<ZipFile>("ftv", type, "images");

const sendMessage = <T extends keyof MessageType>(
	type: T,
	response: MessageType[T]["response"]
) => {
	return JSON.stringify({
		type,
		response,
	});
};

const sendAsyncMessage = <T extends Callback>(
	type: T,
	response?:
		| SuccessMessageType[T]["response"]
		| ErrorMessageType[T]["response"]
) => {
	postMessage(
		JSON.stringify({
			type,
			response: response ?? {
				status: "ok",
			},
		})
	);
};

let zipCancel: (() => void) | undefined;

export const api = {
	createMessage: async (payloadString: string): Promise<string> => {
		const payload = JSON.parse(payloadString ?? "{}") as WorkerMessage;

		console.log("[AppWorker] message recieved", payload);

		if (!payload.payload) {
			return sendMessage("error", {
				status: "error",
				reason: "Malformed message",
			});
		}

		if (isGeneratorMessagePayload(payload)) {
			return api.createGeneratorMessage(payload.payload);
		}

		if (isValidationMessagePayload(payload)) {
			return api.createValidationMessage(payload.payload);
		}

		if (isPathMessagePayload(payload)) {
			return api.createPathMessage(payload.payload);
		}

		if (isKinshipMessagePayload(payload)) {
			return api.createKinshipMessage(payload.payload);
		}

		if (isDownloadMessagePayload(payload)) {
			console.log("[AppWorker]isDownloadMessagePayload", payload);
			return await api.createDownloadMessage(
				payload.method,
				payload.payload
			);
		}

		return sendMessage("error", {
			status: "error",
			reason: "Invalid message",
		});
	},
	createDownloadMessage: async <T extends keyof Params>(
		method: T,
		payload: Required<DownloadWorkerMessage<T>>["payload"]
	): Promise<string> => {
		if (!method) {
			return sendMessage("download", {
				status: "error",
				reason: "No method provided",
			});
		}

		if (method === "zip" && "action" in payload) {
			console.log("[AppWorker] action received", payload);
			if (payload.action === "cancel") {
				zipCancel?.();
				return sendMessage("aborted", {
					status: "ok",
					data: "canceled",
				});
			}

			return sendMessage("error", {
				status: "error",
				reason: "Invalid action",
			});
		}

		if (!payload.name) {
			return sendMessage("download", {
				status: "error",
				reason: "No name name received",
			});
		}

		if (!payload.raw) {
			return sendMessage("download", {
				status: "error",
				reason: "No raw content received",
			});
		}

		if (!payload.options) {
			return sendMessage("download", {
				status: "error",
				reason: "No options provided",
			});
		}

		const gedcom = GedcomTree.parse(payload.raw);

		if (!gedcom) {
			return sendMessage("download", {
				status: "error",
				reason: "Unable to parse GEDCOM file",
			});
		}

		if (method === "pdfi") {
			const params = payload.options as OriginalParams["pdfi"];
			params[3] = gedcom.indis();
			const output = pdfi(...params);

			const url = output && URL.createObjectURL(output);
			return sendMessage("download", {
				status: "ok",
				data: {
					name: `${payload.name}.pdf`,
					url,
				},
			});
		} else if (method === "book") {
			const params = payload.options as OriginalParams["book"];
			params[0] = gedcom;
			const output = await book(...params);

			const url = output && URL.createObjectURL(output);
			return sendMessage("download", {
				status: "ok",
				data: {
					name: `${payload.name}.pdf`,
					url,
				},
			});
		} else if (method === "docx") {
			const params = payload.options as OriginalParams["docx"];
			params[0] = gedcom;
			const output = await docx(...params);

			const url = output && URL.createObjectURL(output);
			return sendMessage("download", {
				status: "ok",
				data: {
					name: `${payload.name}.docx`,
					url,
				},
			});
		} else if (method === "zip") {
			const origParams = payload.options as Params["zip"];
			const storedKey = origParams[1];
			const params = payload.options as OriginalParams["zip"];
			console.log("[AppWorker] zip payload", params);
			params[1] = storedKey
				? await db(storedKey).getAllItems()
				: undefined;
			params[9] = {
				onAborted: () => {
					sendAsyncMessage("aborted");
				},
				onCompleted: (result, url) => {
					sendAsyncMessage("completed", {
						status: "ok",
						data: { files: result, url },
					});
				},
				onFileCompleted: (file, files, stored) => {
					sendAsyncMessage("part-completed", {
						status: "ok",
						data: { file, files, stored },
					});
				},
				onProgress: (result) => {
					sendAsyncMessage("progress", {
						status: "ok",
						data: result,
					});
				},
			};
			const output = zip(...params);

			zipCancel = output.cancel;

			return sendMessage("download", {
				status: "ok",
				data: {
					name: `${payload.name}.zip`,
					estimatedTime: output.estimatedTime,
				},
			});
		}

		return sendMessage("error", {
			status: "error",
			reason: "No file",
		});
	},
	createKinshipMessage: (
		payload: Required<KinshipWorkerMessage>["payload"]
	): string => {
		if (!payload.raw) {
			return sendMessage("kinship", {
				status: "error",
				reason: "No raw content received",
			});
		}

		if (!payload.first || !payload.second) {
			return sendMessage("kinship", {
				status: "error",
				reason: "Two individual id must be received",
			});
		}

		const gedcom = GedcomTree.parse(payload.raw);

		if (!gedcom) {
			return sendMessage("kinship", {
				status: "error",
				reason: "Unable to parse GEDCOM file",
			});
		}

		const firstPerson = gedcom.indi(payload.first);
		const secondPerson = gedcom.indi(payload.second);

		const kinshipShort = firstPerson?.kinship(
			secondPerson,
			false,
			payload.lang,
			payload.entirePath
		);

		const kinshipLong = firstPerson?.kinship(
			secondPerson,
			true,
			payload.lang,
			payload.entirePath,
			payload.displayName
		);

		return sendMessage("kinship", {
			status: "ok",
			data: { short: kinshipShort, long: kinshipLong },
		});
	},

	createGeneratorMessage: (
		payload: Required<GeneratorWorkerMessage>["payload"]
	): string => {
		if (!payload.raw) {
			return sendMessage("generator", {
				status: "error",
				reason: "No raw content received",
			});
		}

		if (!payload.settings) {
			return sendMessage("generator", {
				status: "error",
				reason: "No settings received",
			});
		}

		const gedcom = GedcomTree.parse(payload.raw);

		if (!gedcom) {
			return sendMessage("generator", {
				status: "error",
				reason: "Unable to parse GEDCOM file",
			});
		}

		const person = payload.person && gedcom.indi(payload.person);

		if (!person?.id) {
			return sendMessage("generator", {
				status: "error",
				reason: "Person id must be received",
			});
		}

		let generatedTree:
			| {
					yCoordinates: Record<number, number>;
					indis: IndiDimensionDictionary;
			  }
			| undefined;
		if (payload.type === "genealogy") {
			generatedTree = setGenealogyUtil(
				person.id,
				payload.settings,
				gedcom
			);
		}
		if (payload.type === "genealogy-legacy") {
			const legacy = setGenealogyUtilLegacy(
				person.id,
				payload.settings,
				gedcom
			);
			generatedTree = { yCoordinates: {}, indis: legacy ?? {} };
		}
		if (payload.type === "tree") {
			generatedTree = setTreeUtil(person.id, payload.settings, gedcom);
		}

		const { indis: generatedIndis } = generatedTree ?? {};

		let indis = generatedIndis ?? {};
		let lines = setLinesUtil(
			indis,
			payload.settings,
			payload.type === "genealogy-legacy" ? "genealogy" : payload.type,
			person.id,
			gedcom
		);

		if (payload.type !== "genealogy-legacy") {
			const { lines: fixedLines, indis: fixedIndis } = startPositionFixer(
				indis ?? {},
				lines ?? {},
				payload.settings,
				payload.type,
				person.id,
				gedcom
			);

			indis = fixedIndis;
			lines = fixedLines;
		}

		return sendMessage("generator", {
			status: "ok",
			data: { indis, lines },
		});
	},
	createValidationMessage: (
		payload: Required<ValidationWorkerMessage>["payload"]
	): string => {
		if (!payload.indis || !payload.rects) {
			return sendMessage("validation", {
				status: "error",
				reason: "Malformed message received",
			});
		}

		return sendMessage("validation", {
			status: "ok",
			data: isStageValid(payload.indis, payload.rects),
		});
	},
	createPathMessage: (
		payload: Required<PathWorkerMessage>["payload"]
	): string => {
		if (!payload.raw) {
			return sendMessage("path", {
				status: "error",
				reason: "No raw content received",
			});
		}

		if (!payload.first || !payload.second) {
			return sendMessage("path", {
				status: "error",
				reason: "Two individual id must be received",
			});
		}

		const gedcom = GedcomTree.parse(payload.raw);

		if (!gedcom) {
			return sendMessage("path", {
				status: "error",
				reason: "Unable to parse GEDCOM file",
			});
		}

		const firstPerson = gedcom.indi(payload.first);
		const secondPerson = gedcom.indi(payload.second);

		const path = firstPerson?.path(secondPerson);

		return sendMessage("path", {
			status: "ok",
			data: path?.map((indi) => indi.indi.id!) ?? [],
		});
	},
};

expose(api);
