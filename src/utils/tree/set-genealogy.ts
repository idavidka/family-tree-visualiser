import { type GedComType } from "../../classes/gedcom/classes/gedcom";
import {
	type DimensionsByGen,
	type IndiDimensionDictionary,
	type Settings,
} from "../../store/main/reducers";
import { type IndiKey } from "../../types/types";
import GedcomTree from "../parser";
import { setTreeUtil } from "./set-tree";

export const setGenealogyUtil = <T extends boolean | undefined>(
	id: IndiKey,
	settings: Settings,
	raw?: GedComType | string,
	byGen?: T
): T extends false | undefined
	? {
			yCoordinates: Record<number, number>;
			indis: IndiDimensionDictionary;
	  }
	: {
			yCoordinates: Record<number, number>;
			indis: DimensionsByGen;
	  } => {
	const gedcom = typeof raw === "string" ? GedcomTree.parse(raw) : raw;

	const indi = gedcom?.indi(id);
	if (!indi) {
		return { yCoordinates: {}, indis: {} };
	}

	const newStageIndis: IndiDimensionDictionary = {};
	const { yCoordinates, indis: newStageIndisByGen } = setTreeUtil(
		id,
		settings,
		raw,
		true
	);

	Object.entries(newStageIndisByGen).forEach(([_gen, indis]) => {
		Object.assign(newStageIndis, indis);
	});

	if (byGen) {
		return { yCoordinates, indis: newStageIndisByGen };
	}

	return { yCoordinates, indis: newStageIndis };
};
