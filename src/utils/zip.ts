import { type IndiKey } from "../types/types";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface ZipFile {
	key: string;
	id: string;
	imgId: string;
	downloaded?: boolean;
	tree: string;
	person: IndiKey;
	title: string;
	url: string;
	downloadName: string;
	content?: string;
	contentType?: string;
}

export type AdditionalFile =
	| {
			content?: string | Blob;
			name: string;
			type?: string;
			base64?: boolean;
	  }
	| undefined;

export type ZipFilesInput = Record<string, () => Promise<ZipFile>>;
export type ZipFilesInputSync = Record<string, ZipFile>;

export interface OnCompletedResult {
	id: string;
	content: string;
	stored?: boolean;
}
export interface OnFailedResult {
	id: string;
	error: Error;
}
export interface OnProgressResult {
	state: "downloading" | "zipping" | "idle";
	completed: number;
	failed: number;
	total: number;
}

const abort = {
	abort: false,
};

const replaceInvalidCharts = (name?: string) => {
	return name?.replace(/[&{}()[\]<>/\\?!'".:;,=*^%$#@±§`~|_]+/g, "-") || "";
};

const blobToDataUrl = async (blob: Blob) => {
	return await new Promise<ProgressEvent<FileReader>>((resolve) => {
		const a = new FileReader();
		a.onload = resolve;
		a.readAsDataURL(blob);
	}).then((e) => {
		return e.target?.result as string | undefined;
	});
};

const downloadFile = async (
	files: ZipFilesInput | ZipFilesInputSync,
	index: number,
	max = 10,
	delay = 1000,
	onCompleted?: (result?: OnCompletedResult) => void,
	onFailed?: (result: OnFailedResult) => void,
	stored?: ZipFilesInput | ZipFilesInputSync,
	ghost?: boolean,
	abort?: { abort: boolean }
) => {
	if (abort?.abort) {
		abort.abort = false;
		return;
	}

	const ids = Object.keys(files);

	if (index >= ids.length || index >= max) {
		onCompleted?.();
		return;
	}

	let nextMax = max;
	let shouldDelay = true;

	const id = ids[index];

	const storing = stored?.[id];
	const storedFile =
		typeof storing === "function" ? await storing() : storing;

	if (
		storedFile?.downloaded &&
		storedFile.content &&
		storedFile.contentType
	) {
		nextMax = nextMax + 1;
		shouldDelay = false;
		onCompleted?.({
			id: storedFile.id,
			content: storedFile.content,
			stored: true,
		});
	} else {
		try {
			const storing = files[id];
			const storedFile =
				typeof storing === "function" ? await storing() : storing;
			const fileContent = await fetch(storedFile.url);
			const content = await blobToDataUrl(await fileContent.blob());

			onCompleted?.({ id, content: content ?? "" });
		} catch (e) {
			onFailed?.({ id, error: e as Error });
		}
	}

	const recall = async () => {
		if (abort?.abort) {
			abort.abort = false;
			return;
		}

		await downloadFile(
			files,
			index + 1,
			nextMax,
			delay,
			onCompleted,
			onFailed,
			stored,
			ghost,
			abort
		);
	};

	if (shouldDelay) {
		await new Promise((resolve) => {
			setTimeout(
				() => {
					resolve(recall());
				},
				index % 100 === 1 ? delay * 50 : delay
			);
		});
	} else {
		await recall();
	}
};

const progress = async (
	files: ZipFilesInput | ZipFilesInputSync,
	result?: OnCompletedResult | OnFailedResult,
	onProgress?: (result: OnProgressResult) => void,
	onCompleted?: (result: ZipFilesInput | ZipFilesInputSync) => void
) => {
	if (result) {
		const storing = files[result.id];
		const resultFile =
			typeof storing === "function" ? await storing() : storing;
		if (!("error" in result)) {
			resultFile.downloaded = true;
			resultFile.content = result.content;
		} else {
			resultFile.downloaded = false;
		}
	}

	const total = Object.keys(files).length;
	let settled = 0;
	let completed = 0;
	const downloadedFiles = Object.values(files) as Array<
		| ZipFilesInputSync[keyof ZipFilesInputSync]
		| ZipFilesInput[keyof ZipFilesInput]
	>;
	await Promise.all(
		Object.values(downloadedFiles).map(async (fileGetter) => {
			const file =
				typeof fileGetter === "function"
					? await fileGetter()
					: fileGetter;

			if (file.downloaded !== undefined) {
				settled!++;
			}

			completed! += file.downloaded ? 1 : 0;
		})
	);

	settled = settled || 0;
	completed = completed || 0;

	const failed = settled - completed;

	if (result && total === settled) {
		onCompleted?.(files);
	} else {
		onProgress?.({ total, completed, failed, state: "downloading" });
	}

	return { total, failed, settled, completed };
};

export const downloadZipFile = async (
	files: ZipFilesInput | ZipFilesInputSync,
	onProgress?: (result: OnProgressResult) => void,
	onCompleted?: (
		result: ZipFilesInput | ZipFilesInputSync,
		url?: string
	) => void,
	filename?: string,
	additionalFiles?: AdditionalFile[],
	filePath = "",
	additionalFilePath = ""
) => {
	const downloads = Object.values(files) as Array<
		| ZipFilesInputSync[keyof ZipFilesInputSync]
		| ZipFilesInput[keyof ZipFilesInput]
	>;

	if (downloads.length) {
		const zip = new JSZip();

		if (additionalFiles?.length) {
			additionalFiles.forEach((file) => {
				if (!file) {
					return;
				}

				const { content, name, type, base64 } = file;
				if (content) {
					zip.file(
						`${additionalFilePath}${replaceInvalidCharts(name)}.${
							type ?? "raw"
						}`,
						content,
						{ base64 }
					);
				}
			});
		}

		onProgress?.({
			total: downloads.length,
			completed: 0,
			failed: 0,
			state: "zipping",
		});

		const combinedFiles: Record<
			string,
			{
				mentioned: string[];
				file: ZipFile;
			}
		> = {};

		await Promise.all(
			downloads.map(async (fileGetter) => {
				const file =
					typeof fileGetter === "function"
						? await fileGetter()
						: fileGetter;

				if (combinedFiles[file.imgId]) {
					combinedFiles[file.imgId].mentioned.push(file.person);
				} else {
					combinedFiles[file.imgId] = {
						file,
						mentioned: [file.person],
					};
				}
			})
		);

		await Promise.all(
			Object.values(combinedFiles).map(async (file, index) => {
				const { file: fileContent, mentioned: _mentioned } = file;

				if (fileContent.content) {
					const idx =
						fileContent.content.indexOf("base64,") +
						"base64,".length;
					const content = fileContent.content.substring(idx);

					onProgress?.({
						total: downloads.length,
						completed: index + 1,
						failed: 0,
						state: "zipping",
					});
					zip.file(
						`${filePath}${replaceInvalidCharts(
							fileContent.title
						)}_${replaceInvalidCharts(fileContent.imgId)}.${
							fileContent.contentType ?? "raw"
						}`,
						content,
						{ base64: true }
					);
				}
			})
		);

		const content = await zip.generateAsync(
			{ type: "blob" },
			(metadata) => {
				onProgress?.({
					total: 100,
					completed: Math.ceil(metadata.percent),
					failed: 0,
					state: "zipping",
				});
			}
		);

		const url = URL.createObjectURL(content);
		onCompleted?.(files, url);
	}
};

export const downloadDataUrlsAsZipFile = async (
	files: Record<string, string>,
	_zippedFileNameIterator = 0,
	filename?: string
) => {
	const downloads = Object.entries(files);

	if (downloads.length) {
		const zip = new JSZip();

		downloads.forEach(([index, fileContent]) => {
			const idx = fileContent.indexOf("base64,") + "base64,".length;
			const content = fileContent.substring(idx);
			const type = fileContent
				.split("base64")[0]
				.match(/data:[^/]*\/(?<type>[^;]+);/)?.groups?.type;

			zip.file(
				`${`${index}`.padStart(3, "0")}.${type ?? "raw"}`,
				content,
				{ base64: true }
			);
		});

		const content = await zip.generateAsync({ type: "blob" });

		saveAs(content, `${filename || `files`}.zip`);
	}
};

export const zip = (
	files: ZipFilesInput | ZipFilesInputSync,
	stored?: ZipFilesInput | ZipFilesInputSync,
	ghost?: boolean,
	limit = 1000,
	delay = 500,
	filename?: string,
	additionalFiles?: AdditionalFile[],
	filePath?: string,
	additionalFilePath?: string,
	callbacks?: {
		onAborted?: () => void;
		onProgress?: (result: OnProgressResult) => void;
		onCompleted?: (
			result: ZipFilesInput | ZipFilesInputSync,
			url?: string
		) => void;
		onFileCompleted?: (
			file: ZipFile,
			files?: ZipFilesInput | ZipFilesInputSync,
			stored?: boolean
		) => void;
	}
) => {
	const estimatedTime = Object.keys(files).length * delay;
	let newFiles = { ...files };

	const cancel = () => {
		abort.abort = true;
	};

	downloadFile(
		newFiles,
		0,
		limit,
		delay,
		(result) => {
			if (abort.abort) {
				callbacks?.onAborted?.();
				newFiles = {};
				files = {};
				return;
			}

			progress(newFiles, result, callbacks?.onProgress, (resultFiles) => {
				if (!ghost) {
					downloadZipFile(
						resultFiles,
						callbacks?.onProgress,
						callbacks?.onCompleted,
						filename,
						additionalFiles,
						filePath,
						additionalFilePath
					).then(() => {
						newFiles = {};
						files = {};
					});
				} else {
					callbacks?.onCompleted?.(resultFiles);
				}
			});

			if (result) {
				const storing = newFiles[result.id];
				const storedFile =
					typeof storing === "function"
						? storing()
						: Promise.resolve(storing);
				storedFile.then((file) => {
					callbacks?.onFileCompleted?.(
						{ ...file, content: result.content },
						newFiles,
						result.stored
					);
				});
			}
		},
		(result) => {
			if (abort.abort) {
				callbacks?.onAborted?.();
				newFiles = {};
				files = {};
				return;
			}

			progress(newFiles, result, callbacks?.onProgress, (resultFiles) => {
				callbacks?.onCompleted?.(resultFiles);
			});
		},
		stored,
		ghost,
		abort
	);

	return {
		estimatedTime,
		cancel,
	};
};
