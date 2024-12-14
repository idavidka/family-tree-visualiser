import { type Common } from "../../classes/gedcom/classes/common";

interface IPersonalNamePiecesStructure extends Common {
	NPFX?: Common;
	GIVN?: Common;
	NICK?: Common;
	SPFX?: Common;
	SURN?: Common;
	NSFX?: Common;
}

export default IPersonalNamePiecesStructure;
