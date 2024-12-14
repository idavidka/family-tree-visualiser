import { jsPDF as JsToPdf } from "jspdf";
import hslToHex from "hsl-to-hex";

import {
	type Stage,
	type Settings,
	type TreeState,
} from "../store/main/reducers";
import { getStageEdges } from "./indis-on-stage";
import { type IndiKey } from "../types/types";
import { ArialBold } from "../fonts/ArialBold";
import { Arial } from "../fonts/Arial";
import { type Individuals } from "../classes/gedcom/classes/indis";
import { fixNumber, getScaledBounds } from "./bounds";
import { getParts } from "./line";
import {
	PDF_LINE_BORDER,
	PDF_LINE_WEIGHT,
	PDF_SPLIT_INTO_PAGES,
	PDF_LINE_SCALE,
	LINE_CORNER_RADIUS,
	VERTICAL_MARGIN_MULTIPLIER,
	AUTO_VERTICAL_MARGIN_MULTIPLIER,
	DIM_DIFF,
	PDF_PRINT_MARK,
	getDimDiff,
} from "../constants/constants";
import colors, { GENDER_COLORS, type Colors, LINE_COLORS } from "../colors";
import { type Color } from "../types/colors";
import { type Size, type Curve } from "../types/graphic-types";
import { PageSafeDrawer } from "./page-safe-drawing";
import { getGenderColorOrder } from "./colors";
import { dateFormatter } from "./date-formatter";
import { isDevelopment } from "./get-product-details";
import { printPdf } from "./print-pdf";
import { nameFormatter } from "./name-formatter";
import { TimesNewRoman } from "../fonts/TimesNewRoman";
import { TimesNewRomanBold } from "../fonts/TimesNewRomanBold";
import { t } from "i18next";

const isDev = isDevelopment();

export type PrintSize = "A2" | "A3" | "A4";

const printSizes: Record<PrintSize, Size> = {
	A4: {
		w: 1123,
		h: 794,
	},
	A3: {
		w: 1123 * 2,
		h: 794 * 2,
	},
	A2: {
		w: 1123 * 4,
		h: 794 * 4,
	},
};

const insertBlankPage = (
	doc: JsToPdf,
	page: number,
	settings: {
		width: number;
		height: number;
		cropBox: number;
		label?: string;
		size?: number;
	}
) => {
	const { cropBox, width, height, label, size = 160 } = settings;

	doc.insertPage(page + 1);
	doc.setFont("TimesNewRomanBold");
	doc.setFontSize(size);

	doc.setDrawColor("#a2a2a2");
	doc.setTextColor("#a2a2a2");
	doc.setFillColor("white");
	doc.setLineWidth(1);

	doc.line(
		cropBox + 30,
		cropBox + 30,
		cropBox + width - 30,
		cropBox + height - 30,
		"S"
	);
	doc.line(
		cropBox + width - 30,
		cropBox + 30,
		cropBox + 30,
		cropBox + height - 30,
		"S"
	);
	doc.rect(cropBox + 30, cropBox + 30, width - 60, height - 60);

	const identifierText = label || t("Page {{page}}", { page });
	const { w: textW, h: textH } = doc.getTextDimensions(identifierText, {
		maxWidth: width * 0.8,
	});
	doc.rect(
		cropBox + width / 2 - (textW + 40) / 2,
		cropBox + height / 2 - (textH + 20) / 2,
		textW + 40,
		textH + 20,
		"FD"
	);

	doc.text(identifierText, cropBox + width / 2, cropBox + height / 2, {
		maxWidth: width * 0.8,
		align: "center",
		baseline: "middle",
	});
};

export const pdfi = (
	indis: Stage["indis"],
	lines: Stage["lines"],
	type: TreeState["type"],
	allIndis?: Individuals,
	output: "blob" | "url" | "print" = "blob",
	enableCropBox = true,
	settings?: Settings,
	printSize: PrintSize = "A4",
	title?: string,
	pdfSettings?: Record<string, boolean | undefined>
) => {
	const name = title || t("Family Book");

	const {
		nameOrder = "last-first",
		showSuffix = true,
		cornerRounding = LINE_CORNER_RADIUS,
		genderColors: genderColorMap = GENDER_COLORS,
		lineColors = LINE_COLORS,
		poolId = 0,
		verticalSpace = VERTICAL_MARGIN_MULTIPLIER,
		lineSpace = DIM_DIFF,
	} = settings ?? {};

	const useCropBox =
		pdfSettings?.cropBox !== undefined
			? pdfSettings.cropBox
			: enableCropBox;
	const usePageNumbers = !!pdfSettings?.pageNumbers;
	const useIdentifierPages = !!pdfSettings?.rowIdentifierPage;

	const edges = getStageEdges(indis);
	const cropBox = useCropBox ? PDF_PRINT_MARK : 0;

	if (!edges.left || !edges.top || !edges.right || !edges.bottom) {
		return;
	}

	const leftMost = {
		...edges.left,
		position: getScaledBounds(edges.left.position, settings?.pdfScale),
		size: getScaledBounds(edges.left.size, settings?.pdfScale),
	};
	const topMost = {
		...edges.top,
		position: getScaledBounds(edges.top.position, settings?.pdfScale),
		size: getScaledBounds(edges.top.size, settings?.pdfScale),
	};
	const rightMost = {
		...edges.right,
		position: getScaledBounds(edges.right.position, settings?.pdfScale),
		size: getScaledBounds(edges.right.size, settings?.pdfScale),
	};
	const bottomMost = {
		...edges.bottom,
		position: getScaledBounds(edges.bottom.position, settings?.pdfScale),
		size: getScaledBounds(edges.bottom.size, settings?.pdfScale),
	};

	const verticalMultiplier =
		verticalSpace *
		(type !== "manual" ? AUTO_VERTICAL_MARGIN_MULTIPLIER : 1);
	const dimDiff = getDimDiff(lineSpace, type);
	const padding = fixNumber(
		(topMost.size.h * verticalMultiplier - topMost.size.h) / (dimDiff / 1.5)
	);

	const left = leftMost.position.x - leftMost.size.w / 2;
	const top = topMost.position.y - topMost.size.h - padding;
	const right = rightMost.position.x + rightMost.size.w * 1.5;
	const bottom = bottomMost.position.y + topMost.size.h + padding;
	const rawWidth = right - left;
	const rawHeight = bottom - top;

	const { w: width, h: height } = printSizes[printSize];

	const requiredPagesHorizontal = Math.ceil(rawWidth / width);
	const requiredPagesVertical = Math.ceil(rawHeight / height);
	const requiredPages = requiredPagesHorizontal * requiredPagesVertical;

	const genderColors = getGenderColorOrder(genderColorMap);
	const mediaWidth = PDF_SPLIT_INTO_PAGES ? width + cropBox * 2 : width;
	const mediaHeight = PDF_SPLIT_INTO_PAGES ? height + cropBox * 2 : height;

	const doc = new JsToPdf({
		orientation: width > height ? "landscape" : "portrait",
		unit: "px",
		format: [mediaWidth, mediaHeight],
	});
	doc.setDocumentProperties({
		title: "Family Tree",
		keywords: "family tree,genealogy",
		creator: "Family Tree Visualizer",
		author: "Family Tree Visualizer",
	});

	doc.addFileToVFS("Arial.ttf", Arial);
	doc.addFont("Arial.ttf", "Arial", "normal");
	doc.addFileToVFS("ArialBold.ttf", ArialBold);
	doc.addFont("ArialBold.ttf", "ArialBold", "normal");

	doc.addFileToVFS("TimesNewRoman.ttf", TimesNewRoman);
	doc.addFont("TimesNewRoman.ttf", "TimesNewRoman", "normal");
	doc.addFileToVFS("TimesNewRomanBold.ttf", TimesNewRomanBold);
	doc.addFont("TimesNewRomanBold.ttf", "TimesNewRomanBold", "normal");

	const layout = {
		rows: requiredPagesVertical,
		cols: requiredPagesHorizontal,
		pages: requiredPages,
	};
	if (PDF_SPLIT_INTO_PAGES) {
		let row = 1;
		for (let i = 1; i <= requiredPages; i++) {
			// No hide CropBox, keep here for further action
			// if (cropBox) {
			// const page = doc.getCurrentPageInfo();
			// const scale = 1.3; // convert mm to pt (boxes use use pt)
			// page.pageContext.cropBox = {
			// 	bottomLeftX: cropBox * scale,
			// 	bottomLeftY: cropBox * scale,
			// 	topRightX:
			// 		page.pageContext.mediaBox.topRightX - cropBox * scale,
			// 	topRightY:
			// 		page.pageContext.mediaBox.topRightY - cropBox * scale,
			// };
			// page.pageContext.trimBox = page.pageContext.cropBox;
			// }

			const col = ((i - 1) % requiredPagesHorizontal) + 1;

			if (i < requiredPages) {
				doc.addPage();
			}
			if (col === requiredPagesHorizontal) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				row++;
			}
		}
		doc.setPage(1);
	}

	const drawer = new PageSafeDrawer(
		doc,
		width,
		height,
		cropBox,
		requiredPagesVertical,
		requiredPagesHorizontal
	);

	doc.setLineJoin("rounded");

	const flatLines = Object.values(lines ?? {})
		.map((childLines) => Object.values(childLines ?? {}))
		.flat();

	["lines", "corners"].forEach((itemType) => {
		if (itemType === "lines") {
			flatLines.forEach((path) => {
				const parts = getParts(path, cornerRounding, "lines");

				const common = parts.find(
					(partProps) =>
						"hasCommon" in partProps && partProps.hasCommon
				);

				const colors = common ? genderColors : lineColors;
				parts.forEach((part) => {
					if (!("type" in part) && "x" in part) {
						return;
					}

					if (!("x" in part)) {
						const { x1, y1, x2, y2, colorIndex, weight } =
							getScaledBounds(part, settings?.pdfScale);
						const lineColor = getPdfColor(colors[colorIndex ?? 0]);

						const lineWeight = weight
							? weight * PDF_LINE_SCALE
							: PDF_LINE_WEIGHT;
						doc.setDrawColor("white");
						doc.setLineWidth(lineWeight + PDF_LINE_BORDER);
						drawer.line(
							x1 - left,
							y1 - top,
							x2 - left,
							y2 - top,
							"S"
						);

						doc.setLineWidth(lineWeight);
						doc.setDrawColor(lineColor);
						drawer.line(
							x1 - left,
							y1 - top,
							x2 - left,
							y2 - top,
							"S"
						);
					}
				});
			});
		}

		if (itemType === "corners") {
			flatLines.forEach((path) => {
				const parts = getParts(path, cornerRounding, "corners");

				const common = parts.find(
					(partProps) => "common" in partProps && partProps.common
				);
				const colors = common ? genderColors : lineColors;

				parts.forEach((part) => {
					if ("type" in part) {
						const { x, y, type, colorIndex, weight, radius } =
							getScaledBounds(part, settings?.pdfScale);
						const { w: r } = getScaledBounds(
							{
								w: radius || cornerRounding,
								h: radius || cornerRounding,
							},
							settings?.pdfScale
						);

						const curve: Curve = {
							x1: 0,
							y1: 0,
							x2: 0,
							y2: 0,
							x3: 0,
							y3: 0,
						};

						if (type === "tr") {
							curve.y2 = -r;
							curve.x3 = r;
							curve.y3 = -r;
						}
						if (type === "tl") {
							curve.y2 = -r;
							curve.x3 = -r;
							curve.y3 = -r;
						}
						if (type === "br") {
							curve.x2 = -r;
							curve.x3 = -r;
							curve.y3 = -r;
						}
						if (type === "bl") {
							curve.x2 = r;
							curve.x3 = r;
							curve.y3 = -r;
						}
						if (type === "tri") {
							curve.x2 = -r;
							curve.x3 = -r;
							curve.y3 = r;
						}
						if (type === "tli") {
							curve.x2 = r;
							curve.x3 = r;
							curve.y3 = r;
						}
						if (type === "bri") {
							curve.y2 = r;
							curve.x3 = r;
							curve.y3 = r;
						}
						if (type === "bli") {
							curve.y2 = r;
							curve.x3 = -r;
							curve.y3 = r;
						}

						const lineColor = getPdfColor(colors[colorIndex ?? 0]);

						const lineWeight = weight
							? weight * PDF_LINE_SCALE
							: PDF_LINE_WEIGHT;
						doc.setLineWidth(lineWeight);
						doc.setDrawColor(lineColor);
						drawer.lines(
							[
								[
									curve.x1,
									curve.y1,
									curve.x2,
									curve.y2,
									curve.x3,
									curve.y3,
								],
							],
							x - left,
							y - top,
							[1, 1],
							"S",
							false
						);
					}
				});
			});

			flatLines.forEach((path) => {
				const connects = getParts(path, cornerRounding, "connects");

				connects.forEach((part) => {
					if (!("type" in part) && "x" in part) {
						const { x, y, weight } = getScaledBounds(
							part,
							settings?.pdfScale
						);

						const lineWeight = weight
							? weight * PDF_LINE_SCALE
							: PDF_LINE_WEIGHT;
						doc.setLineWidth(lineWeight);
						doc.setFillColor("white");
						doc.setDrawColor("black");
						drawer.circle(
							x - left,
							y - top,
							lineWeight + PDF_LINE_BORDER / 2,
							"FD"
						);
					}
				});
			});
		}
	});

	Object.entries(indis ?? {}).forEach(
		([id, { position: rawPosition, size: rawSize }]) => {
			const indi = allIndis?.items[id as IndiKey];

			if (!indi) {
				return;
			}

			const position = getScaledBounds(rawPosition, settings?.pdfScale);
			const size = getScaledBounds(rawSize, settings?.pdfScale);
			const lineStartSpace = size.w * 0.065;
			const multilineStartSpace = size.w * 0.085;
			const wordSpace = size.w * 0.035;
			const rightSpace = size.w - lineStartSpace * 2;
			const bottomSpace = size.w * 0.05;
			const cornerRadius = size.w * 0.05;
			const multilineBottomSpace = size.w * 0.03;
			const topSpace = size.w * 0.1;

			const [suffix, firstNamePart, secondNamePart] = nameFormatter(
				indi,
				settings
			).inOrder;

			const link = indi.link(poolId);
			const sex = indi.SEX?.toValue();
			const dates = dateFormatter(indi, settings?.showMarriages).inOrder;
			const itemLeft = position.x - left;
			const itemRight = itemLeft + size.w;
			const itemTop = position.y - top;
			const itemBottom = itemTop + size.h;

			doc.setLineWidth(PDF_LINE_WEIGHT);
			doc.setDrawColor(genderColorMap[sex ?? "U"]);
			doc.setTextColor(0);
			doc.setFillColor(255, 255, 255);
			drawer.roundedRect(
				itemLeft,
				itemTop,
				size.w,
				size.h,
				cornerRadius,
				cornerRadius,
				"B"
			);

			if (link) {
				drawer.link(itemLeft, itemTop, size.w, size.h, { url: link });
			}

			const firstNamePartsFont =
				nameOrder === "last-first"
					? "TimesNewRomanBold"
					: "TimesNewRoman";
			const secondNamePartsFont =
				nameOrder === "first-last"
					? "TimesNewRomanBold"
					: "TimesNewRoman";

			let fontSizeDiff = 0.4;
			let nameDone = false;
			while (fontSizeDiff > 0.2) {
				doc.setFontSize(size.h * fontSizeDiff);
				doc.setFont("TimesNewRoman");
				const suffixDimensions = doc.getTextDimensions(suffix);
				doc.setFont(firstNamePartsFont);
				const firstNamePartDimensions =
					doc.getTextDimensions(firstNamePart);
				doc.setFont(secondNamePartsFont);
				const secondNamePartDimensions =
					doc.getTextDimensions(secondNamePart);
				const suffixLeft = itemLeft + lineStartSpace;
				const firstNamePartLeft =
					suffixLeft +
					(suffix && showSuffix
						? suffixDimensions.w + wordSpace / 2
						: 0);
				const secondNamePartLeft =
					firstNamePartLeft +
					(secondNamePart
						? firstNamePartDimensions.w + wordSpace / 2
						: 0);

				const fitAll =
					secondNamePartLeft +
						(secondNamePart ? secondNamePartDimensions.w : 0) <
					itemLeft + rightSpace;
				const fit1stLine =
					firstNamePartLeft +
						(firstNamePart ? firstNamePartDimensions.w : 0) <
					itemLeft + rightSpace;
				const fit2ndLine =
					suffixLeft +
						(secondNamePart ? secondNamePartDimensions.w : 0) <
					itemLeft + rightSpace;

				if (fitAll && fontSizeDiff === 0.4) {
					doc.setFontSize(size.h * fontSizeDiff);

					doc.setFont("TimesNewRoman");
					showSuffix &&
						drawer.text(suffix, suffixLeft, itemTop + topSpace);

					doc.setFont(firstNamePartsFont);
					drawer.text(
						firstNamePart,
						firstNamePartLeft,
						itemTop + topSpace
					);

					doc.setFont(secondNamePartsFont);
					drawer.text(
						secondNamePart,
						secondNamePartLeft,
						itemTop + topSpace
					);

					doc.setFontSize(size.h * 0.3);
					drawer.text(
						dates,
						itemLeft + lineStartSpace,
						itemBottom - bottomSpace
					);
					nameDone = true;
					break;
				} else if (fit1stLine && fit2ndLine) {
					doc.setFontSize(size.h * fontSizeDiff);
					doc.setFont("TimesNewRoman");
					showSuffix &&
						drawer.text(
							suffix,
							suffixLeft,
							itemTop + multilineStartSpace
						);

					doc.setFont(firstNamePartsFont);
					drawer.text(
						firstNamePart,
						firstNamePartLeft,
						itemTop + multilineStartSpace
					);

					doc.setFont(secondNamePartsFont);
					drawer.text(
						secondNamePart,
						suffixLeft,
						itemTop +
							multilineStartSpace +
							secondNamePartDimensions.h * 1.05
					);

					doc.setFontSize(size.h * 0.3);
					drawer.text(
						dates,
						itemLeft + lineStartSpace,
						itemBottom - multilineBottomSpace
					);
					nameDone = true;
					break;
				}
				fontSizeDiff = fontSizeDiff - 0.05;
			}

			if (!nameDone) {
				const secondNameRawParts = secondNamePart?.split(" ") ?? [];
				const secondNameParts = secondNameRawParts.map(
					(part, index) => ({
						bold: nameOrder !== "last-first",
						part:
							index === 0 || secondNameRawParts.length <= 2
								? part
								: part.substring(0, 1),
					})
				);

				const firstNameRawParts = firstNamePart?.split(" ") ?? [];
				const firstNameParts = firstNameRawParts.map((part, index) => ({
					bold: nameOrder === "last-first",
					part:
						index === 0 || firstNameRawParts.length <= 2
							? part
							: part.substring(0, 1),
				}));

				fontSizeDiff = 0.32;
				let textLeft = itemLeft + lineStartSpace;
				let textTop = itemTop + multilineStartSpace;
				let rowIndex = 0;

				(showSuffix && suffix ? [{ bold: false, part: suffix }] : [])
					.concat(firstNameParts, secondNameParts)
					.forEach((part) => {
						doc.setFontSize(size.h * fontSizeDiff);
						if (part.bold) {
							doc.setFont("TimesNewRomanBold");
						} else {
							doc.setFont("TimesNewRoman");
						}
						const partDimensions = doc.getTextDimensions(
							part.part ?? ""
						);

						const fitNext =
							textLeft + partDimensions.w < itemLeft + rightSpace;

						if (!fitNext) {
							textLeft = itemLeft + lineStartSpace;
							rowIndex++;
							textTop =
								itemTop +
								multilineStartSpace +
								partDimensions.h * 1.05 * rowIndex;
						}

						if (part.bold) {
							doc.setFont("TimesNewRomanBold");
						} else {
							doc.setFont("TimesNewRoman");
						}

						drawer.text(part.part ?? "", textLeft, textTop);

						textLeft = textLeft + partDimensions.w + wordSpace;

						doc.setFont("TimesNewRoman");
						doc.setFontSize(size.h * 0.3);
						drawer.text(
							dates,
							itemLeft + lineStartSpace,
							itemBottom - multilineBottomSpace
						);
					});
			}

			let sexValue = "";
			if (sex === "F") {
				sexValue = "♀";
			} else if (sex === "M") {
				sexValue = "♂";
			}

			if (sexValue && sex) {
				doc.setFont("TimesNewRoman");
				doc.setFontSize(size.h * 0.5);
				const sexDimensions = doc.getTextDimensions(sexValue);
				drawer.text(
					sexValue,
					itemRight - topSpace,
					itemBottom - sexDimensions.h
				);
			}
		}
	);

	if (usePageNumbers) {
		for (let i = layout.pages; i >= 1; i--) {
			insertBlankPage(doc, i, { width, height, cropBox });
		}
	}

	if (useIdentifierPages) {
		for (let i = layout.rows; i >= 1; i--) {
			const blankPageIndex = i * layout.cols * (usePageNumbers ? 2 : 1);

			insertBlankPage(doc, blankPageIndex, {
				width,
				height,
				cropBox,
				label: t("End of row identifier page"),
				size: 60,
			});
			if (usePageNumbers) {
				insertBlankPage(doc, blankPageIndex, {
					width,
					height,
					cropBox,
					label: t("End of row identifier page"),
					size: 60,
				});
			}
		}
	}

	doc.insertPage(1);

	doc.setFont("TimesNewRomanBold");
	doc.setTextColor(0);
	doc.setFontSize(70);

	doc.text(name, width / 2, height / 4 - 100, {
		maxWidth: width * 0.8,
		align: "center",
	});

	doc.text(t("Document info for print"), width / 2, height / 4, {
		maxWidth: width * 0.8,
		align: "center",
	});

	doc.setFont("Arial");
	doc.setFontSize(30);

	let infoY = height / 2;
	doc.text(
		t("Optimised for page size: {{value}}", { value: printSize }),
		width / 2,
		(infoY += 40),
		{
			maxWidth: width * 0.8,
			align: "center",
		}
	);
	doc.text(
		t("Number of printed pages: {{value}}", {
			value: layout.rows * layout.cols,
		}),
		width / 2,
		(infoY += 40),
		{
			maxWidth: width * 0.8,
			align: "center",
		}
	);
	doc.text(
		t("Number of printed rows: {{value}}", { value: layout.rows }),
		width / 2,
		(infoY += 40),
		{
			maxWidth: width * 0.8,
			align: "center",
		}
	);
	doc.text(
		t("Number of printed columns in printed rows: {{value}}", {
			value: layout.cols,
		}),
		width / 2,
		(infoY += 40),
		{
			maxWidth: width * 0.8,
			align: "center",
		}
	);
	if (useIdentifierPages) {
		doc.text(
			t("Number of end of row identifier pages: {{value}}", {
				value: layout.rows,
			}),
			width / 2,
			(infoY += 40),
			{
				maxWidth: width * 0.8,
				align: "center",
			}
		);
	}
	doc.text(
		t(`Number of info pages: {{value}}`, { value: 1 }),
		width / 2,
		(infoY += 40),
		{
			maxWidth: width * 0.8,
			align: "center",
		}
	);
	if (useCropBox) {
		doc.text(t(`This document has cropbox`), width / 2, (infoY += 40), {
			maxWidth: width * 0.8,
			align: "center",
		});
	} else {
		doc.text(
			t(`This document does not have cropbox`),
			width / 2,
			(infoY += 40),
			{
				maxWidth: width * 0.8,
				align: "center",
			}
		);
	}

	if (usePageNumbers) {
		doc.text(
			t(
				"This document has page number on every 2nd pages, double-sided printing suggested"
			),
			width / 2,
			(infoY += 40),
			{
				maxWidth: width * 0.8,
				align: "center",
			}
		);
	}

	if (usePageNumbers) {
		insertBlankPage(doc, 1, { width, height, cropBox, label: "Info" });
	}

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

export const getPdfColor = (colorCode?: Colors | Color) => {
	let color = "black";
	const validColorCode = colorCode?.toUpperCase();

	if (validColorCode?.match(/#[A-F0-9]{3}|#[A-F0-9]{6}/)) {
		color = ["#FFF", "#FFFFFF"].includes(validColorCode ?? "")
			? "black"
			: colorCode ?? "black";
	} else if (colorCode) {
		if (Object.keys(colors).includes(colorCode)) {
			color = colors[colorCode as Colors];
		} else {
			const hsl = colorCode?.match(
				/hsl\((?<hue>[\d.%]+),(?<sat>[\d.]+)%,(?<lum>[\d.]+)%\)/
			)?.groups;

			if (hsl) {
				color = hslToHex(
					Number(hsl.hue),
					Number(hsl.sat),
					Number(hsl.lum)
				);
			}
		}
	}

	return color;
};
