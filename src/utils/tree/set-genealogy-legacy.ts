import range from "lodash/range";
import { type GedComType } from "../../classes/gedcom/classes/gedcom";
import { AUTO_VERTICAL_MARGIN_MULTIPLIER } from "../../constants/constants";
import { type IndiDimensions, type Settings } from "../../store/main/reducers";
import { type IndiKey } from "../../types/types";
import { isDevelopment } from "../get-product-details";
import GedcomTree from "../parser";
import {
	getEdgeRelativeOnStage,
	getHorizontalPositionByRelative,
} from "../get-relatives-on-stage";

const isDev = isDevelopment();

export const setGenealogyUtilLegacy = (
	id: IndiKey,
	settings: Settings,
	raw?: GedComType | string
) => {
	const gedcom = typeof raw === "string" ? GedcomTree.parse(raw) : raw;

	const diff = settings.individualSize.w * settings.horizontalSpace;
	const indi = gedcom?.indi(id);
	const verticalMultiplier =
		settings.verticalSpace * AUTO_VERTICAL_MARGIN_MULTIPLIER;
	if (!indi) {
		return;
	}

	const newStageIndis: Record<`@I${number}@`, IndiDimensions> = {};
	const generationEdges: Record<
		number,
		{ start: number; end: number } | undefined
	> = {};
	const generationStageIndis: Record<
		number,
		Record<`@I${number}@`, IndiDimensions>
	> = {};
	let horizontal = 0;

	const genealogy = indi
		.getGenealogy(false, settings.drawDescendants)
		?.toReversed();
	const gens = Object.keys(genealogy ?? []);

	const firstGeneration = gens[0];
	const lastGeneration = gens[gens.length - 1];
	const longestGeneration =
		genealogy &&
		Object.entries(genealogy).find(([_key, pack], index) => {
			const gen = genealogy.length - index - 1;

			return pack.left.length + pack.right.length > Math.pow(2, gen);
		})?.[0];

	if (
		firstGeneration === undefined ||
		lastGeneration === undefined ||
		longestGeneration === undefined
	) {
		return;
	}

	const upperGenerations = range(
		Number(longestGeneration) - 1,
		Number(firstGeneration) - 1
	);
	const lowerGenerations = range(
		Number(longestGeneration) + 1,
		Number(lastGeneration) + 1
	);
	const start = {
		left: -diff * 2,
		right: 0,
	};

	const usedGens = [
		longestGeneration,
		...upperGenerations,
		...lowerGenerations,
	];
	usedGens.forEach((genIndex, loopIndex) => {
		const index = Number(genIndex);
		const genealogySides = genealogy?.[index];
		const isMainGeneration = false;
		const isLastGeneration = loopIndex === usedGens.length - 1;

		["left", "right"].forEach((s) => {
			let hasSpace = false;
			const side = s as "left" | "right";
			const isRight = side === "right";
			const oppositeSide = isRight ? "left" : "right";
			const relativeEdge = isRight ? "rightMost" : "leftMost";
			const relativeOppositeEdge = isRight ? "leftMost" : "rightMost";
			const minmax = isRight ? Math.max : Math.min;
			const sideDiff = isRight ? 1 : -1;

			const generation = genealogySides?.[side];
			horizontal = start[side] - (isLastGeneration ? diff : 0);
			const orderedGeneration = isRight
				? generation
				: generation?.toReversed();

			orderedGeneration?.forEach((indiPack, packIndex) => {
				if (!indiPack && !isMainGeneration) {
					return;
				}
				const nextPackIndi = orderedGeneration[packIndex + 1]?.[0];

				const orderedPack = isRight ? indiPack : indiPack?.toReversed();
				orderedPack?.forEach((indi, indiIndex) => {
					const nextIndi = orderedPack?.[indiIndex + 1];
					const spouses = indi?.getSpouses();
					const children = indi?.getChildren();
					if (indi?.id) {
						const isDebug = false && isDev && indi?.toNaturalName();
						if (!isMainGeneration) {
							const prevIndi = orderedPack?.[indiIndex - 1];
							const space = prevIndi ? 0 : diff;

							horizontal = getHorizontalPositionByRelative({
								isRight,
								indi,
								relativeEdge,
								relativeOppositeEdge,
								spouses,
								isLastGeneration,
								children,
								space,
								diff,
								sideDiff,
								horizontal,
								stageIndis: newStageIndis,
								gedcom,
							});
							isDebug && console.log("[DEBUG][COORD][-1]");
						}
						isDebug && console.log("[DEBUG][COORD][-1]]");

						const prevLeftPack =
							genealogySides?.[oppositeSide][
								(genealogySides?.[oppositeSide].length ?? 0) - 1
							];
						const prevPack =
							orderedGeneration[packIndex - 1] || prevLeftPack;
						if (
							!hasSpace &&
							packIndex >= 1 &&
							indiIndex === 0 &&
							!prevPack &&
							horizontal === start[side]
						) {
							hasSpace = true;
							horizontal = horizontal + diff * sideDiff;
						}

						if (
							side === "left" &&
							!hasSpace &&
							packIndex === 0 &&
							indiIndex === 0 &&
							prevPack
						) {
							hasSpace = true;
							horizontal = horizontal - diff * sideDiff;
						}

						if (!generationEdges[index]) {
							generationEdges[index] = {
								start: horizontal,
								end: horizontal,
							};
						}
						newStageIndis![indi.id] = {
							position: {
								x: horizontal,
								y:
									Number(index) *
									settings.individualSize.h *
									verticalMultiplier,
							},
							size: {
								w: settings.individualSize.w,
								h: settings.individualSize.h,
							},
						};

						if (!generationStageIndis[index]) {
							generationStageIndis[index] = {};
						}

						generationStageIndis[index]![indi.id] =
							newStageIndis![indi.id];

						if (!isMainGeneration) {
							if (
								!nextIndi?.isSpouseOf(indi) &&
								!nextPackIndi?.isSpouseOf(indi)
							) {
								horizontal =
									horizontal +
									Math.max(
										diff,
										diff *
											((children?.length ?? 1) -
												(spouses?.length ? 0 : 1))
									) *
										sideDiff;
							} else {
								horizontal = horizontal + diff * sideDiff;
							}
						}
					}

					if (isMainGeneration) {
						if (
							!nextIndi?.isSpouseOf(indi) &&
							!nextPackIndi?.isSpouseOf(indi)
						) {
							horizontal =
								horizontal +
								Math.max(
									diff,
									diff * (children?.length ?? 1) -
										(spouses?.length ? 1 : 0)
								) *
									sideDiff;
						} else {
							horizontal = horizontal + diff * sideDiff;
						}
					}
				});

				const lastIndi = orderedPack?.[orderedPack.length - 1];

				const nextIsRelative =
					lastIndi?.isSiblingOf(nextPackIndi) ||
					lastIndi?.isSpouseOf(nextPackIndi);

				const packDiff = nextIsRelative ? 0 : diff;
				horizontal = horizontal + packDiff * sideDiff;
			});

			generationEdges[index] = {
				start:
					generationEdges[index]?.start !== undefined
						? generationEdges[index]!.start
						: horizontal,
				end: horizontal,
			};
		});
	});

	return newStageIndis;
};
