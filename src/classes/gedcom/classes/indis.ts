import { type IIndividuals } from "../interfaces/indis";
import {
	type IndiKey,
	type Filter,
	type FamKey,
	type Order,
	type FilterIterator,
	type OrderIterator,
} from "../../../types/types";
import { type IndiType } from "./indi";
import { List } from "./list";

export class Individuals
	extends List<IndiKey, IndiType>
	implements IIndividuals
{
	copy(): Individuals {
		return super.copy(Individuals) as Individuals;
	}

	except(item: IndiType): Individuals {
		return super.except(item, Individuals) as Individuals;
	}

	filter(filters: Filter | FilterIterator<IndiType, IndiKey>): Individuals {
		return super.filter(filters, Individuals) as Individuals;
	}

	orderBy(orders: Order | OrderIterator<IndiType, IndiKey>): Individuals {
		return super.orderBy(orders, Individuals) as Individuals;
	}

	toName() {
		return super.toProp("NAME")?.toValue();
	}

	getFacts() {
		const facts = new List();

		Object.values(this.items).forEach((indi) => {
			const indiFacts = indi?.getFacts();
			if (indi?.id && indiFacts) {
				facts.merge(indiFacts);
			}
		});

		return facts;
	}

	private isRelativeOf(
		type:
			| "sibling"
			| "parent"
			| "child"
			| "spouse"
			| "parentInLaw"
			| "childInLaw",
		indi?: IndiKey | IndiType,
		every = false
	) {
		const usedIndi =
			typeof indi === "string"
				? this.index(0)?.getGedcom()?.indi(indi)
				: indi;

		let getter:
			| keyof Pick<
					IndiType,
					| "getSiblings"
					| "getParents"
					| "getChildren"
					| "getSpouses"
					| "getParentsInLaw"
					| "getChildrenInLaw"
			  >
			| undefined;
		if (type === "sibling") {
			getter = "getSiblings";
		}
		if (type === "parent") {
			getter = "getParents";
		}
		if (type === "child") {
			getter = "getChildren";
		}
		if (type === "spouse") {
			getter = "getSpouses";
		}
		if (type === "parentInLaw") {
			getter = "getParentsInLaw";
		}
		if (type === "childInLaw") {
			getter = "getChildrenInLaw";
		}

		if (!usedIndi || !getter) {
			return false;
		}

		const relatives = usedIndi[getter]();
		const thisIds = Object.keys(this.items);

		if (relatives.length <= 0 || this.length <= 0) {
			return false;
		}

		const filtered = relatives.filter({ id: thisIds });
		if (every) {
			return filtered.length === this.length
				? filtered.index(0)?.id || true
				: false;
		}

		return filtered.length > 0 ? filtered.index(0)?.id || true : false;
	}

	isSiblingOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("sibling", indi, every);
	}

	isSpouseOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("spouse", indi, every);
	}

	isParentOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("parent", indi, every);
	}

	isChildOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("child", indi, every);
	}

	isParentInLawOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("parentInLaw", indi, every);
	}

	isChildInLawOf(indi?: IndiKey | IndiType, every = false) {
		return this.isRelativeOf("childInLaw", indi, every);
	}

	splitByFamily(
		type: "Spouses" | "Parents" | "Children",
		relativeTo?: IndiType
	) {
		const splittedList: Record<`@F${number}@`, Individuals | undefined> =
			{};

		const familiesRelativeTo = Object.keys(
			relativeTo?.get(type !== "Parents" ? "FAMS" : "FAMC")?.toValueList()
				.items || {}
		);

		let lengthOfIndividuals = 0;
		this.forEach((indi) => {
			const families = indi
				.get(type === "Spouses" ? "FAMS" : "FAMC")
				?.toValueList();

			if (families) {
				Object.keys(families.items).forEach((fKey) => {
					const famKey = fKey as FamKey;
					if (
						familiesRelativeTo &&
						!familiesRelativeTo.includes(famKey)
					) {
						return;
					}
					if (!splittedList[famKey]) {
						splittedList[famKey] = new Individuals();
					}

					splittedList[famKey]?.append(indi);
					lengthOfIndividuals++;
				});
			}
		});

		return {
			items: splittedList,
			lengthOfFamily: Object.keys(splittedList).length,
			lengthOfIndividuals,
		};
	}

	getRelativesOnDegree(degree = 0) {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getRelativesOnLevel(degree));
			}
		});

		return persons;
	}

	getRelativesOnLevel(level = 0, filter?: Filter) {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getRelativesOnLevel(level, filter));
			}
		});

		return persons;
	}

	getAscendants(level = 0, filter?: Filter) {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getAscendants(level, filter));
			}
		});

		return persons;
	}

	getDescendants(level = 0, filter?: Filter) {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getDescendants(level, filter));
			}
		});

		return persons;
	}

	getAllAscendants(individuals?: Individuals) {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getAllAscendants(individuals));
			}
		});

		return persons;
	}

	getAllDescendants(
		individuals?: Individuals,
		containDescendantsInLaw = false
	) {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(
					indi.getAllDescendants(individuals, containDescendantsInLaw)
				);
			}
		});

		return persons;
	}

	getSiblings() {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getSiblings());
			}
		});

		return persons;
	}

	getChildren() {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getChildren());
			}
		});

		return persons;
	}

	getParents() {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getParents());
			}
		});

		return persons;
	}

	getSpouses() {
		const persons = new Individuals();

		Object.values(this.items).forEach((indi) => {
			if (indi) {
				persons.merge(indi.getSpouses());
			}
		});

		return persons;
	}
}
