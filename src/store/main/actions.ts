/* eslint-disable max-len */
import type { CaseReducer, PayloadAction } from "@reduxjs/toolkit";
import {
	type StageIndi,
	type Stage,
	type State,
	initialState,
	type StageHistoryItem,
	type AccordionId,
	type IndiDimensions,
	type Settings,
	type TreeType,
	DEFAULT_TREE_STATE,
	type TreeState,
} from "./reducers";
import { type IndiKey } from "../../types/types";
import { type Position, type Size } from "../../types/graphic-types";
import { type TagInputData } from "../../components/search-input/types";
import GedcomTree from "../../utils/parser";
import { getGedcomCache, resetGedcomCache } from "./selectors";
import { type BaseOpenedPanels } from "../../components/accordion/base-accordion";
import { getSearchedConfig } from "../../components/search-input/utils";
import {
	deleteRawStates,
	deleteStates,
	saveRawState,
	saveState,
} from "../../utils/firebase";
import { value, subValue, defaultRaw } from "./utils";
import { type Language } from "../../translation/i18n";
import { setTreeUtil } from "../../utils/tree/set-tree";
import { setLinesUtil } from "../../utils/tree/set-lines";
import { startPositionFixer } from "../../utils/tree/position-fixer";
import { setGenealogyUtil } from "../../utils/tree/set-genealogy";
import saveAs from "file-saver";
import { format } from "date-fns";
import { omit } from "lodash";

export type R<T> = CaseReducer<State, PayloadAction<T>>;
export type RN = CaseReducer<State>;

export const rehydrate: R<
	Partial<
		State & {
			callback?: (
				stage: TreeState["stage"],
				fanStage: TreeState["stage"]
			) => void;
		}
	>
> = (state, action) => {
	// if (!value(state, "settings").cloudSync) {
	// 	return;
	// }

	const newState: State = JSON.parse(
		JSON.stringify({
			...state,
			...omit(action.payload, "treeState", "callback"),
			loading: state.loading,
		})
	);

	Object.entries(action.payload.treeState ?? {}).forEach(
		([key, treeState]) => {
			const id = key === "default" ? "" : key;
			if (!state.treeState[id]?.settings.cloudSync && id) {
				return;
			}

			newState.treeState[id] = {
				...treeState,
				stage: state.treeState[id]?.stage,
				raw: treeState.raw || state.treeState[id]?.raw,
			};
			// if (treeState.type !== "manual") {
			// 	state.treeState[id].stage = {
			// 		...state.treeState[id]?.stage,
			// 	};
			// }
			// treeState.raw = treeState.raw || state.treeState[id]?.raw;
		}
	);

	// newState.treeState[""] = newState.treeState.default ?? DEFAULT_TREE_STATE;
	// delete newState.treeState.default;

	const appliedStage = value(newState, "stage");
	const appliedFanStage = value(newState, "stage");
	action.payload.callback?.(appliedStage, appliedFanStage);

	return newState;
};

export const rehydrateRaw: R<
	Pick<State, "rawSnapshotId"> & { treeState?: Record<string, string> }
> = (state, action) => {
	// if (!value(state, "settings").cloudSync) {
	// 	return;
	// }

	if (action.payload.rawSnapshotId) {
		state.rawSnapshotId = action.payload.rawSnapshotId;
	}

	Object.entries(action.payload.treeState ?? {}).forEach(
		([key, treeState]) => {
			const id = key === "default" ? "" : key;
			if (!state.treeState[id]?.settings.cloudSync && id) {
				return;
			}

			if (state.treeState[id] && treeState !== state.treeState[id].raw) {
				state.treeState[id].raw = treeState;
				treeState && resetGedcomCache(id, GedcomTree.parse(treeState));
			}
		}
	);
};

export const exportTreeStates: RN = (state) => {
	saveAs(
		new Blob([JSON.stringify(state.treeState, null, 2)], {
			type: "application/json",
		}),
		`treevisualiser-state-${format(new Date(), "yyyy-MM-dd")}.json`
	);
};

export const importTreeStates: R<string> = (state, action) => {
	const newTreeState = JSON.parse(action.payload) as State["treeState"];

	state.treeState = { ...state.treeState, ...newTreeState };

	saveState(state);
};

export const removeStates: RN = (state) => {
	deleteStates(state);
	deleteRawStates(state);
};

export const restoreStates: RN = (state) => {
	saveState(state);
	saveRawState(state);
};

export const setUserId: R<string | undefined> = (state, action) => {
	state.userId = action.payload;

	saveState(state);
};

export const logout: RN = (_state) => {
	return initialState;
};

export const setLanguage: R<Language> = (state, action) => {
	state.lang = action.payload;

	saveState(state);
};
export const setGuidded: R<boolean> = (state, action) => {
	state.guided = action.payload;

	saveState(state);
};

export const resetSettings: RN = (state) => {
	value(state, "settings", {
		...DEFAULT_TREE_STATE.settings,
		cloudSync: subValue(state, "settings", "cloudSync"),
	});

	saveState(state);
};

export const setSettings: R<Partial<Settings>> = (state, action) => {
	const currentCloudSync = value(state, "settings").cloudSync;
	value(state, "settings", {
		...DEFAULT_TREE_STATE.settings,
		...value(state, "settings"),
		...action.payload,
	});

	saveState(state);

	if (currentCloudSync !== action.payload.cloudSync) {
		saveRawState(state);
	}
};

export const setAdditionalSettings: R<{
	type: string;
	name: string;
	value?: boolean;
}> = (state, action) => {
	const settings = value(state, "settings");

	if (!settings.additional) {
		settings.additional = {};
	}
	if (!settings.additional[action.payload.type]) {
		settings.additional[action.payload.type] = {};
	}

	settings.additional[action.payload.type][action.payload.name] =
		action.payload.value;

	saveState(state);
};

export const setMode: R<Exclude<State["mode"], undefined>> = (
	state,
	action
) => {
	state.mode = action.payload;

	saveState(state);
};

export const setTreeMode: R<Exclude<TreeType, undefined>> = (state, action) => {
	value(state, "treeMode", action.payload);

	saveState(state);
};

export const setSidebarOpen: R<boolean> = (state, action) => {
	state.sidebarOpen = action.payload;

	saveState(state);
};

export const toggleSidebarOpen: RN = (state) => {
	state.sidebarOpen = !state.sidebarOpen;

	saveState(state);
};

export const setStage: R<Stage> = (state, action) => {
	const newStage = action.payload;

	value(state, "stage", {
		...value(state, "stage"),
		...newStage,
	});

	const stage = value(state, "stage");

	setStageHistoryItem(state, {
		type: "main/setStageHistoryItem",
		payload: {
			type: "interaction",
			position: { x: stage.x, y: stage.y },
			scale: stage.scale,
			time: Date.now(),
		},
	});

	saveState(state);
};

export const setFanStage: R<Stage> = (state, action) => {
	const stage = action.payload;
	value(state, "fanStage", {
		...value(state, "fanStage"),
		...stage,
	});

	saveState(state);
};

export const clearStage: RN = (state) => {
	value(state, "type", "manual");
	value(state, "stage", { ...value(state, "stage"), indis: {}, lines: {} });

	setLines(state, { type: "main/setLines", payload: { reposition: false } });

	saveState(state);
};

export const resetStage: RN = (state) => {
	value(state, "stage", {
		...value(state, "stage"),
		x: DEFAULT_TREE_STATE.stage.x,
		y: DEFAULT_TREE_STATE.stage.y,
		scale: DEFAULT_TREE_STATE.stage.scale,
	});

	saveState(state);
};

export const setIndi: R<{ id: IndiKey; record: StageIndi }> = (
	state,
	action
) => {
	value(state, "indis", {
		...value(state, "indis"),
		[action.payload.id]: action.payload.record,
	});

	saveState(state);
};

export const addRaw: R<{ id: string; raw: string }> = (state, action) => {
	if (state.selectedRaw) {
		state.treeState[state.selectedRaw].raw = action.payload.raw;
	} else {
		state.treeState[action.payload.id] = defaultRaw(state);
		state.treeState[action.payload.id].raw = action.payload.raw;
		state.selectedRaw = action.payload.id;
	}

	const addedRaw = state.treeState[state.selectedRaw]?.raw;
	state.selectedRaw &&
		addedRaw &&
		resetGedcomCache(state.selectedRaw, GedcomTree.parse(addedRaw));

	saveRawState(state);
	saveState(state);
};

export const renameRaw: R<{ id: string; newId: string }> = (state, action) => {
	state.treeState[action.payload.newId] = {
		...state.treeState[action.payload.id],
	};

	delete state.treeState[action.payload.id];
	state.selectedRaw = action.payload.newId;

	saveRawState(state);
	saveState(state);
};

export const deleteRaw: R<string> = (state, action) => {
	delete state.treeState?.[action.payload];

	if (state.selectedRaw === action.payload) {
		state.selectedRaw = "";
	}

	saveRawState(state);
	saveState(state);
};

export const setSelectedRaw: R<string | undefined> = (state, action) => {
	state.selectedRaw = action.payload || "";

	saveState(state);
};

export const setSelected: R<IndiKey | undefined> = (state, action) => {
	value(state, "selected", action.payload);

	if (!action.payload) {
		value(state, "treeMode", "tree");
	}

	saveState(state);
};

export const setSelectedForKinship: R<IndiKey | undefined> = (
	state,
	action
) => {
	value(state, "selectedForKinship", action.payload);

	saveState(state);
};

export const setStagePositionTo: R<{
	id: IndiKey;
	scaled?: boolean;
	viewport: Size;
}> = (state, action) => {
	const { id, scaled = true, viewport } = action.payload;
	const stage = value(state, "stage");
	const indi = stage?.indis?.[id];

	if (!indi) {
		return;
	}

	const centerPosition: Position = {
		x: viewport.w / 2,
		y: viewport.h * 0.75,
	};

	const newPosition: Position = {
		x: centerPosition.x - indi.size.w / 2 - indi.position.x,
		y: centerPosition.y - indi.size.h / 2 - indi.position.y,
	};
	const scaleFactor = scaled ? stage.scale : 1;

	setStage(state, {
		type: "main/setStage",
		payload: {
			...state.treeState[state.selectedRaw].stage,
			x: newPosition.x * scaleFactor,
			y: newPosition.y * scaleFactor,
			scale: scaleFactor,
		},
	});
};

export const setSearched: R<TagInputData[]> = (state, action) => {
	value(state, "searched", getSearchedConfig(action.payload));

	setSearchHistoryItem(state, {
		type: "main/setSearchHistoryItem",
		payload: value(state, "searched"),
	});

	saveState(state);
};

export const setPinned: R<{ id: IndiKey; type: "add" | "remove" }> = (
	state,
	action
) => {
	const current = value(state, "pinned")?.split(",") ?? [];
	const newPinned =
		action.payload.type === "add"
			? current.concat(action.payload.id)
			: current.filter((c) => c !== action.payload.id);
	value(state, "pinned", newPinned.join(","));

	saveState(state);
};

export const setOpened: R<{
	id: AccordionId;
	key: string;
	state: BaseOpenedPanels;
}> = (state, action) => {
	const { id, key, state: payloadState } = action.payload;

	const opened = value(state, "opened");

	if (!opened[id]) {
		opened[id] = {};
	}
	opened[id][key] = payloadState;

	saveState(state);
};

export const setScrolled: R<{ id: string; index: number; scroll: number }> = (
	state,
	action
) => {
	if (!state.selectedRaw) {
		return state;
	}

	const { id, index, scroll } = action.payload;

	const scrolled = value(state, "scrolled");

	if (!scrolled[id]) {
		scrolled[id] = {};
	}
	scrolled[id][index] = scroll;

	saveState(state);
};

export const setLines: R<{ reposition?: boolean }> = (state, action) => {
	const stage = value(state, "stage");
	const { indis = {} } = stage;
	const gedcom = getGedcomCache(state.selectedRaw, value(state, "raw"));
	const selected = value(state, "selected");
	const settings = value(state, "settings");
	const type = value(state, "type");

	let lines = setLinesUtil(indis, settings, type, selected, gedcom);

	if (type !== "manual" || action.payload.reposition) {
		const { lines: fixedLines, indis: fixedIndis } = startPositionFixer(
			stage.indis ?? {},
			lines ?? {},
			settings,
			type,
			selected,
			gedcom
		);

		stage.indis = fixedIndis;
		lines = fixedLines;
	}

	stage.lines = lines;

	saveState(state);
};

export const setIndiOnStage: R<{ id: IndiKey } & IndiDimensions> = (
	state,
	action
) => {
	const stage = value(state, "stage");
	if (!stage.indis) {
		stage.indis = {};
	}

	stage.indis[action.payload.id] = {
		position: action.payload.position,
		size: action.payload.size,
	};

	setLines(state, { type: "main/setLines", payload: { reposition: false } });

	setStageHistoryItem(state, {
		type: "main/setStageHistoryItem",
		payload: {
			id: action.payload.id,
			type: "add",
			position: action.payload.position,
			size: action.payload.size,
			time: Date.now(),
		},
	});

	saveState(state);
};

export const setLoading: R<{ state: boolean; text?: string; time?: number }> = (
	state,
	action
) => {
	state.loading = action.payload.state;
	state.loadingTime = action.payload.time;
	state.loadingText = action.payload.text;
};

export const setTreeRaw: R<{
	indis?: Stage["indis"];
	lines?: Stage["lines"];
}> = (state, action) => {
	value(state, "stage").indis = action.payload.indis;
	value(state, "stage").lines = action.payload.lines;
	value(state, "type", "tree");
};

export const setTree: R<IndiKey> = (state, action) => {
	const settings = value(state, "settings");
	const id = action.payload;
	const gedcom = getGedcomCache(state.selectedRaw, value(state, "raw"));

	const { indis: newStageIndis } = setTreeUtil(id, settings, gedcom, false);

	state.loading = false;
	value(state, "type", "tree");

	subValue(state, "stage", "indis", newStageIndis);

	setLines(state, { type: "main/setLines", payload: { reposition: false } });
};

export const setGenealogyRaw: R<{
	indis?: Stage["indis"];
	lines?: Stage["lines"];
}> = (state, action) => {
	value(state, "stage").indis = action.payload.indis;
	value(state, "stage").lines = action.payload.lines;
	value(state, "type", "genealogy");
};

export const setGenealogy: R<IndiKey> = (state, action) => {
	const settings = value(state, "settings");
	const id = action.payload;
	const gedcom = getGedcomCache(state.selectedRaw, value(state, "raw"));

	const newStageIndis = setGenealogyUtil(id, settings, gedcom);

	state.loading = false;
	value(state, "type", "genealogy");

	value(state, "stage").indis = newStageIndis;

	setLines(state, { type: "main/setLines", payload: { reposition: false } });
};

export const removeIndiFromStage: R<IndiKey> = (state, action) => {
	const stage = value(state, "stage");
	if (!stage.indis) {
		stage.indis = {};
	}

	if (stage.indis[action.payload]) {
		setStageHistoryItem(state, {
			type: "main/setStageHistoryItem",
			payload: {
				id: action.payload,
				type: "remove",
				position: stage.indis[action.payload].position,
				size: stage.indis[action.payload].size,
				time: Date.now(),
			},
		});
		delete stage.indis[action.payload];

		setLines(state, {
			type: "main/setLines",
			payload: { reposition: false },
		});
	}

	saveState(state);
};

const maxHistoryItems = 100;
export const setSearchHistoryItem: R<string | undefined> = (state, action) => {
	if (!action.payload) {
		return;
	}

	const newHistory = {
		...value(state, "searchHistory"),
		[action.payload]: Date.now(),
	};
	const sorted = Object.entries(newHistory)
		.sort(([_keyA, timeA], [_keyB, timeB]) => timeB - timeA)
		.slice(0, maxHistoryItems - 1) // -1 because we are going to add a new one
		.reduce<Record<string, number>>((acc, [key, time]) => {
			acc[key] = time;

			return acc;
		}, {});

	value(state, "searchHistory", sorted);
};

export const setStageHistoryItem: R<StageHistoryItem> = (_state, _action) => {
	// state.stageHistory.items = [];
	// if (!action.payload) {
	//     return;
	// }
	// const sliced = state.stageHistory.items.slice(0, maxHistoryItems - 1); // -1 because we are going to add a new one
	// sliced.unshift(action.payload);
	// state.stageHistory.items = sliced;
};

export const setStageHistoryPointer: R<"undo" | "redo"> = (state, action) => {
	if (!action.payload) {
		return;
	}

	const stageHistory = value(state, "stageHistory");
	let newPointer = stageHistory.pointer;

	if (action.payload === "redo") {
		newPointer = newPointer - 1 < 0 ? 0 : newPointer - 1;
	}
	if (action.payload === "undo") {
		newPointer =
			newPointer + 1 >= stageHistory.items.length
				? stageHistory.items.length - 1
				: newPointer + 1;
	}

	stageHistory.pointer = newPointer;

	saveState(state);
};
