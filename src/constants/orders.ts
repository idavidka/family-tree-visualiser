import { isCommonDate } from "../classes/gedcom/classes/date";
import { type FamType } from "../classes/gedcom/classes/fam";
import { type IndiType } from "../classes/gedcom/classes/indi";
import { type NameOrder } from "../store/main/reducers";
import {
	type OrderIterator,
	type Order,
	type IndiKey,
	type FamKey,
} from "../types/types";

export const DEFAULT: Order = {};

export const AGE_ASC: Order = {
	"BIRT.DATE": {
		direction: "ASC",
		getter: (value, raw) => {
			if (isCommonDate(raw) && raw.rawValue) {
				return raw.rawValue.getTime();
			}
			return new Date(value as string).getTime();
		},
	},
};

export const AGE_DESC: Order = {
	"BIRT.DATE": {
		direction: "DESC",
		getter: (value, raw) => {
			if (isCommonDate(raw) && raw.rawValue) {
				return raw.rawValue.getTime();
			}
			return new Date(value as string).getTime();
		},
	},
};

export const DATE_ASC: Order = {
	DATE: {
		direction: "ASC",
		getter: (value, raw) => {
			if (isCommonDate(raw) && raw.rawValue) {
				return raw.rawValue.getTime();
			}
			return new Date(value as string).getTime();
		},
	},
};

export const DATE_DESC: Order = {
	DATE: {
		direction: "DESC",
		getter: (value, raw) => {
			if (isCommonDate(raw) && raw.rawValue) {
				return raw.rawValue.getTime();
			}
			return new Date(value as string).getTime();
		},
	},
};

const chars = [
	"a",
	"à",
	"á",
	"â",
	"ä",
	"æ",
	"ã",
	"å",
	"ā",
	"b",
	"c",
	"ç",
	"ć",
	"č",
	"cs",
	"d",
	"dz",
	"dzs",
	"e",
	"è",
	"é",
	"ê",
	"ë",
	"ē",
	"ė",
	"ę",
	"f",
	"g",
	"gy",
	"h",
	"i",
	"î",
	"ï",
	"í",
	"ī",
	"į",
	"ì",
	"j",
	"k",
	"l",
	"ł",
	"ly",
	"m",
	"n",
	"ñ",
	"ń",
	"ny",
	"o",
	"ó",
	"ö",
	"ő",
	"ô",
	"ò",
	"õ",
	"œ",
	"ø",
	"ō",
	"p",
	"q",
	"r",
	"s",
	"ś",
	"š",
	"ß",
	"sz",
	"t",
	"ty",
	"u",
	"ú",
	"ü",
	"ű",
	"û",
	"ù",
	"ū",
	"v",
	"w",
	"x",
	"y",
	"z",
	"zs",
];
const alphabets = chars.reduce<Record<string, number>>((acc, curr, idx) => {
	acc[curr] = idx;
	return acc;
}, {});

const convertAlphabet = (value: string) => {
	return value
		.toLowerCase()
		.replace(/(dzs|cs|dz|gy|ly|ny|sz|ty|zs|.)/gi, (_, m) => {
			const code = alphabets[m];
			return code !== undefined
				? `${`${code}`.padStart(`${chars.length}`.length, "0")}`
				: m;
		});
};

const sortValue = (valueA: string, valueB: string) => {
	return convertAlphabet(valueA).localeCompare(convertAlphabet(valueB));
};

export const getNameDesc: (
	nameOrder?: NameOrder
) => OrderIterator<IndiType, IndiKey> =
	(nameOrder: NameOrder = "first-last") =>
	(itemA, _keyA, itemB, _keyB) => {
		const valueA =
			nameOrder === "first-last"
				? [itemA.NAME?.GIVN || "", itemA.NAME?.SURN || ""]
				: [itemA.NAME?.SURN || "", itemA.NAME?.GIVN || ""];
		const valueB =
			nameOrder === "first-last"
				? [itemB.NAME?.GIVN || "", itemB.NAME?.SURN || ""]
				: [itemB.NAME?.SURN || "", itemB.NAME?.GIVN || ""];

		return -sortValue(
			valueA.filter(Boolean).join(" "),
			valueB.filter(Boolean).join(" ")
		);
	};

export const getNameAsc: (
	nameOrder?: NameOrder
) => OrderIterator<IndiType, IndiKey> =
	(nameOrder: NameOrder = "first-last") =>
	(itemA, _keyA, itemB, _keyB) => {
		const valueA =
			nameOrder === "first-last"
				? [itemA.NAME?.GIVN || "", itemA.NAME?.SURN || ""]
				: [itemA.NAME?.SURN || "", itemA.NAME?.GIVN || ""];
		const valueB =
			nameOrder === "first-last"
				? [itemB.NAME?.GIVN || "", itemB.NAME?.SURN || ""]
				: [itemB.NAME?.SURN || "", itemB.NAME?.GIVN || ""];

		return sortValue(
			valueA.filter(Boolean).join(" "),
			valueB.filter(Boolean).join(" ")
		);
	};

export const getBirthAsc: OrderIterator<IndiType, IndiKey> = (
	itemA,
	_keyA,
	itemB,
	_keyB
) => {
	const valueA = itemA?.BIRT?.DATE?.rawValue;
	const valueB = itemB?.BIRT?.DATE?.rawValue;

	if (valueA?.getTime() === valueB?.getTime()) {
		return 0;
	}

	if (!valueA || (valueB && valueA > valueB)) {
		return 1;
	}

	return -1;
};

export const getNameAscAndBirth: (
	nameOrder?: NameOrder
) => OrderIterator<IndiType, IndiKey> =
	(nameOrder: NameOrder = "first-last") =>
	(itemA, keyA, itemB, keyB) => {
		const nameSort = getNameAsc(nameOrder)(itemA, keyA, itemB, keyB);

		if (nameSort !== 0) {
			return nameSort;
		}

		return getBirthAsc(itemA, keyA, itemB, keyB);
	};

const getFamilyWith = (
	person1: IndiType,
	person2?: IndiKey,
	famType: "FAMS" | "FAMC" = "FAMS"
) => {
	return person1
		?.get(famType)
		?.toValueList()
		.map(
			(fams, famKey) =>
				person1?.getGedcom()?.fam(famKey as FamKey) as
					| FamType
					| undefined
		)
		.find(
			(fam) =>
				famType === "FAMC" ||
				fam?.HUSB?.value === person2 ||
				fam?.WIFE?.value === person2
		);
};

export const getMarriageAsc: (
	person?: IndiKey,
	famType?: "FAMS" | "FAMC"
) => OrderIterator<IndiType, IndiKey> =
	(person?: IndiKey, famType: "FAMS" | "FAMC" = "FAMS") =>
	(itemA, _keyA, itemB, _keyB) => {
		if (!person && famType === "FAMS") {
			return 0;
		}

		const familyA = getFamilyWith(itemA, person);
		const familyB = getFamilyWith(itemB, person);

		const marriageA = familyA?.MARR?.DATE?.rawValue;
		const marriageB = familyB?.MARR?.DATE?.rawValue;

		if (marriageA?.getTime() === marriageB?.getTime()) {
			return 0;
		}

		if (!marriageA || (marriageB && marriageA > marriageB)) {
			return 1;
		}

		return -1;
	};

export const getMarriageAscAndChildBirth: (
	person?: IndiKey
) => OrderIterator<IndiType, IndiKey> =
	(person?: IndiKey) => (itemA, keyA, itemB, keyB) => {
		const marriageSort = getMarriageAsc(person)(itemA, keyA, itemB, keyB);

		if (marriageSort !== 0) {
			return marriageSort;
		}

		const familyA = getFamilyWith(itemA, person);
		const familyB = getFamilyWith(itemB, person);

		const childA = familyA?.getChildren().orderBy(AGE_ASC).index(0);
		const childB = familyB?.getChildren().orderBy(AGE_ASC).index(0);

		return getBirthAsc(childA!, keyA, childB!, keyB);
	};

export const getMarriageAscAndBirth: (
	person?: IndiKey
) => OrderIterator<IndiType, IndiKey> =
	(person?: IndiKey) => (itemA, keyA, itemB, keyB) => {
		const marriageSort = getMarriageAsc(person, "FAMC")(
			itemA,
			keyA,
			itemB,
			keyB
		);

		if (marriageSort !== 0) {
			return marriageSort;
		}

		return getBirthAsc(itemA, keyA, itemB, keyB);
	};
