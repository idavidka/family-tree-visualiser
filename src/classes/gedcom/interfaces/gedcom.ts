import { type Common } from "../classes/common";
import { type FamType, type Fam } from "../classes/fam";
import { type IndiType, type Indi } from "../classes/indi";
import { type ObjeType } from "../classes/obje";
import { type SourType } from "../classes/sour";
import { type RepoType } from "../classes/repo";
import { type SubmType } from "../classes/subm";
import { type Families } from "../classes/fams";
import { type Individuals } from "../classes/indis";
import { type Objects } from "../classes/objes";
import { type Repositories } from "../classes/repos";
import { type Sources } from "../classes/sours";
import { type Submitters } from "../classes/subms";
import {
	type FamKey,
	type IndiKey,
	type ObjeKey,
	type RepoKey,
	type SourKey,
	type SubmKey,
} from "../../../types/types";

interface IGedcom extends Common {
	toIndiArray: () => Indi[];

	toFamArray: () => Fam[];

	indis: () => Individuals | undefined;

	fams: () => Families | undefined;

	objes: () => Objects | undefined;

	sours: () => Sources | undefined;

	repos: () => Repositories | undefined;

	subms: () => Submitters | undefined;

	indi: (index: number | IndiKey) => IndiType | undefined;

	fam: (index: number | FamKey) => FamType | undefined;

	obje: (index: number | ObjeKey) => ObjeType | undefined;

	sour: (index: number | SourKey) => SourType | undefined;

	repo: (index: number | RepoKey) => RepoType | undefined;

	subm: (index: number | SubmKey) => SubmType | undefined;
}

export default IGedcom;
