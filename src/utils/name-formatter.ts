import { Indi, type IndiType } from "../classes/gedcom/classes/indi";
import {
	createCommonName,
	type CommonName,
} from "../classes/gedcom/classes/name";
import { type Settings } from "../store/main/reducers";

export const nameFormatter = (
	indi?: IndiType | string,
	settings?: Partial<Settings>,
	letterOnAll = true,
	debug?: 3
) => {
	const {
		nameOrder = "first-last",
		maxGivennames = 0,
		maxSurnames = 0,
	} = settings ?? {};
	const rawName =
		indi instanceof Indi
			? indi?.NAME
			: createCommonName(undefined).name(indi);
	const name = rawName?.toList().index(0) as CommonName | undefined;
	let givenname = name?.GIVN?.toValueList().first()?.value || "";
	let surname = name?.SURN?.toValueList().first()?.value || "";
	let suffix = name?.NSFX?.toValueList().first()?.value || "";

	if (maxGivennames > 0) {
		givenname = givenname.split(" ").slice(0, maxGivennames).join(" ");
	}
	if (maxSurnames > 0) {
		surname = surname.split(" ").slice(0, maxSurnames).join(" ");
	}

	if (debug) {
		suffix = suffix || "Dr";
		for (let i = 1; i < debug; i++) {
			givenname = `${givenname} ${givenname}`;
			surname = `${surname} ${surname}`;
		}
	}

	const inOrder = [
		suffix,
		...(nameOrder === "last-first"
			? [surname, givenname]
			: [givenname, surname]),
	] as [string, string, string];

	const lName = (
		letterOnAll
			? [inOrder[1], inOrder[2]].filter(Boolean).join(" ")
			: inOrder[1]
	).toLowerCase();
	const firstLetter =
		lName.match(/^(dzs|cs|dz|gy|ly|ny|sz|ty|zs|\w)/i)?.[0] ??
		lName.substring(0, 1) ??
		"";
	const validFirstLetter = `${firstLetter
		.substring(0, 1)
		.toUpperCase()}${firstLetter.substring(1)}`;

	return { suffix, givenname, surname, inOrder, letter: validFirstLetter };
};
