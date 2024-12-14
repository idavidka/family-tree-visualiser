import { intersection } from "lodash";
import { type GedComType } from "../../classes/gedcom/classes/gedcom";
import {
	AUTO_VERTICAL_MARGIN_MULTIPLIER,
	COLORED_LINES,
	VERTICAL_MARGIN_MULTIPLIER,
	getDimDiff,
} from "../../constants/constants";
import {
	type Stage,
	type Settings,
	type TreeState,
} from "../../store/main/reducers";
import { type LinePosition } from "../../types/graphic-types";
import { type FamKey, type IndiKey } from "../../types/types";
import { fixNumber } from "../bounds";
import {
	type CommonPoints,
	type ReservedPoints,
	getLineColor,
	getNextHorizontalLines,
	getNextVerticalLines,
	resetIndexedColor,
	setupLine,
} from "../line";
import GedcomTree from "../parser";
import { sortByPositionItems } from "../indis-on-stage";

export const setLinesUtil = (
	indis: Required<Stage>["indis"],
	settings: Settings,
	type: TreeState["type"],
	_selected?: IndiKey,
	raw?: GedComType | string
) => {
	const gedcom = typeof raw === "string" ? GedcomTree.parse(raw) : raw;
	const sortedIndis = sortByPositionItems(indis, "x", true, false);

	const colors = settings.lineColors;
	const diff = settings.individualSize.w * settings.horizontalSpace;
	const dimDiff = getDimDiff(
		settings.lineSpace,
		type === "manual" ? type : "tree"
	);
	const vDimDiff = getDimDiff(
		settings.lineSpace,
		type === "manual" ? type : "tree",
		true
	);
	const verticalMultiplier =
		settings.verticalSpace *
		(type !== "manual"
			? AUTO_VERTICAL_MARGIN_MULTIPLIER
			: VERTICAL_MARGIN_MULTIPLIER);

	const lines: TreeState["stage"]["lines"] = {};
	const commonPoints: CommonPoints = {};
	const commonColorIndices: Record<FamKey, number | undefined> = {};
	const horizontalReservedLines: {
		vertical: ReservedPoints;
		horizontal: ReservedPoints;
	} = {
		vertical: {},
		horizontal: {},
	};
	const verticalReservedLines: {
		vertical: ReservedPoints;
		horizontal: ReservedPoints;
	} = {
		vertical: {},
		horizontal: {},
	};
	const lineCache: Record<
		FamKey,
		| Record<IndiKey | `${IndiKey}.${IndiKey}`, boolean | undefined>
		| undefined
	> = {};

	resetIndexedColor();

	Object.entries(sortedIndis).forEach(([k, { position, size }]) => {
		const key = k as IndiKey;
		const indi = gedcom?.indi(key);

		if (!indi?.id) {
			return;
		}

		const spouses = indi.getSpouses();
		const children = indi.getChildren();

		const childrenOnStage = intersection(
			Object.keys(children.items),
			Object.keys(sortedIndis)
		) as IndiKey[];
		const spousesOnStage = intersection(
			Object.keys(spouses.items),
			Object.keys(sortedIndis)
		) as IndiKey[];

		let indiLines = lines[key as IndiKey] ?? {};

		if (
			children.length === childrenOnStage.length &&
			spouses.length === spousesOnStage.length &&
			spousesOnStage.length + childrenOnStage.length ===
				Object.keys(indiLines).length
		) {
			return;
		}

		const childrenFamilies = children.splitByFamily("Children", indi);
		const spousesFamilies = spouses.splitByFamily("Spouses", indi);

		const hasSpouse = spousesFamilies.lengthOfIndividuals > 0;
		const checkFamilies = hasSpouse
			? spousesFamilies.items
			: childrenFamilies.items;

		const mw = fixNumber((size.w * settings.horizontalSpace - size.w) / 2);
		const mws = fixNumber((size.w * settings.horizontalSpace - size.w) / 4);
		const mqw = fixNumber((size.w * settings.horizontalSpace - size.w) / 4);
		const pqh = fixNumber(
			(size.h * verticalMultiplier - size.h) / (dimDiff / 1.5)
		);

		Object.entries(checkFamilies).forEach(([fKey, members]) => {
			const famKey = fKey as FamKey;
			(hasSpouse ? members : undefined)?.forEach((spouse) => {
				if (!spouse.id || !spousesOnStage.includes(spouse.id)) {
					return;
				}

				let commonPoint = commonPoints[famKey];
				const spousePosition = sortedIndis[spouse.id];

				if (!commonPoint?.spouse) {
					const originY = position.y + size.h / 2;
					const farSpouse =
						Math.abs(position.x - spousePosition.position.x) > diff;
					const farSpouseDiff = farSpouse ? size.h / 2 + vDimDiff : 0;
					commonPoint = {
						...commonPoint,
						spouse: [
							{
								x: position.x + size.w + mw,
								y: originY,
							},
							{
								x: position.x + size.w + mw,
								y: originY - farSpouseDiff,
							},
							{
								x: position.x + size.w + mw,
								y: originY,
							},
						],
					};

					const isSpouseRight =
						spousePosition.position.x > position.x;

					if (!isSpouseRight) {
						commonPoint.spouse![0].x = position.x - mw;
						commonPoint.spouse![1].x = position.x - mw;
						commonPoint.spouse![2].x = position.x - mw;
					}

					if (
						horizontalReservedLines.vertical[
							commonPoint.spouse![0].x
						]?.[originY]
					) {
						commonPoint = {
							...commonPoint,
							spouse: [
								{
									x: spousePosition.position.x + size.w + mw,
									y: originY,
								},
								{
									x: spousePosition.position.x + size.w + mw,
									y: originY - farSpouseDiff,
								},
								{
									x: spousePosition.position.x + size.w + mw,
									y: originY,
								},
							],
						};

						if (isSpouseRight) {
							commonPoint.spouse![0].x =
								spousePosition.position.x - mw;
							commonPoint.spouse![1].x =
								spousePosition.position.x - mw;
							commonPoint.spouse![2].x =
								spousePosition.position.x - mw;
						}
					}

					const newHorizontalReservedLine = getNextHorizontalLines(
						{
							id: famKey,
							x1:
								spousePosition.position.x +
								(isSpouseRight ? 0 : size.w),
							y1: commonPoint.spouse![1].y,
							x2: position.x + (isSpouseRight ? size.w : 0),
							y2: commonPoint.spouse![1].y,
						},
						horizontalReservedLines.horizontal,
						true,
						farSpouse ? -vDimDiff : vDimDiff,
						colors,
						undefined,
						false,
						originY > spousePosition.position.y + size.h / 2
							? "down"
							: "up"
					);
					commonPoint.spouse![1].y = newHorizontalReservedLine.y1;
					const commonPointKey = [
						commonPoint.spouse![1].y,
						commonPoint.spouse![1].x,
					];

					if (
						!horizontalReservedLines.horizontal[commonPointKey[0]]
					) {
						horizontalReservedLines.horizontal[commonPointKey[0]] =
							{};
					}

					horizontalReservedLines.horizontal[commonPointKey[0]][
						commonPointKey[1]
					] = newHorizontalReservedLine;

					if (!horizontalReservedLines.vertical[commonPointKey[1]]) {
						horizontalReservedLines.vertical[commonPointKey[1]] =
							{};
					}

					horizontalReservedLines.vertical[commonPointKey[1]][
						originY
					] = newHorizontalReservedLine;

					const snx =
						spousePosition.position.x +
						(isSpouseRight ? -mws : size.w + mws);

					const sfx =
						position.x + (isSpouseRight ? size.w + mws : -mws);

					commonPoint = {
						...commonPoint,
						nonStraightSpouse: [
							{
								x: sfx,
								y: commonPoint.spouse![0].y,
							},
							{
								x: snx,
								y: commonPoint.spouse![2].y,
							},
						],
					};

					[
						[0, 0],
						[1, 2],
					].forEach(
						([spouseLineReserveIndex, commonPointReserveIndex]) => {
							if (
								commonPoint!.spouse![commonPointReserveIndex]
									.y !==
								spousePosition.position.y + size.h / 2
							) {
								const diff2FromCommonPointY =
									commonPoint!.spouse![
										commonPointReserveIndex
									].y - position.y;
								const newNonStraightSpouseReservedLine =
									getNextVerticalLines(
										{
											id: famKey,
											x1: spouseLineReserveIndex
												? snx
												: sfx,
											y1: commonPoint!.spouse![
												commonPointReserveIndex
											].y,
											x2: spouseLineReserveIndex
												? snx
												: sfx,
											y2:
												spousePosition.position.y +
												diff2FromCommonPointY,
										},
										verticalReservedLines.horizontal,
										false,
										vDimDiff,
										isSpouseRight ? "right" : "left"
									);

								commonPoint!.nonStraightSpouse![
									spouseLineReserveIndex
								].x = newNonStraightSpouseReservedLine.x1;

								if (
									!verticalReservedLines.horizontal[
										newNonStraightSpouseReservedLine.x1
									]
								) {
									verticalReservedLines.horizontal[
										newNonStraightSpouseReservedLine.x1
									] = {};
								}

								verticalReservedLines.horizontal[
									newNonStraightSpouseReservedLine.x1
								][newNonStraightSpouseReservedLine.y1] =
									newNonStraightSpouseReservedLine;
							}
						}
					);

					commonPoints[famKey] = commonPoint;
				}
			});

			childrenFamilies.items[famKey]?.forEach((child) => {
				if (!child.id || !childrenOnStage.includes(child.id)) {
					return;
				}

				let commonPoint = commonPoints[famKey];
				const childPosition = sortedIndis[child.id];

				const ph = fixNumber(
					(size.h * verticalMultiplier - size.h) / (dimDiff / 1.5)
				);
				if (!commonPoint?.children) {
					const originY = position.y + size.h + ph;
					commonPoint = {
						...commonPoint,
						children: {
							y: originY,
							x: {},
						},
					};

					let sx = fixNumber(position.x + size.w / 2);
					let ex = fixNumber(childPosition.position.x + size.w / 2);
					let sy = fixNumber(position.y + size.h);
					if (commonPoint.spouse) {
						sx = commonPoint.spouse[0].x;
						ex = fixNumber(childPosition.position.x + size.w / 2);
						sy = commonPoint.spouse[1].y;
					}

					const newVerticalSpouseReservedLine = getNextVerticalLines(
						{
							id: famKey,
							x1: sx,
							y1: sy,
							x2: sx,
							y2: commonPoint.children!.y,
						},
						verticalReservedLines.horizontal,
						false,
						vDimDiff,
						sx < ex ? "right" : "left"
					);
					sx = newVerticalSpouseReservedLine.x1;

					if (commonPoint.spouse) {
						commonPoint.spouse[0].x = sx;
						commonPoint.spouse[1].x = sx;
						commonPoint.spouse[2].x = sx;
					} else {
						commonPoint.single = {
							x: sx,
							y: sy,
						};
					}

					if (
						!verticalReservedLines.horizontal[
							newVerticalSpouseReservedLine.x1
						]
					) {
						verticalReservedLines.horizontal[
							newVerticalSpouseReservedLine.x1
						] = {};
					}

					verticalReservedLines.horizontal[
						newVerticalSpouseReservedLine.x1
					][newVerticalSpouseReservedLine.y1] =
						newVerticalSpouseReservedLine;

					const lineY = position.y + size.h + ph;
					const newHorizontalReservedLine = getNextHorizontalLines(
						{
							id: famKey,
							x1: sx,
							y1: lineY,
							x2: ex,
							y2: lineY,
						},
						horizontalReservedLines.horizontal,
						false,
						dimDiff,
						colors,
						(!childPosition.line ||
							childPosition.line === "normal") &&
							type !== "manual" &&
							lineY < 0,
						settings.colorizeLines
						// sy < commonPoint.children!.y ? "down" : "up"
					);
					commonPoint.children!.y = newHorizontalReservedLine.y1;

					const newVerticalChildrenReservedLine =
						getNextVerticalLines(
							{
								id: famKey,
								x1: ex,
								y1: sy,
								x2: ex,
								y2: commonPoint.children!.y,
							},
							verticalReservedLines.horizontal,
							true,
							vDimDiff,
							sx > ex ? "right" : "left"
						);
					commonPoint.children!.x![child.id] =
						newVerticalChildrenReservedLine.x1;

					const commonPointKey = [
						commonPoint.children!.y,
						commonPoint.children!.x![child.id]!,
					];

					if (
						!horizontalReservedLines.horizontal[commonPointKey[0]]
					) {
						horizontalReservedLines.horizontal[commonPointKey[0]] =
							{};
					}

					if (!commonColorIndices[famKey] && COLORED_LINES) {
						commonColorIndices[famKey] = getLineColor(
							{
								...newHorizontalReservedLine,
								y1: sy,
								y2: childPosition.position.y,
							},
							horizontalReservedLines.horizontal,
							dimDiff,
							colors
						);
					}

					horizontalReservedLines.horizontal[commonPointKey[0]][
						commonPointKey[1]
					] = newHorizontalReservedLine;

					if (!horizontalReservedLines.vertical[commonPointKey[1]]) {
						horizontalReservedLines.vertical[commonPointKey[1]] =
							{};
					}

					horizontalReservedLines.vertical[commonPointKey[1]][
						originY
					] = newHorizontalReservedLine;

					if (!verticalReservedLines.horizontal[commonPointKey[1]]) {
						verticalReservedLines.horizontal[commonPointKey[1]] =
							{};
					}

					verticalReservedLines.horizontal[commonPointKey[1]][
						originY
					] = newVerticalChildrenReservedLine;

					commonPoints[famKey] = commonPoint;
				} else {
					let sx = fixNumber(position.x + size.w / 2);
					let ex = fixNumber(childPosition.position.x + size.w / 2);
					let sy = fixNumber(position.y + size.h);
					if (commonPoint.spouse) {
						sx = commonPoint.spouse[0].x;
						ex = fixNumber(childPosition.position.x + size.w / 2);
						sy = commonPoint.spouse[1].y;
					}

					const newVerticalSpouseReservedLine = getNextVerticalLines(
						{
							id: famKey,
							x1: sx,
							y1: sy,
							x2: sx,
							y2: commonPoint.children!.y,
						},
						verticalReservedLines.horizontal,
						false,
						vDimDiff,
						sx < ex ? "right" : "left"
					);
					sx = newVerticalSpouseReservedLine.x1;

					if (commonPoint.spouse) {
						commonPoint.spouse[0].x = sx;
						commonPoint.spouse[1].x = sx;
						commonPoint.spouse[2].x = sx;
					} else {
						commonPoint.single = {
							x: sx,
							y: sy,
						};
					}

					if (
						!verticalReservedLines.horizontal[
							newVerticalSpouseReservedLine.x1
						]
					) {
						verticalReservedLines.horizontal[
							newVerticalSpouseReservedLine.x1
						] = {};
					}

					verticalReservedLines.horizontal[
						newVerticalSpouseReservedLine.x1
					][newVerticalSpouseReservedLine.y1] =
						newVerticalSpouseReservedLine;

					const lineY = commonPoint.children.y;
					const newHorizontalReservedLine = getNextHorizontalLines(
						{
							id: famKey,
							x1: sx,
							y1: lineY,
							x2: ex,
							y2: lineY,
						},
						horizontalReservedLines.horizontal,
						false,
						dimDiff,
						colors,

						(!childPosition.line ||
							childPosition.line === "normal") &&
							type !== "manual" &&
							lineY < 0,
						settings.colorizeLines
						// sy < commonPoint.children!.y ? "down" : "up"
					);
					commonPoint.children!.y = newHorizontalReservedLine.y1;

					const newVerticalChildrenReservedLine =
						getNextVerticalLines(
							{
								id: famKey,
								x1: ex,
								y1: sy,
								x2: ex,
								y2: commonPoint.children!.y,
							},
							verticalReservedLines.horizontal,
							true,
							vDimDiff,
							sx > ex ? "right" : "left"
						);
					commonPoint.children!.x![child.id] =
						newVerticalChildrenReservedLine.x1;

					const commonPointKey = [
						commonPoint.children!.y,
						commonPoint.children!.x![child.id]!,
					];

					if (
						!horizontalReservedLines.horizontal[commonPointKey[0]]
					) {
						horizontalReservedLines.horizontal[commonPointKey[0]] =
							{};
					}

					if (!commonColorIndices[famKey] && COLORED_LINES) {
						commonColorIndices[famKey] = getLineColor(
							{
								...newHorizontalReservedLine,
								y1: sy,
								y2: childPosition.position.y,
							},
							horizontalReservedLines.horizontal,
							dimDiff,
							colors
						);
					}

					horizontalReservedLines.horizontal[commonPointKey[0]][
						commonPointKey[1]
					] = newHorizontalReservedLine;

					if (!horizontalReservedLines.vertical[commonPointKey[1]]) {
						horizontalReservedLines.vertical[commonPointKey[1]] =
							{};
					}

					horizontalReservedLines.vertical[commonPointKey[1]][
						commonPointKey[0]
					] = newHorizontalReservedLine;

					if (!verticalReservedLines.horizontal[commonPointKey[1]]) {
						verticalReservedLines.horizontal[commonPointKey[1]] =
							{};
					}

					verticalReservedLines.horizontal[commonPointKey[1]][
						commonPointKey[0]
					] = newVerticalChildrenReservedLine;
				}
			});
		});

		indiLines = {};
		Object.entries(checkFamilies).forEach(([fKey, members]) => {
			const famKey = fKey as FamKey;

			(hasSpouse ? members : undefined)?.forEach((spouse) => {
				if (!spouse.id || !indi.id) {
					return;
				}

				const spouseKeys = [
					`${indi.id}.${spouse.id}`,
					`${spouse.id}.${indi.id}`,
				] as Array<`${IndiKey}.${IndiKey}`>;

				if (
					!spousesOnStage.includes(spouse.id) ||
					lineCache[famKey]?.[spouseKeys[0]] ||
					lineCache[famKey]?.[spouseKeys[1]]
				) {
					return;
				}

				const commonPoint = commonPoints[famKey]!;
				const spousePosition = sortedIndis[spouse.id];

				const spouseLine: LinePosition[] = [];

				const isSpouseRight = spousePosition.position.x > position.x;
				const isStraight = false; //	!!straight?.[indi.id!] && !!straight?.[spouse.id];
				// const childAtRight = commonPoint.spouse
				// 	? commonPoint.spouse.x < childPosition.position.x
				// 	: sx < childPosition.position.x;
				// const cx = childAtRight
				// 	? childPosition.position.x - mqw
				// 	: childPosition.position.x + size.w + mqw;
				// const cy = childPosition.position.y - pqh;
				const diff2FromCommonPointY =
					commonPoint.spouse![2].y - position.y;
				spouseLine.push(
					...setupLine(
						famKey,
						isStraight,
						[
							position.x + (isSpouseRight ? size.w : 0),
							commonPoint.spouse![0].y,
							false,
							indi?.isMale() ? 0 : indi?.isFemale() ? 1 : 2,
						],
						[
							commonPoint.nonStraightSpouse![0].x,
							commonPoint.spouse![0].y,
							false,
							indi?.isMale() ? 0 : indi?.isFemale() ? 1 : 2,
						],
						[
							commonPoint.nonStraightSpouse![0].x,
							commonPoint.spouse![1].y,
							false,
							indi?.isMale() ? 0 : indi?.isFemale() ? 1 : 2,
						],
						[
							commonPoint.spouse![0].x,
							commonPoint.spouse![1].y,
							true,
							spouse?.isMale() ? 0 : spouse?.isFemale() ? 1 : 2,
						],
						[
							commonPoint.nonStraightSpouse![1].x,
							commonPoint.spouse![1].y,
							false,
							spouse?.isMale() ? 0 : spouse?.isFemale() ? 1 : 2,
						],
						[
							commonPoint.nonStraightSpouse![1].x,
							spousePosition.position.y + diff2FromCommonPointY,
							false,
							spouse?.isMale() ? 0 : spouse?.isFemale() ? 1 : 2,
						],
						[
							spousePosition.position.x +
								(isSpouseRight ? 0 : size.w),
							spousePosition.position.y + diff2FromCommonPointY,
							false,
							spouse?.isMale() ? 0 : spouse?.isFemale() ? 1 : 2,
						]
					)
				);

				lineCache[famKey] = {
					...lineCache[famKey],
					[spouseKeys[0]]: true,
					[spouseKeys[1]]: true,
				};
				indiLines[spouse.id] = spouseLine;
			});

			childrenFamilies.items[famKey]?.forEach((child) => {
				if (
					!child.id ||
					!childrenOnStage.includes(child.id) ||
					lineCache[famKey]?.[child.id]
				) {
					return;
				}

				if (!lineCache[famKey]) {
					lineCache[famKey] = {};
				}

				const childLine: LinePosition[] = [];
				const childPosition = sortedIndis[child.id];
				const commonPoint = commonPoints[famKey]!;
				const color = commonColorIndices[famKey];
				const sx =
					commonPoint.single === undefined
						? fixNumber(position.x + size.w / 2)
						: commonPoint.single.x;
				const ex = fixNumber(
					commonPoint.children!.x![child.id] ??
						childPosition.position.x + size.w / 2
				);
				const childAtRight = commonPoint.spouse
					? commonPoint.spouse[0].x < childPosition.position.x
					: sx < childPosition.position.x;
				const cx = childAtRight
					? childPosition.position.x - mqw
					: childPosition.position.x + size.w + mqw;
				const cy = childPosition.position.y - pqh;
				const isStraight = false; // !!straight?.[indi.id!] && !!straight?.[child.id];
				if (!commonPoint?.spouse) {
					if (commonPoint.children!.y > childPosition.position.y) {
						childLine.push(
							...setupLine(
								famKey,
								isStraight,
								[sx, position.y + size.h, false, color],
								[sx, commonPoint.children!.y, false, color],
								[cx, commonPoint.children!.y, false, color],
								[cx, cy, false, color],
								[ex, cy, false, color],
								[ex, childPosition.position.y, false, color]
							)
						);
					} else {
						childLine.push(
							...setupLine(
								famKey,
								isStraight,
								[sx, position.y + size.h, false, color],
								[sx, commonPoint.children!.y, false, color],
								[ex, commonPoint.children!.y, false, color],
								[ex, childPosition.position.y, false, color]
							)
						);
					}
				} else {
					if (commonPoint.children!.y > childPosition.position.y) {
						childLine.push(
							...setupLine(
								famKey,
								isStraight,
								[
									commonPoint.spouse![0].x,
									commonPoint.spouse![1].y,
									false,
									color,
								],
								[
									commonPoint.spouse![0].x,
									commonPoint.children!.y,
									false,
									color,
								],
								[cx, commonPoint.children!.y, false, color],
								[cx, cy, false, color],
								[ex, cy, false, color],
								[ex, childPosition.position.y, false, color]
							)
						);
					} else {
						childLine.push(
							...setupLine(
								famKey,
								isStraight,
								[
									commonPoint.spouse![0].x,
									commonPoint.spouse![1].y,
									false,
									color,
								],
								[
									commonPoint.spouse![0].x,
									commonPoint.children!.y,
									false,
									color,
								],
								[ex, commonPoint.children!.y, false, color],
								[ex, childPosition.position.y, false, color]
							)
						);
					}
				}

				lineCache[famKey] = {
					...lineCache[famKey],
					[child.id]: true,
				};
				indiLines[child.id] = childLine;
			});

			lines[key] = indiLines;
		});
	});

	return lines;
};
