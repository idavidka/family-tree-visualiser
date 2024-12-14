import { type Language } from "../../translation/i18n";
import { type IndiKey } from "../../types/types";
import { type Path, type IndiType } from "../gedcom/classes/indi";
import type IKinshipTranslator from "./kinship-translator.interface";
import * as translators from "./translators";

export default class KinshipTranslator<T extends boolean | undefined> {
	private readonly translator?: IKinshipTranslator;
	private readonly person1: IndiType;
	private readonly person2?: IndiType;
	private readonly path?: Path;
	private readonly entirePath?: T;
	private readonly lang: Language;
	private readonly displayName: "none" | "givenname" | "surname" | "all";
	constructor(
		person1: IndiType,
		person2?: IndiType | IndiKey,
		lang: Language = "en",
		entirePath?: T,
		displayName: "none" | "givenname" | "surname" | "all" = "givenname"
	) {
		this.displayName = displayName;
		this.lang = lang;
		this.entirePath = entirePath;
		this.person1 = person1;
		this.person2 =
			typeof person2 === "string"
				? this.person1.getGedcom()?.indi(person2)
				: person2;

		this.path = this.person1.path(this.person2);

		if (translators[lang]) {
			this.translator = new translators[lang](
				this.path ?? [],
				displayName
			);
		}

		// Fallback
		if (!this.translator) {
			// eslint-disable-next-line new-cap
			this.translator = new translators.en(this.path ?? [], displayName);
		}
	}

	get path0() {
		return this.path?.[0];
	}

	get path1() {
		return this.path?.[1];
	}

	get pathM() {
		return this.path?.[this.path.length - 2];
	}

	get pathN() {
		return this.path?.[this.path.length - 1];
	}

	direct() {
		if (this.pathN?.level === 0 && this.pathN.degree === 0) {
			return this.translator?.spouse();
		}

		if (this.pathN?.level === 0 && this.pathN.degree === 1) {
			return this.translator?.sibling();
		}

		if ((this.pathN?.level ?? 0) > 0 && this.pathN?.degree === 0) {
			return this.translator?.parent();
		}

		if ((this.pathN?.level ?? 0) < 0 && this.pathN?.degree === 0) {
			return this.translator?.child();
		}
	}

	indirect() {
		return this.translator?.indirect();
	}

	removal() {
		return this.translator?.removal();
	}

	translate(showMainPerson?: boolean) {
		if (this.entirePath) {
			const path = this.path?.map((path, index) => ({
				id: path.indi.id,
				absolute: this.person1.kinship(
					path.indi.id,
					showMainPerson,
					this.lang,
					false,
					this.displayName
				),
				relative: this.path?.[index - 1]?.indi.kinship(
					path.indi.id,
					showMainPerson,
					this.lang,
					false,
					this.displayName
				),
			})) as
				| Array<{ id?: IndiKey; absolute?: string; relative?: string }>
				| undefined;

			return path;
		}

		const person1 = this.path0;
		const person2 = this.path1;
		const personM = this.pathM;
		const personN = this.pathN;
		if (!person1 || !person2 || !personM || !personN) {
			return "";
		}

		if (
			person2.kinship === "spouse" &&
			person2.indi.id !== personN.indi.id
		) {
			this.translator && (this.translator.isOfSpouse = true);
		} else if (
			personN.kinship === "spouse" &&
			person2.indi.id !== personN.indi.id
		) {
			this.translator && (this.translator.isSpouseOf = true);
		}

		let relation: string | undefined;
		if (
			personN.degree === 0 ||
			(personN.degree === 1 && personN.level === 0)
		) {
			relation = this.direct();
		} else if (personN.level === 0) {
			relation = this.indirect();
		} else if (personN.level !== 0) {
			relation = this.removal();
		}

		relation = this.translator?.relationType(relation);

		if (this.translator?.isOfSpouse) {
			relation = this.translator?.ofSpouse(relation);
		} else if (this.translator?.isSpouseOf) {
			relation = this.translator?.spouseOf(relation);
		}

		relation = this.translator?.inLaw(relation);

		if (showMainPerson && relation) {
			relation = this.translator?.of(relation);
		}

		return relation ?? "";
	}
}
