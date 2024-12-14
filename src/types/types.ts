import { type Common } from "../classes/gedcom/classes/common";
import { type Families } from "../classes/gedcom/classes/fams";
import { type Individuals } from "../classes/gedcom/classes/indis";
import { type Objects } from "../classes/gedcom/classes/objes";
import { type Repositories } from "../classes/gedcom/classes/repos";
import { type Sources } from "../classes/gedcom/classes/sours";
import { type Submitters } from "../classes/gedcom/classes/subms";

export type ConvertType = "FAM" | "INDI" | "OBJE" | "SOUR" | "REPO" | "SUBM";

export type IndiKey = `@I${number}@`;
export type FamKey = `@F${number}@`;
export type ObjeKey = `@O${number}@`;
export type RepoKey = `@R${number}@`;
export type SourKey = `@S${number}@`;
export type SubmKey = `@SUBM${number}@`;
export type TagKey = `@T${number}@`;
export type UnknownKey = `@U${number}@`;
export type IdType =
	| IndiKey
	| FamKey
	| ObjeKey
	| SourKey
	| RepoKey
	| SubmKey
	| UnknownKey;

export type RelationType =
	| "biological"
	| "adopted"
	| "foster"
	| "sealing"
	| "birth"
	| "step";

export interface NonStandard {
	INDIVIDUALS?: Individuals;
	FAMILIES?: Families;
	OBJECTS?: Objects;
	SOURCES?: Sources;
	REPOSITORIES?: Repositories;
	SUBMITTERS?: Submitters;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value?: any; // Specific type for value, not part of GEDCOM standard
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	id?: any;
}

export const TypeMap: Record<
	keyof Omit<NonStandard, "value" | "id">,
	ConvertType
> = {
	INDIVIDUALS: "INDI",
	FAMILIES: "FAM",
	OBJECTS: "OBJE",
	SOURCES: "SOUR",
	REPOSITORIES: "REPO",
	SUBMITTERS: "SUBM",
};

export const ReverseTypeMap: Record<ConvertType, keyof typeof TypeMap> = {
	INDI: "INDIVIDUALS",
	FAM: "FAMILIES",
	OBJE: "OBJECTS",
	SOUR: "SOURCES",
	REPO: "REPOSITORIES",
	SUBM: "SUBMITTERS",
};

interface Tags {
	_PRIM?: Common<"Y" | "N">;
	_EXPORTED_FROM_SITE_ID?: Common;
	_CLON?: Common;
	_MSER?: Common;
	_OID?: Common;
	_LKID?: Common;
	_PHOTO_RIN?: Common;
	_MTTAG?: Common & { NAME?: Common };
	_FREL?: Common;
	_MREL?: Common;
	_MILT?: Common;
	_LABEL?: Common;

	OBJE?: Common;
	FAMS?: Common; // Family where perons is a spouse
	FAMC?: Common; // Family where perons is a children
	ABBR?: Common; // Abbreviation for a name or title
	ADDR?: Common; // Address, usually mailing address
	ADR1?: Common; // First line of an address
	ADR2?: Common; // Second line of an address
	ADOP?: Common; // Adoption
	AFN?: Common; // Ancestral File number (LDS)
	AGE?: Common; // Age at time of event
	ALIA?: Common; // Alias
	ANUL?: Common; // Annulment
	ARVL?: Common; // Arrival
	AUTH?: Common; // Author of the information
	BAPL?: Common; // LDS baptism
	BAPM?: Common; // Baptism
	BARM?: Common; // Bar Mitzvah
	BASM?: Common; // Bas (or Bat) Mitzvah
	BIRT?: Common; // Birth
	CAST?: Common; // Caste
	CAUS?: Common; // Cause of event, such as death
	CENS?: Common; // Census
	CHIL?: Common; // Child -- natural or adopted
	CHR?: Common; // Christening
	CHRA?: Common; // Adult Christening
	CITY?: Common; // City
	CONC?: Common; // Continue with the previous text; do not leave spaces
	CONF?: Common; // Confirmation
	CONT?: Common; // Content of note
	CONL?: Common; // LDS Confirmation
	CORP?: Common; // Corporation information
	CTRY?: Common; // Country (name or code)
	DATE?: Common; // Date
	DEAT?: Common; // Death
	DESC?: Common; // Descendants
	DIV?: Common; // Divorce
	DIVF?: Common; // Divorce filed
	DSCR?: Common; // Physical description of a person, place, or thing
	EDUC?: Common; // Education
	EMIG?: Common; // Emigration
	ENDL?: Common; // Endowment (LDS)
	ENGA?: Common; // Engagement
	EVEN?: Common; // Event (noteworthy event)
	FCOM?: Common; // First Communion
	FOST?: Common; // Foster
	GIVN?: Common; // Given name
	GRAD?: Common; // Graduation
	HEAD?: Common; // Header
	HUSB?: Common; // Husband
	ILLE?: Common; // Illegitimate
	IMMI?: Common; // Immigration
	INDI?: Common; // Individual
	LANG?: Common; // Language
	LEGA?: Common; // Legatee
	LVG?: Common; // Living
	MARB?: Common; // Marriage banns
	MARC?: Common; // Marriage contract
	MARL?: Common; // Marriage license
	MARR?: Common; // Marriage
	MARS?: Common; // Marriage settlement
	MISC?: Common; // Miscellaneous
	NAME?: Common; // Name
	NATI?: Common; // Nationality
	NATU?: Common; // Naturalization
	NICK?: Common; // Nickname
	NOTE?: Common; // Additional information
	NPFX?: Common; // Name prefix
	NSFX?: Common; // Name suffix (Jr. or Sr. etc.)
	OCCU?: Common; // Occupation
	ORDI?: Common; // Ordinance (religious)
	ORDL?: Common; // Ordination (LDS)
	ORDN?: Common; // Ordination (non-LDS)
	PEDI?: Common; // Pedigree
	PHON?: Common; // Phone number
	PLAC?: Common; // Place
	POST?: Common; // Postal code
	PRIV?: Common; // Private
	PROB?: Common; // Probate
	RACE?: Common; // Race
	RELI?: Common; // Religion (denomination)
	RESI?: Common; // Residence
	RETI?: Common; // Retirement
	SEX?: Common<"F" | "M">; // Sex (male or female)
	SLGC?: Common; // Sealing of a child (LDS)
	SLGS?: Common; // Sealing of a spouse (LDS)
	SOUR?: Common; // Source
	SPFX?: Common; // Surname prefix
	SSN?: Common; // Social Security number
	STAE?: Common; // State
	STAT?: Common; // Statistics
	STIL?: Common; // Stillborn
	SUBM?: Common; // Submitter
	SURN?: Common; // Surname
	TEL?: Common; // Telephone Number
	TEMP?: Common; // Temple (LDS)
	TIME?: Common; // Time
	TITL?: Common; // Title
	WIFE?: Common; // Wife
	WILL?: Common; // Will,
	RIN?: Common;
	FILE?: Common;
	AKA?: Common;
	FACT?: Common;
	TYPE?: Common;
	VERS?: Common;
	FORM?: Common;
	WWW?: Common;
}

export type Tag = keyof Tags | keyof NonStandard;
export type MultiTag = Tag | `${Tag}.${Tag}`;

export type FilterIterator<T, K> = (
	item: T,
	key: K | number,
	index: number
) => boolean;
export type Filter<T = unknown> = Partial<Record<MultiTag, T>>;
export type RequiredFilter<T extends Tag, F = unknown> = Required<
	Pick<Filter<F>, T>
> &
	Partial<Omit<Filter<F>, T>>;

export interface OrderDefinition {
	direction: "ASC" | "DESC";
	getter?: (orig: unknown, raw?: Common) => unknown;
}
export type Order = Partial<Record<MultiTag, OrderDefinition>>;

export type OrderIterator<T, K> = (
	itemA: T,
	keyA: K | number,
	itemB: T,
	keyB: K | number
) => number;
