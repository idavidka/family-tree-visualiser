import React from "react";
import { range } from "lodash";
import { type Settings } from "../../store/main/reducers";
import { darkThemeColors, lightThemeColors } from "../../colors";
import { type Theme } from "../../theme";

interface DebugLineProps {
	color: string;
	mode: Theme;
}
type VerticalDebugLineProps = DebugLineProps & {
	x: number;
};

type HorizontalDebugLineProps = DebugLineProps & {
	y: number;
};
const DebugLine = ({
	color,
	mode,
	...props
}: VerticalDebugLineProps | HorizontalDebugLineProps) => {
	const isVertical = "x" in props;
	const position = isVertical ? props.x : props.y;
	const linePosition = isVertical
		? { left: position - 2, top: -50000, width: 2, height: 100000 }
		: { top: position - 2, left: -50000, width: 100000, height: 2 };
	const labelPosition = isVertical
		? { left: position, top: -180, transform: "translate(-50%, -50%)" }
		: { top: position, left: -90, transform: "translate(-50%, -50%)" };

	return (
		<>
			<div
				style={{
					background: color,
					border: `2px solid ${
						mode === "dark"
							? darkThemeColors.background
							: lightThemeColors.background
					}`,
					boxSizing: "content-box",
					position: "absolute",
					zIndex: 5,
					...linePosition,
				}}
			/>
			<div
				style={{
					textAlign: "center",
					fontSize: 30,
					color,
					padding: 4,
					background:
						mode === "dark"
							? darkThemeColors.background
							: lightThemeColors.background,
					position: "absolute",
					zIndex: 6,
					...labelPosition,
				}}
			>
				{position}
			</div>
		</>
	);
};

interface DebugLinesProps {
	start: number;
	end: number;
	mode: Theme;
	halves?: boolean;
	settings: Settings;
	horizontal?: boolean;
	vertical?: boolean;
}

const DebugLines = ({
	start,
	end,
	halves,
	settings,
	mode,
	horizontal,
	vertical,
}: DebugLinesProps) => {
	if (!horizontal && !vertical) {
		return null;
	}
	return (
		<>
			{range(start, end, 1).map((index) => (
				<>
					{horizontal && (
						<>
							<DebugLine
								key={`horizontal_${index}`}
								mode={mode}
								y={
									index *
									(settings.individualSize.h *
										settings.verticalSpace)
								}
								color={index % 2 ? "red" : "lime"}
							/>
						</>
					)}
					{vertical && (
						<>
							<DebugLine
								key={`vertical_${index}`}
								mode={mode}
								x={
									index *
									(settings.individualSize.w *
										settings.horizontalSpace)
								}
								color="red"
							/>
							{halves && (
								<DebugLine
									key={`vertical_half_${index}`}
									mode={mode}
									x={
										index *
											(settings.individualSize.w *
												settings.horizontalSpace) +
										(settings.individualSize.w *
											settings.horizontalSpace) /
											2
									}
									color="lime"
								/>
							)}
						</>
					)}
				</>
			))}
		</>
	);
};

export default DebugLines;
