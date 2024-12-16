import { createSlice } from "@reduxjs/toolkit";
import * as mainActions from "./actions";
import { type IndiKey } from "../../types/types";
import {
	type Size,
	type Position,
	type LinePosition,
	type GenderColor,
} from "../../types/graphic-types";
import { type BaseOpenedPanels } from "../../components/accordion/base-accordion";
import {
	HEIGHT,
	HORIZONTAL_MARGIN_MULTIPLIER,
	VERTICAL_MARGIN_MULTIPLIER,
	WIDTH,
	DIM_DIFF,
	LINE_CORNER_RADIUS,
	PDF_SCALE,
	FAN_HOME_DIAMETER,
	FAN_THIN_WEIGHT,
	FAN_WIDE_WEIGHT,
	FAN_CHILDREN_WEIGHT,
	FAN_TOTAL_ANGLE,
	FAN_PEDIGREE_COLLAPSE,
	FAN_PLACEHOLDERS,
} from "../../constants/constants";
import { type Color } from "../../types/colors";
import { FAMILY_COLORS, GENDER_COLORS, LINE_COLORS } from "../../colors";
import { type Theme } from "../../theme";
import { type Language } from "../../translation/i18n";

export interface IndiDimensions {
	position: Position;
	size: Size;
	gen?: number;
	line?: "normal" | "compact"; // default compact
}
export type IndiDimensionDictionary<T extends object = object> = Record<
	`@I${number}@`,
	IndiDimensions & T
>;

export type DimensionsByGen = Record<number, IndiDimensionDictionary>;

export type Lines = Record<IndiKey, LinePosition[]>;
export interface Stage {
	x: number;
	y: number;
	scale: number;
	lines?: Record<IndiKey, Lines>;
	indis?: Record<IndiKey, IndiDimensions>;
}

export interface StageIndi {
	position: Position;
	name: string;
	years: string;
}

export type StageHistoryItem =
	| {
			id?: IndiKey;
			type: "add" | "remove";
			position: Position;
			size: Size;
			time: number;
	  }
	| {
			type: "interaction";
			position: Position;
			scale: number;
			time: number;
	  };

export type AccordionId = "pinned" | "selected" | "searched" | "main";
export type Indis = Record<IndiKey, StageIndi>;
export type TreeType = "fanChart" | "tree" | "treeArt";
export type PedigreeCollapse = "hide" | "show" | "grey" | "original-grey";
export type Placeholders = "hide" | "show" | "hide-collapsed";
export type NameOrder = "first-last" | "last-first";

export interface ArtConfig {
	fontFamily: string;
	size: [number, number];
	collapsePlaceholder: Placeholders;
	pedigreeCollapse: PedigreeCollapse;
	homeRectangle: [number, number, number, number];
	start: [number, number];
	firstSliceWeight: number;
	thinSliceWeight: number;
	wideSliceWeight: number;
	totalAngle: number;
	maxGeneration?: number;
	thinCount: number;
	midGap: number;
	arcGap: number | number[];
	sliceGap: number;
	fontColor?: Color;
}

export interface Settings {
	// basic
	nameOrder: NameOrder;
	maxGivennames: number;
	maxSurnames: number;
	showSuffix: boolean;
	showMarriages: boolean;
	showKinship: boolean;
	cloudSync: boolean;
	autoDownload: boolean;
	spaceId?: number;
	poolId?: number;
	pdfScale: number;

	// tree
	individualSize: Size;
	horizontalSpace: number;
	verticalSpace: number;
	lineSpace: number;
	colorizeLines: boolean;
	lineColors: Color[];
	genderColors: GenderColor;
	cornerRounding: number;
	drawDescendants: boolean;
	allowCompact: boolean;

	// fan
	familyColors: Color[];
	thinSliceWeight: number;
	wideSliceWeight: number;
	childrenSliceWeight: number;
	totalAngle: number;
	homeDiameter: number;
	pedigreeCollapse: PedigreeCollapse;
	collapsePlaceholder: Placeholders;

	// additional (this can be customised from anywhere for checkboxes and flags)
	additional?: Record<string, Record<string, boolean | undefined>>;
}

export interface TreeState {
	settings: Settings;
	type: "manual" | "genealogy" | "tree";
	raw?: string;
	stage: Stage;
	fanStage: Stage;
	indis?: Indis;
	selected?: IndiKey;
	selectedForKinship?: IndiKey;
	searched?: string;
	pinned?: string;
	opened: Record<AccordionId, Record<string, BaseOpenedPanels>>;
	scrolled: Record<string, Record<number, number>>;
	searchHistory: Record<string, number>;
	stageHistory: {
		items: StageHistoryItem[];
		pointer: number;
	};
	treeMode: TreeType;
}

export interface State {
	sidebarOpen: boolean;
	clouding?: "normal" | "fullscreen";
	loading?: boolean;
	loadingTime?: number;
	loadingText?: string;
	userId?: string;
	snapshotId?: string;
	rawSnapshotId?: string;
	selectedRaw: string;
	guided?: boolean;
	lang: Language;
	mode: Theme;
	treeState: Record<string, TreeState>;
	logoutState?: Record<string, State>;
}

export const initialOpenedState: BaseOpenedPanels = { 0: true };

export const DEFAULT_TREE_STATE: TreeState = {
	type: "manual",
	stage: {
		x: 0,
		y: 0,
		scale: 1,
		indis: {},
	},
	fanStage: {
		x: 0,
		y: 0,
		scale: 1,
		indis: {},
	},
	opened: {
		main: { default: initialOpenedState },
		selected: { default: initialOpenedState },
		pinned: { default: initialOpenedState },
		searched: { default: initialOpenedState },
	},
	scrolled: {},
	searchHistory: {},
	stageHistory: {
		items: [],
		pointer: 0,
	},
	settings: {
		nameOrder: "first-last",
		individualSize: {
			w: WIDTH,
			h: HEIGHT,
		},
		allowCompact: true,
		maxGivennames: 0,
		maxSurnames: 0,
		horizontalSpace: HORIZONTAL_MARGIN_MULTIPLIER,
		verticalSpace: VERTICAL_MARGIN_MULTIPLIER,
		lineSpace: DIM_DIFF,
		colorizeLines: false,
		lineColors: LINE_COLORS,
		familyColors: FAMILY_COLORS,
		genderColors: GENDER_COLORS,
		cornerRounding: LINE_CORNER_RADIUS,
		showSuffix: true,
		showMarriages: true,
		showKinship: false,
		cloudSync: false,
		autoDownload: false,
		drawDescendants: false,
		pdfScale: PDF_SCALE,
		thinSliceWeight: FAN_THIN_WEIGHT,
		wideSliceWeight: FAN_WIDE_WEIGHT,
		childrenSliceWeight: FAN_CHILDREN_WEIGHT,
		totalAngle: FAN_TOTAL_ANGLE,
		homeDiameter: FAN_HOME_DIAMETER,
		pedigreeCollapse: FAN_PEDIGREE_COLLAPSE,
		collapsePlaceholder: FAN_PLACEHOLDERS,
		additional: {},
	},
	treeMode: "fanChart",
};

export const initialState: State = {
	sidebarOpen: true,
	lang: "hu",
	mode: "dark",
	treeState: {},
	selectedRaw: "",
	logoutState: {},
};

export const mainSlice = createSlice({
	name: "main",
	initialState,
	reducers: mainActions,
});

export const actions = mainSlice.actions;

export default mainSlice.reducer;
