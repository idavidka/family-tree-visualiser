import { type Common } from "../../classes/gedcom/classes/common";
import { type NonStandard } from "../types";
import type IAddressStructure from "./address";
import type INoteStructure from "./note";

interface IGedComStructure extends Common, Omit<NonStandard, "id" | "value"> {
	HEAD?: Common & {
		GEDC?: Common & {
			VERS?: Common;
		};
		SCHMA?: Common & {
			TAG?: Common;
		};
		SOUR?: Common & {
			VERS?: Common;
			NAME?: Common;
			CORP?: Common & {
				PHON?: Common;
				EMAIL?: Common;
				FAX?: Common;
				WWW?: Common;
			} & IAddressStructure;
			DATA?: Common & {
				DATE?: Common & {
					TIME?: Common;
				};
				CORP?: Common;
			};
			_TREE?: Common & {
				RIN?: Common;
			};
		};

		DEST?: Common;
		DATE?: Common & {
			TIME?: Common;
		};
		SUBM?: Common;
		CORP?: Common;
		LANG?: Common;
		PLAC?: Common & {
			FORM?: Common;
		};
	} & INoteStructure;
}
export default IGedComStructure;
