import { type Common } from "../../classes/gedcom/classes/common";
import { type CommonNote } from "../../classes/gedcom/classes/note";
import type ISourceCitationStructure from "./source-citation";

interface INoteStructure extends Common {
	NOTE?: CommonNote & {
		MIME?: Common;
		LANG?: Common;
		TRAN?: Common & {
			MIME?: Common;
			LANG?: Common;
		};
	} & ISourceCitationStructure;
	SNOTE?: Common;
}

export default INoteStructure;
