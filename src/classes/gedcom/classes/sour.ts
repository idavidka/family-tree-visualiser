import type ISour from "../interfaces/sour";
import type ISourceStructure from "../../../types/structures/source";
import { type SourKey } from "../../../types/types";
import { Common } from "./common";
import { type GedComType } from "./gedcom";

export class Sour extends Common<string, SourKey> implements ISour {}

export type SourType = Sour & ISourceStructure;
export const createSour = (gedcom: GedComType, id: SourKey): SourType => {
	return new Sour(gedcom, id);
};
