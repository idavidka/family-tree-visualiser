import { createSelector } from "@reduxjs/toolkit";
import { selectState } from "../root-selector";
import { type IndiKey } from "../../types/types";
import GedcomTree from "../../utils/parser";
import { type GedComType } from "../../classes/gedcom/classes/gedcom";
import { parseSearchCache } from "../../components/search-input/utils";
import { type Position } from "../../types/graphic-types";
import { getStageEdges } from "../../utils/indis-on-stage";
import { Individuals } from "../../classes/gedcom/classes/indis";
import { type IndiWithDimensionType } from "../../classes/gedcom/classes/indi-with-dimension";
import { DEFAULT_TREE_STATE } from "./reducers";

const gedcomCache: Record<string, GedComType | undefined> = {};

export const resetGedcomCache = (id: string, gedcom: GedComType) => {
	gedcomCache[id] = gedcom;
};

export const getGedcomCache = (id?: string, raw?: string) => {
	if (!id) {
		return undefined;
	}

	if (!gedcomCache[id]) {
		gedcomCache[id] = raw ? GedcomTree.parse(raw) : undefined;
	}

	if (!window.gedcom) {
		window.gedcom = {};
	}

	window.gedcom[id] = gedcomCache[id];

	return gedcomCache[id];
};

export const selectMainState = createSelector(
	selectState,
	(state) => state.main
);

export const selectLoading = createSelector(
	selectMainState,
	(state) => state.loading
);
export const selectLoadingTime = createSelector(
	selectMainState,
	(state) => state.loadingTime
);
export const selectLoadingText = createSelector(
	selectMainState,
	(state) => state.loadingText
);
export const selectLanguage = createSelector(
	selectMainState,
	(state) => state.lang
);
export const selectSelectedRaw = createSelector(
	selectMainState,
	(state) => state.selectedRaw
);
export const selectTreeState = createSelector(
	[selectMainState, selectSelectedRaw],
	(state, selected) =>
		(selected && state.treeState[selected]) ||
		state.treeState[""] ||
		DEFAULT_TREE_STATE
);

export const selectRawIds = createSelector(selectMainState, (state) => {
	return Object.keys(state.treeState ?? {});
});

export const selectRaw = createSelector(selectTreeState, (state) => state.raw);

export const selectGedcom = createSelector(
	[selectSelectedRaw, selectRaw],
	(id, state) => {
		return getGedcomCache(id, state);
	}
);
export const selectSidebarOpen = createSelector(
	selectMainState,
	(state) => state.sidebarOpen
);

export const selectUserId = createSelector(
	selectMainState,
	(state) => state.userId
);
export const selectGuided = createSelector(
	selectMainState,
	(state) => state.guided
);
export const selectType = createSelector(
	selectTreeState,
	(state) => state.type
);
export const selectSnapshotId = createSelector(
	selectMainState,
	(state) => state.snapshotId
);
export const selectRawSnapshotId = createSelector(
	selectMainState,
	(state) => state.rawSnapshotId
);

export const selectFanStage = createSelector(
	selectTreeState,
	(state) => state.fanStage
);

export const selectStage = createSelector(
	selectTreeState,
	(state) => state.stage
);

export const selectScale = createSelector(selectStage, (state) => state.scale);

export const selectMode = createSelector(
	selectMainState,
	(state) => state.mode
);
export const selectTreeMode = createSelector(
	selectTreeState,
	(state) => state.treeMode
);
export const selectSettings = createSelector(
	selectTreeState,
	(state) => state.settings || DEFAULT_TREE_STATE.settings
);

export const selectAdditionalSettings = createSelector(
	selectTreeState,
	(state) => (state.settings || DEFAULT_TREE_STATE.settings).additional ?? {}
);

export const selectIndiPositions = createSelector(
	selectStage,
	(state) => state.indis || {}
);

export const selectUploadedIndis = createSelector(
	selectTreeState,
	(state) => state.indis || {}
);

export const selectAllIndis = createSelector(
	selectGedcom,
	(state) => state?.indis()
);

export const selectIndisOnStage = createSelector(
	[selectIndiPositions, selectAllIndis],
	(indisOnStage, allIndis) => {
		const list = new Individuals();

		Object.entries(indisOnStage).forEach(([key, indi]) => {
			const item = allIndis?.items[
				key as IndiKey
			] as IndiWithDimensionType;
			if (item) {
				item.position = indi.position;
				item.size = indi.size;
				list.append(item);
			}
		});

		return list;
	}
);

export const selectIndi = createSelector(
	[selectGedcom, (_state, id: IndiKey) => id],
	(gedcom, id) => {
		return gedcom?.indi(id);
	}
);

export const selectIndiPosition = createSelector(
	[selectIndiPositions, selectAllIndis],
	(onStageIndis, allIndis) => {
		return (...position: Position[]) => {
			const positions = position.map(({ x, y }) => `${x},${y}`);
			const indiOnPosition = Object.entries(onStageIndis).find(
				([_, indi]) => {
					return positions.includes(
						`${indi.position.x},${indi.position.y}`
					);
				}
			);

			if (!indiOnPosition) {
				return undefined;
			}

			return allIndis?.items[indiOnPosition[0] as IndiKey];
		};
	}
);

export const selectHorizontalIndis = createSelector(
	[selectIndiPositions, selectAllIndis],
	(onStageIndis, allIndis) => {
		return (y: number) => {
			const indiOnYAxis = Object.entries(onStageIndis).filter(
				([_, indi]) => {
					return indi.position.y === y;
				}
			);

			if (!indiOnYAxis.length) {
				return undefined;
			}

			const indiIds = indiOnYAxis.map(([key]) => key as IndiKey);

			return allIndis?.filter({ id: indiIds });
		};
	}
);

export const selectEdgeIndi = createSelector(
	selectIndiPositions,
	(indisOnStage) => {
		return () => {
			return getStageEdges(indisOnStage);
		};
	}
);

export const selectSearchHistory = createSelector(selectTreeState, (state) =>
	Object.keys(state.searchHistory).map((historyItem) =>
		parseSearchCache(historyItem)
	)
);
export const selectStageHistory = createSelector(
	selectTreeState,
	(state) => state.stageHistory.items
);
export const selectStageHistoryPointer = createSelector(
	selectTreeState,
	(state) => state.stageHistory.pointer || 0
);
export const selectSelected = createSelector(
	selectTreeState,
	(state) => state.selected
);
export const selectSelectedForKinship = createSelector(
	selectTreeState,
	(state) => state.selectedForKinship
);
export const selectSearchedCache = createSelector(
	selectTreeState,
	(state) => state.searched
);
export const selectSearched = createSelector(selectSearchedCache, (state) =>
	parseSearchCache(state ?? "")
);
export const selectPinned = createSelector(
	selectTreeState,
	(state) => state.pinned
);

export const selectAllOpened = createSelector(
	selectTreeState,
	(state) => state.opened
);
export const selectAllScrolled = createSelector(
	selectTreeState,
	(state) => state.scrolled
);
