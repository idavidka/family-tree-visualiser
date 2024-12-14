import { type Common } from "../../classes/gedcom/classes/common";
import type INoteStructure from "./note";

interface IPlaceStructure extends Common {
	PLAC?: Common & {
		FORM?: Common;
		LANG?: Common;
		TRAN?: Common & {
			LANG?: Common;
		};
		MAP?: Common & {
			LATI?: Common;
			LONG?: Common;
		};
		EXID?: Common & {
			TYPE?: Common;
		};
	} & INoteStructure;
}

export default IPlaceStructure;
