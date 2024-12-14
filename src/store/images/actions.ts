/* eslint-disable max-len */
import type { CaseReducer, PayloadAction } from "@reduxjs/toolkit";
import { type State } from "./reducers";
import { type OnProgressResult } from "../../utils/zip";

export type R<T> = CaseReducer<State, PayloadAction<T>>;
export type RN = CaseReducer<State>;

export const setProgress: R<{ progress?: OnProgressResult }> = (
	state,
	action
) => {
	state.loading = action.payload.progress;
};
