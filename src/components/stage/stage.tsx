import React, {
	useRef,
	useCallback,
	useMemo,
	type MutableRefObject,
	useState,
	useEffect,
	type MouseEventHandler,
} from "react";
import { saveAs } from "file-saver";
import { useDispatch, useSelector } from "react-redux";
import { IoMdDownload, IoMdPrint } from "react-icons/io";
import { GiFamilyTree } from "react-icons/gi";
import { GoSidebarCollapse, GoSidebarExpand } from "react-icons/go";
import { BiMinus, BiPlus, BiReset } from "react-icons/bi";
import { IoHelp, IoSettings } from "react-icons/io5";
import { BsMoonStarsFill, BsSunFill } from "react-icons/bs";
import { VscDebugAlt, VscDiffAdded, VscDiffRemoved } from "react-icons/vsc";
import {
	selectAllIndis,
	selectFanStage,
	selectGedcom,
	selectMode,
	selectPinned,
	selectRaw,
	selectSelected,
	selectSelectedForKinship,
	selectSelectedRaw,
	selectSidebarOpen,
	selectStage,
	selectTreeMode,
	selectType,
	selectUserId,
} from "../../store/main/selectors";
import {
	actions,
	type Stage as StageType,
	type Settings as SettingsType,
	type TreeType,
	DEFAULT_TREE_STATE,
} from "../../store/main/reducers";
import { actions as imagesActions } from "../../store/images/reducers";
import {
	type DebugState,
	actions as debugActions,
} from "../../store/debug/reducers";
import useDragDropZoom, {
	type DraggingAndZooming,
} from "../../hooks/use-drag-drop-zoom";
import { type Position, type Size } from "../../types/graphic-types";
import {
	ButtonWrapper,
	DebugButton,
	FakeStageButton,
	SideBarToggleButton,
	StageButton,
	StageButtonContentContainer,
	StageCoffeeButton,
	SvgContainer,
	SvgFanChartContainer,
	ThemeButton,
	TransformStyle,
} from "./stage.styled";
import { type FamKey, type IndiKey } from "../../types/types";
import Individual from "../individual/individual";
import { useNavigate } from "react-router";
import ErrorComponent from "../error/error";
import release from "../../configs/release.json";
import { format } from "date-fns";
import { fixBounds } from "../../utils/bounds";
import { type PrintSize } from "../../utils/pdfi";
import {
	type ZipFilesInput,
	zip,
	type OnProgressResult,
	type ZipFile,
	downloadDataUrlsAsZipFile,
	type AdditionalFile,
	type ZipFilesInputSync,
} from "../../utils/zip";
import InvalidPlaces from "../invalid-places/invalid-places";
import usePositionValidation from "../../hooks/use-position-validation";
import {
	TransformWrapper,
	TransformComponent,
	type ReactZoomPanPinchContentRef,
	type ReactZoomPanPinchRef,
	type ReactZoomPanPinchProps,
} from "react-zoom-pan-pinch";
import intersection from "lodash/intersection";
import { HiGlobe } from "react-icons/hi";
import { useLocale } from "../../translation/useLocale";
import { Settings } from "../settings/settings";
import { getCommitsPath } from "../../utils/git";
import { selectProgress } from "../../store/images/selectors";
import {
	type IndexedDbType,
	getInstance,
} from "../../utils/indexed-db-manager";
import Close from "../individual/icons/close";
import Dropdown from "../dropdown/dropdown";
import {
	DOWNLOADS,
	type DownloadChildrenType,
	type DownloadType,
	REGISTRY_ALLOWED,
	FILE_NAMES_EXT,
	STAGE_FORMAT,
} from "../../constants/constants";
import { useDebounce, usePrevious } from "react-use";
import { svgi } from "../../utils/svgi";
import { convertSvg } from "../../utils/svg-converter";
import { getVersion, isDevelopment } from "../../utils/get-product-details";
import { selectDebugStates } from "../../store/debug/selectors";
import { type IndiType } from "../../classes/gedcom/classes/indi";
import { svgf } from "../../utils/svgf";
import { pdff } from "../../utils/pdff";
import colors from "../../colors";
import { nameFormatter } from "../../utils/name-formatter";
import { art } from "../../utils/art";
import { openInNewTab } from "../../utils/link";
import useAppWorker from "../../hooks/use-app-worker";
import { debounce, get } from "lodash";
import { TextInput } from "../inputs/text-input.styled";

const isDev = isDevelopment();

const useWorkerForPictures = true;
const SAVE_DEBOUNCE_TIME = 1000;

const db = (type: IndexedDbType) => getInstance<ZipFile>("ftv", type, "images");

interface Props {
	transRef?: MutableRefObject<ReactZoomPanPinchContentRef | null>;
	transFanRef?: MutableRefObject<ReactZoomPanPinchContentRef | null>;
	onSelect?: (
		e: React.MouseEvent | undefined,
		selected: IndiKey,
		source?: "stage" | "sidebar",
		pin?: "add" | "remove"
	) => void;
	onContext?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar"
	) => void;
	onHover?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar",
		type?: "leave" | "enter"
	) => void;
	settings: SettingsType;
}

const Stage = ({
	transRef,
	transFanRef,
	onSelect,
	onContext,
	onHover: onHoverProp,
	settings,
}: Props) => {
	const ref = useRef<HTMLDivElement>(null);
	const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
	const transformFanRef = useRef<ReactZoomPanPinchContentRef | null>(null);
	const userId = useSelector(selectUserId);
	const gedcom = useSelector(selectGedcom);
	const stage = useSelector(selectStage);
	const fanStage = useSelector(selectFanStage);
	const allIndis = useSelector(selectAllIndis);
	const selected = useSelector(selectSelected);
	const forKinship = useSelector(selectSelectedForKinship);
	const pinned = useSelector(selectPinned);
	const raw = useSelector(selectRaw);
	const rawId = useSelector(selectSelectedRaw);
	const zipProgress = useSelector(selectProgress);
	const mode = useSelector(selectMode);
	const treeMode = useSelector(selectTreeMode);
	const sidebarOpened = useSelector(selectSidebarOpen);
	const type = useSelector(selectType);
	const debugStates = useSelector(selectDebugStates);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { language, setLanguage, t } = useLocale();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [controlsOpen, setControlsOpen] = useState(false);
	const [storedItems, setStoredItems] = useState<ZipFilesInput>();
	const [linesSvgContent, setLinesSvgContent] = useState<{
		left: number;
		top: number;
		width: number;
		height: number;
		svg: string;
	}>();
	const [fanChartSvgContent, setFanChartSvgContent] = useState<{
		width: number;
		height: number;
		svg: string;
	}>();

	const {
		sendDownloadMessage,
		sendAsyncDownloadMessage,
		sendKinshipMessage,
		sendGeneratorMessage,
	} = useAppWorker();
	const downloadName = useRef<string>();
	const cancelController = useRef<() => void>();
	const downloadStarted = useRef(false);
	const manualDownloadStarted = useRef(false);
	const previousAutoDownload = usePrevious(settings.autoDownload);

	const { isAncestry, isMyHeritage, isSupportedTree } = useMemo(() => {
		const isAncestry = gedcom?.isAncestry();
		const isMyHeritage = gedcom?.isMyHeritage();
		const isSupportedTree = isAncestry || isMyHeritage;
		return { isAncestry, isMyHeritage, isSupportedTree };
	}, [gedcom]);

	const { validator, validationDetails, setValidation } =
		usePositionValidation();

	const setZipProgress = useCallback(
		(progress?: OnProgressResult) => {
			dispatch(imagesActions.setProgress({ progress }));
		},
		[dispatch]
	);

	const selectedForKinship = useMemo(
		() => selected && forKinship,
		[forKinship, selected]
	);

	const selectedIndi = useMemo(() => {
		return selected && gedcom?.indi(selected);
	}, [selected, gedcom]);
	const previousSelectedIndi = usePrevious(selectedIndi);

	const selectedNameInOrder = useMemo(() => {
		const formattedName = nameFormatter(selectedIndi, settings).inOrder;
		return [
			settings.showSuffix ? formattedName[0] : undefined,
			formattedName[1],
			formattedName[2],
		]
			.filter(Boolean)
			.join(" ");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedIndi, settings.nameOrder, settings.showSuffix]);

	const getKinship = useCallback(
		async (indi: IndiType) => {
			const response = await sendKinshipMessage({
				first: selectedIndi?.id,
				second: indi?.id,
				raw,
				lang: language,
			});

			return response.response.data;
		},
		[language, raw, selectedIndi?.id, sendKinshipMessage]
	);

	useEffect(() => {
		if (!useWorkerForPictures) {
			if (settings.spaceId && isAncestry) {
				db("Ancestry").getAllItems().then(setStoredItems);
			} else if (isMyHeritage) {
				db("MyHeritage").getAllItems().then(setStoredItems);
			}
		}
	}, [isAncestry, isMyHeritage, settings.spaceId]);

	const toggleControlsOpen = useCallback(() => {
		setControlsOpen((prev) => !prev);
	}, []);

	const treeName = useMemo(() => {
		return gedcom?.getTreeName() || gedcom?.getTreeId() || "tree";
	}, [gedcom]);

	const doDownloadPictures = useCallback(
		async (
			ghost = false,
			additionalFiles?: AdditionalFile[],
			imagePath?: string
		) => {
			if (
				downloadStarted.current ||
				(!storedItems && !useWorkerForPictures) ||
				!isSupportedTree
			) {
				return;
			}

			manualDownloadStarted.current = !ghost;

			downloadStarted.current = true;

			const media: ZipFilesInputSync = {};

			await Promise.all(
				(gedcom?.indis() ?? []).map(async (indi) => {
					const medium = await indi.multimedia(settings.spaceId);

					Object.entries(medium ?? {}).forEach(([key, value]) => {
						media[key] = value;
					});
				})
			);

			setZipProgress({
				total: Object.keys(media).length,
				completed: 0,
				failed: 0,
				state: "idle",
			});

			if (useWorkerForPictures) {
				// ASYNC memory leak
				const { cancel } = sendAsyncDownloadMessage("zip", {
					raw,
					name: downloadName.current,
					options: [
						media,
						settings.spaceId
							? isAncestry
								? "Ancestry"
								: "MyHeritage"
							: undefined,
						ghost,
						5000,
						500,
						treeName,
						additionalFiles,
						imagePath,
						undefined,
						undefined,
					],
					callbacks: {
						aborted: () => {
							setZipProgress(undefined);
							downloadStarted.current = false;
							manualDownloadStarted.current = false;
						},
						completed: (result: { url?: string }) => {
							setTimeout(() => {
								setZipProgress(undefined);
							}, 100);
							downloadStarted.current = false;
							manualDownloadStarted.current = false;
							result.url && saveAs(result.url, `${treeName}.zip`);
						},
						// "part-completed": (result: {
						// 	file: ZipFile;
						// 	stored?: boolean;
						// }) => {
						// 	// !result.stored &&
						// 	// 	db(isAncestry ? "Ancestry" : "MyHeritage").setItem(
						// 	// 		result.file.id,
						// 	// 		result.file
						// 	// 	);
						// },
						progress: setZipProgress,
					},
				});
				return cancel;
			}
			const { cancel } = zip(
				media,
				storedItems,
				ghost,
				5000,
				100,
				treeName,
				additionalFiles,
				imagePath,
				undefined,
				{
					onAborted: () => {
						setZipProgress(undefined);
						downloadStarted.current = false;
						manualDownloadStarted.current = false;
					},
					onCompleted: (_, url) => {
						setTimeout(() => {
							setZipProgress(undefined);
						}, 100);
						downloadStarted.current = false;
						manualDownloadStarted.current = false;
						url && saveAs(url, `${treeName}.zip`);
					},
					onFileCompleted: (file, _, stored) => {
						!stored &&
							db(isAncestry ? "Ancestry" : "MyHeritage").setItem(
								file.id,
								file
							);
					},
					onProgress: setZipProgress,
				}
			);

			if (!Object.keys(media).length) {
				setTimeout(() => {
					setZipProgress(undefined);
				}, 100);
				downloadStarted.current = false;
				manualDownloadStarted.current = false;
			}

			return cancel;
		},
		[
			gedcom,
			isAncestry,
			isSupportedTree,
			raw,
			sendAsyncDownloadMessage,
			setZipProgress,
			settings.spaceId,
			storedItems,
			treeName,
		]
	);

	const doDownloadPdf = useCallback(
		async (
			print = false,
			debug = false,
			size?: PrintSize,
			cropbox = false,
			downloadSettings?: Record<string, boolean | undefined>
		) => {
			return await sendDownloadMessage("pdfi", {
				raw,
				name: downloadName.current,
				options: [
					stage.indis,
					stage.lines,
					type,
					Object.keys(allIndis?.items ?? {}) as IndiKey[],
					debug ? "url" : print ? "print" : "blob",
					cropbox,
					settings,
					size,
					downloadName.current,
					downloadSettings,
				],
			});
		},
		[
			sendDownloadMessage,
			raw,
			stage.indis,
			stage.lines,
			type,
			allIndis?.items,
			settings,
		]
	);

	const doDownloadBook = useCallback(
		async (
			memberType: "all" | "fan" | "tree" | "selectedTree" | "selectedGen",
			outputType: "print" | "blob" = "blob",
			docType = "pdf",
			type: "book" | "obook" | "fbook" | "ggbook" | "gtbook" = "book"
		) => {
			let selectedIndis: IndiKey[] | undefined;

			if (memberType === "tree") {
				selectedIndis = Object.keys(stage.indis ?? {}) as IndiKey[];
			}

			if (memberType === "fan") {
				selectedIndis = selectedIndi
					?.getAllAscendants()
					.copy()
					.merge(selectedIndi.getChildren())
					.keys();
			}
			if (memberType === "selectedGen" || memberType === "selectedTree") {
				const ancestors = selectedIndi?.getAllAscendants().copy();
				const descendants = selectedIndi?.getAllDescendants().copy();
				if (memberType === "selectedTree") {
					const siblings = selectedIndi?.getSiblings();
					const spouses = selectedIndi?.getSpouses();
					const descendantSpouses = descendants?.getSpouses();
					selectedIndis = ancestors
						?.merge(descendants)
						.merge(siblings)
						.merge(spouses)
						.merge(descendantSpouses)
						.keys();
				} else {
					const ancestorDescendants = ancestors?.getAllDescendants();
					const all = ancestors
						?.copy()
						.merge(descendants)
						.merge(ancestorDescendants);
					const allSpouses = all?.getSpouses();
					selectedIndis = all?.merge(allSpouses).keys();
				}
			}

			const validName = `${downloadName.current}${
				FILE_NAMES_EXT[type] ?? ""
			}`;
			if (docType === "pdf") {
				return await sendDownloadMessage("book", {
					raw,
					name: validName,
					options: [
						undefined,
						outputType,
						settings,
						selectedIndis,
						"A4",
						downloadName.current,
					],
				});
			}

			if (docType === "docx") {
				return await sendDownloadMessage("docx", {
					raw,
					name: validName,
					options: [
						undefined,
						settings,
						selectedIndis,
						"A4",
						downloadName.current,
						true,
					],
				});
			}
		},
		[stage.indis, selectedIndi, sendDownloadMessage, raw, settings]
	);

	const doDownloadSvg = useCallback(
		(showIndividuals = true) => {
			const output = svgi(
				stage.indis,
				stage.lines,
				type,
				allIndis,
				"screen",
				settings,
				showIndividuals
			);

			return output;
		},
		[stage.indis, stage.lines, type, allIndis, settings]
	);

	const doDownloadArtSvg = useCallback(
		async (
			indi: IndiType,
			svgType: "print" | "screen" = "screen",
			title?: string
		) => {
			const output = await art(
				"/images/famtree-1.svg",
				indi,
				svgType,
				settings,
				colors.white,
				title || ((person: string) => t("familyTree", { person }))
			);

			return output;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[settings, t, gedcom]
	);

	const doDownloadFanChartSvg = useCallback(
		(indi: IndiType, svgType: "print" | "screen" = "screen") => {
			const output = svgf(
				indi,
				svgType,
				settings,
				svgType === "print" ? colors.grey4 : "transparent"
			);

			return output;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[settings, gedcom]
	);

	const doDownloadFanPdf = useCallback(
		async (
			type: "fpdf" | "ppdf",
			fanType: "print" | "blob" = "blob",
			title?: string
		) => {
			const svg =
				selectedIndi &&
				(type === "fpdf"
					? doDownloadFanChartSvg(selectedIndi, "print")
					: await doDownloadArtSvg(selectedIndi, "print", title));

			if (!svg) {
				return;
			}

			const output = await pdff(svg.svg, svg.width, svg.height, fanType);

			return output;
		},
		[doDownloadArtSvg, doDownloadFanChartSvg, selectedIndi]
	);

	const doDownloadRaw = useCallback(
		(
			type: "svg" | "json" | "ged" | "oged" | "fged" | "ojson" | "fjson"
		) => {
			let output = "";
			let selectedIndis: IndiKey[] | undefined;

			if (type === "ged" || type === "json") {
				selectedIndis = Object.keys(stage.indis ?? {}) as IndiKey[];
			}

			if (type === "fged" || type === "fjson") {
				selectedIndis = selectedIndi
					?.getAllAscendants()
					.copy()
					.merge(selectedIndi.getChildren())
					.keys();
			}

			if (type === "json" || type === "ojson" || type === "fjson") {
				output =
					gedcom?.toJson(undefined, {
						obje: {
							standardize: true,
							namespace: settings.spaceId,
						},
						indis: selectedIndis,
					}) || "";
			} else if (type === "ged" || type === "oged" || type === "fged") {
				output =
					gedcom?.toGedcom(undefined, 0, {
						obje: {
							standardize: true,
							namespace: settings.spaceId,
						},
						indis: selectedIndis,
					}) || "";
			} else if (type === "svg") {
				const { svg: content } = doDownloadSvg(true) ?? {};

				output = content ?? "";
			}

			return output;
		},
		[doDownloadSvg, gedcom, selectedIndi, settings.spaceId, stage.indis]
	);

	const doDowloadPicture = useCallback(
		async (
			type: "jpg" | "png" | "fjpg" | "fpng" | "pjpg" | "ppng",
			title?: string
		) => {
			const output =
				["fpng", "fjpg"].includes(type) && selectedIndi
					? doDownloadFanChartSvg(selectedIndi, "print").svg
					: ["ppng", "pjpg"].includes(type) && selectedIndi
					? (await doDownloadArtSvg(selectedIndi, "print", title))
							?.svg
					: doDownloadRaw("svg");
			if (output) {
				return (
					(await convertSvg(
						output,
						type.replace(/^f/, "") as "jpg" | "png",
						"white",
						["fpng", "fjpg"].includes(type) ? 3 : 10
					)) || undefined
				);
			}
		},
		[doDownloadArtSvg, doDownloadFanChartSvg, doDownloadRaw, selectedIndi]
	);

	const doDownload = useCallback(
		async (
			rawType: DownloadType | DownloadChildrenType,
			downloadSettings?: Record<string, boolean | undefined>
		) => {
			const docName =
				rawType === "ggbook"
					? t("generateGenealogy", {
							person: selectedNameInOrder,
					  })
					: rawType === "gtbook"
					? t("generateTree", {
							person: selectedNameInOrder,
					  })
					: treeName;
			downloadName.current =
				prompt(t("Title of exported document"), docName) ?? docName;
			const usedTreeName = downloadName.current;
			const [type, extension, cropbox] = rawType.split("-") as [
				DownloadType,
				string?,
				string?,
			];
			dispatch(actions.setLoading({ state: true }));

			if (type === "fpdf" || type === "ppdf") {
				const output =
					selectedIndi &&
					(await doDownloadFanPdf(
						type,
						"blob",
						downloadName.current
					));
				output &&
					saveAs(
						output,
						`${usedTreeName}-${
							type === "fpdf" ? "fan" : "poster"
						}.pdf`
					);
			} else if (type === "pdf") {
				await doDownloadPdf(
					false,
					false,
					["A4", "A3", "A2"].includes(extension ?? "")
						? (extension as PrintSize)
						: undefined,
					cropbox === "cropbox",
					downloadSettings
				);
			} else if (type === "registry") {
				// developer usecase, not allowed for anyone
				const registryUrl = prompt(t("Paste registry json url"));
				if (registryUrl) {
					fetch(registryUrl)
						.then(async (r) => await r.json())
						.then((response) => {
							const registryNamePart = registryUrl.split("/");
							const registryName =
								registryNamePart[registryNamePart.length - 1];
							downloadDataUrlsAsZipFile(
								response,
								0,
								registryName?.replace(/\.json$/, "") ||
									"registry"
							);
						});
				}
			} else if (type === "all") {
				// if (!zipProgress) {
				// 	const pdfOutput = doDownloadPdf(false, false, "A4", false);
				// 	const pdfWithCropboxOutput = doDownloadPdf(
				// 		false,
				// 		false,
				// 		"A4",
				// 		true
				// 	);
				// 	const bookOutput = await doDownloadBook("tree");
				// 	const oBookOutput = await doDownloadBook("all");
				// 	const fBookOutput = await doDownloadBook("fan");
				// 	const oGedcomOutput = doDownloadRaw("oged");
				// 	const fGedcomOutput = doDownloadRaw("fged");
				// 	const gedcomOutput = doDownloadRaw("ged");
				// 	const oJsonOutput = doDownloadRaw("ojson");
				// 	const fJsonOutput = doDownloadRaw("fjson");
				// 	const jsonOutput = doDownloadRaw("json");
				// 	const svgOutput = doDownloadRaw("svg");
				// 	const svgFanOutput =
				// 		selectedIndi &&
				// 		doDownloadFanChartSvg(selectedIndi, "print");
				// 	const svgArtOutput =
				// 		selectedIndi &&
				// 		(await doDownloadArtSvg(
				// 			selectedIndi,
				// 			"print",
				// 			downloadName.current
				// 		));
				// 	const pngOutput = (await doDowloadPicture("png")) as
				// 		| Blob
				// 		| undefined;
				// 	const jpgOutput = (await doDowloadPicture("jpg")) as
				// 		| Blob
				// 		| undefined;
				// 	const pngFanOutput =
				// 		selectedIndi &&
				// 		((await doDowloadPicture("fpng")) as Blob | undefined);
				// 	const jpgFanOutput =
				// 		selectedIndi &&
				// 		((await doDowloadPicture("fjpg")) as Blob | undefined);
				// 	cancelController.current = await doDownloadPictures(
				// 		false,
				// 		[
				// 			{
				// 				content: pdfOutput,
				// 				type: "pdf",
				// 				name: `${usedTreeName}-A4`,
				// 			},
				// 			{
				// 				content: pdfWithCropboxOutput,
				// 				type: "pdf",
				// 				name: `${usedTreeName}-A4-CropBox`,
				// 			},
				// 			{
				// 				content: gedcomOutput,
				// 				type: "ged",
				// 				name: usedTreeName,
				// 			},
				// 			{
				// 				content: oGedcomOutput,
				// 				type: "ged",
				// 				name: `${usedTreeName}-original`,
				// 			},
				// 			{
				// 				content: fGedcomOutput,
				// 				type: "ged",
				// 				name: `${usedTreeName}-fan`,
				// 			},
				// 			{
				// 				content: jsonOutput,
				// 				type: "json",
				// 				name: usedTreeName,
				// 			},
				// 			{
				// 				content: oJsonOutput,
				// 				type: "json",
				// 				name: `${usedTreeName}-original`,
				// 			},
				// 			{
				// 				content: fJsonOutput,
				// 				type: "json",
				// 				name: `${usedTreeName}-fan`,
				// 			},
				// 			{
				// 				content: svgOutput,
				// 				type: "svg",
				// 				name: usedTreeName,
				// 			},
				// 			svgFanOutput
				// 				? {
				// 						content: svgFanOutput.svg,
				// 						type: "svg",
				// 						name: `${usedTreeName}-fan`,
				// 				  }
				// 				: undefined,
				// 			svgArtOutput
				// 				? {
				// 						content: svgArtOutput.svg,
				// 						type: "svg",
				// 						name: `${usedTreeName}-poster`,
				// 				  }
				// 				: undefined,
				// 			pngFanOutput
				// 				? {
				// 						content: pngFanOutput,
				// 						type: "png",
				// 						name: `${usedTreeName}-fan`,
				// 				  }
				// 				: undefined,
				// 			jpgFanOutput
				// 				? {
				// 						content: jpgFanOutput,
				// 						type: "jpg",
				// 						name: `${usedTreeName}-fan`,
				// 				  }
				// 				: undefined,
				// 			{
				// 				content: pngOutput,
				// 				type: "png",
				// 				name: usedTreeName,
				// 			},
				// 			{
				// 				content: jpgOutput,
				// 				type: "jpg",
				// 				name: usedTreeName,
				// 			},
				// 			bookOutput
				// 				? {
				// 						content: bookOutput,
				// 						type: "pdf",
				// 						name: `${usedTreeName}-tree-book`,
				// 				  }
				// 				: undefined,
				// 			oBookOutput
				// 				? {
				// 						content: oBookOutput,
				// 						type: "pdf",
				// 						name: `${usedTreeName}-book`,
				// 				  }
				// 				: undefined,
				// 			fBookOutput
				// 				? {
				// 						content: fBookOutput,
				// 						type: "pdf",
				// 						name: `${usedTreeName}-fan-book`,
				// 				  }
				// 				: undefined,
				// 		],
				// 		"media/"
				// 	);
				// }
			} else if (type === "media") {
				if (!zipProgress) {
					cancelController.current = await doDownloadPictures();
				}
			} else if (
				type === "png" ||
				type === "jpg" ||
				type === "fpng" ||
				type === "fjpg" ||
				type === "ppng" ||
				type === "pjpg"
			) {
				const output = (await doDowloadPicture(
					type,
					downloadName.current
				)) as Blob | undefined;
				const validType = type.replace(/^(f|p)(png|jpg)/, "$2");
				const validName = `${usedTreeName}${
					FILE_NAMES_EXT[type] ?? ""
				}`;
				output && saveAs(output, `${validName}.${validType}`);
			} else if (
				type === "book" ||
				type === "obook" ||
				type === "fbook" ||
				type === "ggbook" ||
				type === "gtbook"
			) {
				let memberType:
					| "all"
					| "tree"
					| "fan"
					| "selectedGen"
					| "selectedTree" = "tree";
				if (type === "obook") {
					memberType = "all";
				}
				if (type === "fbook") {
					memberType = "fan";
				}
				if (type === "ggbook") {
					memberType = "selectedGen";
				}
				if (type === "gtbook") {
					memberType = "selectedTree";
				}
				await doDownloadBook(memberType, undefined, extension, type);
			} else {
				if (type === "svg" || type === "fsvg" || type === "psvg") {
					const output =
						type === "svg"
							? doDownloadRaw(type)
							: type === "fsvg"
							? selectedIndi &&
							  doDownloadFanChartSvg(selectedIndi, "print").svg
							: selectedIndi &&
							  (
									await doDownloadArtSvg(
										selectedIndi,
										"print",
										downloadName.current
									)
							  )?.svg;
					const validType = type.replace(/^(f|p)(svg)/, "$2");
					const validName = `${usedTreeName}${
						FILE_NAMES_EXT[type] ?? ""
					}`;
					output &&
						saveAs(
							`data:image/svg+xml;base64,${btoa(
								unescape(encodeURIComponent(output))
							)}`,
							`${validName}.${validType}`
						);
				} else {
					const output = doDownloadRaw(type);
					const validType = type.replace(/^o(ged|json)$/, "$1");
					const validName = `${usedTreeName}${
						FILE_NAMES_EXT[type] ?? ""
					}`;
					output &&
						saveAs(`data:,${output}`, `${validName}.${validType}`);
				}
			}

			dispatch(actions.setLoading({ state: false }));
		},
		[
			dispatch,
			doDowloadPicture,
			doDownloadArtSvg,
			doDownloadBook,
			doDownloadFanChartSvg,
			doDownloadFanPdf,
			doDownloadPdf,
			doDownloadPictures,
			doDownloadRaw,
			selectedIndi,
			selectedNameInOrder,
			t,
			treeName,
			zipProgress,
		]
	);

	const _doPrint = useCallback(
		async (
			pdfSize?: string,
			printSettings?: Record<string, boolean | undefined>
		) => {
			downloadName.current = `${treeName} - print`;
			const [pdfType, size, cropbox] = pdfSize?.split("-") as [
				DownloadType,
				string?,
				string?,
			];
			if (pdfType === "fpdf" || pdfType === "ppdf") {
				return await doDownloadFanPdf(pdfType, "print");
			} else {
				const validSize = ["A4", "A3", "A2"].includes(size ?? "")
					? (size as PrintSize)
					: undefined;
				return await doDownloadPdf(
					true,
					false,
					validSize,
					cropbox === "cropbox",
					printSettings
				);
			}
		},
		[treeName, doDownloadFanPdf, doDownloadPdf]
	);

	const onSvgClick = useCallback<MouseEventHandler>(
		(e) => {
			const target = e.target as SVGElement | undefined;
			const id = target
				?.closest("a")
				?.getAttributeNS("http://www.w3.org/1999/xlink", "href")
				?.replace(/^\//, "") as IndiKey | undefined;
			if (id && (e.ctrlKey || e.metaKey)) {
				const linkTo = gedcom?.indi(id)?.link(settings.poolId);
				linkTo && openInNewTab(linkTo);
			} else if (id && onSelect && !window.wasDragging) {
				onSelect(e, id, "stage");
			}
			e.preventDefault();
			e.stopPropagation();
		},
		[gedcom, onSelect, settings.poolId]
	);

	const previousOverId = useRef<IndiKey>();
	const onSvgHover = useCallback<MouseEventHandler>(
		(e) => {
			const target = e.target as SVGElement | undefined;
			const id = target
				?.closest("a")
				?.getAttributeNS("http://www.w3.org/1999/xlink", "href")
				?.replace(/^\//, "") as IndiKey | undefined;
			if (id !== previousOverId.current) {
				if (id && previousOverId.current) {
					onHoverProp?.(e, previousOverId.current, "stage", "leave");
					onHoverProp?.(e, id, "stage", "enter");
				} else if (!id && previousOverId.current) {
					onHoverProp?.(e, previousOverId.current, "stage", "leave");
				} else if (id && !previousOverId.current) {
					onHoverProp?.(e, id, "stage", "enter");
				}
			}
			previousOverId.current = id;
			e.preventDefault();
			e.stopPropagation();
		},
		[onHoverProp]
	);

	const onSvgContext = useCallback<MouseEventHandler>(
		(e) => {
			const target = e.target as SVGElement | undefined;
			const id = target
				?.closest("a")
				?.getAttributeNS("http://www.w3.org/1999/xlink", "href")
				?.replace(/^\//, "") as IndiKey | undefined;
			if (id && onSelect && !window.wasDragging) {
				onContext?.(e, id, "stage");
			}
			e.preventDefault();
			e.stopPropagation();
		},
		[onContext, onSelect]
	);

	useEffect(() => {
		if (
			!manualDownloadStarted.current ||
			(previousAutoDownload !== settings.autoDownload &&
				!settings.autoDownload)
		) {
			if (
				!downloadStarted.current &&
				settings.autoDownload &&
				(storedItems || useWorkerForPictures)
			) {
				doDownloadPictures(true).then((cancel) => {
					cancelController.current = cancel;
				});
			} else if (downloadStarted.current && !settings.autoDownload) {
				setZipProgress(undefined);
				cancelController.current?.();
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		doDownloadPictures,
		setZipProgress,
		settings.autoDownload,
		storedItems,
	]);

	const setStage = useCallback((params: StageType) => {
		if (!ref.current) {
			return;
		}

		ref.current.style.transform = `scale(${params.scale})`;
		ref.current.style.left = `${params.x}px`;
		ref.current.style.top = `${params.y}px`;
	}, []);

	const onUpdate = useCallback(() => {
		const scale = stage.scale || DEFAULT_TREE_STATE.stage.scale;
		const x = stage.x || DEFAULT_TREE_STATE.stage.x;
		const y = stage.y || DEFAULT_TREE_STATE.stage.y;

		setStage({ x, y, scale });

		return { x, y, scale };
	}, [setStage, stage.scale, stage.x, stage.y]);

	const onTransformTimeout = useRef<NodeJS.Timeout>();
	const onTransformed = useCallback(
		(e: ReactZoomPanPinchRef) => {
			clearTimeout(onTransformTimeout.current);

			onTransformTimeout.current = setTimeout(() => {
				const { positionX: x, positionY: y, scale } = e.state;

				if (!window.isRehydrating) {
					dispatch(actions.setStage({ x, y, scale }));
				}

				window.isRehydrating = false;
				dispatch(actions.setClouding({ state: false }));
			}, SAVE_DEBOUNCE_TIME);
		},
		[dispatch]
	);

	const onTransformFanTimeout = useRef<NodeJS.Timeout>();
	const onTransformedFan = useCallback(
		(e: ReactZoomPanPinchRef) => {
			clearTimeout(onTransformFanTimeout.current);

			onTransformFanTimeout.current = setTimeout(() => {
				const { positionX: x, positionY: y, scale } = e.state;

				if (!window.isRehydrating) {
					dispatch(actions.setFanStage({ x, y, scale }));
				}

				window.isRehydrating = false;
				dispatch(actions.setClouding({ state: false }));
			}, SAVE_DEBOUNCE_TIME);
		},
		[dispatch]
	);

	const onCancel = useCallback(() => {
		setTimeout(() => {
			setValidation([]);
		}, 200);
	}, [setValidation]);

	const onDragEndFan = useCallback(
		(e: ReactZoomPanPinchRef) => {
			onTransformedFan(e);
		},
		[onTransformedFan]
	);

	const onDragEnd = useCallback(
		(e: ReactZoomPanPinchRef) => {
			document
				.querySelector(".main-stage")
				?.classList.remove("cursor-grabbing");

			onTransformed(e);

			setValidation([]);
		},
		[onTransformed, setValidation]
	);

	const onDragStart = useCallback(() => {
		document.querySelector(".main-stage")?.classList.add("cursor-grabbing");
	}, []);

	const onDrop = useCallback(
		(
			_e: MouseEvent,
			_d: DraggingAndZooming,
			element?: HTMLElement,
			position?: Position,
			size?: Size
		) => {
			if (!element || !position || !size) {
				return;
			}

			const id = element.id.replace("dropped.", "") as IndiKey;

			setLinesSvgContent(undefined);
			dispatch(
				actions.setIndiOnStage({
					id,
					position: fixBounds(position),
					size: fixBounds(size),
				})
			);
			setValidation([]);
		},
		[dispatch, setValidation]
	);

	const onRemove = useCallback(
		(e: React.MouseEvent, selected: IndiKey) => {
			setLinesSvgContent(undefined);
			navigate(`/`);
			dispatch(actions.removeIndiFromStage(selected));
		},
		[dispatch, navigate]
	);

	const wiredDebugAction = useCallback(() => {
		doDownload("gtbook-docx");
	}, [doDownload]);

	const onAddDebugState = useCallback(() => {
		dispatch(debugActions.addDebugState({ stage, settings, userId }));
	}, [dispatch, settings, stage, userId]);

	const onRemoveDebugState = useCallback(
		(debugState: DebugState) => {
			dispatch(debugActions.removeDebugState(debugState));
		},
		[dispatch]
	);

	const onSetDebugState = useCallback(
		(debugState: DebugState) => {
			dispatch(actions.setStage(debugState.stage));
			dispatch(actions.setSettings(debugState.settings));
		},
		[dispatch]
	);

	const onReset = useCallback(() => {
		setLinesSvgContent(undefined);
		dispatch(actions.clearStage());
		dispatch(actions.resetStage());

		transformRef.current?.setTransform(0, 0, 1);
	}, [dispatch]);

	const onSidebarToggle = useCallback(() => {
		dispatch(actions.toggleSidebarOpen());
	}, [dispatch]);

	useDragDropZoom({
		avoidPhysicalDrop: true,
		dragTarget: ".main-stage",
		dropTarget: ".wrapper",
		zoomTarget: ".main-stage",
		avoidTarget: ".close",
		onUpdate,
		onDrop,
		snapTo: (placeholder: HTMLElement): Size => {
			return fixBounds({
				w: (placeholder.offsetWidth * settings.horizontalSpace) / 2,
				h: placeholder.offsetHeight * settings.verticalSpace,
			});
		},
		isValidPosition: validator,
		avoidOnCtrl: true,
	});

	useDragDropZoom({
		dragTarget: ".individual-dropped",
		clone: true,
		cloneDelay: 200,
		onCancel,
	});

	const prevHoveredFamId = useRef<FamKey[]>();
	const prevClickedFamId = useRef<FamKey[]>();
	const preventHover = useRef(false);
	const mouseMoving = useRef(false);
	const mouseDown = useRef(false);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const onLineAction = useCallback<MouseEventHandler>(
		debounce((event) => {
			if (document.querySelector(".main-hovered")) {
				return;
			}

			if (event.type === "mousedown") {
				mouseDown.current = true;
			} else if (event.type === "click") {
				mouseDown.current = false;

				if (mouseMoving.current) {
					mouseMoving.current = false;
					return;
				}
			} else if (event.type === "mousemove" && mouseDown.current) {
				mouseMoving.current = true;
			}
			const target = event.target as SVGElement;
			const targetElement =
				target.closest("line") ||
				target.closest("path") ||
				target.closest("circle") ||
				target.closest("div.individual-dropped");
			const famId = targetElement?.dataset.famId
				?.split(",")
				.filter(Boolean) as FamKey[] | undefined;

			if (event.type === "click") {
				if (!targetElement || !famId?.length) {
					prevClickedFamId.current = undefined;
					preventHover.current = false;
				} else if (
					intersection(prevHoveredFamId.current, famId).length
				) {
					if (
						!prevClickedFamId.current ||
						intersection(prevClickedFamId.current, famId).length
					) {
						preventHover.current = !preventHover.current;
					}

					prevClickedFamId.current = famId;
				}
			}
			if (preventHover.current && event.type !== "click") {
				prevHoveredFamId.current = famId;
				return;
			}

			if (!targetElement || !famId?.length) {
				prevHoveredFamId.current = famId;
				document
					?.querySelectorAll(
						`[data-fam-id].not-hovered,[data-fam-id].hovered`
					)
					.forEach((element) => {
						element.classList.remove("hovered");
						element.classList.remove("not-hovered");
					});
				return;
			}

			if (
				intersection(famId, prevHoveredFamId.current).length &&
				event.type !== "click"
			) {
				return;
			}

			prevHoveredFamId.current = famId;

			Array.from<HTMLElement>(
				document?.querySelectorAll(`[data-fam-id]`) ?? []
			).forEach((element) => {
				element.classList.remove("hovered");
				element.classList.add("not-hovered");

				if (
					famId.length &&
					intersection(
						element.dataset?.famId?.split(",").filter(Boolean),
						famId
					).length
				) {
					element.classList.remove("not-hovered");
					element.classList.add("hovered");
				}
			});
		}, 100),
		[]
	);

	const onHover = useCallback(
		(
			e: React.MouseEvent,
			selectedItem: IndiKey,
			source?: "stage" | "sidebar",
			type?: "leave" | "enter"
		) => {
			if (!mouseDown.current) {
				onHoverProp?.(e, selectedItem, source, type);
			}
			onLineAction(e);
		},
		[onHoverProp, onLineAction]
	);

	const indis = useMemo(() => {
		return Object.entries(stage.indis ?? {}).map(
			([id, { position, size }], indiIndex) => {
				const loopIndi = allIndis?.item(id as IndiKey);

				if (!loopIndi) {
					return null;
				}
				return (
					<Individual
						settings={settings}
						key={id}
						index={indiIndex}
						type="dropped"
						record={loopIndi}
						relatedTo={selected}
						connectedTo={selectedForKinship}
						onSelect={onSelect}
						onContext={onContext}
						onHover={onHover}
						onClose={onRemove}
						className="absolute"
						getKinship={
							settings.showKinship &&
							selectedIndi &&
							stage.scale > 0.4
								? getKinship
								: undefined
						}
						style={{
							left: position.x,
							top: position.y,
							width: size.w,
							height: size.h,
						}}
						isPinned={pinned?.includes(id)}
					/>
				);
			}
		);
	}, [
		allIndis,
		getKinship,
		onContext,
		onHover,
		onRemove,
		onSelect,
		pinned,
		selected,
		selectedForKinship,
		selectedIndi,
		settings,
		stage.indis,
		stage.scale,
	]);

	useDebounce(
		() => {
			const svg = doDownloadSvg(false);

			setLinesSvgContent(svg);
		},
		200,
		[doDownloadSvg]
	);

	useEffect(() => {
		if (["fanChart", "treeArt"].includes(treeMode) && selectedIndi?.id) {
			const svgGetter = async () => {
				if (treeMode === "treeArt") {
					return await doDownloadArtSvg(selectedIndi, "screen");
				}
				return doDownloadFanChartSvg(selectedIndi, "screen");
			};

			svgGetter().then((svg) => {
				if (!svg) {
					return;
				}

				setFanChartSvgContent(svg);

				if (selectedIndi.id !== previousSelectedIndi?.id) {
					let scale = window.innerWidth / svg.width;
					if (window.innerWidth > window.innerHeight) {
						scale = window.innerHeight / svg.height;
					}

					setTimeout(() => {
						transformFanRef.current?.centerView(scale);
					}, 500);
				}
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		doDownloadFanChartSvg,
		doDownloadArtSvg,
		selectedIndi?.id,
		treeMode,
		gedcom,
	]);

	const [zoomValue, setZoomValue] = useState("100%");
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const formatZoomValue = useCallback((value: number | string) => {
		setZoomValue(
			new Intl.NumberFormat("en-US", {
				useGrouping: false,
				maximumFractionDigits: 2,
				style: "percent",
			}).format(Number(`${value}`.replace(/[^\d.]/, "") || 0))
		);
	}, []);

	const onZoomValueChange = useCallback<React.ChangeEventHandler>(
		(e) => {
			const target = e.target as HTMLInputElement;
			const newValue =
				Number(`${target.value}`.replace(/[^\d.]/, "") || 0) / 100;
			const diff = stage.scale - newValue;
			const smooth = !!transRef?.current?.instance?.setup?.smooth;
			const delta = 1;
			const step = smooth
				? Math.log(newValue / stage.scale) / delta
				: (newValue - stage.scale) / delta;

			formatZoomValue(newValue);
			if (diff < 0) {
				transRef?.current?.zoomIn(Math.abs(step));
				transFanRef?.current?.zoomIn(Math.abs(step));
			} else {
				transRef?.current?.zoomOut(Math.abs(step));
				transFanRef?.current?.zoomOut(Math.abs(step));
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stage.scale, formatZoomValue]
	);
	const onZoom = useCallback(
		(ref: ReactZoomPanPinchRef) => {
			formatZoomValue(ref.state.scale);
		},
		[formatZoomValue]
	);
	useEffect(() => {
		formatZoomValue(stage.scale);
	}, [formatZoomValue, stage.scale]);

	const debugStatesArray = useMemo(() => {
		return Object.entries(debugStates ?? {});
	}, [debugStates]);

	const transformProps = useMemo<
		Omit<ReactZoomPanPinchProps, "ref"> &
			React.RefAttributes<ReactZoomPanPinchContentRef>
	>(() => {
		if (["fanChart", "treeArt"].includes(treeMode)) {
			return {
				onPanningStop: onDragEndFan,
				onZoom,
				onTransformed: onTransformedFan,
				initialPositionX: fanStage.x,
				initialPositionY: fanStage.y,
				initialScale: fanStage.scale,
				minScale: 0.0001,
				maxScale: 100,
				ref: (ref) => {
					transformFanRef.current = ref;

					if (transFanRef) {
						transFanRef.current = transformFanRef.current;
					}
				},
			};
		}

		return {
			onPanningStart: onDragStart,
			onPanningStop: onDragEnd,
			onTransformed,
			onZoom,
			panning: { excluded: ["avoid-stage-gesture"] },
			doubleClick: {
				excluded: ["avoid-stage-gesture"],
			},
			initialPositionX: stage.x,
			initialPositionY: stage.y,
			initialScale: stage.scale,
			minScale: 0.0001,
			maxScale: 100,
			limitToBounds: false,
			ref: (ref) => {
				transformRef.current = ref;

				if (transRef) {
					transRef.current = transformRef.current;
				}
			},
		};
	}, [
		fanStage.scale,
		fanStage.x,
		fanStage.y,
		onDragEnd,
		onDragEndFan,
		onDragStart,
		onTransformed,
		onTransformedFan,
		onZoom,
		stage.scale,
		stage.x,
		stage.y,
		transFanRef,
		transRef,
		treeMode,
	]);

	return (
		<>
			<TransformStyle />
			<TransformWrapper {...transformProps}>
				{selectedIndi && ["fanChart", "treeArt"].includes(treeMode) ? (
					<TransformComponent wrapperClass="main-stage step-5">
						{fanChartSvgContent && (
							<SvgFanChartContainer
								onClick={onSvgClick}
								onContextMenu={onSvgContext}
								onMouseOver={onSvgHover}
								style={{
									width: fanChartSvgContent.width,
									height: fanChartSvgContent.height,
								}}
								dangerouslySetInnerHTML={{
									__html: fanChartSvgContent.svg,
								}}
							/>
						)}
					</TransformComponent>
				) : (
					<TransformComponent
						wrapperClass="main-stage step-5"
						contentClass="wrapper"
					>
						{/* {isDev && (
							<DebugLines
								start={-50}
								end={50}
								settings={settings}
								mode={mode}
								horizontal
								vertical
								halves
							/>
						)} */}
						{linesSvgContent && (
							<SvgContainer
								onMouseDown={onLineAction}
								onMouseMove={onLineAction}
								onClick={onLineAction}
								style={{
									left: linesSvgContent.left,
									top: linesSvgContent.top,
								}}
								dangerouslySetInnerHTML={{
									__html: linesSvgContent.svg,
								}}
							/>
						)}
						{indis}
					</TransformComponent>
				)}
				<ButtonWrapper
					onMouseEnter={() => {
						toggleControlsOpen();
					}}
					onMouseLeave={() => {
						toggleControlsOpen();
					}}
					className={`${
						settingsOpen || zipProgress ? "opened" : ""
					} step-4`}
				>
					<StageButton
						title={language === "en" ? "magyar" : "English"}
						onClick={() => {
							setLanguage(language === "en" ? "hu" : "en");
						}}
					>
						<HiGlobe className="icon" />
						<span>{language === "en" ? "magyar" : "English"}</span>
					</StageButton>
					<StageButton
						title={t("Help")}
						onClick={() => {
							dispatch(actions.setGuidded(false));
							setTimeout(() => {
								window.location.reload();
							}, 1000);
						}}
					>
						<IoHelp className="icon" />
						<span>{t("Help")}</span>
					</StageButton>
					<FakeStageButton
						className="settings"
						title={t("Settings")}
						onClick={(e) => {
							const target = e.target as HTMLElement;
							if (
								!target.closest(".settings-container") ||
								target.closest(".settings-close")
							) {
								setSettingsOpen((prev) => !prev);
							}
						}}
						column
					>
						<IoSettings className="icon" />
						<span className={settingsOpen ? "opened-button" : ""}>
							{t("Settings")}
						</span>
						<StageButtonContentContainer
							className="settings-container"
							opened={settingsOpen}
							maxHeight={700}
						>
							<Settings
								settings={settings}
								isAncestry={isAncestry}
								isMyHeritage={isMyHeritage}
							/>
							<div className="flex justify-between mt-auto">
								<span
									className={`settings-reset cursor-pointer ${
										settingsOpen ? "opened-button" : ""
									}`}
									onClick={() => {
										dispatch(actions.resetSettings());
									}}
								>
									{t("Reset")}
								</span>
								<span className="settings-close cursor-pointer ">
									{t("Close")}
								</span>
							</div>
						</StageButtonContentContainer>
					</FakeStageButton>
					{rawId ? (
						<>
							{/* <Dropdown
								items={PDF_DOWNLOADS.concat(
									selectedIndi
										? [
												{
													value: "fpdf-print",
													label: "Fan chart",
												},
										  ]
										: []
								).map((item, printIndex) => ({
									...item,
									settings:
										printIndex === 0
											? (
													DOWNLOADS.find(
														(downloadItem) =>
															"value" in
																downloadItem &&
															downloadItem.value ===
																"pdf"
													) as
														| DropdownItemWithChildren<
																DownloadType,
																DownloadChildrenType
														  >
														| undefined
											  )?.settings
											: undefined,
									child: false,
								}))}
								as={
									<StageButton title={t("Print")}>
										<IoMdPrint className="icon" />
										<span>{t("Print")}</span>
									</StageButton>
								}
								blocked={!controlsOpen}
								onSelect={(selected, printSettings) => {
									doPrint(selected, printSettings).catch(
										(e) => {
											console.error("HIBA", e);
										}
									);
								}}
							/> */}
							<Dropdown
								items={DOWNLOADS.filter((item) => {
									if ("isDivider" in item) {
										if (
											item.label ===
												"Visualised fan chart" &&
											!selectedIndi
										) {
											return false;
										}

										return true;
									}

									if (
										[
											"fsvg",
											"fpng",
											"fjpg",
											"fpdf",
											"fbook",
											"fged",
											"fjson",
											"ggbook",
											"gtbook",
										].includes(item.value) &&
										!selectedIndi
									) {
										return false;
									}

									if (
										item.value === "registry" &&
										!REGISTRY_ALLOWED.includes(userId ?? "")
									) {
										return false;
									}

									return (
										(item.value !== "media" &&
											item.value !== "all") ||
										isSupportedTree
									);
								}).map((item) => {
									const isDivider = "isDivider" in item;
									const enabled =
										isDivider ||
										(item.value !== "media" &&
											item.value !== "all") ||
										(((isAncestry && settings.spaceId) ||
											isMyHeritage) &&
											(storedItems ||
												useWorkerForPictures));

									return isDivider
										? item
										: {
												...item,
												variables: {
													person: selectedNameInOrder,
												},
												disabled: !enabled,
										  };
								})}
								as={
									<StageButton
										visuallyDisabled={!!zipProgress}
										title={t("Download")}
									>
										<IoMdDownload className="icon" />
										<span
											className={`flex items-center justify-between ${
												zipProgress
													? "opened-button"
													: ""
											}`}
										>
											{zipProgress
												? `${t(zipProgress.state)} (${
														zipProgress.completed
												  }/${zipProgress.total})`
												: t("Download")}
											{zipProgress && (
												<Close
													className="h-4 w-4"
													onClick={() => {
														cancelController.current?.();
													}}
												/>
											)}
										</span>
									</StageButton>
								}
								blocked={!controlsOpen || !!zipProgress}
								onSelect={doDownload}
							/>
							<StageButton onClick={onReset} title={t("Reset")}>
								<BiReset className="icon" />
								<span>{t("Reset")}</span>
							</StageButton>
							{isDev && (
								<StageButton
									style={{
										background: "#d3bb27",
										color: "black",
									}}
									onClick={() =>
										dispatch(
											actions.setLines({
												reposition: true,
											})
										)
									}
									title="Debug Lines"
								>
									Debug Lines
								</StageButton>
							)}

							{selectedIndi && selected && (
								<>
									<StageButton
										className="bg-[#da6a1d]"
										onClick={() => {
											dispatch(
												actions.setLoading({
													state: true,
												})
											);
											setLinesSvgContent(undefined);
											sendGeneratorMessage({
												person: selectedIndi?.id,
												type: "genealogy-legacy",
												raw,
												settings,
											}).then((resp) => {
												dispatch(
													actions.setGenealogyRaw(
														resp.response.data
													)
												);
												dispatch(
													actions.setLoading({
														state: false,
													})
												);
											});
										}}
										title={t("generateGenealogyLegacy", {
											person: selectedNameInOrder,
										})}
									>
										<GiFamilyTree className="icon" />
										<span>
											{t("generateGenealogyLegacy", {
												person: selectedNameInOrder,
											})}
										</span>
									</StageButton>
									<StageButton
										className="bg-[#da6a1d]"
										onClick={() => {
											dispatch(
												actions.setLoading({
													state: true,
												})
											);
											setLinesSvgContent(undefined);
											sendGeneratorMessage({
												person: selectedIndi?.id,
												type: "genealogy",
												raw,
												settings,
											}).then((resp) => {
												dispatch(
													actions.setGenealogyRaw(
														resp.response.data
													)
												);
												dispatch(
													actions.setLoading({
														state: false,
													})
												);
											});
										}}
										title={t("generateGenealogy", {
											person: selectedNameInOrder,
										})}
									>
										<GiFamilyTree className="icon" />
										<span>
											{t("generateGenealogy", {
												person: selectedNameInOrder,
											})}
										</span>
									</StageButton>
									<StageButton
										className="bg-[#da6a1d]"
										onClick={() => {
											dispatch(
												actions.setLoading({
													state: true,
												})
											);
											setLinesSvgContent(undefined);
											sendGeneratorMessage({
												person: selectedIndi?.id,
												type: "tree",
												raw,
												settings,
											}).then((resp) => {
												dispatch(
													actions.setTreeRaw(
														resp.response.data
													)
												);
												dispatch(
													actions.setLoading({
														state: false,
													})
												);
											});
										}}
										title={t("generateTree", {
											person: selectedNameInOrder,
										})}
									>
										<GiFamilyTree className="icon" />
										<span>
											{t("generateTree", {
												person: selectedNameInOrder,
											})}
										</span>
									</StageButton>
								</>
							)}
						</>
					) : null}

					<StageCoffeeButton />
					{debugStatesArray.map(([id, debugState], index) => (
						<DebugButton
							key={index}
							onClick={() => {
								onSetDebugState(debugState);
							}}
							title={t("Set debug state")}
						>
							<VscDebugAlt className="icon" />
							<span>
								{t("setDebugState", {
									name: id,
								})}
								{isDev && (
									<VscDiffRemoved
										className="h-4 w-4"
										onClick={() => {
											onRemoveDebugState(debugState);
										}}
									/>
								)}
							</span>
						</DebugButton>
					))}
					{isDev || debugStatesArray.length ? (
						<DebugButton
							onClick={onAddDebugState}
							title={t("Add debug state")}
						>
							<VscDebugAlt className="icon" />
							<span>
								{t("Add debug state")}
								<VscDiffAdded className="h-4 w-4" />
							</span>
						</DebugButton>
					) : null}
					{isDev && wiredDebugAction ? (
						<DebugButton
							style={{ background: "lime", color: "black" }}
							onClick={wiredDebugAction}
							title="Wired debug action"
						>
							<VscDebugAlt className="icon" />
							<span>Wired debug action</span>
						</DebugButton>
					) : null}
				</ButtonWrapper>
				<ButtonWrapper
					className={`theme absolute top-2 overflow-visible`}
					horizontal=""
					isRow
					spanWidth={150}
					style={{
						left: sidebarOpened
							? `calc(${
									34 + settings.individualSize.w
							  }px - 0.25rem)`
							: -4,
					}}
				>
					<SideBarToggleButton
						title={t(`${sidebarOpened ? "Close" : "Open"} sidebar`)}
						onClick={onSidebarToggle}
					>
						{!sidebarOpened ? (
							<GoSidebarCollapse className="icon" />
						) : (
							<GoSidebarExpand className="icon" />
						)}
						<span>
							{t(`${sidebarOpened ? "Close" : "Open"} sidebar`)}
						</span>
					</SideBarToggleButton>

					{selectedIndi && (
						<Dropdown
							items={STAGE_FORMAT}
							as={
								<StageButton
									title={t("Visualised format")}
									className="no-collapse"
								>
									<IoMdPrint className="icon" />
									<span>{t("Visualised format")}</span>
								</StageButton>
							}
							className="dropdown"
							selected={treeMode}
							showSelectedOnTarget
							blocked={!controlsOpen}
							onSelect={(selectedMode) => {
								dispatch(
									actions.setTreeMode(
										selectedMode as TreeType
									)
								);
							}}
						/>
					)}

					<ThemeButton
						mode={mode === "light" ? "dark" : "light"}
						onClick={() =>
							dispatch(
								actions.setMode(
									mode === "light" ? "dark" : "light"
								)
							)
						}
					>
						{mode === "light" ? (
							<>
								<BsMoonStarsFill className="icon" />
								<span>{t("Dark")}</span>
							</>
						) : (
							<>
								<BsSunFill className="icon" />
								<span>{t("Light")}</span>
							</>
						)}
					</ThemeButton>

					<StageButton
						onClick={() => {
							transRef?.current?.zoomIn(0.5);
							transFanRef?.current?.zoomIn(0.5);
						}}
						title={t("Zoom in")}
					>
						<BiPlus className="icon" />
					</StageButton>
					<StageButton
						onClick={() => {
							transRef?.current?.zoomOut(0.5);
							transFanRef?.current?.zoomOut(0.5);
						}}
						title={t("Zoom out")}
					>
						<BiMinus className="icon" />
					</StageButton>
					<TextInput
						className="w-[50px] px-0.5 m-0 text-center text-xs border-none focus:w-[100px] focus:px-1 hover:w-[100px] hover:px-1 transition-all"
						autoComplete="off"
						value={zoomValue}
						onChange={onZoomValueChange}
					/>
				</ButtonWrapper>
				{validationDetails.length ? (
					<ErrorComponent title={t("Invalid place")}>
						<InvalidPlaces details={validationDetails} />
					</ErrorComponent>
				) : null}
				<div className="version absolute bottom-2 right-2 text-grey-800 dark:text-gray-50 text-xs">
					{`${t("Version")} `}
					<a
						href={`${getCommitsPath(release.url)}/${
							release.version
						}`}
						target="_blank"
						rel="noreferrer"
						className="text-blue-700 dark:text-blue-300 hover:underline"
					>
						{getVersion()}.{release.version}
					</a>{" "}
					{t("onDay", {
						date: format(
							new Date(release.date),
							language === "hu"
								? "yyyy. MMM dd. HH:mm"
								: "dd MMM yyyy HH:mm"
						),
					})}
				</div>
			</TransformWrapper>
		</>
	);
};

export default Stage;
