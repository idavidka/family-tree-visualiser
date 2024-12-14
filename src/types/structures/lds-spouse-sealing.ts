import { type Common } from "../../classes/gedcom/classes/common";
import type ILdsOrdinanceDetailStructure from "./lds-ordinance-detail";

interface ILdsSpouseSealingStructure extends Common {
	SLSG?: Common & ILdsOrdinanceDetailStructure;
}

export default ILdsSpouseSealingStructure;
