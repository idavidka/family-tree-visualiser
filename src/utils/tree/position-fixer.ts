import { type GedComType } from "../../classes/gedcom/classes/gedcom";
import { getDimDiff } from "../../constants/constants";
import {
	type Stage,
	type Settings,
	type TreeState,
} from "../../store/main/reducers";
import { type IndiKey } from "../../types/types";
import GedcomTree from "../parser";
import { sortByPositionItems } from "../indis-on-stage";
import { setLinesUtil } from "./set-lines";

export const startPositionFixer = (
	indisProp: Required<Stage>["indis"],
	linesProp: Required<Stage>["lines"],
	settings: Settings,
	type: TreeState["type"],
	selected?: IndiKey,
	raw?: GedComType | string
) => {
	let indis = indisProp;
	let lines = linesProp;

	let isFixed = false;
	let helper = 0;
	while (!isFixed) {
		const fixedIndis = positionFixer(
			indis ?? {},
			lines ?? {},
			settings,
			type,
			selected,
			raw
		);

		if (fixedIndis) {
			indis = fixedIndis;
			lines = setLinesUtil(indis, settings, type, selected, raw);
		} else {
			isFixed = true;
		}

		if (helper++ > 10) {
			break;
		}
	}

	return { lines, indis };
};

export const positionFixer = (
	indisProp: Required<Stage>["indis"],
	linesProp: Required<Stage>["lines"],
	settings: Settings,
	type: TreeState["type"],
	selected?: IndiKey,
	raw?: GedComType | string
) => {
	const vDimDiff = getDimDiff(
		settings.lineSpace,
		type === "manual" ? type : "tree",
		true
	);
	let fixed = false;
	const gedcom = typeof raw === "string" ? GedcomTree.parse(raw) : raw;
	const indis = JSON.parse(
		JSON.stringify(indisProp)
	) as Required<Stage>["indis"];
	const lines = JSON.parse(
		JSON.stringify(linesProp)
	) as Required<Stage>["lines"];
	const sortedIndis = sortByPositionItems(indis, "y", false, true);
	const yCoordinates = Object.keys(sortedIndis).reduce<
		Record<number, number>
	>((acc, curr) => {
		acc[Number(curr)] = Number(curr);

		return acc;
	}, {});

	let globalDiffToLine = 0;
	Object.entries(lines).forEach(([from, linesTo]) => {
		const fromKey = from as IndiKey;
		const fromDimension = indis[fromKey];

		if (!fromDimension) {
			return;
		}

		Object.entries(linesTo).forEach(([to, line]) => {
			const toKey = to as IndiKey;
			const toDimension = indis[toKey];

			if (!toDimension) {
				return;
			}

			if (
				toDimension.position.y <= fromDimension.position.y ||
				gedcom?.indi(toKey)?.isSpouseOf(fromKey)
			) {
				return;
			}

			const storedY =
				yCoordinates[toDimension.position.y] || toDimension.position.y;
			const checkPoint = storedY - vDimDiff;
			const linePointsSorted = line.slice(0, -1).toSorted((a, b) => {
				return b.y - a.y;
			});
			const linePointInvalid = linePointsSorted.find(
				(position) => position.y > checkPoint
			);

			if (linePointInvalid) {
				fixed = true;
				const diffToLine = linePointInvalid.y - checkPoint;

				globalDiffToLine = globalDiffToLine + diffToLine;
				const originalYToCheck = toDimension.position.y;
				Object.entries(sortedIndis).forEach(([pos, dimensions]) => {
					const posNum = Number(pos);

					if (posNum >= originalYToCheck) {
						yCoordinates[posNum] =
							yCoordinates[posNum] + diffToLine;
						Object.entries(dimensions).forEach(([key]) => {
							const indiKey = key as IndiKey;

							indis[indiKey].position.y =
								indis[indiKey].position.y + diffToLine;
						});
					}
				});
			}
		});
	});
	return fixed ? indis : undefined;
};
