import { type Common } from "../../classes/gedcom/classes/common";
import type IDateStructure from "./date";
import type INoteStructure from "./note";
import type IPlaceStructure from "./place";

interface IMarriageDateStructure extends Common, INoteStructure {
	MARR?: Common & IDateStructure & IPlaceStructure;
	HUSB?: Common;
	WIFE?: Common;
}

export default IMarriageDateStructure;
