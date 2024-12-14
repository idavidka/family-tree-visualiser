import type IFam from "../interfaces/fam";
import type IFamilyStructure from "../../../types/structures/family";
import { type FamKey, type IndiKey } from "../../../types/types";
import { Common } from "./common";
import { type GedComType } from "./gedcom";
import { Individuals } from "./indis";

export class Fam extends Common<string, FamKey> implements IFam {
	private getFamilyMembers(type: "CHIL" | "WIFE" | "HUSB"): Individuals {
		const familyMembers = new Individuals();
		this.get(type)
			?.toList()
			.forEach((item) => {
				const indiId = item.value as IndiKey;
				const indi = this.gedcom?.indi(indiId);

				if (indi) {
					familyMembers.item(indiId, indi);
				}
			});
		return familyMembers;
	}

	getChildren() {
		return this.getFamilyMembers("CHIL");
	}

	getHusband() {
		return this.getFamilyMembers("HUSB");
	}

	getWife() {
		return this.getFamilyMembers("WIFE");
	}

	getParents(): Individuals {
		return this.getWife().copy().merge(this.getHusband());
	}
}

export type FamType = Fam & IFamilyStructure;
export const createFam = (gedcom: GedComType, id: FamKey): FamType => {
	return new Fam(gedcom, id);
};
