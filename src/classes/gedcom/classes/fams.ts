import { type IFamilies } from "../interfaces/fams";
import {
	type FamKey,
	type Filter,
	type Order,
	type FilterIterator,
	type OrderIterator,
} from "../../../types/types";
import { type FamType } from "./fam";
import { Individuals } from "./indis";
import { List } from "./list";

export class Families extends List<FamKey, FamType> implements IFamilies {
	copy(): Families {
		return super.copy(Families) as Families;
	}

	except(item: FamType): Families {
		return super.except(item, Families) as Families;
	}

	filter(filters: Filter | FilterIterator<FamType, FamKey>): Families {
		return super.filter(filters, Families) as Families;
	}

	orderBy(orders: Order | OrderIterator<FamType, FamKey>): Families {
		return super.orderBy(orders, Families) as Families;
	}

	getParents(): Individuals {
		const persons = new Individuals();

		Object.values(this.items).forEach((fam) => {
			if (fam) {
				persons.merge(fam.getParents());
			}
		});

		return persons;
	}

	getChildren(): Individuals {
		const persons = new Individuals();

		Object.values(this.items).forEach((fam) => {
			if (fam) {
				persons.merge(fam.getChildren());
			}
		});

		return persons;
	}
}
