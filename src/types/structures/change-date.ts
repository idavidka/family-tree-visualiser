import { type Common } from "../../classes/gedcom/classes/common";
import type IDateStructure from "./date";
import type INoteStructure from "./note";

interface IChangeDateStructure extends Common, INoteStructure {
	CHAN?: Common & IDateStructure;
}

export default IChangeDateStructure;
