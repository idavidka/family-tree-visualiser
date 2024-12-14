export const ordinalize = (n: number): string => {
	const num = Math.round(n);
	const numString = num.toString();

	// If the ten's place is 1, the suffix is always "th"
	// (10th, 11th, 12th, 13th, 14th, 111th, 112th, etc.)
	if (Math.floor(num / 10) % 10 === 1) {
		return numString + "th";
	}

	// Otherwise, the suffix depends on the one's place as follows
	// (1st, 2nd, 3rd, 4th, 21st, 22nd, etc.)
	switch (num % 10) {
		case 1:
			return numString + "st";
		case 2:
			return numString + "nd";
		case 3:
			return numString + "rd";
		default:
			return numString + "th";
	}
};

type Ordinal = string | [string, string];
type Ordinals = [
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
	Ordinal,
];
export const hungarianOrdinalize = (n: number) => {
	const numberPrefix = [
		"",
		"",
		"két",
		"három",
		"négy",
		"öt",
		"hat",
		"hét",
		"nyolc",
		"kilenc",
	];
	const ordinals: Array<string | Ordinal | Ordinals> = [
		[
			"",
			["első", "egyed"],
			["másod", "ketted"],
			"harmad",
			"negyed",
			"ötöd",
			"hatod",
			"heted",
			"nyolcad",
			"kilenced",
		],
		[
			"",
			["tized", "tizen"],
			["huszad", "huszon"],
			"harmincad",
			"negyvened",
			"ötvened",
			"hatvanad",
			"hetvened",
			"nyolcvanad",
			"kilencvened",
		],
		"század",
		["ezred", "ezer"],
	];

	const parts = [];
	let fractionIndex = 0;
	let fractions = 1;
	let nr = Math.abs(n);
	let part;
	do {
		const nextFractions = fractions * 10;
		const index =
			fractions > 1
				? (nr % nextFractions) / fractions
				: nr % nextFractions;

		const ordinalList = ordinals[fractionIndex++];
		if (typeof ordinalList === "string") {
			part = `${numberPrefix[index]}${ordinalList}`;
		} else if (ordinalList.length === 2) {
			part = ordinalList;
		} else {
			part = ordinalList?.[index];
		}

		if (Array.isArray(part)) {
			if (fractions === 1) {
				part = part[nr < 10 ? 0 : 1];
			} else {
				part = part[n % 10 === 0 ? 0 : 1];
			}
		} else if (fractions > 1 && n % 10 !== 0) {
			part = part?.substring(0, part.length - 2);
		}

		if (part !== undefined) {
			parts.unshift(part);
		}
		fractions = nextFractions;
		nr = Math.floor(nr / nextFractions) * nextFractions;

		if (nr < nextFractions) {
			break;
		}
	} while (part !== undefined);

	return parts.join("");
};
