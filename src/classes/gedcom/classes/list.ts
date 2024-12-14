import get from "lodash/get";
import set from "lodash/set";
import intersectionBy from "lodash/intersectionBy";
import {
	type OrderDefinition,
	type IdType,
	type Filter,
	type FilterIterator,
	type MultiTag,
	type Order,
	type OrderIterator,
} from "../../../types/types";
import { getValidTag, type Common } from "./common";
import { type IList } from "../interfaces/list";
import { type ConvertOptions } from "../interfaces/common";
export class List<K extends IdType = IdType, T extends Common = Common>
	implements IList<K, T>
{
	isListable = true;
	items: Partial<Record<K, T>> = {};
	length = 0;

	constructor(items?: Partial<Record<K, T>> | T[]) {
		if (items) {
			this.concat(items);
		}
	}

	has(indi?: K | T) {
		return !!this.items[
			(typeof indi === "string" ? indi : indi?.id ?? "") as K
		];
	}

	get(name: MultiTag) {
		const propList = new List();
		(Object.entries(this.items) as Array<[K, T]>).forEach(([key, item]) => {
			propList.item(key, item.get(name) as T);
		});

		return propList;
	}

	getIf(name: MultiTag, condition: string, name2: MultiTag) {
		const propList = new List();

		(Object.entries(this.items) as Array<[K, T]>).forEach(([key, item]) => {
			const passedItem = item.getIf(name, condition, name2) as
				| T
				| undefined;

			if (passedItem) {
				propList.item(key, passedItem);
			}
		});

		return propList;
	}

	keys() {
		const hasOwn = Object.prototype.hasOwnProperty;
		const keys: K[] = [];
		for (const k in this.items) {
			if (hasOwn.call(this.items, k)) {
				keys.push(k);
			}
		}

		return keys;
	}

	setLength(type?: "increase" | "decrease") {
		if (!type) {
			this.length = this.keys().length;
		} else {
			this.length = this.length + (type === "increase" ? 1 : -1);
		}
	}

	first() {
		return this.index(0);
	}

	last() {
		return this.index(this.keys().length);
	}

	index(index: number) {
		const keys = this.keys();
		const key = keys[index];

		return key && this.items[key];
	}

	item(name: K, value?: T) {
		if (arguments.length > 1) {
			set(this.items, name, value);

			this.setLength();
		}

		return get(this.items, name) as T | undefined;
	}

	exclude(excludedList: List<K, T>) {
		excludedList.keys().forEach((itemId) => {
			delete this.items[itemId as K];
		});

		this.setLength();

		return this;
	}

	concat(items?: Partial<Record<K, T>> | T[]) {
		if (Array.isArray(items)) {
			items.forEach((item) => {
				this.append(item);
			});
		} else {
			Object.assign(this.items, items ?? {});
		}

		this.setLength();

		return this;
	}

	merge(mergedList?: List<K, T>) {
		this.concat(mergedList?.items);

		return this;
	}

	intersection(mergedList?: List<K, T>) {
		const inter = intersectionBy(
			Object.values(this.items),
			Object.values(mergedList?.items ?? {}),
			"id"
		) as T[];

		return new List<K, T>(inter);
	}

	prepend(item: T) {
		if (item.id) {
			let increase = true;
			if (this.items[item.id as K]) {
				delete this.items[item.id as K];
				increase = false;
			}

			this.items = Object.assign(
				{
					[item.id]: item,
				},
				this.items
			);

			if (increase) {
				this.setLength("increase");
			}
		}

		return this;
	}

	append(item: T) {
		if (item.id) {
			let increase = true;
			if (this.items[item.id as K]) {
				delete this.items[item.id as K];
				increase = false;
			}

			this.items[item.id as K] = item;

			if (increase) {
				this.setLength("increase");
			}
		}

		return this;
	}

	delete(item: T) {
		if (item.id && this.items[item.id as K]) {
			delete this.items[item.id as K];

			this.setLength("decrease");
		}

		return this;
	}

	copy(ClassName: typeof List<K, T> = List<K, T>) {
		const newList = new ClassName();

		Object.assign(newList.items, this.items);
		newList.setLength();

		return newList;
	}

	except(item: T, ClassName: typeof List<K, T> = List<K, T>) {
		return this.copy(ClassName).delete(item);
	}

	forEach(iterate: (item: T, key: K, index: number) => void) {
		Object.entries(this.items).forEach(([key, item], index) => {
			iterate(item as T, key as K, index);
		});
	}

	map<R>(iterate: (item: T, key: K, index: number) => R) {
		return Object.entries(this.items).map(([key, item], index) => {
			return iterate(item as T, key as K, index);
		});
	}

	reduce<R>(
		iterate: (acc: R, item: T, key: K, index: number) => R,
		initialValue: R
	) {
		return Object.entries(this.items).reduce((acc, [key, item], index) => {
			return iterate(acc as R, item as T, key as K, index);
		}, initialValue);
	}

	filter(
		filters: Filter | FilterIterator<T, K>,
		ClassName: typeof List<K, T> = List<K, T>
	) {
		const newList = new ClassName();

		const isIterator = typeof filters === "function";
		(Object.entries(this.items) as Array<[K, T]>).forEach(
			([itemId, item], index) => {
				if (isIterator) {
					filters(item, itemId, index) && newList.item(itemId, item);

					return;
				}

				if (
					!Object.keys(filters).length ||
					Object.entries(filters).every(([key, value]) => {
						let itemValue: string | undefined;

						if (key === "id") {
							// id is a special prop. it's always a string
							itemValue = item.toProp("id") as unknown as string;
						} else {
							itemValue = item.toProp(key as MultiTag)?.toValue();
						}

						if (Array.isArray(value)) {
							return value.includes(itemValue);
						}

						return itemValue === value;
					})
				) {
					newList.item(itemId, item);
				}
			}
		);

		return newList;
	}

	orderBy(
		orders: Order | OrderIterator<T, K>,
		ClassName: typeof List<K, T> = List<K, T>
	) {
		const newList = new ClassName();

		const isIterator = typeof orders === "function";

		if (!isIterator && !Object.keys(orders).length) {
			return newList.merge(this);
		}

		const sortedItems = (Object.entries(this.items) as Array<[K, T]>).sort(
			([itemAId, itemA], [itemBId, itemB]) => {
				if (isIterator) {
					return orders(itemA, itemAId, itemB, itemBId);
				}

				const [key, { direction, getter }] = Object.entries(
					orders
				)[0] as [MultiTag, OrderDefinition];

				const rawA = itemA.get<T>(key as MultiTag);
				const rawB = itemB.get<T>(key as MultiTag);
				let valueA = rawA?.toValue();
				let valueB = rawB?.toValue();

				if (getter && typeof getter === "function") {
					valueA = getter(valueA, rawA) as typeof valueA;
					valueB = getter(valueB, rawB) as typeof valueB;
				}

				let sortValue = 0;
				if (!valueA && !valueB) {
					sortValue = 0;
				} else if (!valueB) {
					sortValue = 1;
				} else if (!valueA) {
					sortValue = -1;
				} else if (valueA < valueB) {
					sortValue = -1;
				} else if (valueA > valueB) {
					sortValue = 1;
				}

				return sortValue * (direction === "DESC" ? -1 : 1);
			}
		);

		sortedItems.forEach(([key, value]) => {
			newList.item(key, value);
		});

		return newList;
	}

	findIndex(item: T) {
		if (!item?.id) {
			return -1;
		}

		return this.keys().findIndex((key) => key === item.id);
	}

	getItems() {
		return this.items;
	}

	toJson(tag: MultiTag, options?: ConvertOptions) {
		const json = this.toObject(tag, options);

		return JSON.stringify(json);
	}

	toObject(tag: MultiTag, options?: ConvertOptions) {
		const json: Record<
			string,
			string | undefined | ({ value?: string } & Record<string, unknown>)
		> = {};
		(Object.entries(this.items) as Array<[K, T]>).forEach(([_, item]) => {
			const validTag = getValidTag(tag);
			const validKey = item.id;
			const validValue = validKey ? validTag : item.value;

			json[
				`${validKey || validTag}${validValue ? ` ${validValue}` : ""}`
			] = item.toObject(validTag as MultiTag | undefined, options);
		});

		return json;
	}

	toGedcom(tag: MultiTag, level = 0, options?: ConvertOptions) {
		const gedcom = this.toGedcomLines(tag, level, options);

		return gedcom.join("\n");
	}

	toGedcomLines(tag: MultiTag, level = 0, options?: ConvertOptions) {
		const gedcom: string[] = [];

		(Object.entries(this.items) as Array<[K, T]>).forEach(([_, item]) => {
			const validTag = getValidTag(tag);
			const validKey = item.id;
			const validValue = validKey ? validTag : item.value;
			gedcom.push(
				`${level} ${validKey || validTag}${
					validValue ? ` ${validValue}` : ""
				}`
			);
			gedcom.push(
				...item.toGedcomLines(
					validTag as MultiTag | undefined,
					level + 1,
					options
				)
			);
		});

		return gedcom;
	}

	toValue() {
		const propList = new List();
		(Object.entries(this.items) as Array<[K, T]>).forEach(([key, item]) => {
			propList.item(key, item?.toValue() as unknown as T);
		});

		return propList;
	}

	// @deprecated use get instead
	toProp(tag: MultiTag) {
		return this.get(tag);
	}

	toList() {
		return new List().concat(this.items);
	}

	toValueList() {
		const newList = new List();

		(Object.values(this.items) as Common[]).forEach((value) => {
			value.value && newList.item(value.value as IdType, value);
		});

		return newList;
	}
}
