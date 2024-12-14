import { type Common } from "../../classes/gedcom/classes/common";
import type INoteStructure from "./note";
import type IPlaceStructure from "./place";
import type ISourceCitationStructure from "./source-citation";

interface ILdsOrdinanceDetailStructure
	extends Common,
		INoteStructure,
		ISourceCitationStructure,
		IPlaceStructure {
	DATE?: Common & {
		TIME?: Common;
		PHRASE?: Common;
	};
	TEMP?: Common;
	STAT?: Common & {
		DATE?: Common;
		TIME?: Common;
	};
}

export default ILdsOrdinanceDetailStructure;
