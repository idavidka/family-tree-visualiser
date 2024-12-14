import { jsPDF as JsToPdf } from "jspdf";
import { type Settings } from "../store/main/reducers";
import { type FamKey, type IndiKey } from "../types/types";
import { ArialBold } from "../fonts/ArialBold";
import { ArialItalic } from "../fonts/ArialItalic";
import { Arial } from "../fonts/Arial";
import { type Position, type Size } from "../types/graphic-types";
import { dateFormatter, noteDateFormatter } from "./date-formatter";
import { isDevelopment } from "./get-product-details";
import { printPdf } from "./print-pdf";
import { nameFormatter } from "./name-formatter";
import { type GedComType } from "../classes/gedcom/classes/gedcom";
import { AGE_ASC, getNameAscAndBirth } from "../constants/orders";
import { TimesNewRoman } from "../fonts/TimesNewRoman";
import { TimesNewRomanBold } from "../fonts/TimesNewRomanBold";
import { type IndiType } from "../classes/gedcom/classes/indi";
import i18n from "../translation/i18n";
import { placeTranslator } from "./place-translator";
import { type Common } from "../classes/gedcom/classes/common";
import { blobToBase64 } from "./blob-to-base64";

const isDev = isDevelopment();

const images: Record<
	string,
	{
		uri: string;
		img: { src: string; naturalWidth: number; naturalHeight: number };
	}
> = {};
const downloadImg = async (imgUri: string) => {
	if (images[imgUri]) {
		return images[imgUri];
	}

	const imgResponse = await fetch(imgUri);
	const imageBlob = await imgResponse.blob();
	const image = await createImageBitmap(imageBlob);
	const uri = await blobToBase64(imageBlob);
	images[imgUri] = {
		uri: imgUri,
		img: {
			src: uri,
			naturalWidth: image.width,
			naturalHeight: image.height,
		},
	};

	image.close();

	return images[imgUri];
};

const t = i18n.t;

export type PrintSize = "A2" | "A3" | "A4";

type AnnotationItem = {
	page: number;
} & Size &
	Position;

interface BookItem {
	inBook?: boolean;
	bookItemId: string;
	page: number;
	top: number;
	annotations: AnnotationItem[];
}

interface TocItem {
	letter?: boolean;
	page: number;
	top: number;
	count: number;
}

const printSizes: Record<PrintSize | "A5", Size> = {
	A5: {
		w: 794 / 2,
		h: 1123 / 2,
	},
	A4: {
		w: 794,
		h: 1123,
	},
	A3: {
		w: 794 * 2,
		h: 1123 * 2,
	},
	A2: {
		w: 794 * 4,
		h: 1123 * 4,
	},
};

const addPage = (
	doc: JsToPdf,
	showPageNr = true,
	margin: { x: number; y: number },
	size: { w: number; h: number }
) => {
	doc.addPage();

	if (showPageNr) {
		const pageNr = doc.getCurrentPageInfo().pageNumber;

		const originalFont = doc.getFont();
		const originalFontSize = doc.getFontSize();

		doc.setFont("TimesNewRoman");
		doc.setFontSize(16);

		doc.text(
			`${pageNr - 1}.`,
			margin.x + size.w / 2,
			margin.y + size.h + margin.y / 2,
			{
				maxWidth: size.w,
				align: "center",
			}
		);

		doc.setFont(originalFont.fontName);
		doc.setFontSize(originalFontSize);
	}
};

const otherFormatter = (parent: IndiType, child: IndiType) => {
	const parentType = parent.getParentType(child);

	if (!parentType || parentType === "biological") {
		return "";
	}

	return `(${t(parentType)})`;
};

const printName = (params: {
	item: IndiType;
	itemFormatter?: (indi1: IndiType) => string;
	x: number;
	y: number;
	maxWidth: number;
	prefix?: string;
	otherSeparator?: string | string[];
	otherPrefix?: string;
	others?: Array<string | IndiType | undefined>;
	otherFormatter?: (indi1: IndiType, indi2: IndiType) => string;
	settings?: Settings;
	sizes: {
		margin: { x: number; y: number };
		innerSize: { w: number; h: number };
		spaceWidth: number;
		fontSize: number;
		lineSpace: number;
		paragraphSpace: number;
		nextLine: number;
	};
	showItemId?: boolean;
	showFirstname?: boolean;
	showSurname?: boolean;
	doc: JsToPdf;
	inBook: Record<IndiKey, BookItem | undefined>;
	toc: Record<string, TocItem>;
	addToToc?: boolean;
}) => {
	const {
		item,
		itemFormatter,
		x,
		y,
		maxWidth,
		prefix,
		otherSeparator: otherSeparatorProp,
		otherPrefix,
		others = [],
		otherFormatter,
		settings,
		sizes,
		doc,
		toc,
		inBook,
		showItemId,
		showFirstname = true,
		showSurname = true,
		addToToc,
	} = params;
	const { margin, innerSize, lineSpace } = sizes;
	const { nameOrder = "last-first", showSuffix = true } = settings ?? {};
	const left = x;
	let top = y;

	const otherSeparator =
		Array.isArray(otherSeparatorProp) || otherSeparatorProp === undefined
			? otherSeparatorProp
			: [otherSeparatorProp];

	if (otherSeparator && !otherSeparator?.[1]) {
		otherSeparator[1] = otherSeparator?.[0];
	}

	const bookItem = item.id ? inBook[item.id] : undefined;
	if (!bookItem) {
		return { left, top, bottom: top };
	}

	const allItems = ([item] as typeof others).concat(
		others.filter((part) => {
			if (typeof part === "string") {
				return !!part;
			}

			if (!part?.id || !inBook[part.id]) {
				return false;
			}

			return true;
		})
	);

	const mainText: Array<
		| {
				text: string | string[];
				font?: string | string[];
				annotation?: BookItem | Array<undefined | BookItem>;
				suffix?: string;
				lastSuffix?: string;
		  }
		| undefined
	> = [];

	let prefixAdded = false;
	allItems.forEach((part, index) => {
		if (!part) {
			return;
		}

		if (typeof part === "string") {
			mainText.push({ text: part });
			return;
		}

		const { inOrder: name, letter } = nameFormatter(part, settings);

		if (!showFirstname) {
			name[nameOrder === "last-first" ? 2 : 1] = "";
		}
		if (!showSurname) {
			name[nameOrder === "first-last" ? 2 : 1] = "";
		}

		if (!name[1] && !name[2]) {
			return;
		}

		if (addToToc && index === 0) {
			if (letter) {
				if (!toc[letter]) {
					toc[letter] = {
						page: bookItem.page,
						top,
						letter: true,
						count: 1,
					};
				} else {
					toc[letter].count++;
				}
			}

			const usedName = name[1] || name[2];
			if (!toc[usedName]) {
				toc[usedName] = { page: bookItem.page, top, count: 1 };
			} else {
				toc[usedName].count++;
			}
		}

		if (index === 0 && prefix) {
			mainText.push({ text: prefix });
		}

		if (index > 0 && !prefixAdded && otherPrefix) {
			mainText.push({ text: otherPrefix });
			prefixAdded = true;
		}

		mainText.push(
			{ text: showSuffix ? name[0] : "", font: "Arial" },
			{
				text: name[1].split(" "),
				font: nameOrder === "last-first" ? "ArialBold" : "Arial",
			},
			{
				text: name[2].split(" "),
				font: nameOrder === "first-last" ? "ArialBold" : "Arial",
			}
		);

		if (itemFormatter) {
			const itemText = itemFormatter(part);

			if (itemText) {
				mainText.push({ text: itemText, font: "ArialItalic" });
			}
		}

		if (otherFormatter) {
			const otherText = otherFormatter(item, part);

			if (otherText) {
				mainText.push({ text: otherText, font: "ArialItalic" });
			}
		}

		const itemId = part?.id ? inBook[part.id]?.bookItemId : undefined;

		if ((index > 0 || showItemId) && itemId) {
			mainText.push({
				suffix: "",
				lastSuffix: " ",
				text: ["(", itemId, ")"],
				annotation: [undefined, part?.id && inBook[part.id], undefined],
				font: ["Arial", "ArialBold"],
			});
		}

		if (
			otherSeparator?.length &&
			index > 0 &&
			index < allItems.length - 1
		) {
			if (otherSeparator[0] && index < allItems.length - 2) {
				mainText.push({ text: otherSeparator[0] });
			} else if (otherSeparator[1]) {
				mainText.push({ text: otherSeparator[1] });
			}
		}
	});

	let mainTextLeft = left;
	let bottom = top;
	mainText.forEach((text) => {
		const textObj:
			| {
					text: string | string[];
					font?: string | string[];
					annotation?: BookItem | Array<undefined | BookItem>;
					suffix?: string;
					lastSuffix?: string;
			  }
			| undefined = typeof text === "string" ? { text } : text;

		if (!textObj?.text) {
			return;
		}

		if (textObj.suffix === undefined) {
			textObj.suffix = " ";
		}

		if (textObj.lastSuffix === undefined) {
			textObj.lastSuffix = " ";
		}

		if (!Array.isArray(textObj.text)) {
			textObj.text = [textObj.text];
		}

		if (!Array.isArray(textObj.annotation)) {
			textObj.annotation = [textObj.annotation];
		}

		if (!textObj.font) {
			textObj.font = [];
		}

		if (!Array.isArray(textObj.font)) {
			textObj.font = [textObj.font];
		}

		textObj.text.forEach((part, index) => {
			if (!part) {
				return;
			}
			const suffix =
				(index === textObj.text.length - 1
					? textObj.lastSuffix
					: textObj.suffix) ?? " ";
			const font =
				(textObj.font as string[])?.[index] ??
				(textObj.font as string[])?.[0] ??
				undefined;
			const annotation =
				(textObj.annotation as BookItem[])?.[index] ??
				(textObj.annotation as BookItem[])?.[0] ??
				undefined;

			if (font) {
				doc.setFont(font);
			}
			const partDimensions = doc.getTextDimensions(`${part}${suffix}`, {
				maxWidth,
			});

			if (mainTextLeft + partDimensions.w > left + maxWidth) {
				mainTextLeft = left;
				top = top + lineSpace;
			}

			if (top + partDimensions.h > margin.y + innerSize.h) {
				top = margin.y;
				mainTextLeft = left;
				addPage(doc, true, margin, innerSize);
			}

			doc.text(`${part}${suffix}`, mainTextLeft, top, {
				baseline: "top",
				maxWidth,
			});

			if (annotation) {
				annotation.annotations.push({
					page: doc.getCurrentPageInfo().pageNumber,
					x: mainTextLeft,
					y: top,
					w: partDimensions.w,
					h: partDimensions.h,
				});
			}

			mainTextLeft = mainTextLeft + partDimensions.w;
			bottom = top + partDimensions.h;
		});
	});
	return { left: mainTextLeft, top, bottom };
};

const printFact = (params: {
	label: string;
	fact: Common;
	x: number;
	y: number;
	maxWidth: number;
	settings?: Settings;
	sizes: {
		margin: { x: number; y: number };
		innerSize: { w: number; h: number };
		spaceWidth: number;
		fontSize: number;
		lineSpace: number;
		paragraphSpace: number;
		nextLine: number;
	};
	doc: JsToPdf;
}) => {
	const { label, fact, x, y, maxWidth, sizes, doc } = params;

	const { margin, innerSize, lineSpace } = sizes;
	const left = x;
	let top = y;

	const factPlace = placeTranslator(
		fact.get("PLAC")?.toValue() as string | undefined
	);

	let note = fact.get("NOTE")?.toValue() as string | undefined;
	if (
		note?.toLowerCase()?.includes("marital status") ||
		note?.toLowerCase()?.includes("relation to head")
	) {
		note = undefined;
	}

	const value = (fact.toValue() || note) as string | undefined;

	if (!value && !factPlace) {
		return;
	}

	const factDate = noteDateFormatter(
		fact.get("DATE"),
		i18n.t("dateFormat"),
		"",
		false
	) as string | undefined;

	const valueString = `${value ?? ""}${
		factPlace ? `${value ? "   " : ""}${factPlace}` : ""
	}`;

	const mainText: Array<
		| {
				text: string | string[];
				font?: string | string[];
				annotation?: BookItem | Array<undefined | BookItem>;
				suffix?: string;
				lastSuffix?: string;
		  }
		| undefined
	> = [
		factDate ? { text: factDate, font: "Arial" } : undefined,
		{ text: label, font: "ArialBold" },
		valueString ? { text: valueString, font: "Arial" } : undefined,
	];

	let mainTextLeft = left;
	let bottom = top;
	mainText.forEach((text) => {
		if (!text) {
			return;
		}
		const textObj:
			| {
					text: string | string[];
					font?: string | string[];
					annotation?: BookItem | Array<undefined | BookItem>;
					suffix?: string;
					lastSuffix?: string;
			  }
			| undefined = typeof text === "string" ? { text } : text;

		if (!textObj?.text) {
			return;
		}

		if (textObj.suffix === undefined) {
			textObj.suffix = " ";
		}

		if (textObj.lastSuffix === undefined) {
			textObj.lastSuffix = " ";
		}

		if (!Array.isArray(textObj.text)) {
			textObj.text = [textObj.text];
		}

		if (!Array.isArray(textObj.annotation)) {
			textObj.annotation = [textObj.annotation];
		}

		if (!textObj.font) {
			textObj.font = [];
		}

		if (!Array.isArray(textObj.font)) {
			textObj.font = [textObj.font];
		}

		textObj.text.forEach((part, index) => {
			if (!part) {
				return;
			}
			const suffix =
				(index === textObj.text.length - 1
					? textObj.lastSuffix
					: textObj.suffix) ?? " ";
			const font =
				(textObj.font as string[])?.[index] ??
				(textObj.font as string[])?.[0] ??
				undefined;
			const annotation =
				(textObj.annotation as BookItem[])?.[index] ??
				(textObj.annotation as BookItem[])?.[0] ??
				undefined;

			if (font) {
				doc.setFont(font);
			}
			const partDimensions = doc.getTextDimensions(`${part}${suffix}`, {
				maxWidth,
			});

			if (mainTextLeft + partDimensions.w > left + maxWidth) {
				mainTextLeft = left;
				top = top + lineSpace;
			}

			if (top + partDimensions.h > margin.y + innerSize.h) {
				top = margin.y;
				mainTextLeft = left;
				addPage(doc, true, margin, innerSize);
			}

			doc.text(`${part}${suffix}`, mainTextLeft, top, {
				baseline: "top",
				maxWidth,
			});

			if (annotation) {
				annotation.annotations.push({
					page: doc.getCurrentPageInfo().pageNumber,
					x: mainTextLeft,
					y: top,
					w: partDimensions.w,
					h: partDimensions.h,
				});
			}

			mainTextLeft = mainTextLeft + partDimensions.w;
			bottom = top + partDimensions.h;
		});
	});
	return { left: mainTextLeft, top, bottom };
};

const printDate = (params: {
	date: string;
	x: number;
	origX?: number;
	y: number;
	place?: string;
	settings?: Settings;
	parsePrefix?: boolean;
	sizes: {
		margin: { x: number; y: number };
		innerSize: { w: number; h: number };
		spaceWidth: number;
		fontSize: number;
		lineSpace: number;
		paragraphSpace: number;
		nextLine: number;
		maxWidth: number;
		dateSpace?: number;
	};
	preCheckLeft?: boolean;
	postCheckLeft?: boolean;
	doc: JsToPdf;
	places: Record<string, TocItem>;
}) => {
	const {
		doc,
		date: rawDate,
		x,
		y,
		place,
		sizes,
		postCheckLeft,
		preCheckLeft,
		origX,
		parsePrefix,
		places,
	} = params;

	if (!rawDate && !place) {
		return { left: x, top: y };
	}

	const {
		margin,
		innerSize,
		maxWidth,
		lineSpace,
		paragraphSpace,
		nextLine,
		dateSpace = 40,
	} = sizes;
	const left = origX !== undefined ? origX : x;
	const prefix = parsePrefix && rawDate.match(/^[*†∞]/)?.[0];
	const date = (
		!prefix ? rawDate : rawDate.replace(new RegExp(`^\\${prefix}`), "")
	).replace(/DECEASED/i, "?");

	let top = y;
	let dateLeft = x;
	const translatedPlace = placeTranslator(place);
	const dateString = `${date}${
		translatedPlace ? `   ${translatedPlace}` : ""
	}`;
	const dateDimension = doc.getTextDimensions(dateString, {
		maxWidth,
	});

	if (translatedPlace) {
		if (!places[translatedPlace]) {
			places[translatedPlace] = { page: 0, top, count: 1 };
		} else {
			places[translatedPlace].count++;
		}
	}

	if (preCheckLeft) {
		if (dateLeft + dateDimension.w > left + maxWidth && dateLeft !== left) {
			dateLeft = left;
			top = top + paragraphSpace;
		}
	}

	if (top + dateDimension.h > margin.y + innerSize.h) {
		top = margin.y;
		addPage(doc, true, margin, innerSize);
	}

	if (prefix) {
		doc.text(prefix, dateLeft, top, {
			baseline: "top",
			maxWidth,
		});
		dateLeft = dateLeft + 10;
	}

	doc.text(dateString, dateLeft, top, {
		baseline: "top",
		maxWidth,
	});

	if (postCheckLeft) {
		if (dateLeft + dateDimension.w > left + maxWidth / 2) {
			top = top + dateDimension.h + lineSpace;
			dateLeft = left;
		} else {
			dateLeft = dateLeft + dateDimension.w + dateSpace;
		}
	} else if (!preCheckLeft) {
		top = top + dateDimension.h + nextLine;
	}

	return { top, left: dateLeft };
};

export const book = async (
	gedcom?: GedComType,
	output: "print" | "blob" | "url" = "blob",
	settings?: Settings,
	indis?: IndiKey[],
	printSize: PrintSize | "A5" = "A5",
	title?: string
) => {
	const name =
		title ||
		gedcom?.getTreeName() ||
		gedcom?.getTreeId() ||
		t("Family Book");

	const usedGedcom = indis ? gedcom?.toFiltered(indis) : gedcom;

	const { w: width, h: height } = printSizes[printSize];
	const margin = {
		x: printSizes[printSize].w * 0.05,
		y: printSizes[printSize].h * 0.07,
	};
	const innerSize = { w: width - margin.x * 2, h: height - margin.y * 2 };
	const spaceWidth = 20;
	const fontSize = 16;
	const tocFontSize = 12;
	const indexFontSize = 12;
	const lineSpace = fontSize * 0.85;
	const paragraphSpace = fontSize * 1.4;
	const tocParagraphSpace = tocFontSize * 1.4;
	const indexParagraphSpace = indexFontSize * 1.4;
	const nextLine = fontSize * 0.1;

	const doc = new JsToPdf({
		orientation: width > height ? "landscape" : "portrait",
		unit: "px",
		format: [width, height],
	});

	const inBook: Record<IndiKey, BookItem | undefined> = {};
	const toc: Record<string, TocItem> = {};
	const places: Record<string, TocItem> = {};

	// Blank page for Cover
	doc.addPage();

	doc.setDocumentProperties({
		title: `${name ? `${name} - ` : ""}Family Book`,
		keywords: "family book",
		creator: "Family Tree Visualizer",
		author: "Family Tree Visualizer",
	});
	doc.addFileToVFS("Arial.ttf", Arial);
	doc.addFont("Arial.ttf", "Arial", "normal");
	doc.addFileToVFS("ArialBold.ttf", ArialBold);
	doc.addFont("ArialBold.ttf", "ArialBold", "normal");
	doc.addFileToVFS("ArialItalic.ttf", ArialItalic);
	doc.addFont("ArialItalic.ttf", "ArialItalic", "normal");

	doc.addFileToVFS("TimesNewRoman.ttf", TimesNewRoman);
	doc.addFont("TimesNewRoman.ttf", "TimesNewRoman", "normal");
	doc.addFileToVFS("TimesNewRomanBold.ttf", TimesNewRomanBold);
	doc.addFont("TimesNewRomanBold.ttf", "TimesNewRomanBold", "normal");

	doc.setFont("TimesNewRomanBold");
	doc.setFontSize(70);

	doc.text(name, width / 2, margin.y + height / 4, {
		maxWidth: innerSize.w,
		align: "center",
	});

	doc.setFont("Arial");
	doc.setFontSize(30);

	doc.text(
		`${new Date().getFullYear()}.`,
		width / 2,
		height - margin.y - height / 6,
		{
			maxWidth: innerSize.w,
			align: "center",
		}
	);

	addPage(doc, true, margin, innerSize);

	const indisOrdered = usedGedcom
		?.indis()
		?.filter((item) => !item.isNonRelevantMember())
		?.orderBy(getNameAscAndBirth(settings?.nameOrder));

	const bookItemIdLength = `${indisOrdered?.length || 0}`.length;
	let bookItemId = 1;
	indisOrdered?.forEach((item) => {
		if (!item.id) {
			return;
		}

		const currentBookItemId = `${bookItemId++}`.padStart(
			bookItemIdLength,
			"0"
		);

		inBook[item.id] = {
			inBook: false,
			page: doc.getCurrentPageInfo().pageNumber,
			bookItemId: currentBookItemId,
			top: 0,
			annotations: [],
		};
	});

	let itemTop = margin.y;
	indisOrdered?.forEach((item) => {
		const bookItem = item.id ? inBook[item.id] : undefined;
		if (!bookItem || bookItem?.inBook) {
			return;
		}

		bookItem.inBook = true;

		const idLeft = margin.x;

		doc.setFont("Arial");
		doc.setFontSize(fontSize);

		const idDimensions = doc.getTextDimensions(bookItem.bookItemId, {
			maxWidth: innerSize.w,
		});

		if (itemTop + idDimensions.h > margin.y + innerSize.h) {
			itemTop = margin.y;
			addPage(doc, true, margin, innerSize);
		}

		bookItem.page = doc.getCurrentPageInfo().pageNumber;
		bookItem.top = itemTop;
		doc.text(bookItem.bookItemId, idLeft, itemTop, {
			baseline: "top",
			maxWidth: innerSize.w,
		});

		const nameLeft = idLeft + idDimensions.w + spaceWidth;
		const contentMaxWidth = innerSize.w - margin.x - nameLeft;

		const response = printName({
			item,
			x: nameLeft,
			y: itemTop,
			maxWidth: contentMaxWidth,
			otherSeparator: [",", t("and")],
			otherPrefix: `   ${t("parents")}:`,
			others: Object.values(item.getFathers().toList().items).concat(
				Object.values(item.getMothers().toList().items)
			) as Array<IndiType | undefined>,
			otherFormatter,
			settings,
			sizes: {
				margin,
				innerSize,
				spaceWidth,
				fontSize,
				lineSpace,
				paragraphSpace,
				nextLine,
			},
			doc,
			inBook,
			toc,
			addToToc: true,
		});
		itemTop = response.top;
		const lastBottom = response.bottom;

		let dateLeft = nameLeft;
		const {
			birth: rawBirth,
			birthPlace,
			death: rawDeath,
			deathPlace,
		} = dateFormatter(item, false, true, true, false);

		const birth = rawBirth || (birthPlace ? "*?" : "");
		const death = rawDeath || (deathPlace ? "†?" : "");

		doc.setFont("Arial");
		doc.setFontSize(fontSize);

		const childrenFamilies = item
			.getChildren()
			.filter((item) => {
				return Boolean(item.id ? inBook[item.id] : undefined);
			})
			.orderBy(AGE_ASC)
			.splitByFamily("Children", item);
		const spousesFamilies = item
			.getSpouses()
			.filter((item) => {
				return Boolean(item.id ? inBook[item.id] : undefined);
			})
			.splitByFamily("Spouses", item);

		if (birth || death) {
			itemTop = lastBottom - lineSpace + paragraphSpace;
		}

		const birthDateResponse = printDate({
			date: birth,
			postCheckLeft: !!death,
			preCheckLeft: !death,
			x: nameLeft,
			y: itemTop,
			place: birthPlace,
			settings,
			sizes: {
				maxWidth: contentMaxWidth,
				margin,
				innerSize,
				spaceWidth,
				fontSize,
				lineSpace,
				paragraphSpace,
				nextLine,
			},
			doc,
			places,
		});
		itemTop = birthDateResponse.top;
		dateLeft = birthDateResponse.left;

		if (death) {
			const deathDateResponse = printDate({
				date: death,
				preCheckLeft: true,
				x: dateLeft,
				origX: nameLeft,
				y: itemTop,
				place: deathPlace,
				settings,
				sizes: {
					maxWidth: contentMaxWidth,
					margin,
					innerSize,
					spaceWidth,
					fontSize,
					lineSpace,
					paragraphSpace,
					nextLine,
				},
				doc,
				places,
			});

			itemTop = deathDateResponse.top;
		}

		const existedFamilies: Record<string, boolean> = {};
		const families = Object.keys(spousesFamilies.items ?? {})
			.concat(Object.keys(childrenFamilies.items ?? {}))
			.map((id) => {
				if (existedFamilies[id]) {
					return null;
				}

				existedFamilies[id] = true;

				const family = usedGedcom?.fam(id as FamKey);

				return {
					marriageDate: noteDateFormatter(
						family?.MARR?.DATE,
						t("dateFormat"),
						"∞",
						false
					),
					marriageSortDate: noteDateFormatter(
						family?.MARR?.DATE,
						"yyyyMMdd",
						"",
						false,
						false
					),
					marriagePlace: family?.MARR?.PLAC?.value,
					children: childrenFamilies.items[id as FamKey],
					spouse: spousesFamilies.items[id as FamKey]?.index(0),
				};
			});
		const sortedFamilies = families.filter(Boolean).sort((a, b) => {
			return (
				a?.marriageSortDate?.localeCompare(b?.marriageSortDate ?? "") ??
				0
			);
		}) as Array<NonNullable<(typeof families)[number]>>;

		sortedFamilies.forEach((family, idx) => {
			const {
				marriageDate,
				marriagePlace,
				spouse: famSpouse,
				children,
			} = family;

			let spouse = famSpouse;
			if (!spouse?.id || !inBook[spouse.id]) {
				spouse = undefined;
			}

			const spouseInBook = spouse?.id && inBook[spouse.id];

			if (marriageDate || spouse || children?.length) {
				if (idx === 0 && !birth && !death) {
					itemTop = lastBottom - lineSpace + paragraphSpace;
				} else {
					itemTop = itemTop + paragraphSpace;
				}
			}

			let hasMarriage = false;

			if (marriageDate || spouse) {
				hasMarriage = true;
				const marriageDateResponse = printDate({
					date: marriageDate ?? "∞?",
					x: nameLeft,
					y: itemTop,
					place: marriagePlace,
					settings,
					sizes: {
						maxWidth: contentMaxWidth,
						margin,
						innerSize,
						spaceWidth,
						fontSize,
						lineSpace,
						paragraphSpace,
						nextLine,
					},
					doc,
					places,
				});

				if (spouseInBook) {
					itemTop = marriageDateResponse.top;
				}
			}

			let hasSpouse = false;
			if (spouseInBook && spouse) {
				hasSpouse = true;
				const spouseResponse = printName({
					item: spouse,
					x: nameLeft,
					y: itemTop,
					showItemId: true,
					prefix: `   ${t("spouse")}:`,
					maxWidth: contentMaxWidth,
					settings,
					sizes: {
						margin,
						innerSize,
						spaceWidth,
						fontSize,
						lineSpace,
						paragraphSpace,
						nextLine,
					},
					doc,
					inBook,
					toc,
				});

				itemTop = spouseResponse.top;
			}

			let labelAdded = false;
			const childLeft = nameLeft;
			children?.forEach((famChild, _, childIndex) => {
				const child = famChild;

				if (!child?.id || !inBook[child.id]) {
					return;
				}

				const labelDimension = doc.getTextDimensions(
					`   ${t("children")}: `,
					{
						maxWidth: contentMaxWidth,
					}
				);
				if (!labelAdded) {
					if (hasSpouse || hasMarriage) {
						itemTop = itemTop + lineSpace;
					}
				}

				const childResponse = printName({
					item: child,
					itemFormatter: (indi1: IndiType) => {
						return otherFormatter(item, indi1);
					},
					showItemId: true,
					showSurname: false,
					prefix: !labelAdded ? `   ${t("children")}:` : undefined,
					x: childLeft + (!labelAdded ? 0 : labelDimension.w),
					y: itemTop,
					maxWidth: contentMaxWidth,
					settings,
					sizes: {
						margin,
						innerSize,
						spaceWidth,
						fontSize,
						lineSpace,
						paragraphSpace,
						nextLine,
					},
					doc,
					inBook,
					toc,
				});

				labelAdded = true;
				itemTop = childResponse.top;
				dateLeft = childResponse.left;

				const { birth: childBirth, death: childDeath } = dateFormatter(
					child,
					false,
					true,
					false,
					false
				);

				const childBirthDate = printDate({
					date: childBirth,
					postCheckLeft: true,
					x: dateLeft + 10,
					y: itemTop,
					settings,
					sizes: {
						maxWidth: contentMaxWidth,
						dateSpace: 5,
						margin,
						innerSize,
						spaceWidth,
						fontSize,
						lineSpace,
						paragraphSpace,
						nextLine,
					},
					doc,
					places,
				});

				itemTop = childBirthDate.top;
				dateLeft = childBirthDate.left;

				const deathDateResponse = printDate({
					date: childDeath,
					preCheckLeft: true,
					x: dateLeft,
					origX: nameLeft,
					y: itemTop,
					settings,
					sizes: {
						maxWidth: contentMaxWidth,
						margin,
						innerSize,
						spaceWidth,
						fontSize,
						lineSpace,
						paragraphSpace,
						nextLine,
					},
					doc,
					places,
				});
				itemTop = deathDateResponse.top;
				dateLeft = deathDateResponse.left;

				if (
					idx < sortedFamilies.length - 1 ||
					childIndex < children.length - 1
				) {
					itemTop = itemTop + lineSpace;
				}
			});
		});

		itemTop += 30;

		const facts = item.getFacts();

		if (facts.length) {
			doc.text(t("Other facts"), nameLeft, itemTop, {
				baseline: "top",
				maxWidth: innerSize.w,
			});
			itemTop = itemTop + paragraphSpace;

			facts.forEach((currentFact) => {
				const label = (currentFact.get("_LABEL")?.toValue() ||
					"") as string;

				const response = printFact({
					label: t(label),
					fact: currentFact,
					x: nameLeft,
					y: itemTop,
					maxWidth: contentMaxWidth,
					settings,
					sizes: {
						margin,
						innerSize,
						spaceWidth,
						fontSize,
						lineSpace,
						paragraphSpace,
						nextLine,
					},
					doc,
				});

				if (response) {
					itemTop = response.bottom - lineSpace + paragraphSpace;
				}
			});

			itemTop += 30;
		}
	});

	addPage(doc, false, margin, innerSize);

	doc.setFont("TimesNewRomanBold");
	doc.setFontSize(50);

	doc.text(t("Table of Contents"), width / 2, margin.y, {
		maxWidth: innerSize.w,
		align: "center",
		baseline: "top",
	});
	doc.setLineDashPattern([1, 1], 2);
	doc.line(
		margin.x + innerSize.w / 2,
		margin.y + 50,
		margin.x + innerSize.w / 2,
		margin.y + innerSize.h
	);

	let tocTop = margin.y + 50;
	let tocColumn = 0;
	Object.entries(toc).forEach(([name, { count, page, top, letter }]) => {
		if (!name) {
			return;
		}

		if (letter) {
			doc.setFont("TimesNewRomanBold");
			doc.setFontSize(tocFontSize * 2);
		} else {
			doc.setFont("Arial");
			doc.setFontSize(tocFontSize);
		}

		const pageText = `${page - 1}.`;
		const countText = `(${count || 1} ${t("persons")})`;
		const nameDimensions = doc.getTextDimensions(name, {
			maxWidth: innerSize.w,
		});

		doc.setFont("Arial");
		doc.setFontSize(tocFontSize);
		const pageDimensions = doc.getTextDimensions(pageText, {
			maxWidth: innerSize.w,
		});
		const countDimensions = doc.getTextDimensions(countText, {
			maxWidth: innerSize.w,
		});

		if (tocTop + nameDimensions.h > margin.y + innerSize.h) {
			tocTop = margin.y + 50;

			if (!tocColumn) {
				tocColumn = 1;
			} else {
				tocColumn = 0;
				addPage(doc, false, margin, innerSize);

				doc.setFont("TimesNewRomanBold");
				doc.setFontSize(50);
				doc.text(t("Table of Contents"), width / 2, margin.y, {
					maxWidth: innerSize.w,
					align: "center",
					baseline: "top",
				});
				doc.setLineDashPattern([1, 1], 2);
				doc.line(
					margin.x + innerSize.w / 2,
					margin.y + 50,
					margin.x + innerSize.w / 2,
					margin.y + innerSize.h
				);
			}
		}

		if (letter) {
			doc.setFont("TimesNewRomanBold");
			doc.setFontSize(tocFontSize * 2);
		} else {
			doc.setFont("Arial");
			doc.setFontSize(tocFontSize);
		}

		const tocLeft = margin.x + (tocColumn ? innerSize.w / 2 + 10 : 0);

		doc.text(name, tocLeft, tocTop, {
			baseline: "top",
			maxWidth: innerSize.w / 2 - 20,
		});

		doc.setFont("Arial");
		doc.setFontSize(tocFontSize);

		doc.text(
			countText,
			tocLeft + nameDimensions.w + 2,
			letter
				? tocTop + nameDimensions.h - countDimensions.h * 1.2
				: tocTop,
			{
				baseline: "top",
				align: "left",
				maxWidth: innerSize.w / 2 - nameDimensions.w,
			}
		);

		doc.text(
			pageText,
			tocLeft + innerSize.w / 2 - 10,
			letter
				? tocTop + nameDimensions.h - pageDimensions.h * 1.2
				: tocTop,
			{
				baseline: "top",
				align: "right",
				maxWidth: innerSize.w,
			}
		);
		doc.setLineDashPattern([1, 1], 2);
		doc.line(
			tocLeft + nameDimensions.w + 4 + countDimensions.w,
			tocTop + nameDimensions.h - 2,
			tocLeft + innerSize.w / 2 - 10 - pageDimensions.w - 2,
			tocTop + nameDimensions.h - 2
		);

		doc.createAnnotation({
			contents: "",
			type: "link",
			pageNumber: page,
			top,
			bounds: {
				x: tocLeft,
				y: tocTop,
				w: innerSize.w / 2 - 10,
				h: nameDimensions.h,
			},
		});
		tocTop =
			tocTop + (letter ? tocParagraphSpace * 1.2 : tocParagraphSpace);
	});
	addPage(doc, false, margin, innerSize);

	doc.setFont("TimesNewRomanBold");
	doc.setFontSize(50);

	doc.text(t("Index"), width / 2, margin.y, {
		maxWidth: innerSize.w,
		align: "center",
		baseline: "top",
	});

	doc.setLineDashPattern([1, 1], 2);
	doc.line(
		margin.x + innerSize.w / 2,
		margin.y + 50,
		margin.x + innerSize.w / 2,
		margin.y + innerSize.h
	);

	let indexTop = margin.y + 50;
	let indexColumn = 0;
	const letters: Record<string, boolean | undefined> = {};
	indisOrdered?.forEach((item) => {
		const bookItem = item.id ? inBook[item.id] : undefined;
		if (!bookItem?.inBook) {
			return;
		}

		const { top, page } = bookItem;
		const { inOrder, letter } = nameFormatter(item, settings);

		const name = inOrder.filter(Boolean).join(" ");

		if (!name) {
			return;
		}

		let newLetter = false;
		if (!letters[letter]) {
			newLetter = true;

			letters[letter] = true;
		}

		const date = dateFormatter(item, true, false, false, false).inOrder;

		const text = `${name}${date ? ` (${date})` : ""}`;

		doc.setFont("Arial");
		doc.setFontSize(indexFontSize);

		const pageText = `${page - 1}.`;
		const textDimensions = doc.getTextDimensions(text, {
			maxWidth: innerSize.w / 2 - 20,
		});

		const pageDimensions = doc.getTextDimensions(pageText, {
			maxWidth: innerSize.w / 2 - 20,
		});

		if (newLetter) {
			doc.setFont("TimesNewRomanBold");
			doc.setFontSize(indexFontSize * 2);

			const letterDimensions = doc.getTextDimensions(letter, {
				maxWidth: innerSize.w / 2 - 20,
			});

			if (indexTop + letterDimensions.h > margin.y + innerSize.h) {
				indexTop = margin.y + 50;

				if (!indexColumn) {
					indexColumn = 1;
				} else {
					indexColumn = 0;
					addPage(doc, false, margin, innerSize);

					doc.setFont("TimesNewRomanBold");
					doc.setFontSize(50);
					doc.text(t("Index"), width / 2, margin.y, {
						maxWidth: innerSize.w,
						align: "center",
						baseline: "top",
					});
					doc.setLineDashPattern([1, 1], 2);
					doc.line(
						margin.x + innerSize.w / 2,
						margin.y + 50,
						margin.x + innerSize.w / 2,
						margin.y + innerSize.h
					);
				}
			}

			const letterLeft =
				margin.x + (indexColumn ? innerSize.w / 2 + 10 : 0);
			doc.setFont("TimesNewRomanBold");
			doc.setFontSize(indexFontSize * 2);
			doc.text(letter, letterLeft, indexTop, {
				baseline: "top",
				maxWidth: innerSize.w / 2 - 20,
			});
			indexTop = indexTop + indexParagraphSpace * 1.2;
		}

		if (indexTop + textDimensions.h > margin.y + innerSize.h) {
			indexTop = margin.y + 50;

			if (!indexColumn) {
				indexColumn = 1;
			} else {
				indexColumn = 0;
				addPage(doc, false, margin, innerSize);

				doc.setFont("TimesNewRomanBold");
				doc.setFontSize(50);
				doc.text(t("Index"), width / 2, margin.y, {
					maxWidth: innerSize.w,
					align: "center",
					baseline: "top",
				});
				doc.setLineDashPattern([1, 1], 2);
				doc.line(
					margin.x + innerSize.w / 2,
					margin.y + 50,
					margin.x + innerSize.w / 2,
					margin.y + innerSize.h
				);
			}
		}
		const nameLeft = margin.x + (indexColumn ? innerSize.w / 2 + 10 : 0);

		doc.setFont("Arial");
		doc.setFontSize(indexFontSize);

		doc.text(text, nameLeft, indexTop, {
			baseline: "top",
			maxWidth: innerSize.w / 2 - 20,
		});

		doc.text(pageText, nameLeft + innerSize.w / 2 - 10, indexTop, {
			baseline: "top",
			align: "right",
			maxWidth: innerSize.w / 2,
		});
		doc.setLineDashPattern([1, 1], 2);
		doc.line(
			nameLeft + textDimensions.w + 2,
			indexTop + textDimensions.h - 2,
			nameLeft + innerSize.w / 2 - 10 - pageDimensions.w - 2,
			indexTop + textDimensions.h - 2
		);

		doc.createAnnotation({
			contents: "",
			type: "link",
			pageNumber: page,
			top,
			bounds: {
				x: nameLeft,
				y: indexTop,
				w: innerSize.w / 2 - 10,
				h: textDimensions.h,
			},
		});

		indexTop = indexTop + indexParagraphSpace;
	});

	Object.values(inBook).forEach((bookItem) => {
		bookItem?.annotations.forEach((annotation) => {
			doc.setPage(annotation.page);
			doc.createAnnotation({
				contents: "",
				type: "link",
				pageNumber: bookItem.page,
				top: bookItem.top,
				bounds: annotation,
			});
		});
	});

	const mmInPix = 3.7795275591;
	const paperWidth = 0.1 * mmInPix;
	const spineWidth = doc.getNumberOfPages() * paperWidth;

	const coverSize = { w: width * 2 + spineWidth, h: height };

	doc.deletePage(1); // Delete blank page
	doc.addPage(
		[coverSize.w, coverSize.h],
		coverSize.w > coverSize.h ? "landscape" : "portrait"
	);
	doc.movePage(doc.getCurrentPageInfo().pageNumber, 1);

	const bg = await downloadImg("/bg.jpg");
	doc.addImage(
		bg.img.src,
		"JPEG",
		-20,
		-20,
		coverSize.w + 40,
		coverSize.h + 40,
		"",
		"FAST"
	);

	const cover = await downloadImg("/cover-white.png");

	const imgMaxWidth = width * 0.6;
	const imgMaxHeight = height * 0.5;

	const widthScale = imgMaxWidth / cover.img.naturalWidth;
	const heightScale = imgMaxHeight / cover.img.naturalWidth;

	let newImgWidth = imgMaxWidth;
	let newImgHeight = cover.img.naturalHeight * widthScale;

	if (newImgHeight > imgMaxHeight) {
		newImgWidth = cover.img.naturalWidth * heightScale;
		newImgHeight = imgMaxHeight;
	}

	const imgTop = height / 2 - newImgHeight / 1.25;
	const coverLeft = width + spineWidth;
	doc.addImage(
		cover.img.src,
		"PNG",
		coverLeft + width / 2 - newImgWidth / 2,
		imgTop,
		newImgWidth,
		newImgHeight,
		"",
		"FAST"
	);

	doc.setTextColor("white");
	doc.setFont("TimesNewRomanBold");
	doc.setFontSize(70);

	doc.text(name, coverLeft + width / 2, height - margin.y - 150, {
		maxWidth: innerSize.w,
		align: "center",
	});

	if (spineWidth >= mmInPix * 5) {
		let spineFontSize = spineWidth * 0.8;

		while (spineFontSize > 2) {
			doc.setFontSize(spineFontSize);

			const spineTextDimension = doc.getTextDimensions(name);

			if (spineTextDimension.w < height * 0.8) {
				doc.text(
					name,
					width +
						spineWidth / 2 -
						spineTextDimension.h / 2 +
						spineWidth * 0.1,
					height / 2 + spineTextDimension.w / 2,
					{
						maxWidth: height,
						angle: 90,
					}
				);
				break;
			}

			spineFontSize = spineFontSize - 2;
		}
	}

	doc.setFont("Arial");
	doc.setFontSize(30);

	doc.text(
		`${new Date().getFullYear()}.`,
		coverLeft + width / 2,
		height - margin.y - 40,
		{
			maxWidth: innerSize.w,
			align: "center",
		}
	);

	const backText = t(
		// eslint-disable-next-line max-len
		"This family book is created by Family Tree Visualiser. There are {{indiCount}} individuals represented with their connections, dates and places of birth, death and marriage.",
		{ indiCount: Object.keys(inBook).length }
	);

	doc.setFont("TimesNewRomanBold");
	doc.setFontSize(50);

	doc.text(name, margin.x, height / 4, {
		maxWidth: innerSize.w,
		align: "left",
	});

	doc.setFont("Arial");
	doc.setFontSize(30);

	const sortedSurnames = Object.entries(toc)
		.sort(([_ak, a], [_bk, b]) => (b?.count ?? 0) - (a?.count ?? 0))
		.reduce<string[]>((acc, [name, value]) => {
			if (value.letter) {
				return acc;
			}

			return [...acc, `${name} (${value.count})`];
		}, [])
		.slice(0, 10);

	const surnamesText = t("The most common surnames: {{surnames}}", {
		surnames: sortedSurnames.join(", "),
	});

	const sortedPlaces = Object.entries(places)
		.sort(([_ak, a], [_bk, b]) => (b?.count ?? 0) - (a?.count ?? 0))
		.reduce<string[]>((acc, [place, value]) => {
			if (value.letter) {
				return acc;
			}

			return [...acc, `${place} (${value.count})`];
		}, [])
		.slice(0, 10);

	const placesText = t("The most common places: {{places}}", {
		places: sortedPlaces.join(", "),
	});

	doc.text(
		[backText, surnamesText, placesText].join("\n\n"),
		margin.x,
		height / 4 + 40,
		{
			maxWidth: innerSize.w,
			align: "justify",
		}
	);

	const qr = await downloadImg("/qr.jpg");

	const qrMaxSize = width * 0.2;

	doc.addImage(
		qr.img.src,
		"JPEG",
		width / 2 - qrMaxSize / 2,
		height - margin.y - 40 - qrMaxSize,
		qrMaxSize,
		qrMaxSize,
		"",
		"FAST"
	);

	if (output === "print") {
		if (isDev) {
			doc.output("dataurlnewwindow");
		} else {
			printPdf(doc.output("blob"));
		}
	}
	if (output === "url") {
		doc.output("dataurlnewwindow");
	}
	if (output === "blob") {
		return doc.output("blob");
	}
};
