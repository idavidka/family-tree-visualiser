import { Common, createCommon } from "./common";
import { type GedComType } from "./gedcom";
import { List } from "./list";

const _LONG_NOTES = {
	"Abt.": "About",
	"Bef.": "Before",
	"Aft.": "After",
};
export class CommonNote extends Common<string> {
	protected _value?: string;

	constructor(gedcom?: GedComType) {
		super(gedcom);

		delete this.id;
	}

	set value(value: string | undefined) {
		const [note, ...contents] = value?.split(/\r?\n/) ?? [];

		this._value = note;

		if (contents.length) {
			const newContents = new List();

			contents.forEach((c, i) => {
				const newContent = createCommon(this.gedcom);
				newContent.id = `@U${i}@`;
				newContent.value = c;
				newContents.append(newContent);
			});

			const firstItem = newContents.index(0);
			if (firstItem) {
				if (newContents.length === 1) {
					this.set("CONT", firstItem);
				} else {
					this.set("CONT", newContents);
				}
			}
		}
	}

	get value() {
		const contents = this.get("CONT")
			?.toList()
			.map((content) => content.value)
			.join("\n");

		if (contents) {
			return `${this._value}\n${contents}`;
		}

		return this._value;
	}
}

export const createCommonNote = (gedcom?: GedComType): CommonNote => {
	return new CommonNote(gedcom);
};
