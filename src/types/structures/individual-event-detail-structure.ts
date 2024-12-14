import { type Common } from "../../classes/gedcom/classes/common";
import type IEventDetailStructure from "./event-detail-structure";

interface IIndividualEventDetailStructure extends IEventDetailStructure {
	AGE?: Common & {
		PHRASE?: Common;
	};
}

export default IIndividualEventDetailStructure;
