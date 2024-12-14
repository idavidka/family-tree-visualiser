import React, { Fragment, useMemo } from "react";
import { type GenderColor, type LinePosition } from "../../types/graphic-types";
import Line from "./line";
import { getParts, orderLineParts } from "../../utils/line";
import Corner from "./corner";
import { LINE_CORNER_RADIUS, LINE_WEIGHT } from "../../constants/constants";
import Connect from "./connect";
import { type Theme } from "../../theme";
import { type Color } from "../../types/colors";
import { GENDER_COLORS, LINE_COLORS } from "../../colors";
import { getGenderColorOrder } from "../../utils/colors";

interface PathProps {
	points: LinePosition[];
	weight?: number;
	rounded?: boolean;
	radius?: number;
	id?: string;
	bordered?: boolean;
	mode: Theme;
	genderColors?: GenderColor;
	lineColors?: Color[];
}

const Path = ({
	rounded,
	radius = LINE_CORNER_RADIUS,
	points,
	weight = LINE_WEIGHT,
	bordered,
	mode,
	genderColors: genderColorsProps = GENDER_COLORS,
	lineColors = LINE_COLORS,
}: PathProps) => {
	const parts = useMemo(
		() => getParts(points, rounded ? radius : undefined),
		[points, radius, rounded]
	);

	const genderColors = useMemo(() => {
		return getGenderColorOrder(genderColorsProps);
	}, [genderColorsProps]);

	const common = useMemo(
		() =>
			parts.find(
				(partProps) => "hasCommon" in partProps && partProps.hasCommon
			),
		[parts]
	);

	return (
		<>
			{parts.map((part, index) => {
				const props = orderLineParts(part);
				const colors = common ? genderColors : lineColors;
				return (
					<Fragment key={index}>
						{"type" in props ? (
							<Corner
								mode={mode}
								weight={weight}
								bordered={false}
								colors={colors}
								{...props}
							/>
						) : null}
						{!("type" in props) && "x" in props ? (
							<Connect
								mode={mode}
								weight={weight}
								bordered={false}
								{...props}
							/>
						) : null}
						{!("x" in props) ? (
							<Line
								mode={mode}
								weight={weight}
								bordered={bordered}
								colors={colors}
								{...props}
							/>
						) : null}
					</Fragment>
				);
			})}
		</>
	);
};

export default Path;
