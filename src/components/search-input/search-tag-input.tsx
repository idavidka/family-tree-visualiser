import React, { useCallback } from "react";
import {
	type SearchTagInputProps,
	TagInput,
	TagifyGlobalStyle,
} from "./search-input.styled";

import { type AddEventData, type RemoveEventData } from "@yaireo/tagify";
import { type TagInputData } from "./types";

import "@yaireo/tagify/dist/tagify.css";

const SearchTagInput = ({
	suggestion,
	onAddOrRemove,
	...props
}: SearchTagInputProps) => {
	const onAdd = useCallback(
		(e: CustomEvent<AddEventData<TagInputData>>) => {
			onAddOrRemove?.(e);
		},
		[onAddOrRemove]
	);

	const onRemove = useCallback(
		(e: CustomEvent<RemoveEventData<TagInputData>>) => {
			onAddOrRemove?.(e);
		},
		[onAddOrRemove]
	);

	return (
		<>
			<TagifyGlobalStyle />
			<TagInput
				{...props}
				whitelist={suggestion}
				onAdd={onAdd}
				onRemove={onRemove}
			/>
		</>
	);
};

export default SearchTagInput;
