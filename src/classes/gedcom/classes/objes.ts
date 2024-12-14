import { type ObjeKey } from "../../../types/types";
import { List } from "./list";
import { type ObjeType } from "./obje";

export class Objects extends List<ObjeKey, ObjeType> {
	copy() {
		const newList = new Objects();

		Object.entries(this.items).forEach(([key, value]) => {
			newList.item(key as ObjeKey, value as ObjeType);
		});

		return newList;
	}

	except(item: ObjeType) {
		return this.copy().delete(item);
	}
}
