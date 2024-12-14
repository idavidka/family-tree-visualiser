import { createSelector } from "@reduxjs/toolkit";
import { selectState } from "../root-selector";

export const selectImagesState = createSelector(
	selectState,
	(state) => state.images
);

export const selectProgress = createSelector(selectImagesState, (state) => {
	return state.loading;
});
