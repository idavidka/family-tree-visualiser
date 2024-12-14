import { type Common } from "../../classes/gedcom/classes/common";
import { type CommonDate } from "../../classes/gedcom/classes/date";

interface IDateStructure extends Common {
	DATE?: CommonDate & {
		TIME?: Common;
	};
}

export default IDateStructure;
