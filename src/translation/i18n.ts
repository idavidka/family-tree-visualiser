import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import hu from "./hu.json";
import en from "./en.json";
import huCountries from "./hu-countries.json";
import enCountries from "./en-countries.json";

export type Language = "hu" | "en";

const lStorage = globalThis.localStorage;

export const defaultLanguage: Language =
	JSON.parse(lStorage?.getItem("persist:ftv") || "{}").lang?.replaceAll(
		'"',
		""
	) || "hu";

i18n.use(initReactI18next).init({
	resources: {
		hu: { translation: { ...hu, ...huCountries } },
		en: { translation: { ...en, ...enCountries } },
	},
	lng: defaultLanguage,
	fallbackLng: "en",

	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
