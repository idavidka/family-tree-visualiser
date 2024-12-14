import { type Common } from "../../classes/gedcom/classes/common";
import type INoteStructure from "./note";
import type IPersonalNamePiecesStructure from "./personal-name-pieces";
import type ISourceCitationStructure from "./source-citation";

interface IPersonalNameStructure extends Common {
	NAME?: Common & {
		TYPE?: Common & {
			PHRASE?: Common;
		};
		TRAN?: Common & {
			LANG?: Common;
		} & IPersonalNamePiecesStructure;
	} & IPersonalNamePiecesStructure &
		INoteStructure &
		ISourceCitationStructure;
}

export default IPersonalNameStructure;
