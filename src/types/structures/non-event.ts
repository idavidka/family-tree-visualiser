import { type Common } from "../../classes/gedcom/classes/common";
import type INoteStructure from "./note";
import type ISourceCitationStructure from "./source-citation";

interface INonEventStructure extends Common {
	NO?: Common & {
		DATE?: Common & {
			PHRASE?: Common;
		};
	} & INoteStructure &
		ISourceCitationStructure;
}

export default INonEventStructure;
