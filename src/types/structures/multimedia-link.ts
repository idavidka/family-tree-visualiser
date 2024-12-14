import { type Common } from "../../classes/gedcom/classes/common";

interface IMultimediaLinkStructure extends Common {
	RIN?: Common;
	OBJE?: Common & {
		CROP?: Common & {
			TOP?: Common;
			LEFT?: Common;
			HEIGHT?: Common;
			WIDTH?: Common;
		};
		TITL?: Common;
		_PRIM?: Common<"Y" | "N">;
	};
}

export default IMultimediaLinkStructure;
