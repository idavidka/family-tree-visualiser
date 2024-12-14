import get from "lodash/get";
import set from "lodash/set";
import {
	type Tag,
	type IdType,
	type MultiTag,
	TypeMap,
	type ObjeKey,
} from "../../../types/types";
import type ICommon from "../interfaces/common";
import { type GedComType } from "./gedcom";
import { List } from "./list";
import { type ConvertOptions } from "../interfaces/common";
import type IObje from "../interfaces/obje";
export class Common<T = string, I extends IdType = IdType>
	implements ICommon<T, I>
{
	protected gedcom?: GedComType;
	protected _value?: T;
	protected _id?: I;
	isListable = true;

	constructor(gedcom?: GedComType, id?: I) {
		this.gedcom = gedcom;
		if (id) {
			this._id = id;
		} else {
			delete this._id;
		}
	}

	set id(id: I | undefined) {
		this._id = idGetter(id);
	}

	get id() {
		return idGetter(this._id);
	}

	set value(value: T | undefined) {
		this._value = value;
	}

	get value() {
		return this._value;
	}

	removeValue() {
		delete this._value;
	}

	set<T extends Common | List = Common | List>(name: MultiTag, value: T) {
		set(this, name, value);
		return get(this, name) as T | undefined;
	}

	get<T extends Common | List = Common | List>(name: MultiTag) {
		if (!name.includes(".")) {
			return get(this, name) as T | undefined;
		}

		const nameParts = name.split(".") as Tag[];
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		let last: T | undefined = this as unknown as T;

		for (const part of nameParts) {
			last = last?.get(part) as T | undefined;

			if (!last) {
				break;
			}
		}

		return last;
	}

	getGedcom() {
		return this.gedcom;
	}

	getIf<T extends Common | List = Common | List>(
		name: MultiTag,
		condition: string,
		name2: MultiTag
	) {
		const nameParts = name.split(".");
		const name2Parts = name2.split(".");

		if (nameParts.length !== name2Parts.length) {
			throw new Error("Tag pathes must be of the same depth");
		}

		if (nameParts.length > 1 && nameParts[0] !== name2Parts[0]) {
			throw new Error("Final tags must be siblings");
		}

		const valueCommon = this.get<T>(name);

		if (valueCommon instanceof Common) {
			return valueCommon?.toValue() !== condition
				? undefined
				: this.get<T>(name2);
		}

		const valueCommon2 = this.get<T>(name2)?.toList();
		const ifList = new List();

		valueCommon?.forEach((item, key) => {
			const pair = valueCommon2?.item(key);

			ifList.item(key, item?.toValue() !== condition ? undefined : pair);
		});

		return ifList as T;
	}

	toString() {
		return this.value?.toString() || "";
	}

	toValue() {
		return this.value;
	}

	toProp(tag: MultiTag) {
		const prop = this.get(tag);

		return prop as Common<T, I> | undefined;
	}

	toList() {
		return new List().concat(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.id ? { [this.id]: this } : ({ ...[this] } as any)
		);
	}

	toValueList() {
		return new List().concat(
			this.value
				? { [this.value as IdType]: this }
				: // eslint-disable-next-line @typescript-eslint/no-explicit-any
				  ({ ...[this] } as any)
		);
	}

	private standardizeObject(tag?: MultiTag, options?: ConvertOptions) {
		if (
			tag === "OBJE" &&
			options?.obje?.standardize &&
			options?.obje?.namespace &&
			"standardizeMedia" in this
		) {
			const standardize = this.standardizeMedia as (
				n: string | number,
				o?: boolean
			) => Common<string, ObjeKey> & IObje;
			return standardize.call(
				this,
				options.obje.namespace,
				options.obje.override
			);
		}
	}

	toJson(tag?: MultiTag, options?: ConvertOptions) {
		const json = this.toObject(tag, options);

		return JSON.stringify(json);
	}

	toObject(tag?: MultiTag, options?: ConvertOptions) {
		this.standardizeObject(tag, options);
		const validKeys = getValidKeys(this);
		let json: Record<
			string,
			string | undefined | ({ value?: string } & Record<string, unknown>)
		> = {};

		validKeys.forEach((key) => {
			if (key === "value" && this.value !== undefined) {
				json.value = this.value as string;
			} else if (key === "_value" && this._value !== undefined) {
				json.value = this._value as string;
			} else {
				const validKey = key as MultiTag;
				const prop = this.get(validKey);
				if (typeof prop?.toObject === "function") {
					if (prop instanceof Common) {
						json[validKey] = prop.toObject(validKey, options);
					} else {
						json = {
							...json,
							...prop.toObject(validKey, options),
						};
					}
				}
			}
		});

		return json;
	}

	toGedcom(tag?: MultiTag, level = 0, options?: ConvertOptions) {
		const gedcom = this.toGedcomLines(tag, level, options);

		return gedcom.join("\n");
	}

	toGedcomLines(tag?: MultiTag, level = 0, options?: ConvertOptions) {
		this.standardizeObject(tag, options);
		const validKeys = getValidKeys(this);
		const gedcom: string[] = [];

		validKeys.forEach((key) => {
			const validKey = key as MultiTag;
			const prop = this.get(validKey);
			if (typeof prop?.toGedcomLines === "function") {
				if (prop instanceof Common) {
					const value = prop.value as string | undefined;
					gedcom.push(
						`${level} ${validKey}${value ? ` ${value}` : ""}`
					);
					gedcom.push(
						...prop.toGedcomLines(validKey, level + 1, options)
					);
				} else {
					gedcom.push(
						...prop.toGedcomLines(validKey, level, options)
					);
				}
			}
		});

		return gedcom;
	}

	isAncestry() {
		const head = get(this, "HEAD") || get(this, "gedcom.HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.startsWith("Ancestry");
	}

	isMyHeritage() {
		const head = get(this, "HEAD") || get(this, "gedcom.HEAD");
		const sour = get(head, "SOUR.value") as string | undefined;

		return !!sour?.startsWith("MYHERITAGE");
	}

	getAncestryTreeId() {
		const path = "HEAD.SOUR._TREE.RIN.value";
		return (get(this, path) || get(this, `gedcom.${path}`)) as
			| string
			| undefined;
	}

	getMyHeritageTreeId() {
		const path = "HEAD._EXPORTED_FROM_SITE_ID.value";
		return (get(this, path) || get(this, `gedcom.${path}`)) as
			| string
			| undefined;
	}

	getTreeId() {
		if (this?.isAncestry()) {
			return this.getAncestryTreeId();
		}

		if (this?.isMyHeritage()) {
			return this.getMyHeritageTreeId();
		}
	}

	getAncestryTreeName() {
		const path = "HEAD.SOUR._TREE.value";
		return (get(this, path) || get(this, `gedcom.${path}`)) as
			| string
			| undefined;
	}

	getMyHeritageTreeName() {
		const path = "HEAD.FILE.value";

		const treeDetails = (get(this, path) || get(this, `gedcom.${path}`)) as
			| string
			| undefined;

		return treeDetails?.match(
			/Exported by MyHeritage.com from (?<tree>.+) in.+$/
		)?.groups?.tree;
	}

	getTreeName() {
		if (this?.isAncestry()) {
			return this.getAncestryTreeName();
		}

		if (this?.isMyHeritage()) {
			return this.getMyHeritageTreeName();
		}
	}
}

export const createCommon = (gedcom?: GedComType): Common => {
	return new Common(gedcom);
};

export const getValidKeys = <T>(common: Common<T>) => {
	return Object.keys(common).filter((key) => {
		const prop = get(common, key);
		return (
			key !== "gedcom" &&
			(key === "value" ||
				key === "_value" ||
				prop instanceof Common ||
				prop instanceof List)
		);
	}) as Array<MultiTag | "_value">;
};

export const getValidTag = (tag: string) => {
	return TypeMap[tag as keyof typeof TypeMap] || tag;
};

export const getValidKey = (tag: string, id: string) => {
	return `${id} ${getValidTag(tag)}`;
};

export const idGetter = <T extends IdType>(id?: T) => {
	if (!id) {
		return undefined;
	}
	let newId = id;
	const parts = newId?.match(/^(?<at>@)?(?<letter>[A-Z])?/i)?.groups as {
		at?: string;
		letter?: string;
	} | null;
	if (!parts?.at && !parts?.letter) {
		newId = `@U${newId}` as T;
	} else if (!parts.at) {
		newId = `@${newId}` as T;
	} else if (!parts.letter) {
		newId = newId.replace(/^@/, "@U") as T;
	}
	if (!newId.endsWith("@")) {
		newId = `${newId}@` as T;
	}
	return newId;
};
