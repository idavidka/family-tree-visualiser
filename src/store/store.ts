import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
	type PersistConfig,
	persistReducer,
	// type WebStorage,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import createIdbStorage from "@piotr-cz/redux-persist-idb-storage";

import mainReducer, { type State as MainState } from "./main/reducers";
import imagesReducer, { type State as ImagesState } from "./images/reducers";
import debugReducer, { type State as DebugState } from "./debug/reducers";
import MigrationStorage from "./migration-storage";
import { getMigrationInstance } from "../utils/indexed-db-manager";

const USE_MIGRATION = true;

export interface State {
	main: MainState;
	images: ImagesState;
	debug: DebugState;
}

export const mainPersistConfig: PersistConfig<MainState> = {
	key: "ftv-main",
	version: 1,
	// storage,
	// storage: createIdbStorage({
	// 	name: "ftv-main",
	// 	storeName: "state",
	// }),
	storage: !USE_MIGRATION
		? storage
		: new MigrationStorage(
				storage,
				createIdbStorage({
					name: "ftv-main",
					storeName: "state",
				}),
				async () => {
					const current = localStorage.getItem("persist:ftv-main");

					return await Promise.resolve(!!current);
				},
				async () => {
					const instance = getMigrationInstance();

					const current = await instance.getItem("persist:ftv-main");

					return !!current;
				}
		  ),
	blacklist: [
		"clouding",
		"loading",
		"loadingTime",
		"snapshotId",
		"rawSnapshotId",
	],
};

export const debugPersistConfig: PersistConfig<DebugState> = {
	key: "ftv-debug",
	version: 1,
	storage,
};

const rootReducer = combineReducers({
	main: persistReducer(mainPersistConfig, mainReducer),
	images: imagesReducer,
	debug: persistReducer(debugPersistConfig, debugReducer),
});

const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
		}),
});

export default store;
