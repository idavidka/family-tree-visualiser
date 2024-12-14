import { type Common } from "../../classes/gedcom/classes/common";
import type INoteStructure from "./note";
import type ISourceCitationStructure from "./source-citation";

interface IAssociationStructure
	extends Common,
		INoteStructure,
		ISourceCitationStructure {
	ASSO?: Common & {
		PHRASE?: Common;
		ROLE?: Common & {
			PHRASE?: Common;
		};
	};
}

export default IAssociationStructure;
