import { type Common } from "../../classes/gedcom/classes/common";
import type IDateStructure from "./date";

interface ICreationDateStructure extends Common {
	CREA?: Common & IDateStructure;
}

export default ICreationDateStructure;
