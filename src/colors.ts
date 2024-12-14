import { type HSL, type Color } from "./types/colors";

import allColor from "./constants/colors.json";
import { type GenderColor } from "./types/graphic-types";

const colors = {
	white: "#e3e3e3",
	black: "#312a2a",
	grey1: "#CDC7D6",
	grey2: "#615757",
	grey3: "#525d6e",
	grey4: "#374151",
	grey5: "#d8dde6",
	blue1: "#6C8EDB",
	blue2: "#5F7BA6",
	red1: "#db6c6c",
	red2: "#a65f5f",
	green1: "#6cdb78",
	green2: "#5fa663",
	orange1: "#e79647",
	orange2: "#d78a42",
} as const;

export const GENDER_COLORS: GenderColor = {
	M: colors.blue1,
	F: colors.red1,
	U: colors.grey2,
};

export const LINE_COLORS = [
	"#FFFFFF",
	"#6cdb89",
	"#e74694",
	"#1c64f2",
	"#d78a42",
] as Color[];
export const PDF_LINE_COLORS = [
	"#000000",
	"#6cdb89",
	"#e74694",
	"#1c64f2",
	"#d78a42",
] as Color[];

export const FAMILY_COLORS = [
	"#d3d3d3",
	"#4947e7",
	"#9ae747",
	"#47e7da",
	"#e79647",
	"#4792e7",
	"#47e774",
	"#e7e147",
	"#e74747",
] as Color[];

export const COLORS = allColor as HSL[];

export type Colors = keyof typeof colors;

export const darkThemeColors = {
	background: colors.grey4,
	backgroundTransparent: `${colors.black}CC`,
	bgInverse: colors.grey5,
	text: colors.white,
	mainLine: colors.white,
	bgHover: colors.grey3,
	indiShadow: colors.black,
	fanBg: colors.white,
} as const;
export const lightThemeColors: Record<ThemeColors, Color> = {
	background: colors.grey5,
	backgroundTransparent: `${colors.white}CC`,
	bgInverse: colors.grey4,
	text: colors.black,
	mainLine: colors.grey4,
	bgHover: colors.white,
	indiShadow: colors.white,
	fanBg: colors.grey4,
};

export type ThemeColors = keyof typeof darkThemeColors;

export default colors as Record<Colors, Color>;
