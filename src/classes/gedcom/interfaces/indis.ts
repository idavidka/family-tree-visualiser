import { type IndiType } from "../classes/indi";
import { type Individuals } from "../classes/indis";
import { type List } from "../classes/list";
import { type FamKey, type IndiKey } from "../../../types/types";
import { type IList } from "./list";

export interface IIndividuals extends IList<IndiKey, IndiType> {
	toName: () => List;

	isParentOf: (
		indi?: IndiKey | IndiType,
		every?: boolean
	) => IndiKey | boolean;

	isChildOf: (
		indi?: IndiKey | IndiType,
		every?: boolean
	) => IndiKey | boolean;

	isSiblingOf: (
		indi?: IndiKey | IndiType,
		every?: boolean
	) => IndiKey | boolean;

	isSpouseOf: (
		indi?: IndiKey | IndiType,
		every?: boolean
	) => IndiKey | boolean;

	isParentInLawOf: (
		indi?: IndiKey | IndiType,
		every?: boolean
	) => IndiKey | boolean;

	isChildInLawOf: (
		indi?: IndiKey | IndiType,
		every?: boolean
	) => IndiKey | boolean;

	splitByFamily: (type: "Spouses" | "Children") => {
		items: Record<FamKey, Individuals | undefined>;
		lengthOfFamily: number;
		lengthOfIndividuals: number;
	};

	getAscendants: () => Individuals;

	getDescendants: () => Individuals;

	getAllAscendants: () => Individuals;

	getAllDescendants: () => Individuals;

	getRelativesOnLevel: () => Individuals;

	getRelativesOnDegree: () => Individuals;

	getSpouses: () => Individuals;

	getSiblings: () => Individuals;

	getChildren: () => Individuals;

	getParents: () => Individuals;
}
