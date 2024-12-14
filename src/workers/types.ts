/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Stage, type Settings } from "../store/main/reducers";
import { type Language } from "../translation/i18n";
import { type IndiKey } from "../types/types";
import { type book } from "../utils/book";
import { type docx } from "../utils/docx";
import { type StageRect, type isStageValid } from "../utils/indis-on-stage";
import { type pdfi } from "../utils/pdfi";
import { type zip } from "../utils/zip";

type ReplaceParam<
	TParams extends readonly any[],
	TKey extends `${number}`,
	TReplace,
> = {
	[K in keyof TParams]: K extends TKey ? TReplace : TParams[K];
};
export interface OriginalParams {
	pdfi: Parameters<typeof pdfi>;
	book: Parameters<typeof book>;
	docx: Parameters<typeof docx>;
	zip: Parameters<typeof zip>;
}

export interface Params {
	pdfi: ReplaceParam<OriginalParams["pdfi"], "3", IndiKey[]>;
	book: ReplaceParam<OriginalParams["book"], "0", undefined>;
	docx: ReplaceParam<OriginalParams["docx"], "0", undefined>;
	zip: ReplaceParam<
		ReplaceParam<OriginalParams["zip"], "1", "Ancestry" | "MyHeritage">,
		"9",
		undefined
	>;
}

export type Callback = "aborted" | "completed" | "part-completed" | "progress";

export type Callbacks = Partial<Record<Callback, (...params: any[]) => void>>;

export interface DownloadMessagePayload<
	P extends Params | OriginalParams,
	T extends keyof P,
> {
	name?: string;
	raw?: string;
	options: P[T];
	callbacks?: Callbacks;
}

export interface PathMessagePayload {
	first?: IndiKey;
	second?: IndiKey;
	raw?: string;
}

export interface ValidationMessagePayload {
	indis: Stage["indis"];
	rects: StageRect[];
	missing?: IndiKey[];
}

export type KinshipMessagePayload = PathMessagePayload & {
	lang?: Language;
	showMainPerson?: boolean;
	entirePath?: boolean;
	displayName?: "none" | "givenname" | "surname" | "all";
};

export interface GeneratorMessagePayload {
	person?: IndiKey;
	raw?: string;
	type: "genealogy" | "genealogy-legacy" | "tree";
	settings: Settings;
}

export type AsyncWorkerMessage = {
	[K in Callback]: {
		type: K;
		payload?: Callbacks[K] extends undefined ? never : Callbacks[K];
	};
};

export interface PathWorkerMessage {
	type: "path";
	payload?: PathMessagePayload;
}

export interface ValidationWorkerMessage {
	type: "validation";
	payload?: ValidationMessagePayload;
}

export interface KinshipWorkerMessage {
	type: "kinship";
	payload?: KinshipMessagePayload;
}

export interface DownloadWorkerMessage<T extends keyof OriginalParams> {
	type: "download";
	method: T;
	payload?: DownloadMessagePayload<OriginalParams, T>;
}

export interface GeneratorWorkerMessage {
	type: "generator";
	payload?: GeneratorMessagePayload;
}

export type WorkerMessages = {
	validation: ValidationWorkerMessage;
	path: PathWorkerMessage;
	kinship: KinshipWorkerMessage;
	download: DownloadWorkerMessage<keyof Params>;
	generator: GeneratorWorkerMessage;
} & AsyncWorkerMessage;
export type WorkerMessage = WorkerMessages[keyof WorkerMessages];

export type PathMessageResponsePayload = IndiKey[];

export type ValidationMessageResponsePayload = ReturnType<typeof isStageValid>;

export interface SingleKinshipMessageResponsePayload {
	short?: string;
	long?: string;
}

export interface MultiKinshipMessageResponsePayload {
	short?: Array<{ id?: IndiKey; relative?: string; absolute?: string }>;
	long?: Array<{ id?: IndiKey; relative?: string; absolute?: string }>;
}

export interface KinshipMessageResponsePayload {
	short?:
		| SingleKinshipMessageResponsePayload["short"]
		| MultiKinshipMessageResponsePayload["short"];
	long?:
		| SingleKinshipMessageResponsePayload["long"]
		| MultiKinshipMessageResponsePayload["long"];
}

export interface GeneratorMessageResponsePayload {
	lines?: Stage["lines"];
	indis?: Stage["indis"];
}

export interface DownloadMessageResponsePayload {
	name: string;
	url?: string;
	estimatedTime?: number;
}

export interface MessageSuccess<T> {
	status: "ok";
	data: T;
}

export type ValidationMessageSuccess =
	MessageSuccess<ValidationMessageResponsePayload>;
export type PathMessageSuccess = MessageSuccess<PathMessageResponsePayload>;
export type KinshipMessageSuccess =
	MessageSuccess<KinshipMessageResponsePayload>;
export type DownloadMessageSuccess =
	MessageSuccess<DownloadMessageResponsePayload>;
export type GeneratorMessageSuccess =
	MessageSuccess<GeneratorMessageResponsePayload>;

export interface MessageError {
	status: "error";
	reason: string;
}

export type Responses = {
	validation: ValidationMessageSuccess;
	path: PathMessageSuccess;
	kinship: KinshipMessageSuccess;
	download: DownloadMessageSuccess;
	generator: GeneratorMessageSuccess;
} & {
	[K in keyof AsyncWorkerMessage]: {
		status: "ok";
		data: any;
	};
};

export type MessageType = {
	[K in keyof Responses]: {
		type: K;
		response: Responses[K] | MessageError;
	};
} & {
	error: { type: "error"; response: MessageError };
};

export type ErrorMessageType = {
	[K in keyof Responses]: {
		type: K;
		response: MessageError;
	};
} & {
	error: { type: "error"; response: MessageError };
};

export type SuccessMessageType = {
	[K in keyof Responses]: {
		type: K;
		response: Responses[K];
	};
};

export const isValidationMessagePayload = (
	value: WorkerMessage
): value is ValidationWorkerMessage => {
	return value.type === "validation";
};

export const isPathMessagePayload = (
	value: WorkerMessage
): value is PathWorkerMessage => {
	return value.type === "path";
};

export const isGeneratorMessagePayload = (
	value: WorkerMessage
): value is GeneratorWorkerMessage => {
	return value.type === "generator";
};

export const isKinshipMessagePayload = (
	value: WorkerMessage
): value is KinshipWorkerMessage => {
	return value.type === "kinship";
};

export const isDownloadMessagePayload = (
	value: WorkerMessage
): value is DownloadWorkerMessage<keyof Params> => {
	return value.type === "download";
};

export const isAsyncSuccessMessage = <T extends keyof SuccessMessageType>(
	type: T,
	value:
		| SuccessMessageType[keyof SuccessMessageType]
		| ErrorMessageType[keyof ErrorMessageType]
): value is SuccessMessageType[T] => {
	return value.type === type && value.response.status === "ok";
};
