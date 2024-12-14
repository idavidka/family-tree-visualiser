import { Common, createCommon } from "./common";
import { type GedComType } from "./gedcom";
import type IPersonalNamePiecesStructure from "../../../types/structures/personal-name-pieces";

export class CommonName extends Common<string> {
	protected _value?: string;

	NPFX?: Common;
	GIVN?: Common;
	NICK?: Common;
	SPFX?: Common;
	SURN?: Common;
	NSFX?: Common;

	constructor(gedcom?: GedComType) {
		super(gedcom);

		delete this.id;
	}

	set value(value: string | undefined) {
		if (value) {
			const nameParts = value.match(
				/(?<givenname>[^/]*)(\/(?<surname>[^/]*)\/)?(?<suffix>.*)$/
			)?.groups as null | {
				givenname?: string;
				surname?: string;
				suffix?: string;
			};

			if (nameParts?.givenname) {
				this.GIVN = this.GIVN || createCommon(this.gedcom);
				this.GIVN.isListable = false;
				this.GIVN.value = nameParts.givenname.trim();
			}

			if (nameParts?.surname) {
				this.SURN = this.SURN || createCommon(this.gedcom);
				this.SURN.value = nameParts.surname.trim();
				this.SURN.isListable = false;
			}

			if (nameParts?.suffix) {
				this.NSFX = this.NSFX || createCommon(this.gedcom);
				this.NSFX.value = nameParts.suffix.trim();
				this.NSFX.isListable = false;
			}
		}

		this._value = value;
	}

	get value() {
		return this._value;
	}

	name(value: string | undefined) {
		this.value = value;

		return this;
	}
}

export const createCommonName = (gedcom?: GedComType): CommonName => {
	return new CommonName(gedcom);
};
