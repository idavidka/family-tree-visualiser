import { nameFormatter } from "../../utils/name-formatter";
import { hungarianOrdinalize } from "../../utils/ordinalize";
import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsHu, casesHu, parentRelationsHu } from "./patterns.hu";
import { type CrossCases } from "./types";

export default class KinshipTranslatorHU extends KinshipTranslatorBasic {
	private directPrefix(l?: number) {
		const level = l === undefined ? Math.abs(this.pathN?.level ?? 0) : l;
		if (level <= 1) {
			return "";
		}

		if (level === 2) {
			return "nagy";
		}

		if (level === 3) {
			return "déd";
		}

		if (level === 4) {
			return "ük";
		}

		if (level === 5) {
			return "szép";
		}

		if (level === 6) {
			return "ős";
		}

		return `${level - 5}. ős`;
	}

	private caseReplacer(
		relation: string,
		to: keyof CrossCases,
		from: keyof CrossCases = "nominativus",
		mod: " " | "$" = "$"
	) {
		let newRelation = relation;
		Object.keys(casesHu[from]).forEach((c, i) => {
			newRelation = newRelation.replace(
				new RegExp(`(?<word1>${c}(?<mod>${mod}))`),
				(m, ...rest) => {
					const groups = rest[rest.length - 1] as
						| {
								word1?: string;
								word2?: string;
								mod?: string;
						  }
						| undefined;
					const word = groups?.word1 || groups?.word2;
					if (!word) {
						return m;
					}
					const toReplace = casesHu[from][word.trim()][to];
					return toReplace ? `${toReplace}${groups.mod || ""}` : m;
				}
			);
		});

		return newRelation;
	}

	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (degree === 1) {
			return `unokatestvér`;
		}

		return `${hungarianOrdinalize(degree)}unokatestvér`;
	}

	removal() {
		const level = this.pathN?.level ?? 0;
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (!degree || (Math.abs(level) >= 1 && Math.abs(level) <= 6)) {
			return level < 0 ? this.nibling() : this.auncle();
		}

		return `${hungarianOrdinalize(
			degree
		)}unokatestvér ${level}x eltávolítva`;
	}

	auncle() {
		const level = this.pathN?.level ?? 0;
		const degree = Math.abs(this.pathN?.degree ?? 0);

		let degreeString = degree > 1 ? hungarianOrdinalize(degree) : "";
		if (degreeString) {
			degreeString = `${degreeString}-`;
		}

		let prefix = this.directPrefix();
		const origPrefix = prefix;

		if (level === 2) {
			prefix = "nagy-";
		}

		if (this.personN?.isMale()) {
			return `${degreeString}${prefix}nagybácsi`;
		}

		if (this.personN?.isFemale()) {
			return `${degreeString}${prefix}nagynéni`;
		}

		return `${origPrefix}szülő ${
			degreeString ? `${degreeString}unoka` : ""
		}testvére`;
	}

	nibling() {
		const level = Math.abs(this.pathN?.level ?? 0);
		const degree = Math.abs(this.pathN?.degree ?? 0);

		const ordinalized = degree > 1 ? hungarianOrdinalize(degree) : "";
		let degreeString = ordinalized;
		if (degreeString) {
			degreeString = `${degreeString}-`;
		}
		const prefix = this.directPrefix(level + 1);
		const origPrefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${degreeString}${
				level === 1 ? origPrefix : prefix
			}unokaöcs`;
		}

		if (this.personN?.isFemale()) {
			return `${degreeString}${
				level === 1 ? origPrefix : prefix
			}unokahúg`;
		}

		if (level <= 1) {
			return `${
				ordinalized ? `${ordinalized}unoka` : ""
			}testvér gyermeke`;
		}

		return `${
			ordinalized ? `${ordinalized}unoka` : ""
		}testvér ${origPrefix.replace(/nagy$/, "")}unokája`;
	}

	parent() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}apa`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}anya`;
		}

		return `${prefix}szülő`;
	}

	child() {
		const level = Math.abs(this.pathN?.level ?? 0);

		if (level <= 1) {
			return "gyermek";
		}

		const prefix = this.directPrefix();

		return `${prefix.replace(/nagy$/, "")}unoka`;
	}

	sibling() {
		const parents1 = this.person1?.getBiologicalParents();
		const parentsN = this.personN?.getBiologicalParents();

		const inter = parents1?.intersection(parentsN);

		// TODO if both has one parent in tree, this returns with an invalid/unsure half-blood state
		if (!inter || inter.length < 2) {
			return "féltestvér";
		}

		return "testvér";
	}

	spouse() {
		if (this.personN?.isMale()) {
			return "férj";
		}

		if (this.personN?.isFemale()) {
			return "feleség";
		}

		return "házastárs";
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[1].indi;

		let spouseType = "házastárs";
		if (spouse?.isMale()) {
			spouseType = "férj";
		}

		if (spouse?.isFemale()) {
			spouseType = "feleség";
		}

		return `${spouseType} ${this.caseReplacer(relation, "possessivus")}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[this.path.length - 1].indi;

		let spouseType = "házastársa";
		if (spouse?.isMale()) {
			spouseType = "férje";
		}

		if (spouse?.isFemale()) {
			spouseType = "felesége";
		}

		return `${this.caseReplacer(
			relation,
			"nominativus",
			"possessivus"
		)} ${spouseType}`;
	}

	of(relation?: string | undefined) {
		const formattedName = nameFormatter(this.path?.[0]?.indi, {
			nameOrder: "last-first",
		});

		let name = formattedName.inOrder.filter(Boolean).join(" ");

		if (this.displayName === "none") {
			name = "";
		} else if (this.displayName === "givenname") {
			name = formattedName.givenname;
		} else if (this.displayName === "surname") {
			name = `${formattedName.surname}`;
		}

		const isSpouse =
			this.path?.[1].kinship === "spouse" ||
			this.path?.[this.path.length - 1].kinship === "spouse";

		if (!name || !relation) {
			return relation ?? "";
		}

		if (isSpouse) {
			return `${name} ${this.caseReplacer(
				this.caseReplacer(relation, "dativus", "nominativus", " "),
				"possessivus"
			)}`;
		}

		return `${name} ${this.caseReplacer(
			this.caseReplacer(relation, "possessivus", "nominativus", " "),
			"possessivus"
		)}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsHu).find((pattern) => {
			const regex = new RegExp(
				`(?<space> )(?<word1>${pattern})$|^(?<word2>${pattern.replace(
					"?<mod1>",
					"?<mod2>"
				)})$`
			);

			if (relation?.match(regex)) {
				inLawRelation = relation?.replace(regex, (m, ...rest) => {
					const groups = rest[rest.length - 1] as
						| {
								word1?: string;
								word2?: string;
								space?: string;
								mod1?: string;
								mod2?: string;
						  }
						| undefined;
					const word = groups?.word1 || groups?.word2;
					const mod = groups?.mod1 || groups?.mod2;
					if (!word) {
						return m;
					}
					let toReplace = InLawsHu[word.trim()] || InLawsHu[pattern];

					if (typeof toReplace === "function") {
						toReplace = toReplace(this.personN) ?? "";
					}

					return toReplace
						? `${groups.space || ""}${mod || ""}${toReplace}`
						: m;
				});
				return true;
			}

			return false;
		});

		return inLawRelation ?? "";
	}

	relationType(relation?: string | undefined) {
		if (!relation || !this.pathN?.relation) {
			return relation ?? "";
		}

		return `${parentRelationsHu[this.pathN.relation]} ${relation}`;
	}
}
