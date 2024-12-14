import { type Common } from "../../classes/gedcom/classes/common";
import type IEventDetailStructure from "./event-detail-structure";
import type IIndividualEventDetailStructure from "./individual-event-detail-structure";

interface IIndividualEventStructure extends IIndividualEventDetailStructure {
	BAPM?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	BARM?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	BASM?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	BLES?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	BURI?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	CENS?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	CHRA?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	CONF?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	CREM?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	DEAT?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	EMIG?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	FCOM?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	GRAD?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	IMMI?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	NATU?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	ORDN?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	PROB?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	RETI?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	WILL?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
	ADOP?: Common & {
		TYPE?: Common;
		FAMC?: Common & {
			ADOP?: Common & {
				PHRASE?: Common;
			};
		};
	} & IEventDetailStructure;
	BIRT?: Common & {
		TYPE?: Common;
		FAMC?: Common;
	} & IEventDetailStructure;
	CHR?: Common & {
		TYPE?: Common;
		FAMC?: Common;
	} & IEventDetailStructure;
	EVEN?: Common & {
		TYPE?: Common;
	} & IEventDetailStructure;
}

export default IIndividualEventStructure;
