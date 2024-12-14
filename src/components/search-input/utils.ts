import i18n from "../../translation/i18n";
import { type MultiTag } from "../../types/types";
import {
	type TagInputType,
	type TagInputData,
	type TagSpecifierType,
	type TagNameType,
} from "./types";

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const filterMap: Record<
	TagNameType,
	MultiTag | [MultiTag, string, MultiTag]
> = {
	"Also known as": ["FACT.TYPE", "AKA", "FACT.NOTE"],
	Givenname: "NAME.GIVN",
	Surname: "NAME.SURN",
	Suffix: "NAME.NSFX",
	Fullname: "NAME",
};

export const filterCacheMap = {
	"Also known as": "a",
	Givenname: "g",
	Surname: "s",
	Suffix: "sx",
	Fullname: "f",
	Exact: "e",
	Contains: "c",
	"Starts with": "st",
	"Ends with": "en",
} as const;

export const filterLangMap = {
	"ismert még, mint": "Also known as",
	keresztnév: "Givenname",
	vezetéknév: "Surname",
	titulus: "Suffix",
	"teljes név": "Fullname",
	pontosan: "Exact",
	tartalmazza: "Contains",
	kezdődik: "Starts with",
	végződik: "Ends with",
} as const;

export const filterReverseCacheMap = {
	a: "Also known as",
	g: "Givenname",
	s: "Surname",
	sx: "Suffix",
	f: "Fullname",
	e: "Exact",
	c: "Contains",
	st: "Starts with",
	en: "Ends with",
} as const;

export const indexMap: Record<number, string> = {
	0: "zero",
	1: "one",
	2: "two",
	3: "three",
	4: "four",
	5: "five",
	6: "six",
	7: "seven",
	8: "eight",
	9: "nine",
	10: "ten",
};

export const getSearchedConfig = (config: TagInputData[]) => {
	return config
		.map(
			(searchData) =>
				`${searchData.type
					?.map((type) => filterCacheMap[type])
					.join(":")}:${searchData.displayValue}`
		)
		.filter(Boolean)
		.join("/");
};

const searchCache: { config: TagInputData[]; cache: string } = {
	cache: "",
	config: [],
};
export const parseSearchCache = (cache: string) => {
	if (!cache) {
		return [];
	}
	if (Array.isArray(cache)) {
		// handle the deprecated cache
		return cache as TagInputData[];
	}

	if (searchCache.cache === cache) {
		return searchCache.config;
	}

	const config: TagInputData[] = [];
	const parts = cache.split("/");

	parts.forEach((part) => {
		config.push(transformTag({ value: part }));
	});

	searchCache.cache = cache;
	searchCache.config = config;

	return config;
};

export const typeSpecifiers: TagSpecifierType[] = [
	"Contains",
	"Exact",
	"Starts with",
	"Ends with",
];
export const transformTag = (tagData: TagInputData) => {
	const raw = tagData.value || tagData.displayValue || "";
	const parts = raw.split(":");
	let types: TagInputType[] = [];
	let value = "";
	let hasTypeSpecifier = false;
	let hasNameSpecifier = false;

	parts.forEach((partProp) => {
		let part = partProp.trim();
		part =
			filterLangMap[part.toLowerCase() as keyof typeof filterLangMap] ||
			part;
		const slashSurname = part.match(/^\/(?<name>[^/]+)\/$/i)?.groups?.name;
		const fullname = part.match(/^(?<type>f(ull(n(ame)?)?)?)$/i)?.groups
			?.type;
		const suffix = part.match(/^(?<type>s(uff(i)?)?x)$/i)?.groups?.type;
		const surname = part.match(/^(?<type>s(ur(n(ame)?)?)?)$/i)?.groups
			?.type;
		const givenname = part.match(/^(?<type>g(ive?n(n(ame)?)?)?)$/i)?.groups
			?.type;
		const akaName = part.match(
			/^(?<type>(a((lso)?\s*(k((nown)?\s*(as?)?)?)?)?))$/i
		)?.groups?.type;
		const startsWithName = part.match(/^(?<type>(st(arts?)?(w(ith)?)?))$/i)
			?.groups?.type;
		const endsWithName = part.match(/^(?<type>(en(ds?)?(w(ith)?)?))$/i)
			?.groups?.type;
		const containsName = part.match(/^(?<type>(c(on(t(ains?)?)?)?))$/i)
			?.groups?.type;
		const exactName = part.match(/^(?<type>(e(x(act?)?)?))$/i)?.groups
			?.type;

		if (fullname) {
			types.push("Fullname");
		} else if (slashSurname) {
			types.push("Surname");
			value = slashSurname;
		} else if (suffix) {
			types.push("Suffix");
		} else if (surname) {
			types.push("Surname");
		} else if (givenname) {
			types.push("Givenname");
		} else if (akaName) {
			types.push("Also known as");
		} else if (startsWithName) {
			types.push("Starts with");
		} else if (endsWithName) {
			types.push("Ends with");
		} else if (containsName) {
			types.push("Contains");
		} else if (exactName) {
			types.push("Exact");
		} else {
			value = part;
		}
	});

	types = types.filter((type) => {
		if (
			typeSpecifiers.includes(type as TagSpecifierType) &&
			!hasTypeSpecifier
		) {
			hasTypeSpecifier = true;
			return true;
		}

		if (
			!typeSpecifiers.includes(type as TagSpecifierType) &&
			!hasNameSpecifier
		) {
			hasNameSpecifier = true;
			return true;
		}

		return false;
	});

	if (!hasTypeSpecifier) {
		types.push("Starts with");
	}

	types.sort((a) => {
		if (typeSpecifiers.includes(a as TagSpecifierType)) {
			return 1;
		}

		return -1;
	});

	tagData.value = raw;
	tagData.displayValue = value.replaceAll("/", "");
	tagData.display = `${
		types.length
			? `<strong>${types
					.map((type) => i18n.t(type))
					?.join(" ")}: </strong>`
			: ""
	}${tagData.displayValue}`;

	tagData.type = types;

	return tagData;
};
