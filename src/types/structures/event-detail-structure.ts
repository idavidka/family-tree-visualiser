import { type Common } from "../../classes/gedcom/classes/common";
import type IAddressStructure from "./address";
import type IAssociationStructure from "./association";
import type IDateStructure from "./date";
import type IMultimediaLinkStructure from "./multimedia-link";
import type INoteStructure from "./note";
import type IPlaceStructure from "./place";
import type ISourceCitationStructure from "./source-citation";

interface IEventDetailStructure
	extends IDateStructure,
		IPlaceStructure,
		IAddressStructure,
		IAssociationStructure,
		INoteStructure,
		ISourceCitationStructure,
		IMultimediaLinkStructure {
	PHON?: Common;
	EMAIL?: Common;
	FAX?: Common;
	WWW?: Common;
	AGNC?: Common;
	RELI?: Common;
	CAUS?: Common;
	RESN?: Common;
	SDATE?: Common & {
		TIME?: Common;
		PHRASE?: Common;
	};
	UID?: Common;
}

export default IEventDetailStructure;
