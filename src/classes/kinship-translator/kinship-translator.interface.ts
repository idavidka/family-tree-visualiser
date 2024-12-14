export type Kinship = "self" | "spouse" | "child" | "parent";
interface IKinshipTranslator {
	isOfSpouse: boolean;
	isSpouseOf: boolean;
	displayName: "none" | "givenname" | "surname" | "all";

	parent: () => string | undefined;

	child: () => string | undefined;

	sibling: () => string | undefined;

	spouse: () => string | undefined;

	indirect: () => string | undefined;

	removal: () => string | undefined;

	inLaw: (relation?: string) => string | undefined;

	ofSpouse: (relation?: string) => string | undefined;

	spouseOf: (relation?: string) => string | undefined;

	relationType: (relation?: string) => string | undefined;

	of: (relation?: string) => string | undefined;
}

export default IKinshipTranslator;
