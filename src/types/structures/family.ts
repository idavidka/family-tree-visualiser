import { type Common } from "../../classes/gedcom/classes/common";
import type IAssociationStructure from "./association";
import type IChangeDateStructure from "./change-date";
import type ICreationDateStructure from "./creation-date";
import type ILdsSpouseSealingStructure from "./lds-spouse-sealing";
import type IMarriageDateStructure from "./marriage-date";
import type IMultimediaLinkStructure from "./multimedia-link";
import type INonEventStructure from "./non-event";
import type INoteStructure from "./note";
import type ISourceCitationStructure from "./source-citation";

interface IFamilyStructure
	extends Common,
		IMarriageDateStructure,
		IChangeDateStructure,
		ICreationDateStructure,
		IAssociationStructure,
		ILdsSpouseSealingStructure,
		IMultimediaLinkStructure,
		INonEventStructure,
		INoteStructure,
		ISourceCitationStructure {
	RESN?: Common;
	HUSB?: Common & {
		PHRASE?: Common;
	};
	WIFE?: Common & {
		PHRASE?: Common;
	};
	CHIL?: Common & {
		PHRASE?: Common;
	};
	SUBM?: Common;
}

export default IFamilyStructure;
