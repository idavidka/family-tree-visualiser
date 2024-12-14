import React from "react";
import { LINE_BORDER, LINE_WEIGHT } from "../../constants/constants";
import { StyledConnect } from "./connect.styled";
import colors, { LINE_COLORS } from "../../colors";
import { type Theme } from "../../theme";
import { getMainLineSequenceColor } from "../../utils/colors";

export interface ConnectProps {
	id?: string;
	weight?: number;
	x: number;
	y: number;
	bordered?: boolean;
	className?: string;
}

const Connect = ({
	weight = LINE_WEIGHT,
	x,
	y,
	bordered = true,
	className = "",
	mode,
}: ConnectProps & {
	mode: Theme;
}) => {
	const x1 = x - LINE_BORDER / 4;
	const y1 = y - LINE_BORDER / 4;

	const diff = (weight * 2 + weight) / 2;

	const lineColor = getMainLineSequenceColor(LINE_COLORS[0], mode);

	return (
		<>
			{bordered && (
				<StyledConnect
					className={`${className} connect-background ${
						weight !== LINE_WEIGHT ? "straight" : ""
					}`}
					weight={weight + LINE_BORDER / 2}
					style={{
						left: x1 - diff - weight / 2,
						top: y1 - diff - weight / 2,
						border: `${weight}px solid ${colors.white}`,
					}}
				/>
			)}
			<StyledConnect
				className={`${className} connect-main ${
					weight !== LINE_WEIGHT ? "straight" : ""
				}`}
				weight={weight}
				style={{
					left: x - diff - weight / 2,
					top: y - diff - weight / 2,
					border: `${weight}px solid ${lineColor}`,
				}}
			/>
		</>
	);
};

export default Connect;
