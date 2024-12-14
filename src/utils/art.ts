/* eslint-disable no-loop-func */

import {
	type ArtConfig,
	type PedigreeCollapse,
	type Settings,
} from "../store/main/reducers";
import { type Color } from "../types/colors";
import { type Position, type Size } from "../types/graphic-types";
import {
	SVG,
	type LineCommand,
	type CurveCommand,
	type Text,
	type Svg,
} from "@svgdotjs/svg.js";
import { nameFormatter } from "./name-formatter";
import { type IndiType } from "../classes/gedcom/classes/indi";
import parseColor from "parse-color";
import clamp from "lodash/clamp";
import { type IndiKey } from "../types/types";
import { FAMILY_COLORS } from "../colors";
import { ART_CONFIGS, MAX_GEN_FOR_SLICE_DRAWING } from "../constants/constants";
import { dateFormatter } from "./date-formatter";
import sum from "lodash/sum";

interface ArcConfigRecord {
	empty?: boolean;
	father?: IndiType;
	mother?: IndiType;
	collapse?: PedigreeCollapse;
}

type ArcConfig = Record<number, Record<number, ArcConfigRecord | undefined>>;

interface Portion {
	path: [LineCommand, CurveCommand] | [LineCommand, LineCommand];
	width: number;
	raw: Pick<ReturnType<typeof describeArc>, "start" | "end">;
}
interface Portions {
	half: Portion;
	oneThird: Portion;
	twoThird: Portion;
	date: Portion;
}

type Output = "print" | "screen";

export const art = async (
	path: `/images/${string}.svg`,
	indi: IndiType,
	output: Output = "print",
	settings?: Settings,
	background?: Color,
	title?: string | ((person: string) => string)
) => {
	const { showSuffix = true } = settings ?? {};
	const pathContent = await fetch(path);
	const drawSvg = await pathContent.text();
	const drawContent = SVG(drawSvg).find("#main")?.[0];

	const artConfig = ART_CONFIGS[path];

	if (!artConfig || !drawContent) {
		return;
	}
	const { size, fontFamily, fontColor = "#000" } = artConfig;

	const arcConfig = getArcConfig(indi, artConfig);

	const [width, height] = size;

	const svg = SVG().size(width, height);

	svg.rect(width, height)
		.addClass("bg-rect")
		.move(0, 0)
		.fill(background ?? "transparent");

	const g = svg.group();
	drawContent.addTo(g).addClass("raw-svg");

	if (title) {
		const [suffix, firstNamePart, secondNamePart] = nameFormatter(
			indi,
			settings
		).inOrder;
		const usedName = [
			...(showSuffix ? [suffix] : []),
			firstNamePart,
			secondNamePart,
		]
			.filter(Boolean)
			.join(" ");

		const usedTitle = typeof title === "function" ? title(usedName) : title;
		svg.textPath(
			svg
				.text(usedTitle)
				.font({
					family: fontFamily,
					size: 36,
				})
				.fill(fontColor),
			[
				["M", width / 2 - 300, 220],
				["A", 20, 4, 0, 0, 1, width / 2 + 300, 220],
			]
				.flat()
				.join(" ")
		)
			.attr("startOffset", "50%")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "middle");
	}

	const main = drawMain(svg, indi, artConfig, settings, output);
	main.rect.addClass(`main-person`);
	main.group.addTo(g);

	const fan = drawFan(svg, arcConfig, artConfig, settings, output);

	fan.addTo(g);

	return {
		svg: svg.svg(),
		width,
		height,
	};
};

const getArcConfig = (indi: IndiType, artConfig: ArtConfig) => {
	const familyColors = FAMILY_COLORS;
	const { pedigreeCollapse, collapsePlaceholder } = artConfig;
	const colorLightnesses: Partial<Record<Color, [number, number]>> = {};
	const colors = familyColors.slice(1);
	colors.forEach((c) => {
		const hsl = parseColor(c).hsl;
		colorLightnesses[c] = [hsl[2], 90];
	});

	const arcConfig: ArcConfig = {
		0: {
			0: {
				father: indi.getFathers().toList().index(0) as
					| IndiType
					| undefined,
				mother: indi.getMothers().toList().index(0) as
					| IndiType
					| undefined,
			},
		},
	};

	let generations = 0;
	const genIndices: Record<number, number[]> = {
		1: [0, 1],
	};
	const onFan: Record<IndiKey, ArcConfigRecord | undefined> = {};
	for (let i = 1; i <= generations + 1; i++) {
		let hasParent = false;

		if (genIndices[i]) {
			const newGenIndices: number[] = [];
			for (const j of genIndices[i]) {
				const prevArc = arcConfig[i - 1]?.[Math.floor(j / 2)];
				let currentIndi = j % 2 ? prevArc?.mother : prevArc?.father;

				if (currentIndi?.isUnknownAncestor()) {
					currentIndi = undefined;
				}

				let collapse: PedigreeCollapse | undefined =
					collapsePlaceholder === "hide" && !currentIndi
						? "hide"
						: undefined;
				if (
					(currentIndi?.id && onFan[currentIndi.id]) ||
					prevArc?.collapse
				) {
					collapse =
						collapsePlaceholder !== "show"
							? !currentIndi?.id
								? "hide"
								: pedigreeCollapse
							: undefined;
					currentIndi =
						pedigreeCollapse === "hide" ? undefined : currentIndi;
				}

				const father = currentIndi?.getFathers().toList().index(0) as
					| IndiType
					| undefined;
				const mother = currentIndi?.getMothers().toList().index(0) as
					| IndiType
					| undefined;

				let empty = true;

				if (father || i <= MAX_GEN_FOR_SLICE_DRAWING) {
					newGenIndices.push(j * 2);
				}

				if (mother || i < MAX_GEN_FOR_SLICE_DRAWING) {
					newGenIndices.push(j * 2 + 1);
				}

				if (currentIndi?.id) {
					empty = false;

					if (pedigreeCollapse === "hide" && onFan[currentIndi.id]) {
						empty = true;
					}
				}

				arcConfig[i] = {
					...arcConfig[i],
					[j]: {
						empty,
						father,
						mother,
						collapse,
					},
				};

				if (currentIndi?.id && !onFan[currentIndi.id]) {
					onFan[currentIndi.id] = arcConfig[i][j];
				}

				if (!!father || !!mother) {
					hasParent = true;
				}
			}

			if (newGenIndices.length) {
				genIndices[i + 1] = newGenIndices;
			}
		}

		if (!hasParent) {
			break;
		} else {
			generations++;
		}
	}

	return arcConfig;
};

const drawMain = (
	svg: Svg,
	indi: IndiType,
	artConfig: ArtConfig,
	settings?: Settings,
	output: Output = "print"
) => {
	const { homeRectangle, fontColor } = artConfig;

	const [centerX, centerY, width, height] = homeRectangle;
	const { poolId = 0 } = settings ?? {};
	const group = svg.group();
	const x = centerX - width / 2;
	const y = centerY - height / 2;
	const rect = svg
		.rect(homeRectangle[2], homeRectangle[3])
		.move(x, y)
		.addTo(group)
		.fill("transparent");

	const texts = renderTextInArea(
		svg,
		indi,
		x,
		y,
		width,
		height,
		artConfig,
		settings,
		fontColor
	);
	texts.addTo(group);

	const usedLink = output === "print" ? indi.link(poolId) : `/${indi.id!}`;
	if (usedLink) {
		svg.rect(width, height)
			.fill("transparent")
			.move(x, y)
			.addTo(group)
			.linkTo(usedLink);
	}

	return { group, rect };
};

const drawFan = (
	svg: Svg,
	arcConfig: ArcConfig,
	artConfig: ArtConfig,
	settings?: Settings,
	output: Output = "print",
	avoidReverse?: "normal" | "reversed"
) => {
	const {
		start,
		totalAngle,
		maxGeneration: max,
		firstSliceWeight,
		thinSliceWeight,
		wideSliceWeight,
		fontColor = "#000",
		midGap,
		arcGap,
		sliceGap,
		thinCount,
	} = artConfig;
	const { poolId = 0 } = settings ?? {};
	const maxGeneration =
		max === undefined ? Number(Object.keys(arcConfig).reverse()[0]) : max;

	const endAngle = totalAngle / 2;
	const startAngle = -endAngle;
	const [x, y] = start;
	const r = 100;
	const a = startAngle;

	const thins = thinCount;
	const firstWeight = firstSliceWeight;
	const thinWeight = thinSliceWeight;
	const wideWeight = wideSliceWeight;
	const fanGroup = svg.group();

	let arcGaps = Array.isArray(arcGap) ? arcGap : arcGap ? [arcGap] : [];
	arcGaps = Object.assign(
		new Array(maxGeneration).fill(
			arcGaps[arcGaps.length - 1] || 0,
			arcGaps.length,
			maxGeneration
		),
		arcGaps
	);

	for (let i = 1; i <= maxGeneration; i++) {
		const amountOfArcs = Math.pow(2, i);
		const degree = totalAngle / amountOfArcs;

		const isWide = i > thins;
		const isWideThin = i > thins + 3;
		const isWideUltraThin = i > thins + 4;
		const weight = i === 1 ? firstWeight : isWide ? wideWeight : thinWeight;

		const currWideLanes = i - 1 > thins ? i - 1 - thins : 0;
		const currThinLanes = i - 1 - currWideLanes;
		const usedArcGap = sum(arcGaps.slice(0, i - 1));

		const genG = svg.group().addTo(fanGroup).addClass(`gen gen-${i}`);

		const middleIndex = amountOfArcs / 2;
		for (let j = 0; j < amountOfArcs; j++) {
			const degreeDiff = amountOfArcs > 2 ? sliceGap : 0;
			const startDegreeGap =
				j === 0 || j === middleIndex ? 0 : degree * degreeDiff;
			const endDegreeGap =
				j === amountOfArcs - 1 || j === middleIndex - 1
					? 0
					: degree * degreeDiff;

			const pathG = svg.group().addTo(genG);
			const lane = describeArcLane(
				x + (j < middleIndex ? -midGap : midGap) / 2,
				y,
				r +
					usedArcGap +
					(i === 1 ? 0 : firstWeight) +
					(currThinLanes - (i > 1 ? 1 : 0)) * thinWeight +
					currWideLanes * wideWeight,
				a + j * degree + startDegreeGap,
				a + (j + 1) * degree - endDegreeGap,
				weight,
				true
			);

			const currentArcConfig = arcConfig[i]?.[j];

			const isEmpty = currentArcConfig?.empty;

			if (currentArcConfig?.collapse === "hide") {
				continue;
			}

			const indi =
				arcConfig[i - 1]?.[Math.floor(j / 2)]?.[
					j % 2 ? "mother" : "father"
				];

			if (
				!isEmpty &&
				indi &&
				lane.lanes &&
				lane.lanesReverse &&
				lane.slices &&
				lane.slicesReverse
			) {
				let usedSlices = lane.slices;
				let usedLanes = lane.lanes;
				let dir: "normal" | "reversed" = "normal";
				let dirSlice: "normal" | "reversed" = "normal";
				const laneHalf = usedLanes.half.raw;
				const sliceHalf = usedSlices.half.raw;
				if (
					(!avoidReverse &&
						laneHalf &&
						laneHalf.start.y <= y + r * 2 &&
						laneHalf.end.y <= y + r * 2) ||
					avoidReverse === "normal"
				) {
					usedLanes = lane.lanesReverse;
					dir = "reversed";
				}
				if (
					(!avoidReverse && sliceHalf && sliceHalf.start.x <= x) ||
					avoidReverse === "reversed"
				) {
					usedSlices = lane.slicesReverse;
					dirSlice = "reversed";
				}

				const texts = renderTextInArc(
					svg,
					indi,
					isWide ? usedSlices : usedLanes,
					weight,
					artConfig,
					settings,
					isWide ? dirSlice : dir,
					clamp(
						(isWide ? usedLanes.half.width * 1.6 : weight * 0.8) /
							((isWideUltraThin
								? 2.4
								: isWideThin
								? 3.2
								: isWide
								? 3.8
								: 2) *
								1.2),
						1,
						36
					)
				);

				texts.forEach((text) => {
					text.fill(fontColor).addTo(pathG);
				});

				const usedLink =
					output === "print" ? indi.link(poolId) : `/${indi.id!}`;
				if (usedLink) {
					svg.path(lane.path)
						.fill("transparent")
						.addTo(pathG)
						.linkTo(usedLink);
				}
			}
		}
	}

	return fanGroup;
};

const renderTextInArc = (
	svg: Svg,
	indi: IndiType,
	portions: Portions,
	weight: number,
	artConfig: ArtConfig,
	settings?: Settings,
	dir: "normal" | "reversed" = "normal",
	defaultFontSize = 20
) => {
	const { fontFamily } = artConfig;
	const { nameOrder = "last-first", showSuffix = true } = settings ?? {};

	const widthFix = 10;
	const widths = {
		half: clamp(
			portions.half.width - widthFix,
			10,
			portions.half.width - widthFix
		),
		oneThird: clamp(
			portions.oneThird.width - widthFix,
			10,
			portions.oneThird.width - widthFix
		),
		twoThird: clamp(
			portions.oneThird.width - widthFix,
			10,
			portions.twoThird.width - widthFix
		),
	};

	const [suffix, firstNamePart, secondNamePart] = nameFormatter(
		indi,
		settings
	).inOrder;

	const dates = dateFormatter(indi, settings?.showMarriages).inOrder;

	const size = { w: widths.oneThird, h: weight };
	const multilineStartSpace = size.w * 0.015;
	const wordSpace = size.w * 0.04;
	const rightSpace = size.w;
	const itemLeft = size.w / 2;
	const itemTop = size.h / 2;

	const bold = {
		family: fontFamily,
		weight: "bold",
	};

	const regular = {
		family: fontFamily,
	};

	const dateFont = { ...regular, size: defaultFontSize * 0.5 };

	const firstNamePartsFont = nameOrder === "last-first" ? bold : regular;
	const secondNamePartsFont = nameOrder === "first-last" ? bold : regular;

	let fontSize = defaultFontSize;
	let nameDone = false;

	while (fontSize > 1) {
		const firstFont = { ...firstNamePartsFont, size: fontSize };
		const secondFont = {
			...secondNamePartsFont,
			size: fontSize,
		};
		const suffixText = svg
			.text(suffix)
			.font({ ...regular, size: fontSize });
		const firstNameText = svg.text(firstNamePart).font(firstFont);
		const secondNameText = svg.text(secondNamePart).font(secondFont);

		const suffixDimensions = suffixText.bbox();
		const firstNamePartDimensions = firstNameText.bbox();
		const secondNamePartDimensions = secondNameText.bbox();

		const suffixLeft = itemLeft;
		const firstNamePartLeft =
			suffixLeft +
			(suffix && showSuffix ? suffixDimensions.w + wordSpace / 2 : 0);
		const secondNamePartLeft =
			firstNamePartLeft +
			(secondNamePart ? firstNamePartDimensions.w + wordSpace / 2 : 0);

		const fitAll =
			secondNamePartLeft +
				(secondNamePart ? secondNamePartDimensions.w : 0) <
			itemLeft + rightSpace;
		const fit1stLine =
			firstNamePartLeft +
				(firstNamePart ? firstNamePartDimensions.w : 0) <
			itemLeft + rightSpace;
		const fit2ndLine =
			suffixLeft + (secondNamePart ? secondNamePartDimensions.w : 0) <
			itemLeft + rightSpace;

		if (fitAll && fontSize === defaultFontSize) {
			const nameText = svg
				.text((add) => {
					let space = "";
					if (showSuffix && suffix) {
						add.tspan(suffix).font({ ...regular, size: fontSize });
						space = " ";
					}

					if (firstNamePart) {
						add.tspan(`${space}${firstNamePart}`).font({
							...firstNamePartsFont,
							size: fontSize,
						});
						space = " ";
					}

					if (secondNamePart) {
						add.tspan(`${space}${secondNamePart}`).font({
							...secondNamePartsFont,
							size: fontSize,
						});
					}
				})
				.addClass("name-fit");

			svg.textPath(nameText, portions.half.path.flat().join(" "))
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");

			suffixText.remove();
			firstNameText.remove();
			secondNameText.remove();

			const dateText = svg.text(dates).font(dateFont);
			svg.textPath(dateText, portions.date.path.flat().join(" "))
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");

			nameDone = true;

			return [nameText, dateText];
		} else if (fit1stLine && fit2ndLine) {
			nameDone = true;

			const nameTextFirstLine = svg
				.text((add) => {
					let space = "";
					if (showSuffix && suffix) {
						add.tspan(suffix).font({ ...regular, size: fontSize });
						space = " ";
					}

					if (firstNamePart) {
						add.tspan(`${space}${firstNamePart}`).font({
							...firstNamePartsFont,
							size: fontSize,
						});
					}
				})
				.addClass("first-name-part-no-fit");

			const nameTextSecondLine = svg
				.text((add) => {
					if (secondNamePart) {
						add.tspan(secondNamePart).font({
							...secondNamePartsFont,
							size: fontSize,
						});
					}
				})
				.addClass("second-name-part-no-fit");

			svg.textPath(
				dir === "normal" ? nameTextFirstLine : nameTextSecondLine,
				portions.oneThird.path.flat().join(" ")
			)
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");

			svg.textPath(
				dir === "reversed" ? nameTextFirstLine : nameTextSecondLine,
				portions.twoThird.path.flat().join(" ")
			)
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");

			suffixText.remove();
			firstNameText.remove();
			secondNameText.remove();

			const dateText = svg.text(dates).font(dateFont);
			svg.textPath(dateText, portions.date.path.flat().join(" "))
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");

			nameDone = true;

			return [nameTextFirstLine, nameTextSecondLine, dateText];
		}

		fontSize = fontSize < 4 ? fontSize - 0.2 : fontSize - 1;
		suffixText.remove();
		firstNameText.remove();
		secondNameText.remove();
	}

	if (!nameDone) {
		const secondNameRawParts = secondNamePart?.split(" ") ?? [];
		const secondNameParts = secondNameRawParts.map((part, index) => ({
			bold: nameOrder !== "last-first",
			part:
				index === 0 || secondNameRawParts.length <= 2
					? part
					: part.substring(0, 1),
		}));
		const firstNameRawParts = firstNamePart?.split(" ") ?? [];
		const firstNameParts = firstNameRawParts.map((part, index) => ({
			bold: nameOrder === "last-first",
			part:
				index === 0 || firstNameRawParts.length <= 2
					? part
					: part.substring(0, 1),
		}));
		fontSize = defaultFontSize;
		let textLeft = itemLeft;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		let textTop = itemTop;
		let rowIndex = 0;
		const textLines: Array<
			Array<{ text: string; font: { size: number; family: string } }>
		> = [[]];
		(showSuffix && suffix ? [{ bold: false, part: suffix }] : [])
			.concat(firstNameParts, secondNameParts)
			.forEach((part) => {
				const font = {
					...(part.bold ? bold : regular),
					size: fontSize,
				};
				const partText = svg.text(part.part).font(font);
				const partDimensions = partText.bbox();
				const fitNext =
					textLeft + partDimensions.w < itemLeft + rightSpace;
				if (!fitNext) {
					textLeft = itemLeft;
					rowIndex++;
					textTop =
						itemTop +
						multilineStartSpace +
						partDimensions.h * 1.05 * rowIndex;
					textLines.push([]);
				}
				const lastLineItem = textLines[textLines.length - 1];
				lastLineItem.push({ text: part.part, font });
				partText.remove();
				textLeft = textLeft + partDimensions.w + wordSpace;
			});
		const firstTextLine = textLines[0];
		const secondTextLine = textLines[1];

		const nameTextFirstLine = firstTextLine?.length
			? svg
					.text((add) => {
						let space = "";

						firstTextLine.forEach((part) => {
							add.tspan(`${space}${part.text}`).font(part.font);

							if (part.text) {
								space = " ";
							}
						});
					})
					.addClass("first-name-part-splitted")
			: undefined;

		const nameTextSecondLine = secondTextLine?.length
			? svg
					.text((add) => {
						let space = "";

						secondTextLine.forEach((part) => {
							add.tspan(`${space}${part.text}`).font(part.font);

							if (part.text) {
								space = " ";
							}
						});
					})
					.addClass("second-name-part-splitted")
			: undefined;

		const lines = (
			dir === "normal"
				? [nameTextFirstLine, nameTextSecondLine]
				: [nameTextSecondLine, nameTextFirstLine]
		).filter(Boolean) as [] | [Text] | [Text, Text];

		if (lines.length === 1) {
			svg.textPath(lines[0]!, portions.half.path.flat().join(" "))
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");
		} else if (lines.length >= 2) {
			svg.textPath(lines[0]!, portions.oneThird.path.flat().join(" "))
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");

			svg.textPath(lines[1]!, portions.twoThird.path.flat().join(" "))
				.attr("startOffset", "50%")
				.attr("dominant-baseline", "middle")
				.attr("text-anchor", "middle");
		}

		const dateText = svg.text(dates).font(dateFont);
		svg.textPath(dateText, portions.date.path.flat().join(" "))
			.attr("startOffset", "50%")
			.attr("dominant-baseline", "middle")
			.attr("text-anchor", "middle");

		return [...lines, dateText];
	}

	return [];
};

const renderTextInArea = (
	svg: Svg,
	indi: IndiType,
	x: number,
	y: number,
	w: number,
	h: number,
	artConfig: ArtConfig,
	settings?: Settings,
	color: Color = "#000"
) => {
	const { fontFamily } = artConfig;
	const { nameOrder = "last-first", showSuffix = true } = settings ?? {};

	const textGroup = svg.group();

	const [suffix, firstNamePart, secondNamePart] = nameFormatter(
		indi,
		settings
	).inOrder;

	const dates = dateFormatter(indi, settings?.showMarriages).inOrder;

	const size = { w, h };
	const multilineStartSpace = size.w * 0.015;
	const wordSpace = size.w * 0.04;
	const rightSpace = size.w;
	const itemLeft = x + w / 2;
	const itemTop = y + h / 2;

	const bold = {
		family: fontFamily,
		weight: "bold",
	};

	const regular = {
		family: fontFamily,
	};

	const firstNamePartsFont = nameOrder === "last-first" ? bold : regular;
	const secondNamePartsFont = nameOrder === "first-last" ? bold : regular;

	const origFontSizeDiff = 0.7;
	let fontSizeDiff = origFontSizeDiff;
	let nameDone = false;

	const dateFont = { ...regular, size: size.h * fontSizeDiff * 0.3 };

	while (fontSizeDiff > 0.15) {
		const fontSize = size.h * fontSizeDiff;
		const firstFont = { ...firstNamePartsFont, size: fontSize };
		const secondFont = {
			...secondNamePartsFont,
			size: fontSize,
		};
		const suffixText = svg
			.text(suffix)
			.font({ ...regular, size: fontSize })
			.fill(color)
			.addTo(textGroup);
		const firstNameText = svg
			.text(firstNamePart)
			.font(firstFont)
			.fill(color)
			.addTo(textGroup);
		const secondNameText = svg
			.text(secondNamePart)
			.font(secondFont)
			.fill(color)
			.addTo(textGroup);

		const suffixDimensions = suffixText.bbox();
		const firstNamePartDimensions = firstNameText.bbox();
		const secondNamePartDimensions = secondNameText.bbox();

		const suffixLeft = itemLeft;
		const firstNamePartLeft =
			suffixLeft +
			(suffix && showSuffix ? suffixDimensions.w + wordSpace / 2 : 0);
		const secondNamePartLeft =
			firstNamePartLeft +
			(secondNamePart ? firstNamePartDimensions.w + wordSpace / 2 : 0);

		const fitAll =
			secondNamePartLeft +
				(secondNamePart ? secondNamePartDimensions.w : 0) <
			itemLeft + rightSpace;
		const fit1stLine =
			firstNamePartLeft +
				(firstNamePart ? firstNamePartDimensions.w : 0) <
			itemLeft + rightSpace;
		const fit2ndLine =
			suffixLeft + (secondNamePart ? secondNamePartDimensions.w : 0) <
			itemLeft + rightSpace;

		if (fitAll && fontSizeDiff === origFontSizeDiff) {
			const fixedLeft =
				(secondNamePartLeft + secondNamePartDimensions.w - suffixLeft) /
				2;
			const fixedTop =
				(itemTop + secondNamePartDimensions.h - itemTop) / 2;
			if (showSuffix) {
				suffixText.move(suffixLeft - fixedLeft, itemTop - fixedTop);
			} else {
				suffixText.remove();
			}

			firstNameText.move(
				firstNamePartLeft - fixedLeft,
				itemTop - fixedTop
			);
			secondNameText.move(
				secondNamePartLeft - fixedLeft,
				itemTop - fixedTop
			);

			nameDone = true;
			break;
		} else if (fit1stLine && fit2ndLine) {
			const fixedLeft1stLine =
				(firstNamePartLeft + firstNamePartDimensions.w - suffixLeft) /
				2;
			const fixedLeft2ndLine = secondNamePartDimensions.w / 2;
			const fixedTop = (secondNamePartDimensions.h * 1.85) / 2;
			if (showSuffix) {
				suffixText.move(
					suffixLeft - fixedLeft1stLine,
					itemTop - fixedTop
				);
			} else {
				suffixText.remove();
			}

			firstNameText.move(
				firstNamePartLeft - fixedLeft1stLine,
				itemTop - fixedTop
			);
			secondNameText.move(
				suffixLeft - fixedLeft2ndLine,
				itemTop + secondNamePartDimensions.h * 0.85 - fixedTop
			);

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
		const secondNameParts = secondNameRawParts.map((part, index) => ({
			bold: nameOrder !== "last-first",
			part:
				index === 0 || secondNameRawParts.length <= 2
					? part
					: part.substring(0, 1),
		}));

		const firstNameRawParts = firstNamePart?.split(" ") ?? [];
		const firstNameParts = firstNameRawParts.map((part, index) => ({
			bold: nameOrder === "last-first",
			part:
				index === 0 || firstNameRawParts.length <= 2
					? part
					: part.substring(0, 1),
		}));

		fontSizeDiff = 0.6;
		let textLeft = itemLeft;
		let textTop = itemTop;
		let rowIndex = 0;

		const textLines: Array<
			Array<{ text: Text; dimension: Position & Size }>
		> = [[]];
		(showSuffix && suffix ? [{ bold: false, part: suffix }] : [])
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
					.addTo(textGroup);
				const partDimensions = partText.bbox();

				const fitNext =
					textLeft + partDimensions.w < itemLeft + rightSpace;

				if (!fitNext) {
					textLeft = itemLeft;
					rowIndex++;
					textTop =
						itemTop +
						multilineStartSpace +
						partDimensions.h * 1.05 * rowIndex;

					textLines.push([]);
				}

				const lastLineItem = textLines[textLines.length - 1];

				lastLineItem.push({
					text: partText,
					dimension: {
						w: partDimensions.w,
						h: partDimensions.h,
						x: textLeft,
						y: textTop,
					},
				});

				textLeft = textLeft + partDimensions.w + wordSpace;
			});

		const firstTextLineItem = textLines[0][0];
		const lastTextLine = textLines[textLines.length - 1];
		const lastTextLineItem = lastTextLine[lastTextLine.length - 1];
		const fixedTop =
			(lastTextLineItem.dimension.y +
				lastTextLineItem.dimension.h -
				firstTextLineItem.dimension.y) /
			2;

		textLines.forEach((textLine) => {
			const firstItem = textLine[0];
			const lastItem = textLine[textLine.length - 1];
			const fixedLeft =
				(lastItem.dimension.x +
					lastItem.dimension.w -
					firstItem.dimension.x) /
				2;

			textLine.forEach((text) => {
				text.text.move(
					text.dimension.x - fixedLeft,
					text.dimension.y - fixedTop
				);
			});
		});
	}

	const dateText = svg.text(dates).font(dateFont).add(textGroup);
	const dateTextDimensions = dateText.bbox();
	dateText.move(itemLeft - dateTextDimensions.w / 2, itemTop + h / 2);

	return textGroup;
};

const polarToCartesian = (
	centerX: number,
	centerY: number,
	radius: number,
	angleInDegrees: number
) => {
	const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

	return {
		x: centerX + radius * Math.cos(angleInRadians),
		y: centerY + radius * Math.sin(angleInRadians),
	};
};

const describeArc = (
	x: number,
	y: number,
	radius: number,
	startAngle: number,
	endAngle: number,
	backward?: boolean
) => {
	const [sA, eA] = backward ? [endAngle, startAngle] : [startAngle, endAngle];
	const start = polarToCartesian(x, y, radius, eA);
	const end = polarToCartesian(x, y, radius, sA);

	const largeArcFlag = eA - sA <= 180 ? 0 : 1;

	const path: [LineCommand, CurveCommand] = [
		["M", start.x, start.y],
		["A", radius, radius, 0, largeArcFlag, backward ? 1 : 0, end.x, end.y],
	];

	return {
		path,
		start,
		end,
		radius,
		angle: Math.abs(eA - sA),
		startAngle,
		endAngle,
	};
};

const describeArcLane = (
	x: number,
	y: number,
	r: number,
	sA: number,
	eA: number,
	w: number,
	usePortions?: boolean
) => {
	const inner = describeArc(x, y, r, sA, eA);
	const outer = describeArc(x, y, r + w, sA, eA, true);
	let lanes: Portions | undefined;
	let lanesReverse: Portions | undefined;
	let slices: Portions | undefined;
	let slicesReverse: Portions | undefined;

	if (usePortions) {
		const totalAngle = Math.abs(eA - sA);
		const halfAngle = totalAngle / 2;
		const thirdAngle = totalAngle / 3;
		const dateArcAngle = totalAngle / 10;
		const halfWidth = w / 2;
		const thirdWidth = w / 3;
		const dateArcWidth = w / 10;
		const halfRaw = {
			normal: describeArc(x, y, r + halfWidth, sA, eA),
			reversed: describeArc(x, y, r + halfWidth, sA, eA, true),
		};
		const oneThridRaw = {
			normal: describeArc(x, y, r + thirdWidth, sA, eA),
			reversed: describeArc(x, y, r + thirdWidth, sA, eA, true),
		};
		const twoThirdRaw = {
			normal: describeArc(x, y, r + thirdWidth * 2, sA, eA),
			reversed: describeArc(x, y, r + thirdWidth * 2, sA, eA, true),
		};
		const dateArcRaw = {
			normal: describeArc(x, y, r + dateArcWidth * 9, sA, eA),
			reversed: describeArc(x, y, r + dateArcWidth, sA, eA, true),
		};

		lanes = {
			half: {
				path: halfRaw.normal.path,
				width: Math.abs(
					halfRaw.normal.angle *
						(Math.PI / 180) *
						halfRaw.normal.radius
				),
				raw: halfRaw.normal,
			},
			oneThird: {
				path: oneThridRaw.normal.path,
				width: Math.abs(
					oneThridRaw.normal.angle *
						(Math.PI / 180) *
						oneThridRaw.normal.radius
				),
				raw: oneThridRaw.normal,
			},
			twoThird: {
				path: twoThirdRaw.normal.path,
				width: Math.abs(
					twoThirdRaw.normal.angle *
						(Math.PI / 180) *
						twoThirdRaw.normal.radius
				),
				raw: twoThirdRaw.normal,
			},
			date: {
				path: dateArcRaw.normal.path,
				width: Math.abs(
					dateArcRaw.normal.angle *
						(Math.PI / 180) *
						dateArcRaw.normal.radius
				),
				raw: dateArcRaw.normal,
			},
		};
		lanesReverse = {
			half: {
				...lanes.half,
				path: halfRaw.reversed.path,
			},
			oneThird: {
				...lanes.oneThird,
				path: oneThridRaw.reversed.path,
			},
			twoThird: {
				...lanes.twoThird,
				path: twoThirdRaw.reversed.path,
			},
			date: {
				...lanes.date,
				path: dateArcRaw.reversed.path,
			},
		};

		const angleFix = 1; // no need for now, this is why it's 1
		const innerHalf = describeArc(x, y, r, sA, sA + halfAngle * angleFix);
		const outerHalf = describeArc(
			x,
			y,
			r + w,
			sA,
			sA + halfAngle * angleFix,
			true
		);

		const innerOneThird = describeArc(
			x,
			y,
			r,
			sA,
			sA + thirdAngle * angleFix
		);
		const outerOneThird = describeArc(
			x,
			y,
			r + w,
			sA,
			sA + thirdAngle * angleFix,
			true
		);
		const innerTwoThird = describeArc(
			x,
			y,
			r,
			sA + thirdAngle,
			sA + thirdAngle + thirdAngle * angleFix
		);
		const outerTwoThird = describeArc(
			x,
			y,
			r + w,
			sA + thirdAngle,
			sA + thirdAngle + thirdAngle * angleFix,
			true
		);

		const innerDateArc = describeArc(
			x,
			y,
			r,
			sA,
			sA + dateArcAngle * angleFix
		);
		const outerDateArc = describeArc(
			x,
			y,
			r + w,
			sA,
			sA + dateArcAngle * angleFix,
			true
		);

		const innerLastDatePart = describeArc(
			x,
			y,
			r,
			sA + dateArcAngle * 8,
			sA + dateArcAngle * 8 + dateArcAngle * angleFix
		);
		const outerLastDatePart = describeArc(
			x,
			y,
			r + w,
			sA + dateArcAngle * 8,
			sA + dateArcAngle * 8 + dateArcAngle * angleFix,
			true
		);

		slices = {
			half: {
				path: [
					["M", innerHalf.start.x, innerHalf.start.y],
					["L", outerHalf.end.x, outerHalf.end.y],
				],
				width: Math.abs(
					Math.sqrt(
						Math.pow(innerHalf.start.x - outerHalf.end.x, 2) +
							Math.pow(innerHalf.start.y - outerHalf.end.y, 2)
					)
				),
				raw: {
					start: innerHalf.start,
					end: outerHalf.end,
				},
			},
			oneThird: {
				path: [
					["M", innerOneThird.start.x, innerOneThird.start.y],
					["L", outerOneThird.end.x, outerOneThird.end.y],
				],
				width: Math.abs(
					Math.sqrt(
						Math.pow(
							innerOneThird.start.x - outerOneThird.end.x,
							2
						) +
							Math.pow(
								innerOneThird.start.y - outerOneThird.end.y,
								2
							)
					)
				),
				raw: {
					start: innerOneThird.start,
					end: outerOneThird.end,
				},
			},
			twoThird: {
				path: [
					["M", innerTwoThird.start.x, innerTwoThird.start.y],
					["L", outerTwoThird.end.x, outerTwoThird.end.y],
				],
				width: Math.abs(
					Math.sqrt(
						Math.pow(
							innerTwoThird.start.x - outerTwoThird.end.x,
							2
						) +
							Math.pow(
								innerTwoThird.start.y - outerTwoThird.end.y,
								2
							)
					)
				),
				raw: {
					start: innerTwoThird.start,
					end: outerTwoThird.end,
				},
			},
			date: {
				path: [
					["M", innerLastDatePart.start.x, innerLastDatePart.start.y],
					["L", outerLastDatePart.end.x, outerLastDatePart.end.y],
				],
				width: Math.abs(
					Math.sqrt(
						Math.pow(
							innerLastDatePart.start.x - outerLastDatePart.end.x,
							2
						) +
							Math.pow(
								innerLastDatePart.start.y -
									outerLastDatePart.end.y,
								2
							)
					)
				),
				raw: {
					start: innerLastDatePart.end,
					end: outerLastDatePart.start,
				},
			},
		};

		slicesReverse = {
			half: {
				...slices.half,
				path: [
					["M", outerHalf.end.x, outerHalf.end.y],
					["L", innerHalf.start.x, innerHalf.start.y],
				],
				raw: {
					start: outerHalf.start,
					end: innerHalf.end,
				},
			},
			oneThird: {
				...slices.oneThird,
				path: [
					["M", outerOneThird.end.x, outerOneThird.end.y],
					["L", innerOneThird.start.x, innerOneThird.start.y],
				],
				raw: {
					start: outerOneThird.start,
					end: innerOneThird.end,
				},
			},
			twoThird: {
				...slices.twoThird,
				path: [
					["M", outerTwoThird.end.x, outerTwoThird.end.y],
					["L", innerTwoThird.start.x, innerTwoThird.start.y],
				],
				raw: {
					start: outerTwoThird.start,
					end: innerTwoThird.end,
				},
			},
			date: {
				...slices.date,
				path: [
					["M", outerDateArc.end.x, outerDateArc.end.y],
					["L", innerDateArc.start.x, innerDateArc.start.y],
				],
				raw: {
					start: outerDateArc.start,
					end: innerDateArc.end,
				},
			},
		};
	}

	const path: [
		LineCommand,
		CurveCommand,
		LineCommand,
		CurveCommand,
		LineCommand,
	] = [
		...inner.path,
		["L", outer.start.x, outer.start.y],
		outer.path[1],
		["L", inner.start.x, inner.start.y],
	];

	return {
		path,
		inner,
		outer,
		lanes,
		lanesReverse,
		slices,
		slicesReverse,
	};
};
