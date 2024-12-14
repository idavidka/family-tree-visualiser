import { type RepoKey } from "../../../types/types";
import { List } from "./list";
import { type RepoType } from "./repo";

export class Repositories extends List<RepoKey, RepoType> {
	copy() {
		const newList = new Repositories();

		Object.entries(this.items).forEach(([key, value]) => {
			newList.item(key as RepoKey, value as RepoType);
		});

		return newList;
	}

	except(item: RepoType) {
		return this.copy().delete(item);
	}
}
