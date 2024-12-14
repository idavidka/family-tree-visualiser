import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import store from "./store/store";

import "./index.css";
import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const persistor = persistStore(store);
const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement
);

root.render(
	<Provider store={store}>
		<PersistGate loading={null} persistor={persistor}>
			<BrowserRouter>
				<Routes>
					<Route path="/:indi" element={<App />} />
					<Route path="*" element={<App />} />
				</Routes>
			</BrowserRouter>
		</PersistGate>
	</Provider>
);
