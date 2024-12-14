import {
	type GenerationIndiType,
	type IndiType,
} from "../../classes/gedcom/classes/indi";
import {
	type IndiDimensionDictionary,
	type IndiDimensions,
} from "../../store/main/reducers";

export const differenceBetweenDimensions = (
	dimension1: IndiDimensions,
	dimension2: IndiDimensions
) => {
	const diff = dimension2.position.x - dimension1.position.x;

	return { dimension1, dimension2, diff };
};

export const differenceBetweenEdgeMembers = (
	dimensions: IndiDimensionDictionary,
	indis?: IndiType[] | GenerationIndiType[]
) => {
	if (!indis) {
		const dimensionValues = Object.values(dimensions).sort(
			(a, b) => a.position.x - b.position.x
		);

		return differenceBetweenDimensions(
			dimensionValues[0],
			dimensionValues[dimensionValues.length - 1]
		);
	}

	const firstMember = indis[0];
	const lastMember = indis[indis.length - 1];

	const firstIndis =
		firstMember && "indi" in firstMember
			? [
					...(firstMember.leftSpouses ?? []),
					{ indi: firstMember.indi },
					...(firstMember.rightSpouses ?? []),
			  ]
			: [{ indi: firstMember }];
	const lastIndis =
		lastMember && "indi" in lastMember
			? [
					...(lastMember.leftSpouses ?? []),
					{ indi: lastMember.indi },
					...(lastMember.rightSpouses ?? []),
			  ]
			: [{ indi: lastMember }];

	const firstIndiId = firstIndis[0]?.indi?.id;
	const lastIndiId = lastIndis[lastIndis.length - 1]?.indi?.id;

	if (
		!firstIndiId ||
		!lastIndiId ||
		!dimensions[firstIndiId] ||
		!dimensions[lastIndiId]
	) {
		return {
			diff: 0,
			dimension1: undefined,
			dimension2: undefined,
		};
	}

	return differenceBetweenDimensions(
		dimensions[firstIndiId],
		dimensions[lastIndiId]
	);
};
