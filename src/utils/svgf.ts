/* eslint-disable no-loop-func */

import { type PedigreeCollapse, type Settings } from "../store/main/reducers";
import { Individuals } from "../classes/gedcom/classes/indis";
import { type Color } from "../types/colors";
import { type Position, type Size } from "../types/graphic-types";
import { getContrastColor } from "./colors";
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
import {
	FAN_THIN_WEIGHT,
	FAN_WIDE_WEIGHT,
	FAN_CHILDREN_WEIGHT,
	FAN_TOTAL_ANGLE,
	FAN_HOME_DIAMETER,
	FAN_PEDIGREE_COLLAPSE,
	FAN_PLACEHOLDERS,
	MAX_GEN_FOR_SLICE_DRAWING,
} from "../constants/constants";
import { dateFormatter } from "./date-formatter";
import { AGE_DESC } from "../constants/orders";

interface ArcConfigRecord {
	color?: string;
	fontOpacity?: number;
	strip?: string;
	rootColor?: string;
	father?: IndiType;
	mother?: IndiType;
	children?: Individuals;
	empty?: boolean;
	opacity?: number;
	collapse?: PedigreeCollapse;
	placeholder?: {
		start: number;
		end: number;
	};
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

export const svgf = (
	indi: IndiType,
	output: Output = "print",
	settings?: Settings,
	background?: Color
) => {
	const {
		thinSliceWeight = FAN_THIN_WEIGHT,
		wideSliceWeight = FAN_WIDE_WEIGHT,
		childrenSliceWeight = FAN_CHILDREN_WEIGHT,
		totalAngle: mainAngle = FAN_TOTAL_ANGLE,
		homeDiameter = FAN_HOME_DIAMETER,
	} = settings ?? {};
	const children = indi.getChildren().orderBy(AGE_DESC);

	const wideLanesFrom = 4;
	const arcConfig = getArcConfig(indi, settings);
	const childArcConfig = getArcConfig(children, settings);
	const generations = Number(Object.keys(arcConfig).reverse()[0]);
	const wideLanes =
		generations > wideLanesFrom ? generations - wideLanesFrom : 0;
	const thinLanes = generations - wideLanes;

	const childrenAngle = clamp(360 - mainAngle, 90, 180);
	let totalAngle = mainAngle;

	if (children.length && 360 - childrenAngle < totalAngle) {
		totalAngle = 360 - childrenAngle;
	}

	const endAngle = totalAngle / 2;
	const startAngle = -endAngle;
	const stagePadding = 20;
	const lineWeight = 0.2;

	const radius = homeDiameter / 2;

	const arcEdges = describeArc(
		0,
		0,
		radius + wideLanes * wideSliceWeight + thinLanes * thinSliceWeight,
		0,
		endAngle,
		true
	);

	const arcChildEdges = describeArc(
		0,
		0,
		radius + childrenSliceWeight,
		endAngle,
		endAngle + childrenAngle / 2,
		true
	);

	const bottom = Math.max(
		arcEdges.end.y,
		...(children.length ? [arcChildEdges.end.y] : []),
		radius
	);

	const width =
		homeDiameter +
		thinLanes * thinSliceWeight * 2 +
		wideLanes * wideSliceWeight * 2 +
		stagePadding * 2;
	const height = Math.abs(bottom - arcEdges.start.y) + stagePadding * 2;

	const centerX = width / 2 - radius;
	const centerY = height - bottom - radius - stagePadding;

	const arcX = centerX + radius;
	const arcY = centerY + radius;

	const svg = SVG().size(width, height);

	svg.rect(width, height)
		.move(0, 0)
		.fill(background ?? "transparent");

	const g = svg.group();

	const mainCircle = drawMainCircle(
		svg,
		centerX,
		centerY,
		homeDiameter,
		indi,
		settings,
		output
	);
	mainCircle.circle
		.addClass(`main-circle`)
		.stroke({ width: lineWeight, color: "black" });
	mainCircle.group.addTo(g);

	const fan = drawFan(
		svg,
		arcX,
		arcY,
		startAngle,
		radius,
		{
			thins: thinLanes,
			wides: wideLanes,
			thinWeight: thinSliceWeight,
			wideWeight: wideSliceWeight,
		},
		totalAngle,
		arcConfig,
		settings,
		output
	);

	fan.addTo(g);

	if (children.length) {
		const childrenFan = drawFan(
			svg,
			arcX,
			arcY,
			endAngle,
			radius,
			childrenSliceWeight,
			childrenAngle,
			childArcConfig,
			settings,
			output,
			"reversed"
		);

		childrenFan.addTo(g);
	}

	return {
		svg: svg.svg(),
		width,
		height,
	};
};

const arcCache: Record<string, ArcConfig> = {};

const getArcConfig = (indi: IndiType | Individuals, settings?: Settings) => {
	const {
		familyColors = FAMILY_COLORS,
		pedigreeCollapse = FAN_PEDIGREE_COLLAPSE,
		collapsePlaceholder = FAN_PLACEHOLDERS,
	} = settings ?? {};
	const defLightness = [60, 90] as [number, number];
	const colorLightnesses: Partial<Record<Color, [number, number]>> = {};
	const colors = familyColors.slice(1);
	colors.forEach((c) => {
		const hsl = parseColor(c).hsl;
		colorLightnesses[c] = [hsl[2], 90];
	});

	const isChildren = indi instanceof Individuals;

	if (!isChildren && indi.id && arcCache[indi.id]) {
		return arcCache[indi.id];
	}

	const arcConfig: ArcConfig = {
		0: isChildren
			? {
					0: {
						color: familyColors[0],
						children: indi,
					},
			  }
			: {
					0: {
						color: "white",
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
	for (let i = 1, k = 0; i <= generations + 1; i++) {
		const children = arcConfig[i - 1]?.[0]?.children;
		let hasParent = false;
		if (children?.length) {
			const amountOfArcs = children.length;
			for (let j = 0; j < amountOfArcs; j++) {
				arcConfig[i] = {
					...arcConfig[i],
					[j]: {
						color: familyColors[0],
					},
				};
			}
		} else if (genIndices[i]) {
			const newGenIndices: number[] = [];
			for (const j of genIndices[i]) {
				const prevArc = arcConfig[i - 1]?.[Math.floor(j / 2)];
				const prevColor = prevArc?.color;
				const rootColor = prevArc?.rootColor;
				let color: string | undefined;
				let strip: string | undefined;
				let opacity = 1;
				let fontOpacity = 1;
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

				if (!currentIndi?.id) {
					color = "white";
				} else {
					empty = false;
					if (pedigreeCollapse === "hide" && onFan[currentIndi.id]) {
						empty = true;
						color = familyColors[0];
					} else {
						if (i <= 1) {
							color = colors[k++];
						} else if (i < 8) {
							if (j % 2) {
								color = colors[k++];
								if (!color) {
									const parsedColor =
										prevColor && parseColor(prevColor);
									let newColor = parsedColor;
									if (typeof parsedColor === "object") {
										const hue =
											parsedColor.hsl[0] + (j % 2) * 5;
										const usedLightness =
											colorLightnesses[
												rootColor as Color
											] ?? defLightness;
										const lightness = clamp(
											usedLightness[0] + (i - 1) * 2,
											...usedLightness
										);
										const newLightenedColor = parseColor(
											`hsl(${hue},${parsedColor.hsl[1]}%,${lightness}%)`
										);
										newColor = newLightenedColor;
									}
									const validColor =
										typeof newColor === "object"
											? newColor.hex
											: newColor;
									color = validColor;
								}
							} else {
								color = prevColor;
							}
						} else {
							color = prevColor;
						}
						if (onFan[currentIndi.id]) {
							if (pedigreeCollapse === "grey") {
								const parsedColor = color && parseColor(color!);
								if (typeof parsedColor === "object") {
									const newColorGrey = parseColor(
										`hsl(${parsedColor.hsl[0]},0%,${parsedColor.hsl[2]}%)`
									); // Grey
									color = newColorGrey.hex;
									fontOpacity = 0.5;
									strip = onFan[currentIndi.id]!.color;
								}
							}
							if (pedigreeCollapse === "original-grey") {
								const parsedColor =
									color &&
									parseColor(
										onFan[currentIndi.id]?.color ?? color!
									);
								if (typeof parsedColor === "object") {
									const newColorGrey = parseColor(
										`hsl(${parsedColor.hsl[0]},30%,${parsedColor.hsl[2]}%)`
									); // half Grey
									color = newColorGrey.hex;
									strip = onFan[currentIndi.id]!.color;
									onFan[currentIndi.id]!.color = color;
								}
							}
							opacity = 1;
						}
					}
				}
				arcConfig[i] = {
					...arcConfig[i],
					[j]: {
						empty,
						color: color ?? "white",
						fontOpacity,
						opacity,
						strip,
						rootColor:
							(i <= 2 ? color : prevArc?.rootColor) ??
							color ??
							"white",
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

	if (!isChildren && indi.id && arcCache[indi.id]) {
		arcCache[indi.id] = arcConfig;
	}

	return arcConfig;
};

const drawMainCircle = (
	svg: Svg,
	x: number,
	y: number,
	d: number,
	indi: IndiType,
	settings?: Settings,
	output: Output = "print"
) => {
	const { poolId = 0, familyColors = FAMILY_COLORS } = settings ?? {};
	const group = svg.group();
	const circle = svg.circle(d).move(x, y).addTo(group).fill(familyColors[0]);

	const a = d * (4 / 5);
	const b = Math.sqrt(Math.pow(d, 2) - Math.pow(a, 2));

	const radius = d / 2;
	const arcX = x + radius;
	const arcY = y + radius;

	const bAngle =
		Math.acos(
			(Math.pow(a / 2, 2) + Math.pow(d / 2, 2) - Math.pow(b / 2, 2)) /
				(2 * (a / 2) * (d / 2))
		) *
		(180 / Math.PI);

	const helperArc = describeArc(arcX, arcY, radius, -90, -90 + bAngle);
	const areaCoord = helperArc.start;

	const texts = renderTextInArea(
		svg,
		indi,
		areaCoord.x,
		areaCoord.y,
		a,
		b,
		settings,
		getContrastColor(familyColors[0])
	);
	texts.addTo(group);

	const usedLink = output === "print" ? indi.link(poolId) : `/${indi.id!}`;
	if (usedLink) {
		svg.circle(d)
			.fill("transparent")
			.move(x, y)
			.addTo(group)
			.linkTo(usedLink);
	}

	return { group, circle };
};

const drawFan = (
	svg: Svg,
	x: number,
	y: number,
	a: number,
	r: number,
	w:
		| number
		| {
				thins: number;
				wides: number;
				thinWeight: number;
				wideWeight: number;
		  },
	totalAngle: number,
	arcConfig: ArcConfig,
	settings?: Settings,
	output: Output = "print",
	avoidReverse?: "normal" | "reversed"
) => {
	const { poolId = 0 } = settings ?? {};
	const maxGeneration = Number(Object.keys(arcConfig).reverse()[0]);

	const {
		thins,
		thinWeight,
		wides: _,
		wideWeight,
	} = typeof w === "object"
		? w
		: {
				thins: maxGeneration,
				thinWeight: w,
				wides: 0,
				wideWeight: w,
		  };

	const fanGroup = svg.group();

	for (let i = 1; i <= maxGeneration; i++) {
		const children = arcConfig[i - 1]?.[0]?.children;
		const isChildren = !!children?.length;
		const amountOfArcs = isChildren ? children.length : Math.pow(2, i);
		const degree = totalAngle / amountOfArcs;

		const isWide = (children?.length ?? 0) > 2 || i > thins;
		const isWideThin = i > thins + 3;
		const isWideUltraThin = i > thins + 4;
		const weight = isWide ? wideWeight : thinWeight;

		const currWideLanes = i - 1 > thins ? i - 1 - thins : 0;
		const currThinLanes = i - 1 - currWideLanes;

		const genG = svg.group().addTo(fanGroup).addClass(`gen gen-${i}`);

		const arcPlaceholders: Array<ArcConfigRecord | string> = [
			{
				placeholder: {
					start: 0,
					end: amountOfArcs / 2,
				},
				empty: true,
			},
			{
				placeholder: {
					start: amountOfArcs / 2,
					end: amountOfArcs,
				},
				empty: true,
			},
		];
		const arcIndices = (
			isChildren || i < MAX_GEN_FOR_SLICE_DRAWING ? [] : arcPlaceholders
		).concat(Object.keys(arcConfig[i]));

		for (const jkey of arcIndices) {
			const isPlaceholder = typeof jkey === "object" && jkey.placeholder;
			if (typeof jkey === "object" && !isPlaceholder) {
				continue;
			}

			let j = Number(jkey);
			let j2 = j + 1;

			if (isPlaceholder) {
				j = jkey.placeholder!.start;
				j2 = jkey.placeholder!.end;
			}

			const currentArcConfig = arcConfig[i]?.[j];
			if (currentArcConfig?.collapse === "hide") {
				continue;
			}

			const empty =
				typeof jkey === "object" && jkey.placeholder
					? jkey.empty
					: !arcConfig[i]?.[j] || arcConfig[i]?.[j]?.empty;

			if (empty && !isPlaceholder && i >= MAX_GEN_FOR_SLICE_DRAWING) {
				continue;
			}

			const startDegree = a + j * degree;
			const endDegree = a + j2 * degree;
			const pathG = svg
				.group()
				.addClass(`member member-${j} ${empty ? "empty" : ""}`)
				.addTo(genG);
			const lane = describeArcLane(
				x,
				y,
				r + currThinLanes * thinWeight + currWideLanes * wideWeight,
				startDegree,
				endDegree,
				weight,
				true
			);

			const isEmpty = currentArcConfig?.empty;
			const arcFontOpacity = currentArcConfig?.fontOpacity;
			const arcLaneColor = currentArcConfig?.color ?? "white";
			const arcLaneOpacity = currentArcConfig?.opacity ?? 1;

			if (arcLaneOpacity !== 1) {
				svg.path(lane.path).fill("white").addTo(pathG);
			}
			const slice = svg
				.path(lane.path)
				.fill(arcLaneColor)
				.opacity(arcLaneOpacity)
				.stroke({
					width: 0.2,
					color: "#00000033",
				});
			slice.addTo(pathG);

			if (!isPlaceholder) {
				const indi = children?.length
					? children.index(j)
					: arcConfig[i - 1]?.[Math.floor(j / 2)]?.[
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
						((!avoidReverse &&
							laneHalf &&
							laneHalf.start.y <= y + r * 2 &&
							laneHalf.end.y <= y + r * 2) ||
							avoidReverse === "normal") &&
						((j >= amountOfArcs / 4 &&
							j < (amountOfArcs / 4) * 3) ||
							i === 1)
					) {
						usedLanes = lane.lanesReverse;
						dir = "reversed";
					}
					if (
						(!avoidReverse &&
							sliceHalf &&
							sliceHalf.start.x <= x) ||
						avoidReverse === "reversed"
					) {
						usedSlices = lane.slicesReverse;
						dirSlice = "reversed";
					}

					const textColor = getContrastColor(arcLaneColor as Color);
					const texts = renderTextInArc(
						svg,
						indi,
						isWide ? usedSlices : usedLanes,
						weight,
						settings,
						isWide ? dirSlice : dir,
						clamp(
							(isWide
								? usedLanes.half.width * 1.6
								: weight * 0.8) /
								((isWideUltraThin
									? 2.4
									: isWideThin
									? 3.2
									: isWide
									? 3.8
									: 2) *
									1.2),
							1,
							16
						)
					);

					const usedLink =
						output === "print" ? indi.link(poolId) : `/${indi.id!}`;
					if (usedLink) {
						slice.linkTo(usedLink);
					}

					texts.forEach((text) => {
						text.fill(textColor)
							.opacity(arcFontOpacity ?? arcLaneOpacity)
							.addTo(pathG);

						if (usedLink) {
							text.linkTo(usedLink);
						}
					});
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
	settings?: Settings,
	dir: "normal" | "reversed" = "normal",
	defaultFontSize = 20
) => {
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
		family: "Arial",
		weight: "bold",
	};

	const regular = {
		family: "Arial",
	};

	const dateFont = { ...regular, size: defaultFontSize * 0.3 };

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
	settings?: Settings,
	color: Color = "#000"
) => {
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
		family: "Arial",
		weight: "bold",
	};

	const regular = {
		family: "Arial",
	};

	const firstNamePartsFont = nameOrder === "last-first" ? bold : regular;
	const secondNamePartsFont = nameOrder === "first-last" ? bold : regular;

	let fontSizeDiff = 0.3;
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

		if (fitAll && fontSizeDiff === 0.3) {
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

		fontSizeDiff = 0.25;
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
