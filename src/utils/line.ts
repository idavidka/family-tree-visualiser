import { COLORS } from "../colors";
import { type ConnectProps } from "../components/path/connect";
import { type CornerProps } from "../components/path/corner";
import { type LineProps } from "../components/path/line";
import {
	COLORED_LINES,
	LINE_WEIGHT,
	MAX_DIM_CHECK,
} from "../constants/constants";
import { type Color } from "../types/colors";
import { type Position, type LinePosition } from "../types/graphic-types";
import { type IndiKey, type FamKey } from "../types/types";
import { fixBounds } from "./bounds";
import inRange from "lodash/inRange";

interface MappedValidPoint {
	x1: { x1: number; ox1: number };
	y1: { y1: number; oy1: number };
	x2: { x2: number; ox2: number };
	y2: { y2: number; oy2: number };
}

type Diff = Record<keyof MappedValidPoint, number>;

export type LinePropsWithId = {
	id: FamKey;
} & LineProps;
export type LinePropsOriginals = Partial<{
	ox1: number;
	oy1: number;
	ox2: number;
	oy2: number;
}> &
	LineProps;
export type ReservedPoints = Record<number, Record<number, LinePropsWithId>>;
export interface CommonPoint {
	spouse?: [Position, Position, Position];
	nonStraightSpouse?: [Position, Position];
	single?: Position;
	children?: Pick<Position, "y"> & {
		x?: Record<IndiKey, number | undefined>;
	};
}
export type CommonPoints = Record<FamKey, CommonPoint | undefined>;

let lineColorIndex = 0;
export const resetIndexedColor = () => {
	lineColorIndex = 0;
};

export const getIndexedColor = () => {
	if (lineColorIndex > COLORS.length - 1) {
		lineColorIndex = 0;
	}

	return COLORS[lineColorIndex++];
};

export const getLineColorSequence = (
	line: LineProps,
	diff: number,
	colors: Color[]
) => {
	return Math.abs(Math.floor(line.y1 / diff)) % colors.length;
};

export const getLineColor = (
	line: LinePropsWithId,
	reservedPoints: ReservedPoints,
	diff: number,
	colors: Color[]
): number | undefined => {
	if (line.colorIndex !== undefined) {
		return line.colorIndex;
	}

	const filteredHorizontals = Object.entries(reservedPoints)
		.filter(([originY]) => {
			const lineToBottom = line.y1 < line.y2;
			return inRange(
				Number(originY),
				line.y1 + Number(!lineToBottom),
				line.y2 + Number(lineToBottom)
			);
		})
		.map(([_key, lines]) => Object.values(lines))
		.flat();

	const found = filteredHorizontals.find((filteredLine) => {
		return (
			isLineIntersect(line, filteredLine) && line.id !== filteredLine.id
		);
	});

	if (found) {
		return getLineColorSequence(line, diff, colors);
	}

	return undefined;
};

export const getNextVerticalLines = (
	line: LinePropsWithId,
	reservedPoints: ReservedPoints,
	left = false,
	dimDiff: number,
	direction?: "left" | "right"
) => {
	let originX = line.x1;
	if (!reservedPoints[originX]) {
		return line;
	}

	const newLine = {
		...line,
	};

	for (let i = 0; i < MAX_DIM_CHECK; i++) {
		const found = Object.values(reservedPoints[originX] ?? {}).find(
			(reservedLine) =>
				isVerticalLineOverlap(newLine, reservedLine) &&
				newLine.id !== reservedLine.id
		);

		if (!found) {
			break;
		}

		if (direction) {
			if (direction === "left") {
				originX -= dimDiff;
			} else {
				originX += dimDiff;
			}
		} else if (left) {
			if (i === 0) {
				originX -= dimDiff;
			} else if (i === 1) {
				originX += dimDiff * 2;
			} else if (i === 2) {
				originX -= dimDiff * 3;
			} else if (i === 3) {
				originX += dimDiff * 4;
			} else {
				originX += dimDiff;
			}
		} else {
			originX += dimDiff;
		}
		newLine.x1 = originX;
		newLine.x2 = originX;
	}

	return newLine;
};

export const getNextHorizontalLines = (
	line: LinePropsWithId,
	reservedPoints: ReservedPoints,
	upper = false,
	dimDiff: number,
	colors: Color[],
	allowedFullDimensionCheck?: boolean,
	allowedColors = false,
	direction?: "down" | "up",
	forceColors = false
) => {
	const newLine = {
		...line,
	};

	if (COLORED_LINES) {
		newLine.colorIndex = 0;
	}

	let originY = line.y1;
	if (!reservedPoints[originY]) {
		return newLine;
	}

	for (let i = 0; i < MAX_DIM_CHECK; i++) {
		let coloredOverlap = false;
		const found = Object.values(reservedPoints[originY] ?? {}).find(
			(reservedLine) => {
				const overlap = isHorizontalLineOverlap(
					newLine,
					reservedLine,
					allowedFullDimensionCheck
				);

				if (overlap.real) {
					coloredOverlap = true;
					return overlap.real && newLine.id !== reservedLine.id;
				}

				return overlap.move && newLine.id !== reservedLine.id;
			}
		);

		if (!found) {
			break;
		}

		if (direction) {
			if (direction === "up") {
				originY += dimDiff;
			} else {
				originY -= dimDiff;
			}
		} else if (upper && !allowedFullDimensionCheck) {
			if (i === 0) {
				originY -= dimDiff;
			} else if (i === 1) {
				originY += dimDiff * 2;
			} else if (i === 2) {
				originY -= dimDiff * 3;
			} else if (i === 3) {
				originY += dimDiff * 4;
			} else {
				originY += dimDiff;
			}
		} else {
			originY += dimDiff;
		}
		newLine.y1 = originY;
		newLine.y2 = originY;

		if (
			forceColors ||
			(COLORED_LINES &&
				coloredOverlap &&
				!allowedFullDimensionCheck &&
				allowedColors)
		) {
			newLine.colorIndex = getLineColorSequence(newLine, dimDiff, colors);
		}
	}

	return newLine;
};

export const isLineIntersect = (line1: LineProps, line2: LineProps) => {
	const { x1: a, y1: b, x2: c, y2: d } = line1;
	const { x1: p, y1: q, x2: r, y2: s } = line2;
	let gamma: number | undefined;
	let lambda: number | undefined;
	const det = (c - a) * (s - q) - (r - p) * (d - b);
	if (det === 0) {
		return false;
	} else {
		lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
		gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
		return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
	}
};

export const isVerticalLineOverlap = (line1: LineProps, line2: LineProps) => {
	const l1 = getValidLine(line1);
	const l2 = getValidLine(line2);

	return (
		inRange(l1.y1, l2.y1, l2.y2 + 1) ||
		inRange(l1.y2, l2.y1, l2.y2 + 1) ||
		inRange(l2.y1, l1.y1, l1.y2 + 1) ||
		inRange(l2.y2, l1.y1, l1.y2 + 1)
	);
};

export const isHorizontalLineOverlap = (
	line1: LineProps,
	line2: LineProps,
	allowedFullDimensionCheck?: boolean
) => {
	const l1 = getValidLine(line1);
	const l2 = getValidLine(line2);

	let x1 = l1.x1;
	let x2 = l1.x2;
	let x3 = l2.x1;
	let x4 = l2.x2;

	const real =
		inRange(x1, x3, x4 + 1) ||
		inRange(x2, x3, x4 + 1) ||
		inRange(x3, x1, x2 + 1) ||
		inRange(x4, x1, x2 + 1);

	if (allowedFullDimensionCheck) {
		if (!l1.c1 && !l1.c2) {
			if (x1 > 1.1) {
				x1 = 1.1;
			} else if (x2 < -1.1) {
				x2 = -1.1;
			}
		}

		if (!l2.c1 && !l2.c2) {
			if (x3 > 1.1) {
				x3 = 1.1;
			} else if (x4 < -1.1) {
				x4 = -1.1;
			}
		}
	}

	const move =
		inRange(x1, x3, x4 + 1) ||
		inRange(x2, x3, x4 + 1) ||
		inRange(x3, x1, x2 + 1) ||
		inRange(x4, x1, x2 + 1);

	return { real, move };
};

export const setupLine = (
	id: FamKey,
	straight?: boolean,
	...points: Array<[number, number, boolean?, number?]>
): LinePosition[] => {
	return points.map((raw) => {
		const [x, y, common, colorIndex] = raw;
		const bound: LinePosition = {
			id,
			x,
			y,
			common,
			colorIndex,
			straight: !!straight,
		};
		const point = fixBounds(bound);

		return point;
	});
};

export const getCornerType = (
	last: LinePropsOriginals,
	current: LinePropsOriginals
) => {
	const useOriginal = true;
	const cox1 =
		current.ox1 !== undefined && useOriginal ? current.ox1 : current.x1;
	const coy1 =
		current.oy1 !== undefined && useOriginal ? current.oy1 : current.y1;
	const cox2 =
		current.ox2 !== undefined && useOriginal ? current.ox2 : current.x2;
	const coy2 =
		current.oy2 !== undefined && useOriginal ? current.oy2 : current.y2;
	const lox1 = last.ox1 !== undefined && useOriginal ? last.ox1 : last.x1;
	const loy1 = last.oy1 !== undefined && useOriginal ? last.oy1 : last.y1;
	const lox2 = last.ox2 !== undefined && useOriginal ? last.ox2 : last.x2;
	const loy2 = last.oy2 !== undefined && useOriginal ? last.oy2 : last.y2;

	const lastIsVertical = lox1 === lox2;
	const lastToTop = loy2 > loy1;
	const currentToTop = coy2 > coy1;
	const currentIsVertical = cox1 === cox2;

	if (lastIsVertical === currentIsVertical) {
		return undefined;
	}
	if (current.x1 > last.x2 && current.x2 > last.x2) {
		if (currentIsVertical) {
			return currentToTop ? "tl" : "bli";
		} else {
			return lastToTop ? "br" : "tri";
		}
	} else {
		if (currentIsVertical) {
			return currentToTop ? "tr" : "bri";
		} else {
			return lastToTop ? "bl" : "tli";
		}
	}
};

export const orderLineEnds = (part: {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}) => {
	let { x1, y1, x2, y2 } = part;

	if (x1 > x2) {
		const x3 = x1;
		x1 = x2;
		x2 = x3;
	}

	if (y1 > y2) {
		const y3 = y1;
		y1 = y2;
		y2 = y3;
	}

	return { x1, y1, x2, y2 };
};

export const orderLineParts = <T extends LineProps | CornerProps>(part: T) => {
	if ("x" in part) {
		return part;
	}

	const {
		x1: origX1,
		y1: origY1,
		x2: origX2,
		y2: origY2,
		colorIndex,
		weight,
	} = part;

	const { x1, y1, x2, y2 } = orderLineEnds({
		x1: origX1,
		y1: origY1,
		x2: origX2,
		y2: origY2,
	});
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return { x1, y1, x2, y2, colorIndex, weight } as T;
};

export const getValidPoints = (
	diffs: Diff,
	order: { index: number; total: number },
	current: LinePropsOriginals,
	last?: LinePropsOriginals,
	next?: LinePropsOriginals
) => {
	const { x1, y1, x2, y2, ox1, ox2, oy1, oy2 } = current;

	const cox1 = ox1 !== undefined ? ox1 : x1;
	const coy1 = oy1 !== undefined ? oy1 : y1;
	const cox2 = ox2 !== undefined ? ox2 : x2;
	const coy2 = oy2 !== undefined ? oy2 : y2;

	const { index, total } = order;
	const type = index === 0 ? "first" : index === total - 1 ? "last" : "inner";
	const isCurrentVertical = cox1 === cox2;
	const currentLength = Math.abs(
		isCurrentVertical ? coy1 - coy2 : cox1 - cox2
	);
	const currentHalfLength = currentLength / 2;

	const lox1 = last
		? last.ox1 !== undefined
			? last.ox1
			: last.x1
		: undefined;
	const loy1 = last
		? last.oy1 !== undefined
			? last.oy1
			: last.y1
		: undefined;
	const lox2 = last
		? last.ox2 !== undefined
			? last.ox2
			: last.x2
		: undefined;
	const loy2 = last
		? last.oy2 !== undefined
			? last.oy2
			: last.y2
		: undefined;

	const isLastVertical = last && lox1 === lox2;
	const lastLength = last
		? Math.abs(isLastVertical ? loy1! - loy2! : lox1! - lox2!)
		: undefined;

	const lastHalfLength =
		lastLength !== undefined ? lastLength / 2 : undefined;

	const nox1 = next
		? next.ox1 !== undefined
			? next.ox1
			: next.x1
		: undefined;
	const noy1 = next
		? next.oy1 !== undefined
			? next.oy1
			: next.y1
		: undefined;
	const nox2 = next
		? next.ox2 !== undefined
			? next.ox2
			: next.x2
		: undefined;
	const noy2 = next
		? next.oy2 !== undefined
			? next.oy2
			: next.y2
		: undefined;

	const isNextVertical = next && nox1 === nox2;
	const nextLength = next
		? Math.abs(isNextVertical ? noy1! - noy2! : nox1! - nox2!)
		: undefined;
	const nextHalfLength =
		nextLength !== undefined ? nextLength / 2 : undefined;

	const newPoints: LinePropsOriginals = { ...current };

	Object.entries(diffs).forEach(([k, diff]) => {
		const key = k as keyof MappedValidPoint;
		let usedDiff = diff;
		const usedProp = current[key];
		const mKey = `o${key}` as `o${keyof MappedValidPoint}`;

		if (type === "inner") {
			if (!isCurrentVertical) {
				if (key === "x1") {
					if (isCurrentVertical !== isLastVertical) {
						const usedLastLength =
							index === 1 ? lastLength : lastHalfLength;
						if (
							usedLastLength !== undefined &&
							usedLastLength < Math.abs(usedDiff)
						) {
							usedDiff = usedLastLength * (usedDiff < 0 ? -1 : 1);
						}

						if (currentHalfLength < Math.abs(usedDiff)) {
							usedDiff =
								currentHalfLength * (usedDiff < 0 ? -1 : 1);
						}

						newPoints.r1 = usedDiff;
					}
				} else if (key === "x2") {
					if (isCurrentVertical !== isNextVertical) {
						const usedNextLength =
							index === total - 2 ? nextLength : nextHalfLength;
						if (
							usedNextLength !== undefined &&
							usedNextLength < Math.abs(usedDiff)
						) {
							usedDiff = usedNextLength * (usedDiff < 0 ? -1 : 1);
						}

						if (currentHalfLength < Math.abs(usedDiff)) {
							usedDiff =
								currentHalfLength * (usedDiff < 0 ? -1 : 1);
						}

						newPoints.r2 = usedDiff;
					}
				}
			} else {
				if (key === "y1") {
					if (isCurrentVertical !== isLastVertical) {
						const usedLastLength =
							index === 1 ? lastLength : lastHalfLength;
						if (
							usedLastLength !== undefined &&
							usedLastLength < Math.abs(usedDiff)
						) {
							usedDiff = usedLastLength * (usedDiff < 0 ? -1 : 1);
						}

						if (currentHalfLength < Math.abs(usedDiff)) {
							usedDiff =
								currentHalfLength * (usedDiff < 0 ? -1 : 1);
						}

						newPoints.r1 = usedDiff;
					}
				} else if (key === "y2") {
					if (isCurrentVertical !== isNextVertical) {
						const usedNextLength =
							index === total - 2 ? nextLength : nextHalfLength;
						if (
							usedNextLength !== undefined &&
							usedNextLength < Math.abs(usedDiff)
						) {
							usedDiff = usedNextLength * (usedDiff < 0 ? -1 : 1);
						}

						if (currentHalfLength < Math.abs(usedDiff)) {
							usedDiff =
								currentHalfLength * (usedDiff < 0 ? -1 : 1);
						}

						newPoints.r2 = usedDiff;
					}
				}
			}
		} else if (type === "first") {
			if (key === "x1" || key === "y1") {
				usedDiff = 0;
			} else {
				if (
					nextHalfLength !== undefined &&
					nextHalfLength < Math.abs(usedDiff)
				) {
					usedDiff =
						Math.abs(nextHalfLength - 0.01) *
						(usedDiff < 0 ? -1 : 1);
				}

				if (currentLength < Math.abs(usedDiff)) {
					usedDiff =
						Math.abs(currentLength - 0.01) *
						(usedDiff < 0 ? -1 : 1);
				}

				newPoints.r2 = usedDiff;
			}
		} else if (type === "last") {
			if (key === "x2" || key === "y2") {
				usedDiff = 0;
			} else {
				if (
					lastHalfLength !== undefined &&
					lastHalfLength < Math.abs(usedDiff)
				) {
					usedDiff =
						Math.abs(lastHalfLength - 0.01) *
						(usedDiff < 0 ? -1 : 1);
				}
				if (currentLength < Math.abs(usedDiff)) {
					usedDiff =
						Math.abs(currentLength - 0.01) *
						(usedDiff < 0 ? -1 : 1);
				}

				if (
					(isCurrentVertical && key === "y1") ||
					(!isCurrentVertical && key === "x1")
				) {
					newPoints.r1 = usedDiff;
				}
			}
		}

		const modifiedPoint = usedProp + usedDiff;

		newPoints[mKey] = newPoints[key];
		newPoints[key] = modifiedPoint;
	});

	return newPoints;
};

export const getParts = (
	points: LinePosition[],
	radius = 0,
	types: "all" | "lines" | "connects" | "corners" = "all"
) => {
	let lastPoint: LinePosition | undefined;
	const lines: LinePropsOriginals[] = [];
	const parts: Array<LineProps | CornerProps | ConnectProps> = [];

	const hasCommon = !!points.find((point) => point.common);

	points.forEach((point) => {
		if (lastPoint) {
			lines.push({
				id: lastPoint.id,
				x1: lastPoint.x,
				y1: lastPoint.y,
				hasCommon,
				c1: !!lastPoint.common,
				x2: point.x,
				y2: point.y,
				c2: !!point.common,
				colorIndex: lastPoint.colorIndex,
				weight: point.straight ? LINE_WEIGHT * 2 : LINE_WEIGHT,
			});
		}

		lastPoint = point;
	});

	let lastProps: LinePropsOriginals | undefined;
	lines.forEach((rawLine, index) => {
		const nextProps = lines[index + 1];
		let newProps = rawLine;
		const validRadius = radius;
		if (validRadius && validRadius > 0) {
			const { x1, y1, c1, x2, y2, c2 } = rawLine;
			const last = lines[index - 1];
			const next = lines[index + 1];

			const isCurrentVertical = x1 === x2;
			const isCurrentToRight = x1 < x2;
			const isCurrentToTop = y1 > y2;
			const isLastVertical = last?.x1 === last?.x2;
			const isNextVertical = next?.x1 === next?.x2;

			const diff: LineProps = { x1: 0, y1: 0, x2: 0, y2: 0 };
			if (!last) {
				// first line
				if (!next) {
					// no next, nothing to do
				} else if (isCurrentVertical === isNextVertical) {
					// same dimension, nothing to do
				} else {
					if (isCurrentVertical) {
						diff.y2 = -validRadius;
					} else if (isCurrentToRight) {
						diff.x2 = -validRadius;
					} else {
						diff.x2 = validRadius;
					}
				}
			} else if (!next) {
				// last line
				if (isCurrentVertical === isLastVertical) {
					// same dimension, nothing to do
				} else {
					if (isCurrentVertical) {
						if (isCurrentToTop) {
							diff.y1 = -validRadius;
						} else {
							diff.y1 = validRadius;
						}
					} else {
						if (isCurrentToRight) {
							diff.x1 = validRadius;
						} else {
							diff.x1 = -validRadius;
						}
					}
				}
			} else {
				// middle line
				if (
					isCurrentVertical === isLastVertical &&
					isCurrentVertical === isNextVertical
				) {
					// same dimension, nothing to do
				} else if (!isCurrentVertical) {
					if (isCurrentVertical === isLastVertical) {
						if (isCurrentToRight) {
							diff.x2 = -validRadius;
						} else {
							diff.x2 = validRadius;
						}
					} else if (isCurrentVertical === isNextVertical) {
						if (isCurrentToRight) {
							diff.x1 = validRadius;
						} else {
							diff.x1 = -validRadius;
						}
					} else {
						if (isCurrentToRight) {
							diff.x1 = validRadius;
							diff.x2 = -validRadius;
						} else {
							diff.x1 = -validRadius;
							diff.x2 = validRadius;
						}
					}
				} else {
					if (isCurrentVertical === isLastVertical) {
						if (isCurrentToTop) {
							diff.y2 = validRadius;
						} else {
							diff.y2 = -validRadius;
						}
					} else if (isCurrentVertical === isNextVertical) {
						if (isCurrentToTop) {
							diff.y1 = -validRadius;
						} else {
							diff.y1 = validRadius;
						}
					} else {
						if (isCurrentToTop) {
							diff.y1 = -validRadius;
							diff.y2 = validRadius;
						} else {
							diff.y1 = validRadius;
							diff.y2 = -validRadius;
						}
					}
				}
			}

			newProps = {
				id: rawLine.id,
				c1,
				c2,
				colorIndex: rawLine.colorIndex,
				weight: rawLine.weight,
				...getValidPoints(
					{
						x1: !c1 ? diff.x1 : 0,
						y1: !c1 ? diff.y1 : 0,
						x2: !c2 ? diff.x2 : 0,
						y2: !c2 ? diff.y2 : 0,
					},
					{ index, total: lines.length },
					newProps,
					lastProps,
					nextProps
				),
			};
		}

		if (types === "all" || types === "lines") {
			parts.push(newProps);
		}

		if (lastProps) {
			if (
				lastProps &&
				lastProps.x2 !== newProps.x1 &&
				lastProps.y2 !== newProps.y1 &&
				newProps.x1 !== lastProps.x2 &&
				newProps.y1 !== lastProps.y2
			) {
				if (types === "all" || types === "corners") {
					const common = lastProps.hasCommon || newProps.hasCommon;
					const type = getCornerType(lastProps, newProps);
					parts.push({
						id: newProps.id,
						x: newProps.x1,
						y: newProps.y1,
						type,
						colorIndex: newProps.colorIndex,
						weight: newProps.weight,
						radius:
							newProps.r1 !== undefined
								? Math.abs(newProps.r1)
								: validRadius,
						common,
					});
				}
			} else if (lastProps.c2 && newProps.c1) {
				// end of line
				if (types === "all" || types === "connects") {
					parts.push({
						id: newProps.id,
						x: newProps.x1,
						y: newProps.y1,
						colorIndex: newProps.colorIndex,
						weight: newProps.weight,
					});
				}
			} else if (lastProps.c1 && newProps.c2) {
				// end of line
				if (types === "all" || types === "connects") {
					parts.push({
						id: newProps.id,
						x: newProps.x2,
						y: newProps.y2,
						colorIndex: newProps.colorIndex,
						weight: newProps.weight,
					});
				}
			}
		}

		lastProps = newProps;
	});

	return parts;
};

export const getValidLine = (line: LineProps) => {
	const lineHelper = { ...line };
	if (lineHelper.x1 > lineHelper.x2) {
		const x1 = lineHelper.x1;
		lineHelper.x1 = lineHelper.x2;
		lineHelper.x2 = x1;
	}

	if (lineHelper.y1 > lineHelper.y2) {
		const y1 = lineHelper.y1;
		lineHelper.y1 = lineHelper.y2;
		lineHelper.y2 = y1;
	}

	return lineHelper;
};

export const getLineLength = (line: SVGLineElement) => {
	const x1 = line.x1.baseVal.value;
	const x2 = line.x2.baseVal.value;
	const y1 = line.y1.baseVal.value;
	const y2 = line.y2.baseVal.value;
	const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	return lineLength;
};
