import { type ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";

let store: ToolkitStore | undefined;

export const dynamicStore = async () => {
	if (!store) {
		const s = await import("./store");
		store = s.default;
	}

	return store;
};
