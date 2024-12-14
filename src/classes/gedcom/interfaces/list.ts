import { type Common } from "../classes/common";
import { type List } from "../classes/list";
import {
	type Filter,
	type Order,
	type IdType,
	type FilterIterator,
	type MultiTag,
} from "../../../types/types";
import { type ConvertOptions } from "./common";

export interface IList<K extends IdType = IdType, T extends Common = Common> {
	readonly items: Partial<Record<K, T | undefined>>;
	readonly length: number;

	isListable: boolean;

	has: (item?: K | T) => boolean;

	get: (name: MultiTag) => List;

	keys: () => K[];

	getIf: (name: MultiTag, condition: string, name2: MultiTag) => List;

	setLength: () => void;

	item: (name: K, value?: T) => T | undefined;

	exclude: (mergedList: List<K, T>) => List<K, T>;

	prepend: (item: T) => List<K, T>;

	append: (item: T) => List<K, T>;

	merge: (mergedList: List<K, T>) => List<K, T>;

	intersection: (mergedList: List<K, T>) => List<K, T>;

	concat: (items: Partial<Record<K, T>>) => List<K, T>;

	delete: (item: T) => List<K, T>;

	copy: (ClassName: typeof List<K, T>) => List<K, T>;

	except: (item: T, ClassName: typeof List<K, T>) => List<K, T>;

	filter: (
		filters: Filter | FilterIterator<T, K>,
		ClassName: typeof List<K, T>
	) => List<K, T>;

	orderBy: (orders: Order, ClassName: typeof List<K, T>) => List<K, T>;

	forEach: (
		iterate: (item: T, key: K | number, index: number) => void
	) => void;

	map: <R>(iterate: (item: T, key: K | number, index: number) => R) => void;

	findIndex: (item: T) => number;

	first: () => T | undefined;

	index: (index: number) => T | undefined;

	last: () => T | undefined;

	getItems: () => Partial<Record<K, T>>;

	toValue: (tag: MultiTag) => List;

	toProp: (tag: MultiTag) => List;

	toList: () => List;

	toValueList: () => List;

	toJson: (tag: MultiTag, options?: ConvertOptions) => string;

	toObject: (
		tag: MultiTag,
		options?: ConvertOptions
	) => Record<
		string,
		string | undefined | ({ value?: string } & Record<string, unknown>)
	>;

	toGedcomLines: (
		tag: MultiTag,
		level?: number,
		options?: ConvertOptions
	) => string[];

	toGedcom: (
		tag: MultiTag,
		level?: number,
		options?: ConvertOptions
	) => string;
}
