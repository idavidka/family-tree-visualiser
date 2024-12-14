import { type FamType } from "../classes/fam";
import { type Individuals } from "../classes/indis";
import { type FamKey } from "../../../types/types";
import { type IList } from "./list";

export interface IFamilies extends IList<FamKey, FamType> {
	getParents: () => Individuals;

	getChildren: () => Individuals;
}
