import { type Common } from "../../classes/gedcom/classes/common";
import { type CommonName } from "../../classes/gedcom/classes/name";
import type IAssociationStructure from "./association";
import type IChangeDateStructure from "./change-date";
import type ICreationDateStructure from "./creation-date";
import type IIndividualEventStructure from "./individual-event-structure";
import type IMultimediaLinkStructure from "./multimedia-link";
import type INonEventStructure from "./non-event";
import type INoteStructure from "./note";
import type ISourceCitationStructure from "./source-citation";

interface IIndividualStructure
	extends Common,
		IIndividualEventStructure,
		IChangeDateStructure,
		ICreationDateStructure,
		IAssociationStructure,
		IMultimediaLinkStructure,
		INonEventStructure,
		INoteStructure,
		ISourceCitationStructure {
	NAME?: CommonName;
	RESN?: Common;
	SEX?: Common<"F" | "M">;
	FAMC?: Common & {
		PEDI?: Common & {
			PHRASE?: Common;
		};
		STAT?: Common & {
			PHRASE?: Common;
		};
	} & INoteStructure;

	FAMS?: Common & INoteStructure;
	SUBM?: Common;
	ALIA?: Common & {
		PHRASE?: Common;
	};
	ANCI?: Common;
	DESI?: Common;
}

export default IIndividualStructure;
