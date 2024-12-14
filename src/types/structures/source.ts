import { type Common } from "../../classes/gedcom/classes/common";
import type IChangeDateStructure from "./change-date";
import type ICreationDateStructure from "./creation-date";
import type IMultimediaLinkStructure from "./multimedia-link";
import type INoteStructure from "./note";
import type IPlaceStructure from "./place";
import type ISourceRepositoryCitationStructure from "./source-repository-citation";

interface ISourceStructure
	extends Common,
		IChangeDateStructure,
		ICreationDateStructure,
		ISourceRepositoryCitationStructure,
		IMultimediaLinkStructure,
		INoteStructure {
	DATA?: Common & {
		EVEN?: Common & {
			DATE?: Common & {
				PHRASE?: Common;
			};
		} & IPlaceStructure;
		AGNC?: Common;
	} & INoteStructure;
	AUTH?: Common;
	TITL?: Common;
	ABBR?: Common;
	PUBL?: Common;
	TEXT?: Common & {
		MIME?: Common;
		LANG?: Common;
	};
	_APID?: Common;
}

export default ISourceStructure;
