import {
	type DropdownItemsWithChildren,
	type DropdownItems,
} from "../components/dropdown/dropdown";
import {
	type PedigreeCollapse,
	type NameOrder,
	type Placeholders,
	type TreeType,
	type ArtConfig,
} from "../store/main/reducers";

import { TbChartDonutFilled } from "react-icons/tb";
import { GiFamilyTree, GiFruitTree } from "react-icons/gi";
import React from "react";

export const FAKE_USER = {
	userId: "___TEST___USER___",
	email: "test@test.hu",
	password: "123456",
};

export const MAX_GEN_FOR_SLICE_DRAWING = 10;

export const HORIZONTAL_MARGIN_MULTIPLIER = 1.25;
export const VERTICAL_MARGIN_MULTIPLIER = 1.5;
export const WIDTH = 240;
export const HEIGHT = 60;
export const DIM_DIFF = 12;

export const getDimDiff = (
	lineSpace: number,
	type: "manual" | "tree" | "genealogy",
	vertical = false
) => {
	return (
		lineSpace *
		(type !== "manual"
			? type === "tree" && !vertical
				? AUTO_DIM_DIFF_MULTIPLIER * 2
				: AUTO_DIM_DIFF_MULTIPLIER
			: 1)
	);
};

export const AUTO_VERTICAL_MARGIN_MULTIPLIER = 6; // 2.5 * 6; // = 15

export const LINE_WEIGHT = 2;
export const LINE_BORDER = 3;
export const LINE_CORNER_RADIUS = 20;
export const MAX_DIM_CHECK = 100;
export const AUTO_DIM_DIFF_MULTIPLIER = 1.6666666666666667; // 12 * 1.6666666666666667; // = 20

export const COLORED_LINES = true;

export const PDF_SCALE = 0.5;
export const PDF_MAX_WIDTH = 14400;
export const PDF_LINE_WEIGHT = 1;
export const PDF_LINE_BORDER = 1.5;
export const PDF_SPLIT_INTO_PAGES = true;
export const PDF_PRINT_MARK = 14;

export const PDF_LINE_SCALE = PDF_LINE_WEIGHT / LINE_WEIGHT;

export const FAN_PLACEHOLDERS = "show";
export const FAN_PEDIGREE_COLLAPSE = "show";
export const FAN_HOME_DIAMETER = 100;
export const FAN_THIN_WEIGHT = 50;
export const FAN_WIDE_WEIGHT = 100;
export const FAN_CHILDREN_WEIGHT = 75;
export const FAN_TOTAL_ANGLE = 360;

export const ART_CONFIGS: Record<`/images/${string}.svg`, ArtConfig> = {
	"/images/famtree-1.svg": {
		fontFamily: "Times New Roman",
		collapsePlaceholder: "show",
		pedigreeCollapse: "show",
		homeRectangle: [1746, 2300, 1000, 160],
		firstSliceWeight: 160,
		thinSliceWeight: 200,
		wideSliceWeight: 220,
		totalAngle: 180,
		size: [3492, 2556],
		start: [1746, 1880],
		maxGeneration: 5,
		thinCount: 3,
		midGap: 80,
		arcGap: [73, 100, 80, 53],
		sliceGap: 0.2, // percent of degree
		fontColor: "#333333",
	},
};

export const PEDIGREE_COLLAPSES: Array<{
	label: string;
	value: PedigreeCollapse;
}> = [
	{
		value: "show",
		label: "Show",
	},
	{
		value: "grey",
		label: "Turn grey",
	},
	{
		value: "original-grey",
		label: "Turn original color half-grey",
	},
	{
		value: "hide",
		label: "Hide",
	},
];

export const PLACEHOLDERS: Array<{
	label: string;
	value: Placeholders;
}> = [
	{
		value: "show",
		label: "Show",
	},
	{
		value: "hide",
		label: "Hide",
	},
	// {
	// 	value: "hide-collapsed",
	// 	label: "Hide only collapsed pedigree",
	// },
];

export const NAME_ORDERS: Array<{
	label: string;
	value: NameOrder;
}> = [
	{
		value: "first-last",
		label: "Given name, Surname",
	},
	{
		value: "last-first",
		label: "Surname, Given name",
	},
];

export type DownloadType =
	| "media"
	| "all"
	| "registry"
	| "oged"
	| "fged"
	| "ged"
	| "ojson"
	| "fjson"
	| "json"
	| "pdf"
	| "fpdf"
	| "ppdf"
	| "png"
	| "jpg"
	| "fpng"
	| "ppng"
	| "fjpg"
	| "pjpg"
	| "svg"
	| "fsvg"
	| "psvg"
	| "book"
	| "obook"
	| "fbook"
	| "ggbook"
	| "gtbook"
	| "obook"
	| "fbook"
	| "ggbook"
	| "gtbook";

export type DownloadChildrenType = `${DownloadType}-${string}`;

export const PDF_DOWNLOADS: Array<DropdownItems<DownloadChildrenType>> = [
	{
		value: "pdf-A4",
		label: "A4",
		settings: {
			cropBox: "Include cropbox",
			pageNumbers:
				"Include page numbers on backside (Double sided print suggested)",
			rowIdentifierPage: "Include end of rows identifier page",
		},
		child: true,
	},
	{
		value: "pdf-A3",
		label: "A3",
		child: true,
	},
	{
		value: "pdf-A2",
		label: "A2",
		child: true,
	},
];

export const getBookDownloads: (
	type: "book" | "fbook" | "obook" | "ggbook" | "gtbook"
) => Array<DropdownItems<DownloadChildrenType>> = (type) => [
	{
		value: `${type}-pdf`,
		label: "PDF",
		child: true,
	},
	{
		value: `${type}-docx`,
		label: "DOCX",
		child: true,
	},
];

export const DOWNLOADS: Array<
	DropdownItemsWithChildren<DownloadType, DownloadChildrenType>
> = [
	{
		label: "Visualised tree",
		isDivider: true,
	},
	{
		value: "pdf",
		label: "PDF",
		children: PDF_DOWNLOADS,
	},
	{
		value: "svg",
		label: "SVG",
	},
	{
		value: "png",
		label: "PNG",
	},
	{
		value: "jpg",
		label: "JPG",
	},
	{
		value: "ged",
		label: "GEDCOM",
	},
	{
		value: "json",
		label: "JSON",
	},
	{
		label: "Visualised fan chart",
		isDivider: true,
	},
	{
		value: "fpdf",
		label: "PDF",
	},
	{
		value: "fsvg",
		label: "SVG",
	},
	{
		value: "fpng",
		label: "PNG",
	},
	{
		value: "fjpg",
		label: "JPG",
	},
	{
		value: "fged",
		label: "GEDCOM",
	},
	{
		value: "fjson",
		label: "JSON",
	},
	{
		label: "Visualised poster",
		isDivider: true,
	},
	{
		value: "ppdf",
		label: "PDF",
	},
	{
		value: "psvg",
		label: "SVG",
	},
	{
		value: "ppng",
		label: "PNG",
	},
	{
		value: "pjpg",
		label: "JPG",
	},
	{
		label: "Book",
		isDivider: true,
	},
	{
		value: "book",
		label: "Visualised tree",
		children: getBookDownloads("book"),
	},
	{
		value: "fbook",
		label: "Visualised fan chart",
		children: getBookDownloads("fbook"),
	},
	{
		value: "ggbook",
		label: "generateGenealogy",
		children: getBookDownloads("ggbook"),
	},
	{
		value: "gtbook",
		label: "generateTree",
		children: getBookDownloads("gtbook"),
	},
	{
		label: "Source",
		isDivider: true,
	},
	{
		value: "obook",
		label: "Entire Book",
		children: getBookDownloads("obook"),
	},
	{
		value: "oged",
		label: "Entire GEDCOM",
	},
	{
		value: "ojson",
		label: "Entire JSON",
	},
	{
		value: "media",
		label: "Pictures",
	},
	{
		value: "registry",
		label: "Registry",
	},
];
export const STAGE_FORMAT: Array<DropdownItems<TreeType>> = [
	{
		value: "tree",
		label: "Tree",
		icon: <GiFamilyTree className="icon" />,
	},
	{
		value: "fanChart",
		label: "Fan chart",
		icon: <TbChartDonutFilled className="icon" />,
	},
	{
		value: "treeArt",
		label: "Poster",
		icon: <GiFruitTree className="icon" />,
	},
];

export const FILE_NAMES_EXT: Partial<
	Record<DownloadType, `-${"original" | "fan" | "genealogy" | "tree"}`>
> = {
	oged: "-original",
	fged: "-fan",
	ojson: "-original",
	fjson: "-fan",
	fpdf: "-fan",
	fpng: "-fan",
	fjpg: "-fan",
	fsvg: "-fan",
	obook: "-original",
	fbook: "-fan",
	ggbook: "-genealogy",
	gtbook: "-tree",
};

export const REGISTRY_ALLOWED = ["envagyok@idavid.hu"];

export const bookType = (type: DownloadType) => {
	return type.endsWith("book");
};
