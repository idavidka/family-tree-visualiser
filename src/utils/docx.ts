import { type Settings } from "../store/main/reducers";
import { type FamKey, type IndiKey } from "../types/types";
import { type Position, type Size } from "../types/graphic-types";
import { dateFormatter, noteDateFormatter } from "./date-formatter";
import { isDevelopment } from "./get-product-details";
import { nameFormatter } from "./name-formatter";
import { type GedComType } from "../classes/gedcom/classes/gedcom";
import { AGE_ASC, getNameAscAndBirth } from "../constants/orders";
import { type IndiType } from "../classes/gedcom/classes/indi";
import i18n from "../translation/i18n";
import { placeTranslator } from "./place-translator";
import { type Common } from "../classes/gedcom/classes/common";
import {
	AlignmentType,
	Document,
	HeadingLevel,
	Packer,
	PageOrientation,
	Paragraph,
	TextRun,
	Footer,
	Header,
	PageNumber,
	type ISectionOptions,
	TabStopType,
	Tab,
	Bookmark,
	InternalHyperlink,
	type IParagraphOptions,
	type ParagraphChild,
	type ISectionPropertiesOptions,
	ImageRun,
	HorizontalPositionAlign,
	VerticalPositionAlign,
	LevelFormat,
	LastRenderedPageBreak,
	type AbstractNumbering,
	NumberFormat,
} from "docx";
import { PageReference } from "./docx-utils/page-reference";
import { NumberReference } from "./docx-utils/number-reference";
import get from "lodash/get";
import {
	CustomNumFormat,
	CustomNumberFormat,
	type NumFormat,
} from "./docx-utils/level";
import { blobToBase64 } from "./blob-to-base64";

interface Font {
	f: string;
	b?: boolean;
	i?: boolean;
}

const _isDev = isDevelopment();

interface DocImage {
	uri: string;
	img: ArrayBuffer;
	size: Size;
}
const images: Record<string, DocImage> = {};

const downloadImg = async (imgUri: string): Promise<DocImage> => {
	if (images[imgUri]) {
		return images[imgUri];
	}

	const imgResponse = await fetch(imgUri);
	const imageBlob = await imgResponse.blob();
	const imageBuffer = await imageBlob.arrayBuffer();
	const image = await createImageBitmap(imageBlob);
	const uri = await blobToBase64(imageBlob);

	images[imgUri] = {
		uri,
		img: imageBuffer,
		size: { w: image.width, h: image.height },
	};

	image.close();

	return images[imgUri];
};

const t = i18n.t;

const DEFAULT_FONT_SIZE = 26;
const LETTER_FONT_SIZE = 38;
const HEADER_FONT_SIZE = 56;
const SUBTITLE_FONT_SIZE = 72;
const TITLE_FONT_SIZE = 104;

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
	id: string;
	letter?: boolean;
	page: number;
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

const getSpacing = (spacing: number) => {
	return spacing * 7.2;
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
	prefix?: string;
	otherSeparator?: string | string[];
	otherPrefix?: string;
	others?: Array<string | IndiType | undefined>;
	otherFormatter?: (indi1: IndiType, indi2: IndiType) => string;
	settings?: Settings;
	showItemId?: boolean;
	showFirstname?: boolean;
	showSurname?: boolean;
	inBook: Record<IndiKey, BookItem | undefined>;
	toc: Record<string, TocItem>;
	addToToc?: boolean;
	font?: string;
}): Array<TextRun | InternalHyperlink> => {
	const {
		item,
		itemFormatter,
		prefix,
		otherSeparator: otherSeparatorProp,
		otherPrefix,
		others = [],
		otherFormatter,
		settings,
		toc,
		inBook,
		showItemId,
		showFirstname = true,
		showSurname = true,
		addToToc,
		font,
	} = params;
	const { nameOrder = "last-first", showSuffix = true } = settings ?? {};

	const otherSeparator =
		Array.isArray(otherSeparatorProp) || otherSeparatorProp === undefined
			? otherSeparatorProp
			: [otherSeparatorProp];

	if (otherSeparator && !otherSeparator?.[1]) {
		otherSeparator[1] = otherSeparator?.[0];
	}

	const bookItem = item.id ? inBook[item.id] : undefined;
	if (!bookItem) {
		return [];
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
				text: string | Array<string | NumberReference>;
				font?: Font | Font[];
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
						id: bookItem.bookItemId,
						page: bookItem.page,
						letter: true,
						count: 1,
					};
				} else {
					toc[letter].count++;
				}
			}

			const usedName = name[1] || name[2];
			if (!toc[usedName]) {
				toc[usedName] = {
					id: bookItem.bookItemId,
					page: bookItem.page,
					count: 1,
				};
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
			{ text: showSuffix ? name[0] : "", font: { f: "Arial" } },
			{
				text: name[1].split(" "),
				font:
					nameOrder === "last-first"
						? { f: "Arial", b: true }
						: { f: "Arial" },
			},
			{
				text: name[2].split(" "),
				font:
					nameOrder === "first-last"
						? { f: "Arial", b: true }
						: { f: "Arial" },
			}
		);

		if (itemFormatter) {
			const itemText = itemFormatter(part);

			if (itemText) {
				mainText.push({
					text: itemText,
					font: { f: "Arial", i: true },
				});
			}
		}

		if (otherFormatter) {
			const otherText = otherFormatter(item, part);

			if (otherText) {
				mainText.push({
					text: otherText,
					font: { f: "Arial", i: true },
				});
			}
		}

		const itemId = part?.id ? inBook[part.id]?.bookItemId : undefined;

		if ((index > 0 || showItemId) && itemId) {
			mainText.push({
				suffix: "",
				lastSuffix: " ",
				text: [
					"(",
					new NumberReference(`person${itemId}`, {
						font: "Arial",
						size: DEFAULT_FONT_SIZE,
						bold: true,
					}),
					")",
				],
				annotation: [undefined, part?.id && inBook[part.id], undefined],
				font: [{ f: "Arial" }, { f: "Arial", b: true }],
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

	const runs: Array<TextRun | InternalHyperlink> = [];

	let lastFont: Font | undefined = font ? { f: font } : undefined;
	mainText.forEach((text) => {
		const textObj:
			| {
					text: string | Array<string | NumberReference>;
					font?: Font | Font[];
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
				(textObj.font as Font[])?.[index] ??
				(textObj.font as Font[])?.[0] ??
				lastFont ??
				undefined;

			if (font) {
				lastFont = font;
			}

			const annotation =
				(textObj.annotation as BookItem[])?.[index] ??
				(textObj.annotation as BookItem[])?.[0] ??
				undefined;

			const nameRun =
				part instanceof NumberReference
					? part
					: new TextRun({
							font: font?.f,
							bold: font?.b,
							italics: font?.i,
							text: `${part}${suffix}`,
							color: "000000",
							size: DEFAULT_FONT_SIZE,
					  });

			if (annotation) {
				runs.push(
					new InternalHyperlink({
						children: [nameRun],
						anchor: `person${annotation.bookItemId}`,
					})
				);
			} else {
				return runs.push(nameRun);
			}
		});
	});
	return runs;
};

const printFact = (params: {
	label: string;
	fact: Common;
	settings?: Settings;
	tabSize: number;
	font?: string;
}) => {
	const { label, fact, tabSize, font } = params;

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
		return [];
	}

	const factDate = noteDateFormatter(
		fact.get("DATE"),
		i18n.t("dateFormat"),
		"",
		false
	) as string | undefined;

	const valueStrings = `${value ?? ""}${
		factPlace ? `${value ? "   " : ""}${factPlace}` : ""
	}`.split("\n");

	const paragraphs = valueStrings.map((valueString, index) => {
		const mainText: Array<
			| {
					text: string | Tab | Array<string | Tab>;
					font?: Font | Font[];
					annotation?: BookItem | Array<undefined | BookItem>;
					suffix?: string;
					lastSuffix?: string;
			  }
			| undefined
		> = [
			factDate && !index
				? { text: factDate, font: { f: "Arial" } }
				: undefined,
			{ text: !index ? label : new Tab(), font: { f: "Arial", b: true } },
			valueString
				? { text: valueString, font: { f: "Arial" } }
				: undefined,
		];

		let lastFont: Font | undefined = font ? { f: font } : undefined;
		const otherRuns: TextRun[] = [];
		mainText.forEach((text) => {
			if (!text) {
				return;
			}
			const textObj:
				| {
						text: string | Tab | Array<string | Tab>;
						font?: Font | Font[];
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

				if (part instanceof Tab) {
					otherRuns.push(
						new TextRun({
							children: [part],
							color: "000000",
							size: DEFAULT_FONT_SIZE,
						})
					);

					return;
				}

				const suffix =
					(typeof textObj.text === "object" &&
					"length" in textObj.text &&
					index === textObj.text.length - 1
						? textObj.lastSuffix
						: textObj.suffix) ?? " ";
				const font =
					(textObj.font as Font[])?.[index] ??
					(textObj.font as Font[])?.[0] ??
					lastFont ??
					undefined;

				if (font) {
					lastFont = font;
				}

				otherRuns.push(
					new TextRun({
						children: [`${part}${suffix}`],
						color: "000000",
						size: DEFAULT_FONT_SIZE,
						font: font.f,
						bold: font.b,
						italics: font.i,
					})
				);
			});
		});
		return getParagraph(
			[
				new TextRun({
					children: [new Tab(), new Tab()],
					size: DEFAULT_FONT_SIZE,
					font: "Arial",
				}),
				...otherRuns,
			],
			tabSize
		);
	});

	return paragraphs;
};

const printDate = (params: {
	date: string;
	place?: string;
	settings?: Settings;
	parsePrefix?: boolean;
	places: Record<string, TocItem>;
	tabSize: number;
	spacing?:
		| {
				after: number;
		  }
		| {
				before: number;
		  };
}): TextRun[] => {
	const { date: rawDate, place, parsePrefix, places } = params;

	if (!rawDate && !place) {
		return [];
	}
	const prefix = parsePrefix && rawDate.match(/^[*†∞]/)?.[0];
	const date = (
		!prefix ? rawDate : rawDate.replace(new RegExp(`^\\${prefix}`), "")
	).replace(/DECEASED/i, "?");

	const translatedPlace = placeTranslator(place);
	const dateString = `${date}${
		translatedPlace ? `   ${translatedPlace}` : ""
	}`;

	if (translatedPlace) {
		if (!places[translatedPlace]) {
			places[translatedPlace] = {
				id: translatedPlace,
				page: 0,
				count: 1,
			};
		} else {
			places[translatedPlace].count++;
		}
	}

	const dateRuns: TextRun[] = [];

	if (prefix) {
		dateRuns.push(
			new TextRun({
				text: prefix,
				font: "Arial",
				color: "000000",
				size: DEFAULT_FONT_SIZE,
			})
		);
	}

	dateRuns.push(
		new TextRun({
			text: dateString,
			font: "Arial",
			color: "000000",
			size: DEFAULT_FONT_SIZE,
		})
	);

	if (!dateRuns.length) {
		return [];
	}

	return [
		new TextRun({
			children: [new Tab()],
			font: "Arial",
			color: "000000",
			size: DEFAULT_FONT_SIZE,
		}),
		...dateRuns,
	];
};

const printDateParagraph = (
	params: Parameters<typeof printDate>[0]
): Paragraph | undefined => {
	const runs = printDate(params);

	if (!runs.length) {
		return;
	}

	return getParagraph(runs, params.tabSize, {
		spacing: params.spacing || {
			after: 100,
		},
	});
};

const getParagraph = (
	content: ParagraphChild | ParagraphChild[],
	tabSize: number,
	options?: IParagraphOptions
) => {
	const runs = Array.isArray(content) ? content : [content];

	return new Paragraph({
		children: runs,
		tabStops: [
			{
				type: TabStopType.LEFT,
				position: tabSize,
			},
			{
				type: TabStopType.LEFT,
				position: tabSize + 200,
			},

			{
				type: TabStopType.LEFT,
				position: tabSize + 1600,
			},
		],
		spacing: {
			after: 0,
		},
		...options,
	});
};

const getProperties = (
	width: number,
	height: number,
	options?: ISectionPropertiesOptions
): ISectionOptions => {
	return {
		properties: {
			...options,
			page: {
				...options?.page,
				size: {
					width: `${width}pt`,
					height: `${height}pt`,
					orientation:
						width > height
							? PageOrientation.LANDSCAPE
							: PageOrientation.PORTRAIT,
					...options?.page?.size,
				},
				pageNumbers: {
					start: 1,
					formatType: NumberFormat.DECIMAL,
					...options?.page?.pageNumbers,
				},
			},
		},
		children: [],
	};
};

const getCoverPage = (
	title: string,
	size: Size,
	images: { bg: DocImage; cover: DocImage }
): Paragraph[] => {
	const { bg, cover } = images;
	const { w: width, h: height } = size;

	const imgMaxWidth = width * 0.6;
	const imgMaxHeight = height * 0.5;

	const widthScale = imgMaxWidth / cover.size.w;
	const heightScale = imgMaxHeight / cover.size.w;

	let newImgWidth = imgMaxWidth;
	let newImgHeight = cover.size.h * widthScale;

	if (newImgHeight > imgMaxHeight) {
		newImgWidth = cover.size.w * heightScale;
		newImgHeight = imgMaxHeight;
	}

	return [
		new Paragraph({
			children: [
				new ImageRun({
					data: bg.img,
					transformation: {
						width: size.w * 2.5,
						height: size.h * 1.5,
					},
					floating: {
						behindDocument: true,
						horizontalPosition: {
							align: HorizontalPositionAlign.RIGHT,
						},
						verticalPosition: {
							align: VerticalPositionAlign.TOP,
						},
					},
				}),
			],
		}),
		new Paragraph({
			children: [
				new ImageRun({
					data: cover.img,
					transformation: {
						width: newImgWidth,
						height: newImgHeight,
					},
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: {
				before: getSpacing(size.h * 0.4),
			},
		}),
		new Paragraph({
			children: [
				new TextRun({
					text: title,
					color: "ffffff",
					size: TITLE_FONT_SIZE,
					font: "Times New Roman",
					bold: true,
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: {
				before: getSpacing(size.h * 0.5),
			},
			heading: HeadingLevel.HEADING_1,
		}),
		new Paragraph({
			children: [
				new TextRun({
					text: `${new Date().getFullYear()}.`,
					color: "ffffff",
					size: DEFAULT_FONT_SIZE,
					font: "Arial",
				}),
			],
			alignment: AlignmentType.CENTER,
			heading: HeadingLevel.HEADING_2,
			spacing: {
				before: 200,
			},
		}),
	];
};

const getBackPage = (
	name: string,
	size: Size,
	images: { bg: DocImage; qr: DocImage },
	details: {
		inBook: Record<IndiKey, BookItem | undefined>;
		toc: Record<string, TocItem>;
		places: Record<string, TocItem>;
	}
): Paragraph[] => {
	const { bg, qr } = images;
	const { w: width } = size;
	const { inBook, toc, places } = details;

	const imgMaxSize = width * 0.2;

	const widthScale = imgMaxSize / qr.size.w;
	const heightScale = imgMaxSize / qr.size.w;

	let newImgWidth = imgMaxSize;
	let newImgHeight = qr.size.h * widthScale;

	if (newImgHeight > imgMaxSize) {
		newImgWidth = qr.size.w * heightScale;
		newImgHeight = imgMaxSize;
	}

	const backText = t(
		// eslint-disable-next-line max-len
		"This family book is created by Family Tree Visualiser. There are {{indiCount}} individuals represented with their connections, dates and places of birth, death and marriage.",
		{ indiCount: Object.keys(inBook).length }
	);

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

	return [
		new Paragraph({
			children: [
				new ImageRun({
					data: bg.img,
					transformation: {
						width: size.w * 2.5,
						height: size.h * 1.5,
					},
					floating: {
						behindDocument: true,
						horizontalPosition: {
							align: HorizontalPositionAlign.LEFT,
						},
						verticalPosition: {
							align: VerticalPositionAlign.TOP,
						},
					},
				}),
			],
		}),
		new Paragraph({
			alignment: AlignmentType.LEFT,
			children: [
				new TextRun({
					children: [name],
					color: "ffffff",
					size: SUBTITLE_FONT_SIZE,
					font: "Times New Roman",
					bold: true,
				}),
			],
			spacing: {
				before: getSpacing(size.h * 0.3),
			},
		}),
		new Paragraph({
			alignment: AlignmentType.LEFT,
			children: [
				new TextRun({
					children: [backText],
					color: "ffffff",
					size: LETTER_FONT_SIZE,
					font: "Arial",
				}),
			],
			spacing: {
				before: 200,
			},
		}),
		new Paragraph({
			alignment: AlignmentType.LEFT,
			children: [
				new TextRun({
					children: [surnamesText],
					color: "ffffff",
					size: LETTER_FONT_SIZE,
					font: "Arial",
				}),
			],
			spacing: {
				before: 200,
			},
		}),
		new Paragraph({
			alignment: AlignmentType.LEFT,
			children: [
				new TextRun({
					children: [placesText],
					color: "ffffff",
					size: LETTER_FONT_SIZE,
					font: "Arial",
				}),
			],
			spacing: {
				before: 200,
			},
		}),
		new Paragraph({
			children: [
				new ImageRun({
					data: qr.img,
					transformation: {
						width: newImgWidth,
						height: newImgHeight,
					},
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: {
				before: getSpacing(size.h * 0.6),
			},
		}),
	];
};

const getFirstPage = (title: string, size: Size): Paragraph[] => {
	return [
		new Paragraph({
			children: [
				new TextRun({
					text: title,
					color: "000000",
					size: TITLE_FONT_SIZE,
					font: "Times New Roman",
					bold: true,
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: {
				before: getSpacing(size.h / 2),
			},
			heading: HeadingLevel.HEADING_1,
		}),
		new Paragraph({
			children: [
				new TextRun({
					text: `${new Date().getFullYear()}.`,
					color: "000000",
					size: DEFAULT_FONT_SIZE,
					font: "Arial",
				}),
			],
			alignment: AlignmentType.CENTER,
			spacing: {
				before: getSpacing(size.h * 1.2),
			},
			heading: HeadingLevel.HEADING_2,
		}),
	];
};

const getFooter = (
	empty?: boolean
): { footers: ISectionOptions["footers"] } => {
	return {
		footers: {
			default: new Footer({
				children: empty
					? []
					: [
							new Paragraph({
								alignment: AlignmentType.CENTER,
								children: [
									new TextRun({
										children: [PageNumber.CURRENT, "."],
										color: "000000",
										size: DEFAULT_FONT_SIZE,
									}),
								],
							}),
					  ],
			}),
		},
	};
};

const getEmptyHeader = (): { headers: ISectionOptions["headers"] } => {
	return {
		headers: {
			default: new Header({
				children: [],
			}),
		},
	};
};

const getTocHeader = (): { headers: ISectionOptions["headers"] } => {
	return {
		headers: {
			default: new Header({
				children: [
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [
							new TextRun({
								children: [t("Table of Contents")],
								color: "000000",
								size: HEADER_FONT_SIZE,
								font: "Times New Roman",
								bold: true,
							}),
						],
					}),
				],
			}),
		},
	};
};

const getIndexHeader = (): { headers: ISectionOptions["headers"] } => {
	return {
		headers: {
			default: new Header({
				children: [
					new Paragraph({
						alignment: AlignmentType.CENTER,
						children: [
							new TextRun({
								children: [t("Index")],
								color: "000000",
								size: HEADER_FONT_SIZE,
								font: "Times New Roman",
								bold: true,
							}),
						],
					}),
				],
			}),
		},
	};
};

export const docx = async (
	gedcom?: GedComType,
	settings?: Settings,
	indis?: IndiKey[],
	printSize: PrintSize | "A5" = "A5",
	title?: string,
	numberingLeadingZero?: boolean
) => {
	const name =
		title ||
		gedcom?.getTreeName() ||
		gedcom?.getTreeId() ||
		t("Family Book");

	const usedGedcom = indis ? gedcom?.toFiltered(indis) : gedcom;

	const { w: width, h: height } = printSizes[printSize];

	const inBook: Record<IndiKey, BookItem | undefined> = {};
	const toc: Record<string, TocItem> = {};
	const places: Record<string, TocItem> = {};

	const persons: Paragraph[] = [];

	const indisOrdered = usedGedcom
		?.indis()
		?.filter((item) => {
			return !item.isNonRelevantMember();
		})
		?.orderBy(getNameAscAndBirth(settings?.nameOrder));

	const bookItemIdLength = `${indisOrdered?.length || 0}`.length;
	const tabSize = bookItemIdLength * 150 + 200;
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
			page: Number(PageNumber.CURRENT),
			bookItemId: currentBookItemId,
			top: 0,
			annotations: [],
		};
	});

	indisOrdered?.forEach((item) => {
		const bookItem = item.id ? inBook[item.id] : undefined;
		if (!bookItem || bookItem?.inBook) {
			return;
		}

		bookItem.inBook = true;

		const nameRuns = printName({
			item,
			otherSeparator: [",", t("and")],
			otherPrefix: `   ${t("parents")}:`,
			others: Object.values(item.getFathers().toList().items).concat(
				Object.values(item.getMothers().toList().items)
			) as Array<IndiType | undefined>,
			otherFormatter,
			settings,
			inBook,
			toc,
			addToToc: true,
		});

		const {
			birth: rawBirth,
			birthPlace,
			death: rawDeath,
			deathPlace,
		} = dateFormatter(item, false, true, true, false);

		const birth = rawBirth || (birthPlace ? "*?" : "");
		const death = rawDeath || (deathPlace ? "†?" : "");

		const bookmark = new Bookmark({
			id: `person${bookItem.bookItemId}`,
			children: nameRuns,
		});

		const personParagraph = getParagraph(
			[new LastRenderedPageBreak(), bookmark],
			tabSize,
			{
				spacing: {
					after: 100,
				},
				numbering: {
					reference: "person-list",
					level: 0,
				},
			}
		);

		const person = [personParagraph];

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

		const birthParagraph = printDateParagraph({
			date: birth,
			place: birthPlace,
			settings,
			places,
			tabSize,
		});

		const deathParagraph = printDateParagraph({
			date: death,
			place: deathPlace,
			settings,
			places,
			tabSize,
		});

		const marriageParagraphs: Paragraph[] = [];

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

		sortedFamilies.forEach((family) => {
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

			if (marriageDate || spouse) {
				const marriageParagraph = printDateParagraph({
					date: marriageDate ?? "∞?",
					place: marriagePlace,
					settings,
					places,
					tabSize,
					spacing: {
						after: 0,
					},
				});

				if (marriageParagraph) {
					marriageParagraphs.push(marriageParagraph);
				}
			}

			if (spouseInBook && spouse) {
				const spouseRuns = printName({
					item: spouse,
					showItemId: true,
					settings,
					inBook,
					toc,
					font: "Arial",
				});

				if (spouseRuns.length) {
					marriageParagraphs.push(
						getParagraph(
							[
								new TextRun({
									children: [
										new Tab(),
										new Tab(),
										`${t("spouse")}:`,
										new Tab(),
									],
									color: "000000",
									size: DEFAULT_FONT_SIZE,
									font: "Arial",
								}),
								...spouseRuns,
							],
							tabSize
						)
					);
				}
			}

			let labelAdded = false;
			children?.forEach((famChild) => {
				const child = famChild;

				if (!child?.id || !inBook[child.id]) {
					return;
				}

				const childRuns = printName({
					item: child,
					itemFormatter: (indi1: IndiType) => {
						return otherFormatter(item, indi1);
					},
					showItemId: true,
					showSurname: false,
					settings,
					inBook,
					toc,
					font: "Arial",
				});

				const { birth: childBirth, death: childDeath } = dateFormatter(
					child,
					false,
					true,
					false,
					false
				);

				const childBirthDateRuns = printDate({
					date: childBirth,
					settings,
					places,
					tabSize,
				});

				const childDeathDateRuns = printDate({
					date: childDeath,
					settings,
					places,
					tabSize,
				});

				if (
					childRuns.length ||
					childBirthDateRuns.length ||
					childDeathDateRuns.length
				) {
					marriageParagraphs.push(
						getParagraph(
							[
								new TextRun({
									children: [
										new Tab(),
										new Tab(),
										...(!labelAdded
											? [`${t("children")}:`]
											: []),
										new Tab(),
									],
									color: "000000",
									size: DEFAULT_FONT_SIZE,
									font: "Arial",
								}),
								...childRuns,
								...childBirthDateRuns,
								...childDeathDateRuns,
							],
							tabSize,
							{
								spacing: {
									after: 0,
								},
							}
						)
					);
				}

				labelAdded = true;
			});
		});

		if (birthParagraph) {
			person.push(birthParagraph);
		}

		if (deathParagraph) {
			person.push(deathParagraph);
		}

		if (marriageParagraphs.length) {
			person.push(...marriageParagraphs);
		}

		const facts = item.getFacts();

		if (facts.length) {
			person.push(
				getParagraph(
					[
						new TextRun({
							children: [new Tab(), t("Other facts")],
							color: "000000",
							size: DEFAULT_FONT_SIZE,
							font: "Arial",
							bold: true,
						}),
					],
					tabSize,
					{
						spacing: {
							before: 200,
							after: 100,
						},
					}
				)
			);

			facts.forEach((currentFact) => {
				const label = (currentFact.get("_LABEL")?.toValue() ||
					"") as string;

				const factParagraphs = printFact({
					label: t(label),
					fact: currentFact,
					settings,
					tabSize,
				});

				if (factParagraphs.length) {
					person.push(...factParagraphs);
				}
			});
		}

		persons.push(
			...person,
			new Paragraph({
				children: [],
				spacing: {
					after: 100,
				},
			})
		);
	});

	const tocParagraphs: Paragraph[] = [];
	const tocEntries = Object.entries(toc);
	tocEntries.forEach(([name, { id, count, letter }], index) => {
		if (!name) {
			return;
		}
		let font: Font = { f: "Arial" };
		if (letter) {
			font = { f: "Times News Roman", b: true };
		}
		const countText = `(${count || 1} ${t("persons")})`;
		const next: TocItem | undefined = tocEntries[index + 1]?.[1];

		tocParagraphs.push(
			getParagraph(
				[
					new InternalHyperlink({
						children: [
							new TextRun({
								children: [name],
								font: font.f,
								bold: font.b,
								size: letter
									? LETTER_FONT_SIZE
									: DEFAULT_FONT_SIZE,
							}),
							new TextRun({
								children: [" ", countText, new Tab()],
								font: "Arial",
								size: DEFAULT_FONT_SIZE,
							}),
							new PageReference(`person${id}`, {
								font: "Arial",
								size: DEFAULT_FONT_SIZE,
							}),
						],
						anchor: `person${id}`,
					}),
				],
				tabSize,
				{
					...(next?.letter
						? {
								spacing: { after: 100 },
						  }
						: {}),
					tabStops: [
						{
							type: TabStopType.RIGHT,
							position: tabSize + 12000,
							leader: "dot",
						},
					],
				}
			)
		);
	});
	const letters: Record<string, boolean | undefined> = {};

	const indexParagraphs: Paragraph[] = [];

	const indisOrderedArray = Object.values(indisOrdered?.items ?? {});
	indisOrderedArray?.forEach((item, index) => {
		const bookItem = item?.id ? inBook[item.id] : undefined;
		const nextItem: IndiType | undefined = indisOrderedArray[index + 1];
		if (!bookItem?.inBook) {
			return;
		}

		const { bookItemId } = bookItem;
		const { inOrder, letter } = nameFormatter(item, settings);
		const { letter: nextLetter } = nameFormatter(nextItem, settings);

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

		if (newLetter) {
			indexParagraphs.push(
				getParagraph(
					[
						new InternalHyperlink({
							children: [
								new TextRun({
									children: [letter],
									font: "Times News Roman",
									bold: true,
									size: LETTER_FONT_SIZE,
								}),
								new TextRun({
									children: [new Tab()],
									font: "Arial",
									size: DEFAULT_FONT_SIZE,
								}),
								new PageReference(`person${bookItemId}`, {
									font: "Arial",
									size: DEFAULT_FONT_SIZE,
								}),
							],
							anchor: `person${bookItemId}`,
						}),
					],
					tabSize,
					{
						tabStops: [
							{
								type: TabStopType.RIGHT,
								position: tabSize + 12000,
								leader: "dot",
							},
						],
					}
				)
			);
		}

		indexParagraphs.push(
			getParagraph(
				[
					new InternalHyperlink({
						children: [
							new TextRun({
								children: [text, new Tab()],
								font: "Arial",
								size: DEFAULT_FONT_SIZE,
							}),
							new PageReference(`person${bookItemId}`, {
								font: "Arial",
								size: DEFAULT_FONT_SIZE,
							}),
						],
						anchor: `person${bookItemId}`,
					}),
				],
				tabSize,
				{
					...(!letters[nextLetter]
						? {
								spacing: { after: 100 },
						  }
						: {}),
					tabStops: [
						{
							type: TabStopType.RIGHT,
							position: tabSize + 12000,
							leader: "dot",
						},
					],
				}
			)
		);
	});

	const bg = await downloadImg("/bg.jpg");
	const qr = await downloadImg("/qr.jpg");
	const cover = await downloadImg("/cover-white.png");

	const doc = new Document({
		title: `${name ? `${name} - ` : ""}Family Book`,
		keywords: "family book",
		creator: "Family Tree Visualizer",
		numbering: {
			config: [
				{
					reference: "person-list",
					levels: [
						{
							level: 0,
							format: LevelFormat.DECIMAL,
							text: "%1",
							alignment: AlignmentType.START,
							style: {
								run: {
									font: "Arial",
									size: DEFAULT_FONT_SIZE,
								},
								paragraph: {
									// alignment: AlignmentType.RIGHT,
									// indent: { left: tabSize },
								},
							},
						},
					],
				},
			],
		},
		sections: [
			{
				...getProperties(width, height),
				children: [
					...getCoverPage(
						name,
						{ w: width, h: height },
						{ bg, cover }
					),
				],
			},
			{
				...getProperties(width, height),
				children: [...getFirstPage(name, { w: width, h: height })],
			},
			{
				...getProperties(width, height),
				...getFooter(),
				children: [...persons],
			},
			{
				...getProperties(width, height, {
					column: {
						space: 1000,
						count: 2,
						separate: true,
						equalWidth: true,
					},
					page: {
						pageNumbers: { start: undefined },
					},
				}),
				...getTocHeader(),
				...getFooter(),
				children: tocParagraphs,
			},
			{
				...getProperties(width, height, {
					column: {
						space: 1000,
						count: 2,
						separate: true,
						equalWidth: true,
					},
					page: {
						pageNumbers: { start: undefined },
					},
				}),
				...getIndexHeader(),
				...getFooter(),
				children: indexParagraphs,
			},
			{
				...getProperties(width, height),
				...getEmptyHeader(),
				...getFooter(true),
				children: [
					...getBackPage(
						name,
						{ w: width, h: height },
						{ bg, qr },
						{ inBook, toc, places }
					),
				],
			},
		],
	});

	const customFormatKey = Object.keys(CustomNumberFormat)[
		bookItemIdLength - 2
	] as keyof typeof CustomNumberFormat | undefined;
	if (numberingLeadingZero && customFormatKey) {
		const customFormat = CustomNumberFormat[customFormatKey];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const numbering = get(doc as any, "numbering.abstractNumberingMap") as
			| Map<string, AbstractNumbering>
			| undefined;

		const personNumbering = numbering?.get("person-list");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const level = get(personNumbering as any, "root")?.find(
			({ rootKey }: { rootKey?: string }) => rootKey === "w:lvl"
		) as {
			root: Array<NumFormat | CustomNumFormat>;
		};

		let foundNumFmt = false;
		level.root = level.root.map((v) => {
			const item = v as NumFormat & { rootKey: string };
			if (item.rootKey === "w:numFmt" && !foundNumFmt) {
				foundNumFmt = true;

				return new CustomNumFormat({
					requires: "w14",
					format: customFormat,
					fallback: "decimal",
				});
			}

			return item;
		});
	}

	return await Packer.toBlob(doc);
};
