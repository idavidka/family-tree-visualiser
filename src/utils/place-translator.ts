import i18n from "../translation/i18n";

export const placeTranslator = (place?: string) => {
	if (!place) {
		return;
	}

	const parts = place.split(/,\s?/);

	return parts.map((part) => i18n.t(part)).join(", ");
};
