import { nameFormatter } from "../../utils/name-formatter";
import { ordinalize } from "../../utils/ordinalize";
import KinshipTranslatorBasic from "./kinship-translator.basic";
import { InLawsEn } from "./patterns.en";

export default class KinshipTranslatorEn extends KinshipTranslatorBasic {
	private directPrefix() {
		const level = Math.abs(this.pathN?.level ?? 0);
		if (level <= 1) {
			return "";
		}

		if (level === 2) {
			return "grand";
		}

		if (level === 3) {
			return "great-grand";
		}

		return `${ordinalize(level - 2)} great-grand`;
	}

	indirect() {
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (degree === 1) {
			return `cousin`;
		}

		return `${ordinalize(degree)} cousin`;
	}

	removal() {
		const level = this.pathN?.level ?? 0;
		let degree = Math.abs(this.pathN?.degree ?? 0);
		if (degree > 0) {
			degree = degree - 1;
		}

		if (!degree) {
			return level < 0 ? this.nibling() : this.auncle();
		}

		return `${ordinalize(degree)} cousin ${level}x removed`;
	}

	auncle() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}uncle`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}aunt`;
		}

		return `${prefix}auncle`;
	}

	nibling() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}nephew`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}niece`;
		}

		return `${prefix}nibling`;
	}

	parent() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}father`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}mother`;
		}

		return `${prefix}parent`;
	}

	child() {
		const prefix = this.directPrefix();

		if (this.personN?.isMale()) {
			return `${prefix}son`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}daughter`;
		}

		return `${prefix}child`;
	}

	sibling() {
		const parents1 = this.person1?.getBiologicalParents();
		const parentsN = this.personN?.getBiologicalParents();

		const inter = parents1?.intersection(parentsN);

		// TODO if both has one parent in tree, this returns with an invalid/unsure half-blood state
		let prefix = "";
		if (!inter || inter.length < 2) {
			prefix = "half-";
		}

		if (this.personN?.isMale()) {
			return `${prefix}brother`;
		}

		if (this.personN?.isFemale()) {
			return `${prefix}sister`;
		}

		return `${prefix}sibling`;
	}

	spouse() {
		if (this.personN?.isMale()) {
			return "husband";
		}

		if (this.personN?.isFemale()) {
			return "wife";
		}

		return "spouse";
	}

	ofSpouse(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[1].indi;

		let spouseType = "spouse";
		if (spouse?.isMale()) {
			spouseType = "husband";
		}

		if (spouse?.isFemale()) {
			spouseType = "wife";
		}

		return `${relation} of ${spouseType}`;
	}

	spouseOf(relation?: string | undefined) {
		if (!relation) {
			return "";
		}

		const spouse = this.path?.[this.path.length - 1].indi;

		let spouseType = "spouse";
		if (spouse?.isMale()) {
			spouseType = "husband";
		}

		if (spouse?.isFemale()) {
			spouseType = "wife";
		}

		return `${spouseType} of ${relation}`;
	}

	of(relation?: string | undefined) {
		const formattedName = nameFormatter(this.path?.[0]?.indi, {
			nameOrder: "first-last",
		});

		let name = formattedName.inOrder.filter(Boolean).join(" ");

		if (this.displayName === "none") {
			name = "";
		} else if (this.displayName === "givenname") {
			name = formattedName.givenname;
		} else if (this.displayName === "surname") {
			name = `${formattedName.surname}`;
		}

		if (!name || !relation) {
			return relation ?? "";
		}

		if (relation.includes(" of ")) {
			return relation.replace(" of ", ` of ${name}'s `);
		}

		return `${name}'s ${relation}`;
	}

	inLaw(relation?: string | undefined) {
		let inLawRelation = relation;
		Object.keys(InLawsEn).find((pattern) => {
			const regex = new RegExp(
				`(?<space> )(?<word1>${pattern})$|^(?<word2>${pattern})$`
			);

			if (relation?.match(regex)) {
				inLawRelation = relation?.replace(regex, (m, ...rest) => {
					const groups = rest[rest.length - 1] as
						| {
								word1?: string;
								word2?: string;
								space?: string;
						  }
						| undefined;
					const word = groups?.word1 || groups?.word2;
					if (!word) {
						return m;
					}
					const toReplace =
						InLawsEn[word.trim()] || InLawsEn[pattern];
					return toReplace ? `${groups.space || ""}${toReplace}` : m;
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

		return `${this.pathN.relation} ${relation}`;
	}
}
