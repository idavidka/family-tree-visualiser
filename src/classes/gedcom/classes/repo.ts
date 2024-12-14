import type IRepo from "../interfaces/repo";
import type IRepositoryStructure from "../../../types/structures/repository";
import { type RepoKey } from "../../../types/types";
import { Common } from "./common";
import { type GedComType } from "./gedcom";

export class Repo extends Common<string, RepoKey> implements IRepo {}

export type RepoType = Repo & IRepositoryStructure;
export const createRepo = (gedcom: GedComType, id: RepoKey): RepoType => {
	return new Repo(gedcom, id);
};
