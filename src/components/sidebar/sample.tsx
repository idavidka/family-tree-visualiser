import React, { useCallback, useMemo } from "react";
import { type TagInputType } from "../search-input/types";
import { Tag } from "./sample.styled";
import { filterCacheMap } from "../search-input/utils";
import { useTranslation } from "react-i18next";

interface SampleProps {
	target?: string;
	value: TagInputType;
}

const Sample = ({ target, value }: SampleProps) => {
	const { t } = useTranslation();
	const onSample = useCallback(() => {
		if (!target) {
			return;
		}

		const content = document.querySelector(
			`${target} .tagify__input`
		) as HTMLElement;

		if (content) {
			content.innerText = `${t(value)}:`;
			content.focus();
		}
	}, [target, value, t]);

	const translated = useMemo(() => {
		let translatedValue = value;
		Object.keys(filterCacheMap).forEach((filter) => {
			translatedValue = translatedValue.replace(
				filter,
				t(filter)
			) as TagInputType;
		});
		return translatedValue;
	}, [value, t]);

	return (
		<Tag onClick={onSample}>
			<strong>{translated}</strong>: &lt;{t("name")}&gt;
		</Tag>
	);
};

export default Sample;
