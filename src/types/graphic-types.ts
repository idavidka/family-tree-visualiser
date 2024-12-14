import { type Color as ColorType } from "./colors";
import { type FamKey } from "./types";
export interface Position {
	x: number;
	y: number;
}

export interface Curve {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	x3: number;
	y3: number;
}

export type LinePosition = Position & {
	id: FamKey;
	common?: boolean;
	colorIndex?: number;
	straight: boolean;
};

export interface Size {
	w: number;
	h: number;
}

export interface Color {
	main: ColorType;
	sub: ColorType;
}

export interface GenderColor {
	M: ColorType;
	F: ColorType;
	U: ColorType;
}

export type Side = "Left" | "Right";
