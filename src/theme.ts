import colors, { darkThemeColors, lightThemeColors } from "./colors";
import { type DefaultTheme } from "styled-components";
export type Theme = "light" | "dark";

export const DARK_THEME: DefaultTheme = {
	colors,
	elements: darkThemeColors,
};

export const LIGHT_THEME: DefaultTheme = {
	colors,
	elements: lightThemeColors,
};

const lStorage = globalThis.localStorage;
export const initialTheme: Theme =
	JSON.parse(lStorage?.getItem("persist:ftv") || "{}").mode?.replaceAll(
		'"',
		""
	) || "light";

export const changeTheme = (mode: Theme) => {
	if (mode === "dark") {
		document.documentElement.classList.add("dark");
	} else {
		document.documentElement.classList.remove("dark");
	}
};
