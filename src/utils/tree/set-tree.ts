import { type GedComType } from "../../classes/gedcom/classes/gedcom";
import {
	type GenerationSpouseType,
	type GenerationIndiType,
	type IndiType,
} from "../../classes/gedcom/classes/indi";
import { getDimDiff } from "../../constants/constants";
import { AGE_ASC, getMarriageAscAndChildBirth } from "../../constants/orders";
import {
	type IndiDimensions,
	type IndiDimensionDictionary,
	type Settings,
	type DimensionsByGen,
} from "../../store/main/reducers";
import { type FamKey, type IndiKey } from "../../types/types";
import { getHorizontalPositionByRelative } from "../get-relatives-on-stage";
import GedcomTree from "../parser";
import {
	differenceBetweenDimensions,
	differenceBetweenEdgeMembers,
} from "./position";
import { Individuals } from "../../classes/gedcom/classes/indis";

type AvoidTouching = Record<IndiKey, "main" | "spouse" | undefined>;

interface AddGenerationProps {
	allowCompact?: boolean;
	childrenOnlyFor?: IndiType;
	gen: number;
	generation: IndiType[];
	nextX?: number;
	nextY?: number;
	storedY?: Record<number, number>;
	settings: Settings;
	diff: number;
	forGenealogy?: boolean;
	forRemoval?: boolean;
	forRemovalGen?: number;
	updateParentsPosition?: (diff: number, force?: boolean) => void;
	shouldUpdateParents?: boolean;
	side?: "left" | "right" | "auto";
	avoidTouching?: AvoidTouching;
	edgeIndisByGen?: {
		left: Record<
			number,
			| (IndiDimensions & { name: string; hasChildren: boolean })
			| undefined
		>;
		right: Record<
			number,
			| (IndiDimensions & { name: string; hasChildren: boolean })
			| undefined
		>;
	};
}

const addGenerationWithDescendantsToStage = ({
	allowCompact,
	childrenOnlyFor,
	gen,
	generation,
	nextX = 0,
	nextY = 0,
	storedY = {},
	forGenealogy,
	forRemoval,
	forRemovalGen,
	settings,
	diff,
	side = "auto",
	updateParentsPosition,
	shouldUpdateParents = true,
	avoidTouching = {},
	edgeIndisByGen = { left: {}, right: {} },
}: AddGenerationProps) => {
	const isLeft = side === "left";
	const direction = isLeft ? -1 : 1;
	const famsInGen: string[] = [];
	const dimDiff = getDimDiff(settings.lineSpace, "tree");
	let usedGeneration: GenerationIndiType[] = [];

	const useSpouses = true;

	if (useSpouses && forGenealogy) {
		const treeObj: Record<IndiKey, GenerationIndiType> = {};
		generation.forEach((indi) => {
			if (!indi.id) {
				return;
			}

			let leftSpouses: Record<IndiKey, GenerationSpouseType> = {};
			let rightSpouses: Record<IndiKey, GenerationSpouseType> = {};
			const indiSpouses = indi.getSpouses();
			indiSpouses
				.orderBy(getMarriageAscAndChildBirth(indi.id))
				.forEach((spouse, _, index) => {
					if (
						!spouse.id ||
						leftSpouses[spouse.id] ||
						rightSpouses[spouse.id]
					) {
						return;
					}

					if (
						indiSpouses.length <= 1 ||
						index >= Math.floor(indiSpouses.length / 2)
					) {
						rightSpouses = {
							...rightSpouses,
							[spouse.id]: { indi: spouse, normal: true },
						};
					} else {
						leftSpouses = {
							[spouse.id]: { indi: spouse, normal: true },
							...leftSpouses,
						};
					}

					spouse
						.getSpouses()
						.except(indi)
						.orderBy(getMarriageAscAndChildBirth(spouse.id))
						.forEach((anotherSpouse) => {
							if (
								!anotherSpouse.id ||
								leftSpouses[anotherSpouse.id] ||
								rightSpouses[anotherSpouse.id]
							) {
								return;
							}

							if (
								indiSpouses.length <= 1 ||
								index >= Math.floor(indiSpouses.length / 2)
							) {
								rightSpouses = {
									...rightSpouses,
									[anotherSpouse.id]: {
										indi: anotherSpouse,
										extra: true,
									},
								};
							} else {
								leftSpouses = {
									[anotherSpouse.id]: {
										indi: anotherSpouse,
										extra: true,
									},
									...leftSpouses,
								};
							}
						});
				});

			treeObj[indi.id] = {
				indi,
				leftSpouses: Object.values(leftSpouses),
				rightSpouses: Object.values(rightSpouses),
			};
		});
		usedGeneration = Object.values(treeObj);
	} else {
		usedGeneration = generation.map((indi) => ({ indi }));
	}

	const sameGenerationParents = usedGeneration.reduce<string[]>(
		(acc, currA) => {
			const famKey = currA?.indi
				.get("FAMC")
				?.toList()
				.index(0)
				?.toValue() as FamKey | undefined;
			const key = famKey || currA?.indi.id;

			if (!key) {
				return acc;
			}

			if (!famsInGen.includes(key)) {
				famsInGen.push(key);
			}

			usedGeneration.forEach((currB) => {
				if (
					currA?.indi.isParentOf(currB?.indi) ||
					currB?.indi.isParentOf(currA?.indi)
				) {
					acc.push(key);
				}
			});

			return acc;
		},
		[]
	);

	const _linesCount = usedGeneration.length + sameGenerationParents.length;
	const newStageIndis: IndiDimensionDictionary = {};
	const newStageIndisByGen: DimensionsByGen = {};
	let x = nextX;

	// TODO, this 3 will be recalculate when after checking line Y
	const currentY = 3 * dimDiff + settings.individualSize.h * 2;

	if (storedY[gen] === undefined) {
		storedY[gen] = nextY;
	}

	const genStageIndis: IndiDimensionDictionary = {};

	const updatePosition = (
		updatedIndis?: GenerationSpouseType[],
		genDiff?: number,
		force = false
	) => {
		if (genDiff === undefined) {
			return;
		}
		const startX = genDiff - (((updatedIndis?.length ?? 1) - 1) * diff) / 2;

		updatedIndis?.forEach((updatedIndi, updatedIndiIndex) => {
			const updatedPosition =
				updatedIndi.indi?.id && newStageIndis[updatedIndi.indi.id];
			if (!updatedPosition) {
				return;
			}

			updatedPosition.position.x = force
				? startX + updatedIndiIndex * diff
				: updatedPosition.position.x + genDiff;
		});

		updateParentsPosition?.(genDiff);
	};

	(isLeft ? usedGeneration.toReversed() : usedGeneration).forEach(
		(mainLevelIndi, mainLevelIndex) => {
			const mainIndi = mainLevelIndi?.indi;
			if (!mainIndi?.id) {
				return;
			}

			const prevLocalX = x;
			const parentGroup = [
				...(mainLevelIndi.leftSpouses ?? []),
				{ indi: mainIndi },
				...(mainLevelIndi.rightSpouses ?? []),
			];

			const edgeKey = isLeft ? "left" : "right";
			const edgeCachedIndiDimension = JSON.parse(
				JSON.stringify(edgeIndisByGen)
			) as Required<AddGenerationProps>["edgeIndisByGen"];
			const edgeIndiDimension = edgeCachedIndiDimension[edgeKey][gen];
			(isLeft ? parentGroup.toReversed() : parentGroup).forEach(
				(genIndi, indiIndex) => {
					const { indi } = genIndi;
					if (!indi?.id || avoidTouching[indi.id]) {
						return;
					}

					avoidTouching[indi.id] =
						mainIndi.id === indi.id ||
						avoidTouching[indi.id] === "spouse"
							? "main"
							: "spouse";
					x =
						gen === 0 &&
						!forRemoval &&
						mainLevelIndex === 0 &&
						indiIndex === 0
							? nextX
							: x + diff * direction;

					newStageIndis![indi?.id] = {
						position: {
							x,
							y:
								storedY[gen] !== undefined
									? storedY[gen]
									: nextY,
						},
						size: {
							w: settings.individualSize.w,
							h: settings.individualSize.h,
						},
						gen,
						line: forRemoval ? "compact" : "normal",
					};

					if (
						!edgeIndiDimension ||
						(isLeft &&
							edgeIndiDimension.position.x >
								newStageIndis![indi?.id].position.x) ||
						(!isLeft &&
							edgeIndiDimension.position.x <
								newStageIndis![indi?.id].position.x)
					) {
						edgeIndisByGen[edgeKey][gen] = {
							...newStageIndis![indi?.id],
							hasChildren: false,
							name: indi.toName() ?? indi.id,
						};
					}

					if (!newStageIndisByGen[gen]) {
						newStageIndisByGen[gen] = {};
					}

					newStageIndisByGen[gen]![indi?.id] =
						newStageIndis![indi?.id];

					genStageIndis[indi?.id] = newStageIndis![indi?.id];
				}
			);

			if (settings.drawDescendants) {
				const childrenInLaws: IndiType[] = [];

				const mainAndExtraParents = parentGroup.filter(
					(parent) => parent.indi.id === mainIndi.id || parent.extra
				);

				const childrenInAvoided: IndiType[] = [];
				const children =
					!childrenOnlyFor || childrenOnlyFor.id === mainIndi?.id
						? new Individuals(
								mainAndExtraParents.map((mp) => mp.indi)
						  )
								.getChildren()
								.orderBy(AGE_ASC)
								.reduce<IndiType[]>((acc, child) => {
									const spouses = child
										.getSpouses()
										.orderBy(
											getMarriageAscAndChildBirth(
												child.id
											)
										);

									spouses.forEach((spouse) => {
										if (
											spouse.id &&
											avoidTouching[spouse.id]
										) {
											return;
										}

										childrenInLaws.push(spouse);
									});
									if (child.id && avoidTouching[child.id]) {
										childrenInAvoided.push(child);
										return acc;
									}

									return acc.concat(child);
								}, [])
						: undefined;
				if (gen <= 0 || (forGenealogy && forRemoval)) {
					const currentEdgeIndi = edgeIndisByGen[edgeKey][gen];
					if (currentEdgeIndi) {
						currentEdgeIndi.hasChildren = !!(
							children?.length || childrenInAvoided.length
						);
					}
					if (!children?.length) {
						if (
							allowCompact && // Move person with no children close to the previous person
							!childrenInAvoided.length &&
							forRemoval &&
							forRemovalGen === gen &&
							gen > 1 &&
							edgeIndiDimension &&
							((isLeft && edgeIndiDimension.position.x > x) ||
								(!isLeft && edgeIndiDimension.position.x < x))
						) {
							(isLeft
								? parentGroup.toReversed()
								: parentGroup
							).forEach((genIndi, indiIndex) => {
								const { indi } = genIndi;
								if (!indi?.id) {
									return;
								}

								newStageIndis[indi.id].position.x =
									edgeIndiDimension.position.x +
									diff * (indiIndex + 1) * direction;

								if (indiIndex === parentGroup.length - 1) {
									x = x - diff * (indiIndex + 1) * direction;
									if (
										(isLeft &&
											x >
												newStageIndis[indi.id].position
													.x) ||
										(!isLeft &&
											x <
												newStageIndis[indi.id].position
													.x)
									) {
										x = newStageIndis[indi.id].position.x;
									}
								}
							});
						}
					} else {
						const diffBetweenParents = differenceBetweenEdgeMembers(
							newStageIndis,
							parentGroup ?? []
						);
						let nextGenX =
							prevLocalX +
							(diff / 2) * direction +
							(diffBetweenParents.diff / 2 -
								((children.length + childrenInLaws.length) *
									diff) /
									2) *
								direction;

						if (
							(isLeft && prevLocalX < nextGenX) ||
							(!isLeft && prevLocalX > nextGenX)
						) {
							updatePosition(parentGroup, prevLocalX - nextGenX);
							nextGenX = prevLocalX;
						}

						const { genX, stageIndis, stagesByGen } =
							addGenerationWithDescendantsToStage({
								allowCompact,
								gen: gen - 1,
								generation: children,
								nextX: nextGenX,
								nextY: nextY + currentY,
								forGenealogy,
								forRemoval,
								forRemovalGen,
								settings,
								diff,
								storedY,
								side,
								avoidTouching,
								shouldUpdateParents,
								updateParentsPosition: (
									newGenDiff: number,
									force = false
								) => {
									updatePosition(
										parentGroup,
										newGenDiff,
										force
									);
								},
								edgeIndisByGen,
							});

						let usedGenX = genX;
						if (
							isLeft &&
							diffBetweenParents.dimension1 &&
							diffBetweenParents.dimension1.position.x < usedGenX
						) {
							usedGenX = diffBetweenParents.dimension1.position.x;
						} else if (
							!isLeft &&
							diffBetweenParents.dimension2 &&
							diffBetweenParents.dimension2.position.x > usedGenX
						) {
							usedGenX = diffBetweenParents.dimension2.position.x;
						}

						if (
							(isLeft && usedGenX < x) ||
							(!isLeft && usedGenX > x)
						) {
							x = usedGenX;
						}

						Object.assign(newStageIndis, stageIndis);

						Object.entries(stagesByGen).forEach(
							([genKey, newStageByGen]) => {
								const genNum = Number(genKey);

								if (!newStageIndisByGen[genNum]) {
									newStageIndisByGen[genNum] = {};
								}

								Object.assign(
									newStageIndisByGen[genNum],
									newStageByGen
								);
							}
						);
					}
				}
			}
		}
	);

	const diffBetweenChildren = differenceBetweenEdgeMembers(
		newStageIndis,
		usedGeneration
	);

	updateParentsPosition?.(
		(diffBetweenChildren.dimension1?.position.x ?? 0) +
			diffBetweenChildren.diff / 2,
		true
	);

	return {
		genX: x,
		nextX,
		stageIndis: newStageIndis,
		stagesByGen: newStageIndisByGen,
	};
};

export const setTreeUtil = <T extends boolean, U extends boolean>(
	id: IndiKey,
	settings: Settings,
	raw?: GedComType | string,
	forGenealogy?: T,
	byGen?: U
): T extends false | undefined
	? U extends false | undefined
		? {
				yCoordinates: Record<number, number>;
				indis: IndiDimensionDictionary;
		  }
		: { yCoordinates: Record<number, number>; indis: DimensionsByGen }
	: { yCoordinates: Record<number, number>; indis: DimensionsByGen } => {
	const gedcom = typeof raw === "string" ? GedcomTree.parse(raw) : raw;
	const allowCompact = settings.allowCompact;

	const diff = settings.individualSize.w * settings.horizontalSpace;
	const indi = gedcom?.indi(id);
	const storedY: Record<number, number> = {};
	if (!indi?.id) {
		return { yCoordinates: storedY, indis: {} };
	}

	const edgeIndisByGen: AddGenerationProps["edgeIndisByGen"] = {
		left: {},
		right: {},
	};
	const newStageIndis: IndiDimensionDictionary = {};
	const newStageIndisByGen: DimensionsByGen = {};
	const tree = indi
		.getTree(false, forGenealogy, forGenealogy)
		.toSorted(({ gen: a }, { gen: b }) => {
			if (a < 0 && b < 0) {
				return Math.abs(a) - Math.abs(b);
			}

			return a - b;
		});

	const siblings = indi.getSiblings().append(indi).orderBy(AGE_ASC);

	const siblingFamKeys: FamKey[] = [];
	const mainGeneration: IndiType[] = [];
	siblings.forEach((sibling) => {
		if (sibling?.id) {
			const famKey = sibling.get("FAMC")?.toList().index(0)?.toValue() as
				| FamKey
				| undefined;
			if (famKey && !siblingFamKeys.includes(famKey)) {
				siblingFamKeys.push(famKey);
			}
			mainGeneration.push(sibling);
		}
	});

	let lastY = 0;
	let isUp = false;
	tree.forEach(({ gen, indis: generation }) => {
		const up = gen > 0;
		const down = gen < 0;
		if (!isUp && up) {
			lastY = 0;
			isUp = true;
		}

		if (down) {
			return;
		}

		const dimDiff = getDimDiff(settings.lineSpace, "tree");
		const left = generation.slice(0, generation.length / 2).filter(Boolean);
		const right = generation.slice(generation.length / 2).filter(Boolean);

		const famsInGen: string[] = [];
		const sameGenerationParents = generation.reduce<string[]>(
			(acc, indiPackA) => {
				generation.forEach((indiPackB) => {
					const key = indiPackA?.id;
					if (!key) {
						return acc;
					}
					if (!famsInGen.includes(key)) {
						famsInGen.push(key);
					}

					if (
						indiPackB?.father?.isParentOf(indiPackA?.father) ||
						indiPackB?.father?.isParentOf(indiPackA?.mother) ||
						indiPackB?.mother?.isParentOf(indiPackA?.father) ||
						indiPackB?.mother?.isParentOf(indiPackA?.mother)
					) {
						acc.push(key);
					}
				});

				return acc;
			},
			[]
		);

		const membersCount = generation.filter(
			(genPack) => genPack?.father || genPack?.mother
		).length;
		const minMemberCount = Math.pow(2, Math.abs(gen) - 1) / 2;
		const linesCount =
			gen === 1
				? siblingFamKeys.length
				: left.length > right.length
				? left.length + sameGenerationParents.length
				: right.length + sameGenerationParents.length;

		[left.toReversed(), right].forEach((side, sideIndex) => {
			const isRight = sideIndex === 1;
			const relativeEdge = isRight ? "rightMost" : "leftMost";
			const relativeOppositeEdge = isRight ? "leftMost" : "rightMost";
			const sideDiff = isRight ? 1 : -1;
			const horizontal = gen === 1 ? -diff * 2 : isRight ? -diff : 0;

			const currentY =
				linesCount * dimDiff + settings.individualSize.h * 2;
			if (!isRight) {
				lastY = up ? lastY - currentY : lastY + currentY;
			}

			const y = lastY;

			if (storedY[gen] === undefined) {
				storedY[gen] = y;
			}

			let x = horizontal;
			side.forEach((indiPack, indiPackIndex) => {
				const prevPack = side?.[indiPackIndex - 1];
				const prevIndi = isRight
					? prevPack?.mother || prevPack?.father
					: prevPack?.father || prevPack?.mother;
				const space = prevIndi ? 0 : diff;
				const first = isRight ? indiPack?.father : indiPack?.mother;
				const second = isRight ? indiPack?.mother : indiPack?.father;

				const firstSpouses = isRight
					? indiPack?.fatherSpouses
					: indiPack?.motherSpouses;
				const secondSpouses = isRight
					? indiPack?.motherSpouses
					: indiPack?.fatherSpouses;

				const usedIndis = [
					...(firstSpouses ?? []),
					first,
					second,
					...(secondSpouses ?? []),
				];

				usedIndis.forEach((indi) => {
					if (indi?.id) {
						x = x + diff * (isRight ? 1 : -1);

						if (membersCount <= minMemberCount) {
							x = getHorizontalPositionByRelative({
								isRight,
								indi,
								relativeEdge,
								relativeOppositeEdge,
								spouses: indi.getSpouses(),
								children: indi.getChildren(),
								space,
								diff,
								sideDiff,
								horizontal: x,
								stageIndis: newStageIndis,
								gedcom,
							});
						}

						newStageIndis![indi.id] = {
							position: {
								x,
								y,
							},
							size: {
								w: settings.individualSize.w,
								h: settings.individualSize.h,
							},
							gen,
							line: "normal",
						};

						const edgeKey = !isRight ? "left" : "right";
						const edgeIndiDimension = edgeIndisByGen[edgeKey][gen];

						if (
							!edgeIndiDimension ||
							(!isRight &&
								edgeIndiDimension.position.x >
									newStageIndis![indi?.id].position.x) ||
							(isRight &&
								edgeIndiDimension.position.x <
									newStageIndis![indi?.id].position.x)
						) {
							edgeIndisByGen[edgeKey][gen] = {
								...newStageIndis![indi?.id],
								hasChildren: true,
								name: indi.toName() ?? indi.id,
							};
						}

						if (!newStageIndisByGen[gen]) {
							newStageIndisByGen[gen] = {};
						}

						newStageIndisByGen[gen]![indi.id] =
							newStageIndis![indi.id];
					}
				});
			});
		});
	});

	const { stageIndis, stagesByGen } = addGenerationWithDescendantsToStage({
		allowCompact,
		childrenOnlyFor: !forGenealogy ? indi : undefined,
		gen: 0,
		generation: mainGeneration,
		forGenealogy,
		settings,
		diff,
		storedY,
		edgeIndisByGen,
	});

	Object.assign(newStageIndis, stageIndis);

	// Reposition
	let middleDiff: number | undefined;

	let longestGen: number | undefined;
	let leftMost: IndiDimensions | undefined;
	let rightMost: IndiDimensions | undefined;

	Object.entries(stagesByGen).forEach(([_genKey, newStageByGen]) => {
		const diffBetweenEdges = differenceBetweenEdgeMembers(newStageByGen);
		if (
			!leftMost ||
			(diffBetweenEdges.dimension1?.position.x ?? 0) < leftMost.position.x
		) {
			leftMost = diffBetweenEdges.dimension1;
		}
		if (
			!rightMost ||
			(diffBetweenEdges.dimension2?.position.x ?? 0) >
				rightMost.position.x
		) {
			rightMost = diffBetweenEdges.dimension2;
		}

		if (leftMost && rightMost) {
			const diffBetween = differenceBetweenDimensions(
				leftMost,
				rightMost
			);

			if (!longestGen || diffBetween.diff > longestGen) {
				middleDiff =
					-(diffBetween.diff / 2) -
					diff / 2 -
					(diffBetween.dimension1?.position.x ?? 0);
				longestGen = diffBetween.diff;
			}
		}
	});

	Object.entries(stagesByGen).forEach(([genKey, newStageByGen]) => {
		const genNum = Number(genKey);

		Object.values(newStageByGen).forEach((newStageIndi) => {
			newStageIndi.position.x =
				newStageIndi.position.x + (middleDiff ?? 0);
		});

		if (!newStageIndisByGen[genNum]) {
			newStageIndisByGen[genNum] = {};
		}

		Object.assign(newStageIndisByGen[genNum], newStageByGen);
	});

	if (forGenealogy) {
		const avoidTouching = Object.keys(newStageIndis).reduce<AvoidTouching>(
			(acc, curr) => {
				acc[curr as IndiKey] = "main";
				return acc;
			},
			{}
		);
		Object.entries(newStageIndisByGen).forEach(
			([genKey, newStageByGen]) => {
				const genNum = Number(genKey);

				// if (genNum > 5) {
				// 	return;
				// }
				if (genNum <= 0) {
					return;
				}

				Object.entries(newStageByGen)
					.toSorted(([, a], [, b]) => {
						const posA = a.position.x;
						const posB = b.position.x;

						if (
							(posA < 0 && posB >= 0) ||
							(posA >= 0 && posB < 0)
						) {
							return posA - posB;
						}

						return Math.abs(posA) - Math.abs(posB);
					})
					.forEach(([newStageIndiKey, stageIndi]) => {
						const indi = gedcom?.indi(newStageIndiKey as IndiKey);
						if (!indi?.id) {
							return;
						}

						const side =
							stageIndi.position.x >= 0 ? "right" : "left";

						const { stagesByGen } =
							addGenerationWithDescendantsToStage({
								allowCompact,
								gen: genNum,
								generation: [indi],
								nextX:
									side === "right"
										? rightMost?.position.x ?? 0
										: leftMost?.position.x ?? 0,
								nextY: stageIndi.position.y,
								side,
								forGenealogy: true,
								forRemoval: true,
								forRemovalGen: genNum - 1,
								settings,
								diff,
								avoidTouching,
								storedY,
								edgeIndisByGen,
							});

						Object.entries(stagesByGen).forEach(
							([genKey, newStageByGen]) => {
								const genNum = Number(genKey);

								const diffBetweenEdges =
									differenceBetweenEdgeMembers(newStageByGen);
								if (
									!leftMost ||
									(diffBetweenEdges.dimension1?.position.x ??
										0) < leftMost.position.x
								) {
									leftMost = diffBetweenEdges.dimension1;
								}
								if (
									!rightMost ||
									(diffBetweenEdges.dimension2?.position.x ??
										0) > rightMost.position.x
								) {
									rightMost = diffBetweenEdges.dimension2;
								}

								if (!newStageIndisByGen[genNum]) {
									newStageIndisByGen[genNum] = {};
								}

								Object.assign(newStageIndis, newStageByGen);
								Object.assign(
									newStageIndisByGen[genNum],
									newStageByGen
								);
							}
						);
					});
			}
		);
	}
	if (forGenealogy || byGen) {
		return { yCoordinates: storedY, indis: newStageIndisByGen };
	}

	return { yCoordinates: storedY, indis: newStageIndis };
};
