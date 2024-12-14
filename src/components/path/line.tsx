import React from "react";
import { StyledLine } from "./line.styled";
import { LINE_BORDER, LINE_WEIGHT } from "../../constants/constants";
import colors, { LINE_COLORS, type Colors } from "../../colors";
import { type Color } from "../../types/colors";
import { type Theme } from "../../theme";
import { getMainLineSequenceColor } from "../../utils/colors";

export interface LineProps {
	id?: string;
	x1: number;
	y1: number;
	hasCommon?: boolean;
	c1?: boolean;
	r1?: number;
	x2: number;
	y2: number;
	c2?: boolean;
	r2?: number;
	weight?: number;
	colorIndex?: number;
	bordered?: boolean;
	className?: string;
	colors?: Color[];
}

const Line = ({
	weight = LINE_WEIGHT,
	colorIndex,
	bordered = true,
	className = "",
	mode,
	colors: lineColors = LINE_COLORS,
	...rawPoints
}: LineProps & {
	mode: Theme;
}) => {
	const { x1, y1, x2, y2 } = rawPoints;

	const xSize = x2 - x1;
	const ySize = y2 - y1;

	const isHorizontal = !ySize;

	const color = lineColors[colorIndex ?? 0];

	const lineColor = getMainLineSequenceColor(
		colors[color as Colors] ?? color ?? colors.white,
		mode
	);

	return (
		<>
			{bordered && xSize !== ySize ? (
				<StyledLine
					className={`${className} line-background ${
						weight !== LINE_WEIGHT ? "straight" : ""
					}`}
					style={{
						left:
							x1 - weight / 2 - (isHorizontal ? 0 : LINE_BORDER),
						top: y1 - weight / 2 - (isHorizontal ? LINE_BORDER : 0),
						height: isHorizontal
							? weight + LINE_BORDER * 2
							: ySize + weight,
						width: isHorizontal
							? xSize + weight
							: weight + LINE_BORDER * 2,
					}}
				/>
			) : null}
			<StyledLine
				className={`${className} line-main ${
					weight !== LINE_WEIGHT ? "straight" : ""
				}`}
				style={{
					background: lineColor,
					left: x1 - weight / 2,
					top: y1 - weight / 2,
					height: isHorizontal ? weight : ySize + weight,
					width: isHorizontal ? xSize + weight : weight,
				}}
			/>
		</>
	);
};

export default Line;
