import { type Common } from "../classes/common";
import { type List } from "../classes/list";
import { type IdType, type MultiTag } from "../../../types/types";

export type CommonWild = Partial<Record<`_${string}`, Common>>;

export interface ConvertOptions {
	obje?: {
		standardize?: boolean;
		override?: boolean;
		namespace?: string | number;
	};
}

interface ICommon<P = string, I extends IdType = IdType> {
	set value(value: P | undefined);
	get value();

	isListable: boolean;

	id?: I;

	removeValue: () => void;

	set: <T extends Common | List = Common | List>(
		name: MultiTag,
		value: T
	) => T | undefined;

	get: <T extends Common | List = Common | List>(
		name: MultiTag
	) => T | undefined;

	getIf: <T extends Common | List = Common | List>(
		name: MultiTag,
		condition: string,
		name2: MultiTag
	) => T | undefined;

	toString: () => string;

	toValue: () => P | undefined;

	toProp: (tag: MultiTag) => Common<P, I> | undefined;

	toList: () => List;

	toValueList: () => List;

	toJson: (tag?: MultiTag, options?: ConvertOptions) => string;

	toObject: (
		tag?: MultiTag,
		options?: ConvertOptions
	) => Record<
		string,
		string | undefined | ({ value?: string } & Record<string, unknown>)
	>;

	toGedcomLines: (
		tag?: MultiTag,
		level?: number,
		options?: ConvertOptions
	) => string[];

	toGedcom: (
		tag?: MultiTag,
		level?: number,
		options?: ConvertOptions
	) => string;
}

export default ICommon;
