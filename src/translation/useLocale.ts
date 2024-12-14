import { useDispatch, useSelector } from "react-redux";
import { selectLanguage } from "../store/main/selectors";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect } from "react";
import i18n, { type Language } from "./i18n";
import { actions } from "../store/main/reducers";

export const useLocale = () => {
	const dispatch = useDispatch();
	const language = useSelector(selectLanguage);
	const { t } = useTranslation();
	const setLanguage = useCallback(
		(lang: Language) => {
			if (i18n.language !== lang) {
				i18n.changeLanguage(lang);
				dispatch(actions.setLanguage(lang));
			}
		},
		[dispatch]
	);

	useEffect(() => {
		if (i18n.language !== language) {
			i18n.changeLanguage(language);
		}
	}, [language]);

	return { language, setLanguage, t };
};
