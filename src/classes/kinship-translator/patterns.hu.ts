import { type IndiType } from "../gedcom/classes/indi";
import { type CrossCases, type CrossCase } from "./types";

export const parentRelationsHu: Record<string, string> = {
	step: "mostoha",
	foster: "nevelt",
	birth: "vérszerinti",
	biological: "vérszerinti",
	adopted: "örökbefogadott",
};

const nominativus: CrossCase = {
	apa: { nominativus: "apa", dativus: "apjának", possessivus: "apja" },
	anya: { nominativus: "anya", dativus: "anyjának", possessivus: "anyja" },
	após: { nominativus: "após", dativus: "apósának", possessivus: "apósa" },
	anyós: {
		nominativus: "anyós",
		dativus: "anyósának",
		possessivus: "anyósa",
	},
	vő: { nominativus: "vő", dativus: "vejének", possessivus: "veje" },
	meny: { nominativus: "meny", dativus: "menyének", possessivus: "menye" },
	sógor: {
		nominativus: "sógor",
		dativus: "sógorának",
		possessivus: "sógora",
	},
	sógornő: {
		nominativus: "sógornő",
		dativus: "sógornőjének",
		possessivus: "sógornője",
	},
	bácsi: {
		nominativus: "bácsi",
		dativus: "bátyjának",
		possessivus: "bátyja",
	},
	néni: { nominativus: "néni", dativus: "nénjének", possessivus: "nénje" },
	testvér: {
		nominativus: "testvér",
		dativus: "testvérének",
		possessivus: "testvére",
	},
	öcs: { nominativus: "öcs", dativus: "öccsének", possessivus: "öccse" },
	húg: { nominativus: "húg", dativus: "húgának", possessivus: "húga" },
	férj: { nominativus: "férj", dativus: "férjének", possessivus: "férje" },
	feleség: {
		nominativus: "feleség",
		dativus: "feleségének",
		possessivus: "felesége",
	},
	házastárs: {
		nominativus: "házastárs",
		dativus: "házastársának",
		possessivus: "házastársa",
	},
	unoka: {
		nominativus: "unoka",
		dativus: "unokájának",
		possessivus: "unokája",
	},
	gyermek: {
		nominativus: "gyermek",
		dativus: "gyermekének",
		possessivus: "gyermeke",
	},
	szülő: {
		nominativus: "szülő",
		dativus: "szülőjének",
		possessivus: "szülője",
	},
};

const dativus = Object.values(nominativus).reduce<CrossCase>((acc, val) => {
	acc[val.dativus] = val;

	return acc;
}, {});

const possessivus = Object.values(nominativus).reduce<CrossCase>((acc, val) => {
	acc[val.possessivus] = val;

	return acc;
}, {});

export const casesHu: CrossCases = {
	nominativus,
	dativus,
	possessivus,
};

export const InLawsHu: Record<
	string,
	string | ((indi?: IndiType) => string | undefined)
> = {
	"gyermek felesége": "meny",
	"gyermek férje": "vő",
	[`(férj|feleség) (?<mod1>(${Object.values(parentRelationsHu).join(
		"|"
	)}) )?anyja`]: "anyós",
	[`(férj|feleség) (?<mod1>(${Object.values(parentRelationsHu).join(
		"|"
	)}) )?apja`]: "após",
	[`(férj|feleség) (?<mod1>(${Object.values(parentRelationsHu).join(
		"|"
	)}) )?(fél)?testvére`]: (indi?: IndiType) => {
		if (indi?.isMale()) {
			return "sógor";
		}
		if (indi?.isFemale()) {
			return "sógornő";
		}
	},
	[`(fél)?testvér férje`]: "sógor",
	[`(fél)?testvér felesége`]: "sógornő",
};
