import { type Draft } from "@reduxjs/toolkit";
import { type TreeState, DEFAULT_TREE_STATE, type State } from "./reducers";

export const defaultRaw = function (state: Draft<State>) {
	if (!state.treeState[""]) {
		state.treeState[""] = { ...DEFAULT_TREE_STATE };
	}

	return state.treeState[""] as Draft<TreeState>;
};

export const value = function <T extends keyof TreeState>(
	state: Draft<State>,
	key: T,
	newValue?: Draft<TreeState>[T]
) {
	if (!state.treeState[state.selectedRaw]) {
		state.treeState[state.selectedRaw] = { ...defaultRaw(state) };
	}

	if (arguments.length > 2) {
		state.treeState[state.selectedRaw][key] =
			newValue as Draft<TreeState>[T];
	}

	return state.treeState[state.selectedRaw][key] as Draft<TreeState>[T];
};

export const subValue = function <
	T extends keyof Pick<
		TreeState,
		"stage" | "stageHistory" | "fanStage" | "settings"
	>,
	K extends keyof TreeState[T],
>(state: Draft<State>, key: T, subKey: K, newValue?: Draft<TreeState>[T][K]) {
	const mainValue = value(state, key);

	if (arguments.length > 3) {
		mainValue[subKey] = newValue as Draft<TreeState>[T][K];
	}

	return mainValue[subKey] as Draft<TreeState>[T][K];
};
