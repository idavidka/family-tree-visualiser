import { createSlice } from "@reduxjs/toolkit";
import * as imagesActions from "./actions";
import { type OnProgressResult, type ZipFilesInput } from "../../utils/zip";

export interface State {
    images: ZipFilesInput,
    loading?: OnProgressResult
}

export const initialState: State = {
    images: {},
};

export const imagesSlice = createSlice({
    name: "images",
    initialState,
    reducers: imagesActions
});

export const actions = imagesSlice.actions;

export default imagesSlice.reducer;
