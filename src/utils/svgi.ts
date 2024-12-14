import hslToHex from "hsl-to-hex";

import {
	type Stage,
	type Settings,
	type TreeState,
} from "../store/main/reducers";
import { getStageEdges } from "./indis-on-stage";
import { type IndiKey } from "../types/types";
import { type Individuals } from "../classes/gedcom/classes/indis";
import { getParts } from "./line";
import {
	LINE_WEIGHT,
	LINE_CORNER_RADIUS,
	LINE_BORDER,
	AUTO_VERTICAL_MARGIN_MULTIPLIER,
	DIM_DIFF,
	VERTICAL_MARGIN_MULTIPLIER,
	getDimDiff,
} from "../constants/constants";
import colors, { GENDER_COLORS, type Colors, LINE_COLORS } from "../colors";
import { type Color } from "../types/colors";
import { type Curve } from "../types/graphic-types";
import { getGenderColorOrder } from "./colors";
import { type G, SVG } from "@svgdotjs/svg.js";
import { dateFormatter } from "./date-formatter";
import { fixNumber } from "./bounds";
import { nameFormatter } from "./name-formatter";

const USE_LINE_GROUPS = false;
export const svgi = (
	indis: Stage["indis"],
	lines: Stage["lines"],
	type: TreeState["type"],
	allIndis?: Individuals,
	_output: "print" | "screen" = "print",
	settings?: Settings,
	showIndividuals = true
) => {
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

	const edges = getStageEdges(indis);

	if (!edges.left || !edges.top || !edges.right || !edges.bottom) {
		return;
	}

	const leftMost = edges.left;
	const topMost = edges.top;
	const rightMost = edges.right;
	const bottomMost = edges.bottom;

	const verticalMultiplier =
		verticalSpace *
		(type !== "manual" ? AUTO_VERTICAL_MARGIN_MULTIPLIER : 1);
	const dimDiff = getDimDiff(lineSpace, type);
	const padding =
		fixNumber(
			(topMost.size.h * verticalMultiplier - topMost.size.h) /
				(dimDiff / 1.5)
		) * 1.1;

	const left = leftMost.position.x - leftMost.size.w / 2;
	const top = topMost.position.y - topMost.size.h - padding;
	const right = rightMost.position.x + rightMost.size.w * 1.5;
	const bottom = bottomMost.position.y + topMost.size.h + padding;
	const rawWidth = right - left;
	const rawHeight = bottom - top;

	const svg = SVG().size(rawWidth, rawHeight);
	const genderColors = getGenderColorOrder(genderColorMap);

	const flatLines = Object.entries(lines ?? {})
		.map(([p1, childLines]) =>
			Object.entries(childLines ?? {}).map(([p2, childLine]) => ({
				path: childLine,
				p1: p1 as IndiKey,
				p2: p2 as IndiKey,
			}))
		)
		.flat();

	const groups: Record<string, G> = {};
	["lines", "corners"].forEach((itemType) => {
		if (itemType === "lines") {
			flatLines.forEach((lineProps) => {
				const { p1, p2, path } = lineProps;
				const parts = getParts(path, cornerRounding, "lines");

				const common = parts.find(
					(partProps) =>
						"hasCommon" in partProps && partProps.hasCommon
				);
				const usedLineColors = common ? genderColors : lineColors;

				parts.forEach((part) => {
					if (!("type" in part) && "x" in part) {
						return;
					}

					if (!("x" in part)) {
						const { id, x1, y1, x2, y2, colorIndex, weight } = part;

						const color = usedLineColors[colorIndex ?? 0];
						const lineColor = getSvgColor(color);

						const lineWeight = weight || LINE_WEIGHT;

						const lineBg = svg
							.line(x1 - left, y1 - top, x2 - left, y2 - top)
							.addClass(
								`line-${
									common ? "spouse" : "normal"
								} line-background line-color-${colorIndex}`
							)
							.stroke({
								width: lineWeight + LINE_BORDER,
								color: "white",
							});

						const line = svg
							.line(x1 - left, y1 - top, x2 - left, y2 - top)
							.addClass(
								`line-${
									common ? "spouse" : "normal"
								} line-main line-color-${colorIndex} duration-500 transition-colors`
							)
							.stroke({
								width: lineWeight,
								color: lineColor,
							});

						if (id) {
							lineBg.attr("data-fam-id", id);
							line.attr("data-fam-id", id);

							if (USE_LINE_GROUPS) {
								groups[id] = groups[id] || svg.group();
								groups[id].add(lineBg);
								groups[id].add(line);
							}
						}

						if (p1 || p2) {
							lineBg.attr("data-p1-id", p1);
							line.attr("data-p1-id", p1);
							lineBg.attr("data-p2-id", p2);
							line.attr("data-p2-id", p2);
						}
					}
				});
			});
		}

		if (itemType === "corners") {
			flatLines.forEach((lineProps) => {
				const { p1, p2, path } = lineProps;
				const parts = getParts(path, cornerRounding, "corners");

				const common = parts.find(
					(partProps) => "common" in partProps && partProps.common
				);

				const usedLineColors = common ? genderColors : lineColors;

				parts.forEach((part) => {
					if ("type" in part) {
						const { id, x, y, type, colorIndex, weight, radius } =
							part;
						const { w: r } = {
							w: radius || cornerRounding,
						};

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

						const color = usedLineColors[colorIndex ?? 0];
						const lineColor = getSvgColor(color);

						const lineWeight = weight || LINE_WEIGHT;

						const line = svg
							.path([
								["M", x - left, y - top],
								[
									"C",
									x - left + curve.x1,
									y - top + curve.y1,
									x - left + curve.x2,
									y - top + curve.y2,
									x - left + curve.x3,
									y - top + curve.y3,
								],
							])
							.addClass(
								`corner corner-${
									common ? "spouse" : "normal"
								} corner-color-${colorIndex} duration-500 transition-colors`
							)
							.fill("transparent")
							.stroke({
								width: lineWeight,
								color: lineColor,
							});

						if (id) {
							line.attr("data-fam-id", id);

							if (USE_LINE_GROUPS) {
								groups[id] = groups[id] || svg.group();
								groups[id].add(line);
							}
						}
						if (p1 || p2) {
							line.attr("data-p1-id", p1);
							line.attr("data-p2-id", p2);
						}
					}
				});
			});

			flatLines.forEach((lineProps) => {
				const { p1, p2, path } = lineProps;
				const connects = getParts(path, cornerRounding, "connects");

				connects.forEach((part) => {
					if (!("type" in part) && "x" in part) {
						const { id, x, y, weight } = part;

						const lineWeight = weight || LINE_WEIGHT;
						const diameter = lineWeight + LINE_BORDER;
						const radius = diameter / 2;

						const circle = svg
							.circle(diameter)
							.move(x - left - radius, y - top - radius)
							.addClass(`connect duration-500 transition-colors`)
							.fill("white")
							.stroke({
								width: lineWeight,
								color: "black",
							});

						if (id) {
							circle.attr("data-fam-id", id);

							if (USE_LINE_GROUPS) {
								groups[id] = groups[id] || svg.group();
								groups[id].add(circle);
							}
						}

						if (p1 || p2) {
							circle.attr("data-p1-id", p1);
							circle.attr("data-p2-id", p2);
						}
					}
				});
			});
		}
	});

	if (showIndividuals) {
		Object.entries(indis ?? {}).forEach(
			([id, { position: rawPosition, size: rawSize }]) => {
				const indi = allIndis?.items[id as IndiKey];

				if (!indi) {
					return;
				}

				const position = rawPosition;
				const size = rawSize;
				const lineStartSpace = size.w * 0.065;
				const multilineStartSpace = size.w * 0.015;
				const lineDatesStartSpace = size.w * 0.0645;
				const wordSpace = size.w * 0.04;
				const rightSpace = size.w - lineStartSpace;
				const bottomSpace = size.w * 0.1;
				const cornerRadius = size.w * 0.05;
				const multilineBottomSpace = size.w * 0.08;
				const topSpace = size.w * 0.04;

				const [suffix, firstNamePart, secondNamePart] = nameFormatter(
					indi,
					settings
				).inOrder;

				const link = indi.link(poolId);
				const sex = indi.SEX?.toValue();
				const dates = dateFormatter(
					indi,
					settings?.showMarriages
				).inOrder;
				const itemLeft = position.x - left;
				const itemRight = itemLeft + size.w;
				const itemTop = position.y - top;
				const itemBottom = itemTop + size.h;

				const lineWeight = LINE_WEIGHT;

				const g = svg.group();

				const rect = svg
					.rect(size.w, size.h)
					.move(itemLeft, itemTop)
					.fill("white")
					.stroke({
						width: lineWeight,
						color: genderColorMap[sex ?? "U"],
					})
					.radius(cornerRadius);
				g.add(rect);

				if (link) {
					const a = svg.link(link).target("_blank");
					a.add(g);
				}

				const bold = {
					family: "Arial",
					weight: "bold",
				};

				const regular = {
					family: "Arial",
				};

				const dateFont = { ...regular, size: size.h * 0.2 };

				const firstNamePartsFont =
					nameOrder === "last-first" ? bold : regular;
				const secondNamePartsFont =
					nameOrder === "first-last" ? bold : regular;

				let fontSizeDiff = 0.3;
				let nameDone = false;

				while (fontSizeDiff > 0.2) {
					const fontSize = size.h * fontSizeDiff;
					const firstFont = { ...firstNamePartsFont, size: fontSize };
					const secondFont = {
						...secondNamePartsFont,
						size: fontSize,
					};
					const suffixText = svg
						.text(suffix)
						.font({ ...regular, size: fontSize })
						.addTo(g);
					const firstNameText = svg
						.text(firstNamePart)
						.font(firstFont)
						.addTo(g);
					const secondNameText = svg
						.text(secondNamePart)
						.font(secondFont)
						.addTo(g);

					const suffixDimensions = suffixText.bbox();
					const firstNamePartDimensions = firstNameText.bbox();
					const secondNamePartDimensions = secondNameText.bbox();

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

					if (fitAll && fontSizeDiff === 0.3) {
						if (showSuffix) {
							suffixText.move(suffixLeft, itemTop + topSpace);
						} else {
							suffixText.remove();
						}

						firstNameText.move(
							firstNamePartLeft,
							itemTop + topSpace
						);
						secondNameText.move(
							secondNamePartLeft,
							itemTop + topSpace
						);

						svg.text(dates)
							.font(dateFont)
							.move(
								itemLeft + lineDatesStartSpace,
								itemBottom - bottomSpace
							)
							.addTo(g);

						nameDone = true;
						break;
					} else if (fit1stLine && fit2ndLine) {
						if (showSuffix) {
							suffixText.move(
								suffixLeft,
								itemTop + multilineStartSpace
							);
						} else {
							suffixText.remove();
						}

						firstNameText.move(
							firstNamePartLeft,
							itemTop + multilineStartSpace
						);
						secondNameText.move(
							suffixLeft,
							itemTop +
								multilineStartSpace +
								secondNamePartDimensions.h * 0.85
						);

						svg.text(dates)
							.font(dateFont)
							.move(
								itemLeft + lineDatesStartSpace,
								itemBottom - multilineBottomSpace
							)
							.addTo(g);
						nameDone = true;
						break;
					}
					fontSizeDiff = fontSizeDiff - 0.025;
					suffixText.remove();
					firstNameText.remove();
					secondNameText.remove();
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
					const firstNameParts = firstNameRawParts.map(
						(part, index) => ({
							bold: nameOrder === "last-first",
							part:
								index === 0 || firstNameRawParts.length <= 2
									? part
									: part.substring(0, 1),
						})
					);

					fontSizeDiff = 0.25;
					let textLeft = itemLeft + lineStartSpace;
					let textTop = itemTop + multilineStartSpace;
					let rowIndex = 0;

					(showSuffix && suffix
						? [{ bold: false, part: suffix }]
						: []
					)
						.concat(firstNameParts, secondNameParts)
						.forEach((part) => {
							const fontSize = size.h * fontSizeDiff;
							const font = {
								...(part.bold ? bold : regular),
								size: fontSize,
							};

							const partText = svg
								.text(part.part)
								.font(font)
								.addTo(g);
							const partDimensions = partText.bbox();

							const fitNext =
								textLeft + partDimensions.w <
								itemLeft + rightSpace;

							if (!fitNext) {
								textLeft = itemLeft + lineStartSpace;
								rowIndex++;
								textTop =
									itemTop +
									multilineStartSpace +
									partDimensions.h * 1.05 * rowIndex;
							}

							partText.move(textLeft, textTop);

							textLeft = textLeft + partDimensions.w + wordSpace;

							svg.text(dates)
								.font(dateFont)
								.move(
									itemLeft + lineDatesStartSpace,
									itemBottom - multilineBottomSpace
								)
								.addTo(g);
						});
				}

				let sexValue = "";
				if (sex === "F") {
					sexValue = "♀";
				} else if (sex === "M") {
					sexValue = "♂";
				}

				if (sexValue && sex) {
					const sexText = svg.text(sexValue).font({
						...regular,
						anchor: "middle",
						size: size.h * 0.4,
					});
					const sexDimensions = sexText.bbox();
					sexText.move(
						itemRight - topSpace * 2.5,
						itemBottom - size.h / 2 - sexDimensions.h / 2
					);
				}
			}
		);
	}

	return {
		svg: svg.svg(),
		left,
		top,
		width: rawWidth,
		height: rawHeight,
	};
};

export const getSvgColor = (colorCode?: Colors | Color) => {
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
