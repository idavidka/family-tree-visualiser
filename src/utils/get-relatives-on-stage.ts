import { type Individuals } from "../classes/gedcom/classes/indis";
import { type TreeState, type IndiDimensions } from "../store/main/reducers";

import intersectionBy from "lodash/intersectionBy";
import { type IndiKey } from "../types/types";
import { type IndiType } from "../classes/gedcom/classes/indi";
import { isDevelopment } from "./get-product-details";
import { type GedComType } from "../classes/gedcom/classes/gedcom";

const isDev = isDevelopment();

export const getRelativesOnStage = (
	individuals?: Individuals,
	indisOnStage?: TreeState["stage"]["indis"]
) => {
	const intersection = intersectionBy(
		Object.keys(individuals?.items ?? {}),
		Object.keys(indisOnStage ?? {})
	) as IndiKey[];

	if (!individuals || !indisOnStage || !intersection.length) {
		return undefined;
	}

	const relativesOnStage: TreeState["stage"]["indis"] = {};
	intersection.forEach((indiKey) => {
		if (indisOnStage[indiKey]) {
			relativesOnStage[indiKey] = indisOnStage[indiKey];
		}
	});

	return relativesOnStage;
};

export const getEdgeRelativeOnStage = (
	edge: "leftMost" | "rightMost",
	individuals?: Individuals,
	indisOnStage?: TreeState["stage"]["indis"]
) => {
	const relatives = getRelativesOnStage(individuals, indisOnStage);

	let edgeIndi: { key: IndiKey; dimension: IndiDimensions } | undefined;

	Object.entries(relatives ?? {}).forEach(([indiKey, indiDimension]) => {
		const key = indiKey as IndiKey;

		if (
			!edgeIndi ||
			(edge === "leftMost" &&
				edgeIndi.dimension.position.x > indiDimension.position.x) ||
			(edge === "rightMost" &&
				edgeIndi.dimension.position.x < indiDimension.position.x)
		) {
			edgeIndi = {
				key,
				dimension: indiDimension,
			};
		}
	});

	return edgeIndi;
};

const isIncluded = <T extends unknown[]>(exclude?: T, value?: T[number]) => {
	return !exclude?.includes(value) ? true : undefined;
};

export const getMiddlePointBetweenIndis = (
	indis?: Individuals,
	stageIndis?: Record<IndiKey, IndiDimensions>
) => {
	if (!indis || !stageIndis) {
		return undefined;
	}

	let leftEdgeIndi: { key: IndiKey; dimension: IndiDimensions } | undefined;
	let rightEdgeIndi: { key: IndiKey; dimension: IndiDimensions } | undefined;

	Object.entries(indis.items ?? {}).forEach(([indiKey]) => {
		const key = indiKey as IndiKey;

		const stageIndi = stageIndis[key];
		if (!stageIndi) {
			return;
		}

		if (
			!leftEdgeIndi ||
			leftEdgeIndi.dimension.position.x > stageIndi.position.x
		) {
			leftEdgeIndi = { key, dimension: stageIndi };
		}
		if (
			!rightEdgeIndi ||
			rightEdgeIndi.dimension.position.x < stageIndi.position.x
		) {
			rightEdgeIndi = { key, dimension: stageIndi };
		}
	});

	if (rightEdgeIndi && leftEdgeIndi) {
		const middlePoint =
			(rightEdgeIndi.dimension.position.x -
				leftEdgeIndi.dimension.position.x) /
			2;

		return {
			leftEdgeIndi,
			rightEdgeIndi,
			middlePoint: leftEdgeIndi.dimension.position.x + middlePoint,
		};
	}
};

interface Props {
	isRight: boolean;
	indi: IndiType;
	relativeEdge: "leftMost" | "rightMost";
	relativeOppositeEdge: "leftMost" | "rightMost";
	spouses?: Individuals;
	children?: Individuals;
	horizontal: number;
	stageIndis: Record<IndiKey, IndiDimensions>;
	isLastGeneration?: boolean;
	sideDiff: number;
	diff: number;
	space: number;
	gedcom?: GedComType;
	exclude?: Array<"spouses" | "children" | "siblings" | "parents">;
}
export const getHorizontalPositionByRelative = ({
	isRight,
	indi,
	relativeEdge,
	relativeOppositeEdge,
	spouses: spousesProp,
	children: childrenProp,
	horizontal,
	stageIndis,
	isLastGeneration,
	diff,
	sideDiff,
	space,
	gedcom,
	exclude,
}: Props) => {
	const spouses = spousesProp || indi.getSpouses();
	const children = childrenProp || indi.getChildren();
	let newHorizontal = horizontal;
	const minmax = isRight ? Math.max : Math.min;
	const isDebug = false && isDev;
	let relativeOnStage:
		| {
				key: IndiKey;
				dimension: IndiDimensions;
		  }
		| undefined;

	if (!relativeOnStage) {
		relativeOnStage =
			isIncluded(exclude, "spouses") &&
			getEdgeRelativeOnStage(relativeEdge, spouses, stageIndis);
		if (!relativeOnStage) {
			const siblings = indi
				.getSiblings()
				.copy()
				.merge(indi.getSiblingsInLaw())
				.exclude(indi.getChildrenInLaw());

			relativeOnStage =
				isIncluded(exclude, "siblings") &&
				getEdgeRelativeOnStage(relativeEdge, siblings, stageIndis);

			if (!relativeOnStage) {
				const parents = indi
					.getParents()
					.getSpouses()
					.copy()
					.merge(indi.getParentsInLaw());
				relativeOnStage =
					isIncluded(exclude, "parents") &&
					getEdgeRelativeOnStage(
						relativeOppositeEdge,
						parents,
						stageIndis
					);

				if (!relativeOnStage) {
					const childrenInLaw = children
						?.copy()
						.merge(indi.getChildrenInLaw());
					relativeOnStage =
						isIncluded(exclude, "children") &&
						getEdgeRelativeOnStage(
							isLastGeneration
								? "leftMost"
								: relativeOppositeEdge,
							childrenInLaw,
							stageIndis
						);
					if (relativeOnStage) {
						isDebug && console.log("[DEBUG][COORD][7]");
						newHorizontal = minmax(
							newHorizontal,
							relativeOnStage.dimension.position.x
						);
					} else {
						isDebug && console.log("[DEBUG][COORD][6]");
					}
				} else {
					if (
						!isLastGeneration ||
						parents.length === siblings.length + 1
					) {
						isDebug &&
							console.log(
								"[DEBUG][COORD][5.3]",
								parents,
								siblings
							);
						newHorizontal = minmax(
							newHorizontal,
							relativeOnStage.dimension.position.x
						);
					} else if (parents.length > siblings.length + 1) {
						isDebug && console.log("[DEBUG][COORD][5.2]");
						const parDiff =
							(parents.length * diff) / 2 -
							(isRight ? diff * 1.5 : diff / 2);
						newHorizontal = minmax(
							newHorizontal - parDiff,
							relativeOnStage.dimension.position.x - parDiff
						);
					} else {
						isDebug && console.log("[DEBUG][COORD][5.1]");
						const sibDiff = (siblings.length * diff) / 2 - diff / 2;
						newHorizontal = minmax(
							newHorizontal - sibDiff,
							relativeOnStage.dimension.position.x - sibDiff
						);
					}
				}
			} else {
				const isSiblingInLaw = gedcom
					?.indi(relativeOnStage.key)
					?.isSiblingInLawOf(indi);

				if (!isSiblingInLaw) {
					isDebug && console.log("[DEBUG][COORD][4]");
					newHorizontal = minmax(
						newHorizontal,
						relativeOnStage.dimension.position.x +
							(diff + space) * sideDiff
					);
				} else {
					isDebug && console.log("[DEBUG][COORD][3]");
					newHorizontal = minmax(
						newHorizontal,
						relativeOnStage.dimension.position.x +
							(diff * 2 + space) * sideDiff
					);
				}
			}
		} else {
			isDebug && console.log("[DEBUG][COORD][2]");
			newHorizontal = minmax(
				newHorizontal,
				relativeOnStage.dimension.position.x + diff * sideDiff
			);
		}
	} else {
		if (relativeOnStage) {
			isDebug && console.log("[DEBUG][COORD][1]");
			newHorizontal = minmax(
				newHorizontal,
				relativeOnStage.dimension.position.x
			);
		} else {
			isDebug && console.log("[DEBUG][COORD][0]");
		}
	}

	return newHorizontal;
};
