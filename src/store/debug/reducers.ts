import { createSlice } from "@reduxjs/toolkit";
import * as debugActions from "./actions";
import { type Settings, type Stage } from "../main/reducers";

export interface DebugState {
	settings: Settings;
	stage: Stage;
	userId?: string;
	docId?: string;
}

export interface State {
	states: Record<number, DebugState>;
}

export const initialState: State = {
	states: {},
};

export const debugSlice = createSlice({
	name: "debug",
	initialState,
	reducers: debugActions,
});

export const actions = debugSlice.actions;

export default debugSlice.reducer;
