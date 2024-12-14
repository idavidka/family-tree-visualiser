import { type Common } from "../classes/common";
import { type ObjeKey } from "../../../types/types";

interface IObje extends Common<string, ObjeKey> {
	_PRIM?: Common<"Y" | "N">;
}

export default IObje;
