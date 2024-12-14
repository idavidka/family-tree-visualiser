import { type RequiredFilter, type Filter } from "../types/types";

export const EVERY: Filter = {};

export const FEMALE: Filter = {
	SEX: "F",
};

export const MALE: Filter = {
	SEX: "M",
};

export const ADOPTED: RequiredFilter<"PEDI", string> = {
	PEDI: "ADOPTED",
};

export const BIRTH: RequiredFilter<"PEDI", string> = {
	PEDI: "BIRTH",
};

export const FOSTER: RequiredFilter<"PEDI", string> = {
	PEDI: "FOSTER",
};

export const SEALING: RequiredFilter<"PEDI", string> = {
	PEDI: "SEALING",
};

export const STEP: RequiredFilter<"PEDI", string> = {
	PEDI: "STEP",
};

export const BIOLOGICAL: RequiredFilter<"PEDI", string> = {
	PEDI: "BIOLOGICAL",
};
