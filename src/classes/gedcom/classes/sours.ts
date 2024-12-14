import { type SourKey } from "../../../types/types";
import { List } from "./list";
import { type SourType } from "./sour";

export class Sources extends List<SourKey, SourType> {
	copy() {
		const newList = new Sources();

		Object.entries(this.items).forEach(([key, value]) => {
			newList.item(key as SourKey, value as SourType);
		});

		return newList;
	}

	except(item: SourType) {
		return this.copy().delete(item);
	}
}
