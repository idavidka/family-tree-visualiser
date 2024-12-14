import React from "react";
import {
	LINE_BORDER,
	LINE_CORNER_RADIUS,
	LINE_WEIGHT,
} from "../../constants/constants";
import { StyledCorner } from "./corner.styled";
import colors, { LINE_COLORS, type Colors } from "../../colors";
import { type Color } from "../../types/colors";
import { type Theme } from "../../theme";
import { getMainLineSequenceColor } from "../../utils/colors";

type CornerTypeNormal = "bl" | "tl" | "br" | "tr";
type CornerTypeInverse = `${CornerTypeNormal}i`;
export type CornerType = CornerTypeNormal | CornerTypeInverse;

const cornerDiff = 1 - 1 / Math.PI;
export interface CornerProps {
	id?: string;
	weight?: number;
	radius?: number;
	x: number;
	y: number;
	type?: CornerType;
	colorIndex?: number;
	bordered?: boolean;
	className?: string;
	colors?: Color[];
	common?: boolean;
}

const Corner = ({
	weight = LINE_WEIGHT,
	x,
	y,
	radius = LINE_CORNER_RADIUS,
	type,
	colorIndex,
	bordered = true,
	className = "",
	mode,
	colors: lineColors = LINE_COLORS,
}: CornerProps & {
	mode: Theme;
}) => {
	if (!type) {
		return null;
	}

	let deg = 0;
	let xDiff = 0;
	let yDiff = 0;
	let xBorderDiff = 0;
	let yBorderDiff = 0;
	if (type) {
		if (["bl", "bli"].includes(type)) {
			deg = -45;
			xDiff = -radius + weight;
			yDiff = -(radius * 2) + weight;
			xBorderDiff = LINE_BORDER * cornerDiff;
			yBorderDiff = LINE_BORDER * cornerDiff;
		}
		if (["tl", "tli"].includes(type)) {
			deg = -135;
			xDiff = -(radius * 2) + weight;
			yDiff = -radius;
			xBorderDiff = LINE_BORDER * cornerDiff;
			yBorderDiff = -LINE_BORDER * cornerDiff;
		}
		if (["br", "bri"].includes(type)) {
			deg = 45;
			xDiff = -radius;
			yDiff = -(radius * 2) + weight;
			xBorderDiff = -LINE_BORDER * cornerDiff;
			yBorderDiff = LINE_BORDER * cornerDiff;
		}
		if (["tr", "tri"].includes(type)) {
			deg = 135;
			yDiff = -radius;
			xBorderDiff = -LINE_BORDER * cornerDiff;
			yBorderDiff = -LINE_BORDER * cornerDiff;
		}

		if (["bli", "tri"].includes(type)) {
			yDiff += radius;
			xDiff -= radius;
		} else if (["tli", "bri"].includes(type)) {
			yDiff += radius;
			xDiff += radius;
		}
	}

	const color = lineColors[colorIndex ?? 0];

	const lineColor = getMainLineSequenceColor(
		colors[color as Colors] ?? color ?? colors.white,
		mode
	);

	return (
		<>
			{bordered && (
				<StyledCorner
					className={`${className} corner-background ${
						weight !== LINE_WEIGHT ? "straight" : ""
					}`}
					weight={weight + LINE_BORDER * 2}
					radius={radius}
					type={type}
					style={{
						left: x - weight / 2 + xDiff + xBorderDiff,
						top: y - weight / 2 + yDiff + yBorderDiff,
						transform: `rotate(${deg}deg)`,
					}}
				/>
			)}
			<StyledCorner
				className={`${className} corner-main ${
					weight !== LINE_WEIGHT ? "straight" : ""
				}`}
				weight={weight}
				radius={radius}
				type={type}
				style={{
					borderBottomColor: lineColor,
					left: x - weight / 2 + xDiff,
					top: y - weight / 2 + yDiff,
					transform: `rotate(${deg}deg)`,
				}}
			/>
		</>
	);
};

export default Corner;
