import { isEqualWith } from "lodash";

export const isArrayEqual = (value?: unknown[], other?: unknown[]) =>
	isEqualWith(value, other, (a) => a.toSorted());
