import { type LevelFormat, XmlComponent } from "docx";
import { Attributes } from "./attributes";

export class NumFormat extends XmlComponent {
	public constructor(
		value: (typeof LevelFormat)[keyof typeof LevelFormat],
		format?: string
	) {
		super("w:numFmt");
		this.root.push(
			new Attributes({
				val: value,
				format,
			})
		);
	}
}

// <mc:AlternateContent>
// 	<mc:Choice Requires="w14">
// 		<w:numFmt w:val="custom" w:format="00001, 00002, 00003, ..." />
// 	</mc:Choice>
// 	<mc:Fallback>
// 		<w:numFmt w:val="decimal" />
// 	</mc:Fallback>
// </mc:AlternateContent>
export const CustomNumberFormat = {
	LEADING_ZERO_1: "01, 02, 03, ...",
	LEADING_ZERO_2: "001, 002, 003, ...",
	LEADING_ZERO_3: "0001, 0002, 0003, ...",
	LEADING_ZERO_4: "00001, 00002, 00003, ...",
} as const;
export class CustomNumFormat extends XmlComponent {
	public constructor(options: {
		requires: `w${number}`;
		format: (typeof CustomNumberFormat)[keyof typeof CustomNumberFormat];
		fallback: (typeof LevelFormat)[keyof typeof LevelFormat];
	}) {
		super("mc:AlternateContent");

		this.root.push(new Choice(options.requires, options.format));
		this.root.push(new Fallback(options.fallback));
	}
}
export class Choice extends XmlComponent {
	public constructor(
		requires: `w${number}`,
		format: (typeof CustomNumberFormat)[keyof typeof CustomNumberFormat]
	) {
		super("mc:Choice");

		this.root.push(new Attributes({ Requires: requires }));
		this.root.push(new NumFormat("custom", format));
	}
}

export class Fallback extends XmlComponent {
	public constructor(format: (typeof LevelFormat)[keyof typeof LevelFormat]) {
		super("mc:Fallback");

		this.root.push(new NumFormat(format));
	}
}
