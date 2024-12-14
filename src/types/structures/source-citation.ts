import { type Common } from "../../classes/gedcom/classes/common";
import type IMultimediaLinkStructure from "./multimedia-link";
import type INoteStructure from "./note";

interface ISourceCitationStructure extends Common, IMultimediaLinkStructure {
	SOUR?: Common & {
		PAGE?: Common;
		DATA?: Common & {
			DATE?: Common & {
				TIME?: Common;
				PHRASE?: Common;
			};
			TEXT?: Common & {
				MIME?: Common;
				LANG?: Common;
			};
		};
		EVEN?: Common & {
			PHRASE?: Common;
			ROLE?: Common & {
				PHRASE?: Common;
			};
		};
		QUAY?: Common;
	} & INoteStructure;
}

export default ISourceCitationStructure;
