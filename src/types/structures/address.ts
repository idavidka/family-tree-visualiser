import { type Common } from "../../classes/gedcom/classes/common";

interface IAddressStructure extends Common {
	ADDR?: Common & {
		ADR1?: Common;
		ADR2?: Common;
		ADR3?: Common;
		CITY?: Common;
		STAE?: Common;
		POST?: Common;
		CTRY?: Common;
	};
}

export default IAddressStructure;
