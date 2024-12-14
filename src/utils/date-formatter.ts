import { type IndiType } from "../classes/gedcom/classes/indi";
import i18n from "../translation/i18n";
import { type FamKey } from "../types/types";
import { type FamType } from "../classes/gedcom/classes/fam";
import type IDateStructure from "../types/structures/date";
import type IEventDetailStructure from "../types/structures/event-detail-structure";

export const commonDateFormatter = (
	date?: IDateStructure["DATE"],
	format = "yyyy",
	prefix = ""
) => {
	const formattedDate = date?.toValue(format);
	if (!formattedDate) {
		return undefined;
	}

	return `${prefix}${formattedDate}`.trim();
};

export const noteDateFormatter = (
	date?: IDateStructure["DATE"],
	format = "yyyy",
	prefix = "",
	shortNote = true,
	showNote = true
) => {
	const rawDate = commonDateFormatter(date, format, "");

	if (!rawDate) {
		return undefined;
	}

	const note = date?.toNote(shortNote) ?? "";

	return `${prefix}${
		note && showNote
			? i18n.t(`${note} {{date}}`, { date: rawDate })
			: rawDate
	}`;
};

export const dateFormatter = (
	indi?: IndiType,
	showMarriages = false,
	showDays = false,
	showPlaces = false,
	shortNote = true,
	showNote = true
) => {
	const birth = showDays
		? (commonDateFormatter(
				(
					indi?.BIRT?.toList().index(0) as
						| IEventDetailStructure
						| undefined
				)?.DATE,
				i18n.t("dateFormat")
		  ) as string | undefined)
		: commonDateFormatter(
				(
					indi?.BIRT?.toList().index(0) as
						| IEventDetailStructure
						| undefined
				)?.DATE
		  );
	const birthNote = indi?.BIRT?.DATE?.toNote(shortNote) ?? "";
	const birthPlace = showPlaces ? indi?.BIRT?.PLAC?.value : undefined;
	const death = showDays
		? (commonDateFormatter(
				(
					indi?.DEAT?.toList().index(0) as
						| IEventDetailStructure
						| undefined
				)?.DATE,
				i18n.t("dateFormat")
		  ) as string | undefined)
		: commonDateFormatter(
				(
					indi?.DEAT?.toList().index(0) as
						| IEventDetailStructure
						| undefined
				)?.DATE
		  );
	const deathNote = indi?.DEAT?.DATE?.toNote(shortNote) ?? "";
	const deathPlace = showPlaces ? indi?.DEAT?.PLAC?.value : undefined;
	const marriagePlaces: Array<string | undefined> = [];
	const marriages = showMarriages
		? (Object.keys(indi?.get("FAMS")?.toValueList().items ?? {}).map(
				(id) => {
					const family = indi?.getGedcom()?.fam(id as FamKey) as
						| FamType
						| undefined;
					const marriageDate = family?.MARR?.DATE;
					const marriagePlace = showPlaces
						? family?.MARR?.PLAC?.value
						: undefined;

					marriagePlaces.push(marriagePlace);

					return showDays
						? noteDateFormatter(
								marriageDate,
								i18n.t("dateFormat"),
								"∞",
								shortNote,
								showNote
						  )
						: noteDateFormatter(
								marriageDate,
								"yyyy",
								"∞",
								shortNote,
								showNote
						  );
				}
		  ) as Array<string | undefined>)
		: [];
	const birthString = birth
		? `*${
				birthNote && showNote
					? i18n.t(`${birthNote} {{date}}`, { date: birth })
					: birth
		  }`
		: "";
	const deathString = death
		? `†${
				deathNote && showNote
					? i18n.t(`${deathNote} {{date}}`, { date: death })
					: death
		  }`
		: "";
	const marriageArray =
		showMarriages && marriages.length
			? (marriages.filter(Boolean) as string[])
			: [];
	const datesArray = (
		!birth && !death
			? marriageArray
			: [birthString, ...marriageArray, deathString]
	).filter(Boolean);

	const dates = datesArray.join(" ").trim();

	return {
		inArray: datesArray,
		inOrder: dates,
		birth: birthString,
		marriage: marriageArray,
		death: deathString,
		...(showPlaces
			? {
					birthPlace,
					deathPlace,
					...(showMarriages ? { marriages, marriagePlaces } : {}),
			  }
			: {}),
	};
};
