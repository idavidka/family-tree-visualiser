import { type Common } from "../classes/common";
import { type SourKey } from "../../../types/types";

interface ISour extends Common<string, SourKey> {
	_APID?: Common;
}

export default ISour;
