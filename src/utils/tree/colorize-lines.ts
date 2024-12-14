import {
	type Stage,
	type Settings,
	type TreeState,
} from "../../store/main/reducers";
import { type LinePosition } from "../../types/graphic-types";

export const colorizeLines = (
	lines: Required<Stage>["lines"],
	settings: Settings,
	_type: TreeState["type"]
) => {
	const colors = settings.lineColors;

	const colorIndicesByY: Record<number, number> = {};
	let lastColorIndex = 0;

	const flatLines = Object.values(lines ?? {})
		.map((childLines) => Object.values(childLines ?? {}))
		.flat()
		.toSorted((a, b) => (a[0]?.y ?? 0) - (b[0]?.y ?? 0));

	flatLines.forEach((line) => {
		let prevPoint: LinePosition | undefined;
		let longestHorizontal: [LinePosition, LinePosition] | undefined;

		if (line[0].common) {
			return;
		}

		line.forEach((point) => {
			if (point.x === prevPoint?.x) {
				prevPoint = point;
				return;
			}

			if (
				prevPoint &&
				(!longestHorizontal ||
					point.x - prevPoint.x >
						longestHorizontal[1].x - longestHorizontal[0].x)
			) {
				longestHorizontal = [prevPoint, point];
			}

			prevPoint = point;
		});

		if (longestHorizontal) {
			if (lastColorIndex >= colors.length) {
				lastColorIndex = 0;
			}
			colorIndicesByY[longestHorizontal[0].y] =
				colorIndicesByY[longestHorizontal[0].y] || lastColorIndex++;

			line.forEach((point, pointIndex) => {
				line[pointIndex].colorIndex =
					colorIndicesByY[longestHorizontal![0].y];
			});
		}
	});
};
