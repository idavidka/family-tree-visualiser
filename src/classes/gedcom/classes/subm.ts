import type ISubm from "../interfaces/subm";
import { type SubmKey } from "../../../types/types";
import { Common } from "./common";
import { type GedComType } from "./gedcom";

export class Subm extends Common<string, SubmKey> implements ISubm {}

export type SubmType = Subm & ISubm;
export const createSubm = (gedcom: GedComType, id: SubmKey): SubmType => {
	return new Subm(gedcom, id);
};
