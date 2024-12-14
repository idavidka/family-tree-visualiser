import { type Common } from "../classes/common";
import { type Individuals } from "../classes/indis";
import { type FamKey } from "../../../types/types";

interface IFam extends Common<string, FamKey> {
	getChildren: () => Individuals;

	getHusband: () => Individuals;

	getWife: () => Individuals;
}

export default IFam;
