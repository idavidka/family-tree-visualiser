import { createSelector } from "@reduxjs/toolkit";
import { selectState } from "../root-selector";

export const selectDebugState = createSelector(
	selectState,
	(state) => state.debug
);

export const selectDebugStates = createSelector(
	selectDebugState,
	(state) => state.states
);
