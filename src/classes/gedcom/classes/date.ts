import { format, isValid, parseISO } from "date-fns";
import { Common, createCommon } from "./common";
import { type GedComType } from "./gedcom";

const LONG_NOTES = {
	"Abt.": "About",
	"Bef.": "Before",
	"Aft.": "After",
};
export class CommonDate extends Common<string> {
	private _date?: Date;
	protected _value?: string;

	DAY?: Common;
	MONTH?: Common;
	YEAR?: Common;
	NOTE?: Common;

	constructor(gedcom?: GedComType) {
		super(gedcom);

		delete this.id;
	}

	set value(value: string | undefined) {
		if (value) {
			const noteRegExp = /^(?<note>[a-zA-Z]+\.)/;
			const noteMatch = value.match(noteRegExp)?.groups;
			let validValue = value;
			if (noteMatch?.note) {
				this.NOTE = this.NOTE || createCommon(this.gedcom);
				this.NOTE.value = noteMatch?.note;

				validValue = value.replace(noteRegExp, "");
			}

			let fixedValue = validValue;
			if (/\d{4} [A-Za-z]+\s*$/.test(validValue)) {
				fixedValue = `${validValue} 1`;
			} else if (/^\s*[A-Za-z]+ \d{4}/.test(validValue)) {
				fixedValue = `1 ${validValue}`;
			}

			this._date = new Date(fixedValue);
			this._value = value;

			if (this._date && isValid(this._date)) {
				const yearMonthDay = /[\dA-Za-z]+ [\dA-Za-z]+ [\dA-Za-z]+/.test(
					validValue
				);
				const yearMonth = /[\dA-Za-z]+ [\dA-Za-z]+/.test(validValue);
				const year = /[\dA-Za-z]+/.test(validValue);
				if (yearMonthDay) {
					this.DAY = this.DAY || createCommon(this.gedcom);
					this.DAY.value = format(this._date, "dd");
				}

				if (yearMonth || yearMonthDay) {
					this.MONTH = this.MONTH || createCommon(this.gedcom);
					this.MONTH.value = format(this._date, "MMM");
				}

				if (year || yearMonth || yearMonthDay) {
					this.YEAR = this.YEAR || createCommon(this.gedcom);
					this.YEAR.value = format(this._date, "yyyy");
				}
			}
		}
	}

	get value() {
		if (!this._date || !isValid(this._date)) {
			return this._value;
		}

		return format(this._date, "dd MMM yyyy");
	}

	get rawValue() {
		return this._date;
	}

	toNote(short = true): string | undefined {
		const note = this.NOTE?.value?.trim() as keyof typeof LONG_NOTES;

		if (!short) {
			return LONG_NOTES[note];
		}

		return note;
	}

	toValue(dateFormat = "dd MMM yyyy"): string | undefined {
		if (!this._date || !isValid(this._date)) {
			return this._value;
		}

		let validDateFormat = dateFormat;
		if (!this.DAY?.value) {
			validDateFormat = validDateFormat.replace(/d+[.\-\s/]*/g, "");
		}

		if (!this.MONTH?.value) {
			validDateFormat = validDateFormat.replace(/M+[.\-\s/]*/g, "");
		}

		if (!this.YEAR?.value) {
			validDateFormat = validDateFormat.replace(/y+[.\-\s/]*/g, "");
		}

		return format(this._date, validDateFormat);
	}
}

export const createCommonDate = (gedcom?: GedComType): CommonDate => {
	return new CommonDate(gedcom);
};

export const isCommonDate = (value?: unknown): value is CommonDate => {
	return (
		!!value &&
		value !== null &&
		typeof value === "object" &&
		"_date" in value
	);
};
