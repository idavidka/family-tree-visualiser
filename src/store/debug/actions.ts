/* eslint-disable max-len */
import type { CaseReducer, PayloadAction } from "@reduxjs/toolkit";
import { type DebugState, type State } from "./reducers";
import { saveDebugState, deleteDebugState } from "../../utils/firebase";

export type R<T> = CaseReducer<State, PayloadAction<T>>;
export type RN = CaseReducer<State>;

export const rehydrate: R<State> = (state, action) => {
	const newState: State = {
		...state,
		...action.payload,
	};

	return newState;
};

export const addDebugState: R<Omit<DebugState, "docId">> = (state, action) => {
	const keys = Object.keys(state.states);
	const docId = Number(keys[keys.length - 1] ?? 0) + 1;

	state.states[docId] = { ...action.payload, docId: `${docId}` };

	saveDebugState(state.states[docId]);
};

export const removeDebugState: R<DebugState> = (state, action) => {
	if (action.payload.docId) {
		deleteDebugState(action.payload);
		delete state.states[Number(action.payload.docId)];
	}
};
