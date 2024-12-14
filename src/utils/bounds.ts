import { type LineProps } from "../components/path/line";
import { PDF_SCALE } from "../constants/constants";
import { type Position, type Size } from "../types/graphic-types";

export const getScaledBounds = <T extends LineProps | Position | Size>(
	bound: T,
	scale = PDF_SCALE
) => {
	if ("x1" in bound) {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return {
			...bound,
			x1: bound.x1 * scale,
			y1: bound.y1 * scale,
			x2: bound.x2 * scale,
			y2: bound.y2 * scale,
		} as T;
	}

	if (isPosition(bound)) {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return {
			...bound,
			x: bound.x * scale,
			y: bound.y * scale,
		} as T;
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return {
		...bound,
		w: bound.w * scale,
		h: bound.h * scale,
	} as T;
};

export const getBounds = (element: HTMLElement) => {
	const { left, top, bottom, right, width, height } =
		element.getBoundingClientRect();

	return { left, top, bottom, right, width, height };
};

export const isPosition = (value: Position | Size): value is Position =>
	"x" in value;

export const fixNumber = (value: number) => {
	return value < 0 ? Math.ceil(value) : Math.floor(value);
};
export const fixBounds = <T extends Position | Size>(bound: T) => {
	if (isPosition(bound)) {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return {
			...bound,
			x: fixNumber(bound.x),
			y: fixNumber(bound.y),
		} as T;
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return {
		...bound,
		w: fixNumber(bound.w),
		h: fixNumber(bound.h),
	} as T;
};
