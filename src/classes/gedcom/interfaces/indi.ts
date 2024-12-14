import { type Common } from "../classes/common";
import { type Families } from "../classes/fams";
import { type IndiType } from "../classes/indi";
import { type Individuals } from "../classes/indis";
import { type List } from "../classes/list";
import { type IndiKey } from "../../../types/types";

export type GeneratorKey = `${"2nd" | "3rd" | `${4 | 5 | 6 | 7 | 8 | 9}th`}`;
export type GeneratorType =
	| "Cousins"
	| "GreatGrandParents"
	| "GreatGrandChildren";

export type GeneratedIndiMethods = Record<
	`get${GeneratorKey}${GeneratorType}`,
	() => Individuals
>;

export type MediaList = Record<
	string,
	{
		key: string;
		id: string;
		imgId: string;
		tree: string;
		person: IndiKey;
		title: string;
		url: string;
		contentType: string;
		downloadName: string;
	}
>;

interface IIndi extends Common<string, IndiKey> {
	isParentOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isChildOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isSiblingOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isSpouseOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isParentInLawOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isChildInLawOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	isSiblingInLawOf: (indi?: IndiKey | IndiType) => IndiKey | boolean;

	toFamilies: (list: List) => Families;

	getAscendants: () => Individuals;

	getDescendants: () => Individuals;

	getRelativesOnLevel: () => Individuals;

	getRelativesOnDegree: () => Individuals;

	getAllDescendants: () => Individuals;

	getAllAscendants: () => Individuals;

	getSiblings: () => Individuals;

	getBrothers: () => Individuals;

	getSisters: () => Individuals;

	getChildren: () => Individuals;

	getAdoptedChildren: () => Individuals;

	getBirthChildren: () => Individuals;

	getFosterChildren: () => Individuals;

	getSealingChildren: () => Individuals;

	getStepChildren: () => Individuals;

	getSons: () => Individuals;

	getAdoptedSons: () => Individuals;

	getBirthSons: () => Individuals;

	getFosterSons: () => Individuals;

	getSealingSons: () => Individuals;

	getStepSons: () => Individuals;

	getDaughters: () => Individuals;

	getAdoptedDaughters: () => Individuals;

	getBirthDaughters: () => Individuals;

	getFosterDaughters: () => Individuals;

	getSealingDaughters: () => Individuals;

	getStepDaughters: () => Individuals;

	getParents: () => Individuals;

	getAdoptedParents: () => Individuals;

	getBirthParents: () => Individuals;

	getFosterParents: () => Individuals;

	getSealingParents: () => Individuals;

	getStepParents: () => Individuals;

	getFathers: () => Individuals;

	getAdoptedFathers: () => Individuals;

	getBirthFathers: () => Individuals;

	getFosterFathers: () => Individuals;

	getSealingFathers: () => Individuals;

	getStepFathers: () => Individuals;

	getMothers: () => Individuals;

	getAdoptedMothers: () => Individuals;

	getBirthMothers: () => Individuals;

	getFosterMothers: () => Individuals;

	getSealingMothers: () => Individuals;

	getStepMothers: () => Individuals;

	getSpouses: () => Individuals;

	getWives: () => Individuals;

	getHusbands: () => Individuals;

	getCousins: () => Individuals;

	getGrandParents: () => Individuals;

	getGrandFathers: () => Individuals;

	getGrandMothers: () => Individuals;

	getGrandChildren: () => Individuals;

	getGrandSons: () => Individuals;

	getGrandDaughters: () => Individuals;

	getGreatGrandParents: () => Individuals;

	getGreatGrandFathers: () => Individuals;

	getGreatGrandMothers: () => Individuals;

	getGreatGrandChildren: () => Individuals;

	getGreatGrandSons: () => Individuals;

	getGreatGrandDaughters: () => Individuals;

	getNiblings: () => Individuals;

	getNieces: () => Individuals;

	getNephews: () => Individuals;

	getAuncles: () => Individuals;

	getAunts: () => Individuals;

	getUncles: () => Individuals;

	getParentsInLaw: () => Individuals;

	getFathersInLaw: () => Individuals;

	getMothersInLaw: () => Individuals;

	getChildrenInLaw: () => Individuals;

	getSonsInLaw: () => Individuals;

	getDaughtersInLaw: () => Individuals;

	getSiblingsInLaw: () => Individuals;

	getBrothersInLaw: () => Individuals;

	getSistersInLaw: () => Individuals;
}

export default IIndi;
