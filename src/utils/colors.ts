import parseColor from "parse-color";
import colors from "../colors";
import { type Theme } from "../theme";
import { type HSL, type Color } from "../types/colors";
import { type GenderColor } from "../types/graphic-types";

export const getRandomColor = () => {
	return ("hsl(" +
		360 * Math.random() +
		"," +
		(15 + 60 * Math.random()) +
		"%," +
		(65 + 30 * Math.random()) +
		"%)") as HSL;
};

export const generateRandomColors = (amunt: number): Color[] => {
	const colors: Color[] = [];
	for (let i = 0; i < amunt; i++) {
		const color = getRandomColor();

		if (!colors.includes(color)) {
			colors.push(color);
		} else {
			i--;
		}
	}

	return colors;
};

export const isWhite = (color: Color) => {
	return [
		"#FFF",
		"#FFFFFF",
		"rgb(255, 255, 255)",
		"rgb(255,255,255)",
	].includes(color);
};

export const getMainLineSequenceColor = (color: Color, mode: Theme) => {
	return isWhite(color) && mode === "light" ? colors.grey4 : color;
};

export const getGenderColorOrder = (colors: GenderColor): Color[] => {
	return ["M", "F", "U"].map((index) => colors[index as keyof GenderColor]);
};

const contrastColors: Record<string, Color> = {};
export const getContrastColor = (color: Color | undefined): Color => {
	if (!color) {
		return "#000";
	}

	if (contrastColors[color]) {
		return contrastColors[color];
	}

	const rgb = parseColor(color).rgb;

	if (!rgb) {
		return color;
	}

	const brightness = Math.round(
		(rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
	);
	const textColor = brightness > 125 ? "#000" : "#FFF";

	contrastColors[color] = textColor;

	return textColor;
};
