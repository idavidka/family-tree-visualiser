import { type Path } from "../gedcom/classes/indi";
import type IKinshipTranslator from "./kinship-translator.interface";

export default class KinshipTranslatorBasic implements IKinshipTranslator {
	isOfSpouse = false;
	isSpouseOf = false;
	displayName: "none" | "givenname" | "surname" | "all";

	private readonly _path?: Path;
	constructor(
		path: Path,
		displayName: "none" | "givenname" | "surname" | "all" = "givenname"
	) {
		this._path = path;
		this.displayName = displayName;
	}

	protected get path() {
		return this._path;
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

	get person1() {
		if (this.isOfSpouse) {
			return this.path1?.indi;
		}

		return this.path0?.indi;
	}

	get person2() {
		return this.path1?.indi;
	}

	get personM() {
		return this.pathM?.indi;
	}

	get personN() {
		if (this.isSpouseOf) {
			return this.pathM?.indi;
		}

		return this.pathN?.indi;
	}

	indirect() {
		return "";
	}

	removal() {
		return "";
	}

	parent() {
		return "";
	}

	child() {
		return "";
	}

	sibling() {
		return "";
	}

	spouse() {
		return "";
	}

	ofSpouse(relation?: string | undefined) {
		return relation ?? "";
	}

	spouseOf(relation?: string | undefined) {
		return relation ?? "";
	}

	relationType(relation?: string | undefined) {
		return relation ?? "";
	}

	of(relation?: string | undefined) {
		return relation ?? "";
	}

	inLaw(relation?: string | undefined) {
		return relation ?? "";
	}
}
