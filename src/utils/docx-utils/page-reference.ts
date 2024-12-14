import {
	type IPageReferenceOptions,
	SpaceType,
	Run,
	XmlComponent,
	XmlAttributeComponent,
	type IRunOptions,
} from "docx";
import { publicField } from "./utils";

export class TextAttributes extends XmlAttributeComponent<object> {
	constructor(root: object) {
		super(root);
		publicField(this, "xmlKeys", { space: "xml:space" });
	}
}

const FieldCharacterType = {
	BEGIN: "begin",
	END: "end",
	SEPARATE: "separate",
};
export class FidCharAttrs extends XmlAttributeComponent<object> {
	constructor(root: object) {
		super(root);
		publicField(this, "xmlKeys", {
			type: "w:fldCharType",
			dirty: "w:dirty",
		});
	}
}

export class Begin extends XmlComponent {
	constructor(dirty?: boolean) {
		super("w:fldChar");
		this.root.push(
			new FidCharAttrs({ type: FieldCharacterType.BEGIN, dirty })
		);
	}
}
export class Separate extends XmlComponent {
	constructor(dirty?: boolean) {
		super("w:fldChar");
		this.root.push(
			new FidCharAttrs({ type: FieldCharacterType.SEPARATE, dirty })
		);
	}
}
export class End extends XmlComponent {
	constructor(dirty?: boolean) {
		super("w:fldChar");
		this.root.push(
			new FidCharAttrs({ type: FieldCharacterType.END, dirty })
		);
	}
}

export class PageReferenceFieldInstruction extends XmlComponent {
	public constructor(
		bookmarkId: string,
		options: IPageReferenceOptions = {}
	) {
		super("w:instrText");
		this.root.push(new TextAttributes({ space: SpaceType.PRESERVE }));

		let instruction = `PAGEREF ${bookmarkId}`;

		if (options.hyperlink) {
			instruction = `${instruction} \\h`;
		}
		if (options.useRelativePosition) {
			instruction = `${instruction} \\p`;
		}

		this.root.push(` ${instruction} `);
	}
}

export class PageReference extends Run {
	public constructor(
		bookmarkId: string,
		options: IPageReferenceOptions & IRunOptions = {}
	) {
		const { useRelativePosition, hyperlink, ...runOptions } = options;

		super({
			children: [
				new Begin(true),
				new PageReferenceFieldInstruction(bookmarkId, {
					useRelativePosition,
					hyperlink,
				}),
				new End(),
			],
			noProof: true,
			...runOptions,
		});
	}

	public static PageReference(
		bookmarkId: string,
		options: IPageReferenceOptions & IRunOptions = {}
	) {
		const { useRelativePosition, hyperlink, ...runOptions } = options;
		return [
			new Run({ children: [new Begin(true)] }),
			new Run({
				children: [
					new PageReferenceFieldInstruction(bookmarkId, {
						useRelativePosition,
						hyperlink,
					}),
				],
			}),
			new Run({ children: [new Separate()] }),
			new Run({ text: "1", noProof: true, ...runOptions }),
			new Run({ children: [new End()] }),
		];
	}
}
