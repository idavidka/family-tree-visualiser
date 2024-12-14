import { type Common } from "../../classes/gedcom/classes/common";
import type INoteStructure from "./note";

interface ISourceRepositoryCitationStructure extends Common {
	REPO?: Common & {
		CALN?: Common & {
			MEDI?: Common & {
				PHRASE?: Common;
			};
		};
	} & INoteStructure;
}

export default ISourceRepositoryCitationStructure;
