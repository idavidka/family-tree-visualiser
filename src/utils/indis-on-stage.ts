import { sum } from "lodash";
import {
	type Stage,
	type IndiDimensions,
	type DimensionsByGen,
	type IndiDimensionDictionary,
} from "../store/main/reducers";
import { type IndiKey } from "../types/types";

export interface StageRect {
	id: string;
	rect: DOMRect;
}

export const getStageEdges = (indis: Stage["indis"]) => {
	const edgeIndi: Partial<{
		top: IndiDimensions & { id?: IndiKey };
		right: IndiDimensions & { id?: IndiKey };
		bottom: IndiDimensions & { id?: IndiKey };
		left: IndiDimensions & { id?: IndiKey };
	}> = {};

	Object.entries(indis ?? {}).forEach(([key, indi]) => {
		const id = key as IndiKey;
		if (!edgeIndi.bottom || indi.position.y > edgeIndi.bottom.position.y) {
			edgeIndi.bottom = { ...indi, id };
		}
		if (!edgeIndi.right || indi.position.x > edgeIndi.right.position.x) {
			edgeIndi.right = { ...indi, id };
		}
		if (!edgeIndi.top || indi.position.y < edgeIndi.top.position.y) {
			edgeIndi.top = { ...indi, id };
		}
		if (!edgeIndi.left || indi.position.x < edgeIndi.left.position.x) {
			edgeIndi.left = { ...indi, id };
		}
	});

	return edgeIndi;
};

const isOverlapping = (
	element1: StageRect | HTMLDivElement,
	element2: StageRect | HTMLDivElement
) => {
	const rect1 =
		"rect" in element1 ? element1.rect : element1.getBoundingClientRect();
	const rect2 =
		"rect" in element2 ? element2.rect : element2.getBoundingClientRect();

	return !(
		rect1.right < rect2.left ||
		rect1.left > rect2.right ||
		rect1.bottom < rect2.top ||
		rect1.top > rect2.bottom
	);
};

export const isStageValid = (
	indis: Stage["indis"],
	rects?: StageRect[],
	missing?: IndiKey[]
) => {
	const coordinates: Record<string, number> = {};
	const overlaps: Record<
		string,
		[StageRect | HTMLDivElement, StageRect | HTMLDivElement]
	> = {};
	const dropped = rects || document.querySelectorAll(".individual-dropped");
	dropped.forEach((elementA) => {
		const indiElement = elementA as StageRect | HTMLDivElement;
		let key = "";

		if ("rect" in indiElement) {
			key = `${indiElement.rect.left},${indiElement.rect.top}`;
		} else {
			key = `${indiElement.style.left},${indiElement.style.top}`;
		}

		if (!coordinates[key]) {
			coordinates[key] = 0;
		}

		coordinates[key]++;

		dropped.forEach((elementB) => {
			if (elementA.id === elementB.id) {
				return;
			}
			const overlapKey = [elementA.id, elementB.id].toSorted().join(",");

			if (overlaps[overlapKey]) {
				return;
			}

			const divElementA = elementA as StageRect | HTMLDivElement;
			const divElementB = elementB as StageRect | HTMLDivElement;
			const overlapping = isOverlapping(divElementA, divElementB);
			if (overlapping) {
				overlaps[overlapKey] = [divElementA, divElementB];
			}
		});
	});

	const onStageLength = Object.keys(indis ?? {}).length;
	const uniqueCoordinatesLength = sum(Object.values(coordinates));
	const overlapsLength = Object.keys(overlaps).length;

	return {
		isValid:
			onStageLength === uniqueCoordinatesLength &&
			!overlapsLength &&
			!missing?.length,
		onStageLength,
		uniqueCoordinatesLength,
		overlapsLength,
		overlaps,
		missing,
	};
};

export const sortByPositionItems = <T extends boolean>(
	items: Stage["indis"],
	posKey: "x" | "y" = "x",
	absolute = true,
	group?: T
): T extends false | undefined ? IndiDimensionDictionary : DimensionsByGen => {
	const newItems: IndiDimensionDictionary = {};
	const newItemsGroups: DimensionsByGen = {};

	const orderedByAbsolute = Object.entries(items ?? {}).sort(
		([_keyA, a], [_keyB, b]) => {
			if (absolute) {
				return (
					Math.abs(a.position[posKey]) - Math.abs(b.position[posKey])
				);
			}

			return a.position[posKey] - b.position[posKey];
		}
	);

	orderedByAbsolute.forEach(([key]) => {
		const usedKey = key as IndiKey;
		if (items?.[usedKey]) {
			newItems[usedKey] = items[usedKey];

			if (group) {
				if (!newItemsGroups[newItems[usedKey].position[posKey]]) {
					newItemsGroups[newItems[usedKey].position[posKey]] = {};
				}

				newItemsGroups[newItems[usedKey].position[posKey]][usedKey] =
					newItems[usedKey];
			}
		}
	});

	if (group) {
		return newItemsGroups;
	}

	return newItems;
};
