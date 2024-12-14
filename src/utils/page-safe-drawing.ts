// Note: this file contains a lot of code duplication.
// This is not an accident. I know it's worse to maintain but it is more logical
// to have calulation ways in code.

import { type jsPDF as JsToPdf } from "jspdf";
import { PDF_SPLIT_INTO_PAGES } from "../constants/constants";
import { orderLineEnds } from "./line";

type Lines = Parameters<JsToPdf["lines"]>;
type Text = Parameters<JsToPdf["text"]>;

interface PagePositionReturnType {
	left: number;
	top: number;
	origLeft: number;
	origTop: number;
	row: number;
	col: number;
	page: number;
}

type Fillers =
	| Array<{
			x1: number;
			x2: number;
	  }>
	| Array<{
			y1: number;
			y2: number;
	  }>;

interface BaseTouchNextPageReturnType {
	coord1Detail: PagePositionReturnType;
	coord2Detail: PagePositionReturnType;
	fillColor: string;
	drawColor: string;
	lineWidth: number;
	font: string;
	fontSize: number;
}

type SingleTouchTouchNextPageReturnType = {
	direction: "horizontal" | "vertical";
	fillers?: Fillers;
} & BaseTouchNextPageReturnType;

type DoubleTouchNextPageReturnType = {
	direction: "both";
	coord3Detail: PagePositionReturnType;
	coord4Detail: PagePositionReturnType;
	fillers?: Fillers;
} & Omit<
	BaseTouchNextPageReturnType,
	"coord1DetailFixed" | "coord2DetailFixed"
>;

type NoTouchNextPageReturnType = {
	direction: null;
} & Omit<
	BaseTouchNextPageReturnType,
	"coord1DetailFixed" | "coord2DetailFixed"
>;

type TouchNextPageReturnType =
	| SingleTouchTouchNextPageReturnType
	| DoubleTouchNextPageReturnType
	| NoTouchNextPageReturnType;
export class PageSafeDrawer {
	doc: JsToPdf;
	width: number;
	height: number;
	cropbox: number;
	rows: number;
	cols: number;

	constructor(
		doc: JsToPdf,
		width: number,
		height: number,
		cropbox: number,
		rows: number,
		cols: number
	) {
		this.doc = doc;
		this.width = width;
		this.height = height;
		this.cropbox = cropbox;
		this.rows = rows;
		this.cols = cols;
	}

	private readonly getPagePosition = ({
		left,
		top,
		directCol,
		directRow,
		lastLeft,
		lastTop,
		noCrop,
	}: {
		left: number;
		top: number;
		directCol?: number;
		directRow?: number;
		lastLeft?: boolean;
		lastTop?: boolean;
		noCrop?: boolean;
	}): PagePositionReturnType => {
		const diffLeft = noCrop ? 0 : lastLeft ? this.cropbox : -this.cropbox;
		const diffTop = noCrop ? 0 : lastTop ? this.cropbox : -this.cropbox;
		const col =
			directCol !== undefined
				? directCol
				: Math.ceil((left + diffLeft * 2) / this.width);
		const row =
			directRow !== undefined
				? directRow
				: Math.ceil((top + diffTop * 2) / this.height);
		const page = (row - 1) * this.cols + col;

		return {
			left: left - (col - 1) * this.width,
			top: top - (row - 1) * this.height,
			origLeft: left,
			origTop: top,
			row,
			col,
			page,
		};
	};

	private readonly isTouchNextPage = (
		{
			x1,
			y1,
			x2,
			y2,
		}: {
			x1: number;
			x2: number;
			y1: number;
			y2: number;
		},
		noCrop?: boolean
	): TouchNextPageReturnType => {
		const coord1Detail = this.getPagePosition({
			left: x1,
			top: y1,
			noCrop,
		}); // top left
		const coord2Detail = this.getPagePosition({
			left: x2,
			top: y2,
			lastLeft: true,
			lastTop: true,
			noCrop,
		}); // bottom right

		const fillColor = this.doc.getFillColor();
		const drawColor = this.doc.getDrawColor();
		const lineWidth = this.doc.getLineWidth();
		const fontSize = this.doc.getFontSize();
		const font = this.doc.getFont().fontName;

		if (
			coord1Detail.row === coord2Detail.row &&
			coord1Detail.col !== coord2Detail.col
		) {
			const diff = Math.abs(coord1Detail.col - coord2Detail.col) - 1;
			const fillers = diff
				? new Array(diff).fill(undefined).map((_) => {
						return {
							x1: -10,
							x2: this.width + 10 + this.cropbox * 2,
						};
				  })
				: [];
			if (coord2Detail.col > coord1Detail.col) {
				return {
					direction: "horizontal",
					coord1Detail,
					coord2Detail,
					fillColor,
					drawColor,
					lineWidth,
					fillers,
					font,
					fontSize,
				};
			}
			return {
				direction: "horizontal",
				coord1Detail,
				coord2Detail,
				fillColor,
				drawColor,
				lineWidth,
				fillers,
				font,
				fontSize,
			};
		} else if (
			coord1Detail.col === coord2Detail.col &&
			coord1Detail.row !== coord2Detail.row
		) {
			const diff = Math.abs(coord1Detail.row - coord2Detail.row) - 1;
			const fillers = diff
				? new Array(diff).fill(undefined).map((_) => {
						return {
							y1: -10,
							y2: this.height + 10 + this.cropbox * 2,
						};
				  })
				: [];
			if (coord2Detail.row > coord1Detail.row) {
				return {
					direction: "vertical",
					coord1Detail,
					coord2Detail,
					fillColor,
					drawColor,
					lineWidth,
					fillers,
					font,
					fontSize,
				};
			}
			return {
				direction: "vertical",
				coord1Detail,
				coord2Detail,
				fillColor,
				drawColor,
				lineWidth,
				fillers,
				font,
				fontSize,
			};
		} else if (
			coord1Detail.col !== coord2Detail.col &&
			coord1Detail.row !== coord2Detail.row
		) {
			const coord3Detail = this.getPagePosition({
				left: x2,
				top: y1,
				lastLeft: true,
				noCrop,
			}); // top right
			const coord4Detail = this.getPagePosition({
				left: x1,
				top: y2,
				lastTop: true,
				noCrop,
			}); // bottom left

			const isLineHorizontal = y1 === y2;

			const diff =
				(isLineHorizontal
					? Math.abs(coord1Detail.col - coord2Detail.col)
					: Math.abs(coord1Detail.row - coord2Detail.row)) - 1;
			const fillers = diff
				? (new Array(diff).fill(undefined).map((_) => {
						if (isLineHorizontal) {
							return {
								x1: -10,
								x2: this.width + 10 + this.cropbox * 2,
							};
						} else {
							return {
								y1: -10,
								y2: this.height + 10 + this.cropbox * 2,
							};
						}
				  }) as Fillers)
				: [];

			return {
				direction: "both",
				coord1Detail,
				coord2Detail,
				coord3Detail,
				coord4Detail,
				fillers,
				fillColor,
				drawColor,
				lineWidth,
				font,
				fontSize,
			};
		}

		return {
			direction: null,
			coord1Detail,
			coord2Detail,
			fillColor,
			drawColor,
			lineWidth,
			font,
			fontSize,
		};
	};

	private readonly fixPage = (
		page: number,
		lineWidth: number,
		drawColor: string,
		fillColor: string,
		font: string,
		fontSize: number
	) => {
		this.doc.setPage(page);
		this.doc.setLineWidth(lineWidth);
		this.doc.setDrawColor(drawColor);
		this.doc.setFillColor(fillColor);
		this.doc.setFont(font);
		this.doc.setFontSize(fontSize);
	};

	text: (
		text: string,
		x: Text[1],
		y: Text[2],
		options?: Text[3],
		transform?: Text[4]
	) => ReturnType<JsToPdf["text"]> = (text, x, y, options, transform) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			return this.doc.text(text, x, y, options, transform);
		}

		const textDimension = this.doc.getTextDimensions(text);
		const w = textDimension.w;
		const h = textDimension.h;

		const touch = this.isTouchNextPage({
			x1: x,
			x2: x + w,
			y1: y - h,
			y2: y,
		});
		const { coord1Detail, coord2Detail, direction } = touch;

		let objects: Parameters<typeof this.draw<"text">>[1] = [
			[
				coord1Detail.page,
				text,
				coord1Detail.left + this.cropbox,
				coord1Detail.top + h + this.cropbox,
				options,
				transform,
			],
		];

		if (direction === "both") {
			const { coord3Detail, coord4Detail } = touch;
			objects = [
				[
					coord1Detail.page,
					text,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + h + this.cropbox,
					options,
					transform,
				],
				[
					coord3Detail.page,
					text,
					coord3Detail.left - w + this.cropbox,
					coord3Detail.top + h + this.cropbox,
					options,
					transform,
				],
				[
					coord4Detail.page,
					text,
					coord4Detail.left + this.cropbox,
					coord4Detail.top + this.cropbox,
					options,
					transform,
				],
				[
					coord2Detail.page,
					text,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top + this.cropbox,
					options,
					transform,
				],
			];
		} else if (direction === "vertical") {
			objects = [
				[
					coord1Detail.page,
					text,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + h + this.cropbox,
					options,
					transform,
				],
				[
					coord2Detail.page,
					text,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top + this.cropbox,
					options,
					transform,
				],
			];
		} else if (direction === "horizontal") {
			objects = [
				[
					coord1Detail.page,
					text,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + h + this.cropbox,
					options,
					transform,
				],
				[
					coord2Detail.page,
					text,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top + this.cropbox,
					options,
					transform,
				],
			];
		}
		return this.draw("text", objects, touch);
	};

	circle: JsToPdf["circle"] = (x, y, r, style) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			return this.doc.circle(x, y, r, style);
		}

		const touch = this.isTouchNextPage({
			x1: x - r,
			x2: x + r,
			y1: y - r,
			y2: y + r,
		});
		const { coord1Detail, coord2Detail, direction } = touch;

		let objects: Parameters<typeof this.draw<"circle">>[1] = [
			[
				coord1Detail.page,
				coord1Detail.left + r + this.cropbox,
				coord1Detail.top + r + this.cropbox,
				r,
				style,
			],
		];

		if (direction === "both") {
			const { coord3Detail, coord4Detail } = touch;
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + r + this.cropbox,
					coord1Detail.top + r + this.cropbox,
					r,
					style,
				],
				[
					coord3Detail.page,
					coord3Detail.left - r + this.cropbox,
					coord3Detail.top + r + this.cropbox,
					r,
					style,
				],
				[
					coord4Detail.page,
					coord4Detail.left + r + this.cropbox,
					coord4Detail.top - r + this.cropbox,
					r,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - r + this.cropbox,
					coord2Detail.top - r + this.cropbox,
					r,
					style,
				],
			];
		} else if (direction === "vertical") {
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + r + this.cropbox,
					coord1Detail.top + r + this.cropbox,
					r,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - r + this.cropbox,
					coord2Detail.top - r + this.cropbox,
					r,
					style,
				],
			];
		} else if (direction === "horizontal") {
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + r + this.cropbox,
					coord1Detail.top + r + this.cropbox,
					r,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - r + this.cropbox,
					coord2Detail.top - r + this.cropbox,
					r,
					style,
				],
			];
		}

		return this.draw("circle", objects, touch);
	};

	link: JsToPdf["link"] = (x, y, w, h, options) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			this.doc.link(x, y, w, h, options);
		} else {
			const touch = this.isTouchNextPage({
				x1: x,
				x2: x + w,
				y1: y,
				y2: y + h,
			});
			const { coord1Detail, coord2Detail, direction } = touch;

			let objects: Parameters<typeof this.draw<"link">>[1] = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					options,
				],
			];

			if (direction === "both") {
				const { coord3Detail, coord4Detail } = touch;
				objects = [
					[
						coord1Detail.page,
						coord1Detail.left + this.cropbox,
						coord1Detail.top + this.cropbox,
						w,
						h,
						options,
					],
					[
						coord3Detail.page,
						coord3Detail.left - w + this.cropbox,
						coord3Detail.top + this.cropbox,
						w,
						h,
						options,
					],
					[
						coord4Detail.page,
						coord4Detail.left + this.cropbox,
						coord4Detail.top - h + this.cropbox,
						w,
						h,
						options,
					],
					[
						coord2Detail.page,
						coord2Detail.left - w + this.cropbox,
						coord2Detail.top - h + this.cropbox,
						w,
						h,
						options,
					],
				];
			} else if (direction === "vertical") {
				objects = [
					[
						coord1Detail.page,
						coord1Detail.left + this.cropbox,
						coord1Detail.top + this.cropbox,
						w,
						h,
						options,
					],
					[
						coord2Detail.page,
						coord2Detail.left - w + this.cropbox,
						coord2Detail.top - h + this.cropbox,
						w,
						h,
						options,
					],
				];
			} else if (direction === "horizontal") {
				objects = [
					[
						coord1Detail.page,
						coord1Detail.left + this.cropbox,
						coord1Detail.top + this.cropbox,
						w,
						h,
						options,
					],
					[
						coord2Detail.page,
						coord2Detail.left - w + this.cropbox,
						coord2Detail.top - h + this.cropbox,
						w,
						h,
						options,
					],
				];
			}

			this.draw("link", objects, touch);
		}
	};

	rect: JsToPdf["rect"] = (x, y, w, h, style) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			return this.doc.rect(x, y, w, h, style);
		}

		const touch = this.isTouchNextPage({
			x1: x,
			x2: x + w,
			y1: y,
			y2: y + h,
		});
		const { coord1Detail, coord2Detail, direction } = touch;

		let objects: Parameters<typeof this.draw<"rect">>[1] = [
			[
				coord1Detail.page,
				coord1Detail.left + this.cropbox,
				coord1Detail.top + this.cropbox,
				w,
				h,
				style,
			],
		];

		if (direction === "both") {
			const { coord3Detail, coord4Detail } = touch;
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					style,
				],
				[
					coord3Detail.page,
					coord3Detail.left - w + this.cropbox,
					coord3Detail.top + this.cropbox,
					w,
					h,
					style,
				],
				[
					coord4Detail.page,
					coord4Detail.left + this.cropbox,
					coord4Detail.top - h + this.cropbox,
					w,
					h,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top - h + this.cropbox,
					w,
					h,
					style,
				],
			];
		} else if (direction === "vertical") {
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top - h + this.cropbox,
					w,
					h,
					style,
				],
			];
		} else if (direction === "horizontal") {
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top - h + this.cropbox,
					w,
					h,
					style,
				],
			];
		}

		return this.draw("rect", objects, touch);
	};

	roundedRect: JsToPdf["roundedRect"] = (x, y, w, h, rx, ry, style) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			return this.doc.roundedRect(x, y, w, h, rx, ry, style);
		}

		const touch = this.isTouchNextPage({
			x1: x,
			x2: x + w,
			y1: y,
			y2: y + h,
		});
		const { coord1Detail, coord2Detail, direction } = touch;

		let objects: Parameters<typeof this.draw<"roundedRect">>[1] = [
			[
				coord1Detail.page,
				coord1Detail.left + this.cropbox,
				coord1Detail.top + this.cropbox,
				w,
				h,
				rx,
				ry,
				style,
			],
		];

		if (direction === "both") {
			const { coord3Detail, coord4Detail } = touch;
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
				[
					coord3Detail.page,
					coord3Detail.left - w + this.cropbox,
					coord3Detail.top + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
				[
					coord4Detail.page,
					coord4Detail.left + this.cropbox,
					coord4Detail.top - h + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top - h + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
			];
		} else if (direction === "vertical") {
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top - h + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
			];
		} else if (direction === "horizontal") {
			objects = [
				[
					coord1Detail.page,
					coord1Detail.left + this.cropbox,
					coord1Detail.top + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
				[
					coord2Detail.page,
					coord2Detail.left - w + this.cropbox,
					coord2Detail.top - h + this.cropbox,
					w,
					h,
					rx,
					ry,
					style,
				],
			];
		}

		return this.draw("roundedRect", objects, touch);
	};

	line: JsToPdf["line"] = (origX1, origY1, origX2, origY2, style) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			return this.doc.line(origX1, origY1, origX2, origY1, style);
		}

		const { x1, x2, y1, y2 } = orderLineEnds({
			x1: origX1,
			y1: origY1,
			x2: origX2,
			y2: origY2,
		});

		const isLineHorizontal = y1 === y2;

		const touch = this.isTouchNextPage({ x1, x2, y1, y2 });
		const { coord1Detail, coord2Detail, direction } = touch;

		let objects: Parameters<typeof this.draw<"line">>[1] = [
			[
				coord1Detail.page,
				coord1Detail.left + this.cropbox,
				coord1Detail.top + this.cropbox,
				coord2Detail.left + this.cropbox,
				coord2Detail.top + this.cropbox,
				style,
			],
		];

		if (direction) {
			const { fillers } = touch;

			if (direction === "vertical" || direction === "horizontal") {
				const fillerParams = (fillers ?? []).map((filler) => {
					if ("x1" in filler) {
						const toRight = coord1Detail.col < coord2Detail.col;
						const nextCol = coord1Detail.col + (toRight ? 1 : -1);
						const page =
							(coord1Detail.row - 1) * this.cols + nextCol;

						return [
							page,
							filler.x1,
							coord1Detail.top + this.cropbox,
							filler.x2,
							coord1Detail.top + this.cropbox,
							style,
						];
					}

					const toBottom = coord1Detail.row < coord2Detail.row;
					const nextRow = coord1Detail.row + (toBottom ? 1 : -1);
					const page = (nextRow - 1) * this.cols + coord1Detail.col;

					return [
						page,
						coord1Detail.left + this.cropbox,
						filler.y1,
						coord1Detail.left + this.cropbox,
						filler.y2,
						style,
					];
				}) as Array<
					[number, number, number, number, number, (string | null)?]
				>;
				if (direction === "horizontal") {
					if (isLineHorizontal) {
						const diff = x2 - x1;
						objects = [
							[
								coord1Detail.page,
								coord1Detail.left + this.cropbox,
								coord1Detail.top + this.cropbox,
								coord1Detail.left + this.cropbox + diff,
								coord1Detail.top + this.cropbox,
								style,
							],
							...fillerParams,
							[
								coord2Detail.page,
								coord2Detail.left + this.cropbox - diff,
								coord2Detail.top + this.cropbox,
								coord2Detail.left + this.cropbox,
								coord2Detail.top + this.cropbox,
								style,
							],
						];
					} else {
						const diff = y2 - y1;

						objects = [
							[
								coord1Detail.page,
								coord1Detail.left + this.cropbox,
								coord1Detail.top + this.cropbox,
								coord1Detail.left + this.cropbox,
								coord1Detail.top + this.cropbox + diff,
								style,
							],
							...fillerParams,
							[
								coord2Detail.page,
								coord2Detail.left + this.cropbox,
								coord2Detail.top + this.cropbox - diff,
								coord2Detail.left + this.cropbox,
								coord2Detail.top + this.cropbox,
								style,
							],
						];
					}
				} else {
					if (isLineHorizontal) {
						const diff = x2 - x1;
						objects = [
							[
								coord1Detail.page,
								coord1Detail.left + this.cropbox,
								coord1Detail.top + this.cropbox,
								coord1Detail.left + this.cropbox + diff,
								coord1Detail.top + this.cropbox,
								style,
							],
							...fillerParams,
							[
								coord2Detail.page,
								coord2Detail.left + this.cropbox - diff,
								coord2Detail.top + this.cropbox,
								coord2Detail.left + this.cropbox,
								coord2Detail.top + this.cropbox,
								style,
							],
						];
					} else {
						const diff = y2 - y1;
						objects = [
							[
								coord1Detail.page,
								coord1Detail.left + this.cropbox,
								coord1Detail.top + this.cropbox,
								coord1Detail.left + this.cropbox,
								coord1Detail.top + this.cropbox + diff,
								style,
							],
							...fillerParams,
							[
								coord2Detail.page,
								coord2Detail.left + this.cropbox,
								coord2Detail.top + this.cropbox - diff,
								coord2Detail.left + this.cropbox,
								coord2Detail.top + this.cropbox,
								style,
							],
						];
					}
				}
			} else if (direction === "both") {
				const { coord3Detail, coord4Detail } = touch;

				const fillerParams = (fillers ?? [])
					.map((filler) => {
						if ("x1" in filler) {
							const toRight = coord1Detail.col < coord2Detail.col;
							const nextCol =
								coord1Detail.col + (toRight ? 1 : -1);
							const prevCol =
								coord2Detail.col + (!toRight ? 1 : -1);
							const page1 =
								(coord1Detail.row - 1) * this.cols + nextCol;
							const page2 =
								(coord2Detail.row - 1) * this.cols + prevCol;

							return [
								[
									page1,
									filler.x1,
									coord1Detail.top + this.cropbox,
									filler.x2,
									coord1Detail.top + this.cropbox,
									style,
								],
								[
									page2,
									filler.x1,
									coord2Detail.top + this.cropbox,
									filler.x2,
									coord2Detail.top + this.cropbox,
									style,
								],
							];
						}

						const toBottom = coord1Detail.row < coord2Detail.row;
						const nextRow = coord1Detail.row + (toBottom ? 1 : -1);
						const prevRow = coord2Detail.row + (!toBottom ? 1 : -1);
						const page1 =
							(nextRow - 1) * this.cols + coord1Detail.col;
						const page2 =
							(prevRow - 1) * this.cols + coord2Detail.col;

						return [
							[
								page1,
								coord1Detail.left + this.cropbox,
								filler.y1,
								coord1Detail.left + this.cropbox,
								filler.y2,
								style,
							],
							[
								page2,
								coord2Detail.left + this.cropbox,
								filler.y1,
								coord2Detail.left + this.cropbox,
								filler.y2,
								style,
							],
						];
					})
					.flat() as Array<
					[number, number, number, number, number, (string | null)?]
				>;

				if (isLineHorizontal) {
					const diff = x2 - x1;
					objects = [
						[
							coord1Detail.page,
							coord1Detail.left + this.cropbox,
							coord1Detail.top + this.cropbox,
							coord1Detail.left + this.cropbox + diff,
							coord1Detail.top + this.cropbox,
							style,
						],
						[
							coord3Detail.page,
							coord3Detail.left + this.cropbox - diff,
							coord3Detail.top + this.cropbox,
							coord3Detail.left + this.cropbox,
							coord3Detail.top + this.cropbox,
							style,
						],
						...fillerParams,
						[
							coord2Detail.page,
							coord2Detail.left + this.cropbox - diff,
							coord2Detail.top + this.cropbox,
							coord2Detail.left + this.cropbox,
							coord2Detail.top + this.cropbox,
							style,
						],
						[
							coord4Detail.page,
							coord4Detail.left + this.cropbox,
							coord4Detail.top + this.cropbox,
							coord4Detail.left + this.cropbox + diff,
							coord4Detail.top + this.cropbox,
							style,
						],
					];
				} else {
					const diff = y2 - y1;
					objects = [
						[
							coord1Detail.page,
							coord1Detail.left + this.cropbox,
							coord1Detail.top + this.cropbox,
							coord1Detail.left + this.cropbox,
							coord1Detail.top + this.cropbox + diff,
							style,
						],
						[
							coord3Detail.page,
							coord3Detail.left + this.cropbox,
							coord3Detail.top + this.cropbox,
							coord3Detail.left + this.cropbox,
							coord3Detail.top + this.cropbox + diff,
							style,
						],
						...fillerParams,
						[
							coord2Detail.page,
							coord2Detail.left + this.cropbox,
							coord2Detail.top + this.cropbox - diff,
							coord2Detail.left + this.cropbox,
							coord2Detail.top + this.cropbox,
							style,
						],
						[
							coord4Detail.page,
							coord4Detail.left + this.cropbox,
							coord4Detail.top + this.cropbox - diff,
							coord4Detail.left + this.cropbox,
							coord4Detail.top + this.cropbox,
							style,
						],
					];
				}
			}
		}

		return this.draw("line", objects, touch);
	};

	lines: (
		lines: [[number, number, number, number, number, number]],
		x: Lines[1],
		y: Lines[2],
		scale: Lines[3],
		style?: Lines[4],
		closed?: Lines[5]
	) => ReturnType<JsToPdf["lines"]> = (lines, x, y, scale, style, closed) => {
		if (!PDF_SPLIT_INTO_PAGES) {
			return this.doc.lines(lines, x, y, scale, style, closed);
		}

		const x1 = lines[0][0];
		const x3 = lines[0][4];
		const y1 = lines[0][1];
		const y3 = lines[0][5];

		const touch = this.isTouchNextPage({
			x1: x + x1,
			x2: x + x3,
			y1: y + y1,
			y2: y + y3,
		});
		const { coord1Detail, coord2Detail, direction } = touch;

		let objects: Parameters<typeof this.draw<"lines">>[1] = [
			[
				coord1Detail.page,
				lines,
				coord1Detail.left - x1 + this.cropbox,
				coord1Detail.top - y1 + this.cropbox,
				scale,
				style,
				closed,
			],
		];

		if (direction === "both") {
			const { coord3Detail, coord4Detail } = touch;
			objects = [
				[
					coord1Detail.page,
					lines,
					coord1Detail.left - x1 + this.cropbox,
					coord1Detail.top - y1 + this.cropbox,
					scale,
					style,
					closed,
				],
				[
					coord3Detail.page,
					lines,
					coord3Detail.left - x3 + this.cropbox,
					coord3Detail.top - y1 + this.cropbox,
					scale,
					style,
					closed,
				],
				[
					coord4Detail.page,
					lines,
					coord4Detail.left - x1 + this.cropbox,
					coord4Detail.top - y3 + this.cropbox,
					scale,
					style,
					closed,
				],
				[
					coord2Detail.page,
					lines,
					coord2Detail.left - x3 + this.cropbox,
					coord2Detail.top - y3 + this.cropbox,
					scale,
					style,
					closed,
				],
			];
		} else if (direction === "vertical") {
			objects = [
				[
					coord1Detail.page,
					lines,
					coord1Detail.left - x1 + this.cropbox,
					coord1Detail.top - y1 + this.cropbox,
					scale,
					style,
					closed,
				],
				[
					coord2Detail.page,
					lines,
					coord2Detail.left - x3 + this.cropbox,
					coord2Detail.top - y3 + this.cropbox,
					scale,
					style,
					closed,
				],
			];
		} else if (direction === "horizontal") {
			objects = [
				[
					coord1Detail.page,
					lines,
					coord1Detail.left - x1 + this.cropbox,
					coord1Detail.top - y1 + this.cropbox,
					scale,
					style,
					closed,
				],
				[
					coord2Detail.page,
					lines,
					coord2Detail.left - x3 + this.cropbox,
					coord2Detail.top - y3 + this.cropbox,
					scale,
					style,
					closed,
				],
			];
		}

		return this.draw("lines", objects, touch);
	};

	draw = <
		T extends
			| "line"
			| "lines"
			| "rect"
			| "roundedRect"
			| "circle"
			| "text"
			| "link",
	>(
		method: T,
		params: Array<[number, ...Parameters<JsToPdf[T]>]>,
		touch: ReturnType<typeof this.isTouchNextPage>
	) => {
		const currentPage = this.doc.getCurrentPageInfo().pageNumber;

		params.forEach(([page, ...param]) => {
			this.fixPage(
				page,
				touch.lineWidth,
				touch.drawColor,
				touch.fillColor,
				touch.font,
				touch.fontSize
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.doc[method] as any)(...param);
		});

		return this.doc.setPage(currentPage);
	};
}
