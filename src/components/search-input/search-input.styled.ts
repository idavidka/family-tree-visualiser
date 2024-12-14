import styled, { createGlobalStyle } from "styled-components";
import tw from "tailwind-styled-components";
import Tags from "@yaireo/tagify/dist/react.tagify";
import {
	type AddEventData,
	type RemoveEventData,
	type TagifySettings,
} from "@yaireo/tagify";
import { type TagInputData } from "./types";
import { transformTag } from "./utils";

import { type TagifyBaseReactProps } from "@yaireo/tagify/dist/react.tagify";

export type SearchTagInputProps = TagifyBaseReactProps & {
	onAddOrRemove?: (
		e: CustomEvent<
			AddEventData<TagInputData> | RemoveEventData<TagInputData>
		>
	) => void;
	suggestion?: TagInputData[];
	custom?: Record<string, unknown>;
};

const StyledInput = styled.input.attrs({
	id: "search_input",
	type: "search",
	required: true,
})``;

export const Input = tw(StyledInput)`
    block
    w-full
    text-sm
    text-gray-900
    bg-gray-50
    rounded-lg
    border-l-gray-50
    border-l-2
    border
    border-gray-300
    focus:ring-blue-500
    focus:border-blue-500
`;

const settings: TagifySettings<TagInputData> = {
	delimiters: ",",
	maxTags: 10,
	addTagOnBlur: false,
	pasteAsTags: false,
	tagTextProp: "display",
	transformTag,
	dropdown: {
		highlightFirst: true,
		mapValueTo: (value) =>
			(value.display || value.value).replace(/<[^>]+>/g, ""),
		maxItems: 20,
		classname: [
			"tags-look",
			"block",
			"w-full",
			"text-sm",
			"text-gray-800",
			"dark:text-gray-50",
			"bg-gray-50",
			"dark:bg-gray-800",
			"rounded-b-lg",
			"border",
			"border-t-0",
			"border-gray-300",
			"dark:border-gray-700",
		].join(" "),
		enabled: 0,
		closeOnSelect: false,
	},
};

const StyledTagInput = styled(Tags).attrs({ settings })``;

export const TagInput = tw(StyledTagInput)`
    block
    w-full
    text-sm
    text-gray-800
    dark:text-gray-50
    bg-gray-50
    dark:bg-gray-800
    rounded-lg
    border
    border-gray-300
    dark:border-gray-700
    focus:ring-blue-500
    focus:border-blue-500
    tagify
    overflow-x-auto
    [.tagify__focus]:bg-red-400
`;

export const TagifyGlobalStyle = createGlobalStyle`
    .tags-look {
        transform: translateY(-5px);

        .tagify__dropdown__item{
            display: inline-block;
            vertical-align: middle;
            border-radius: 3px;
            padding: .3em .5em;
            border: 1px solid ${({ theme }) => theme.elements.background};
            color: ${({ theme }) => theme.elements.text};
            background: ${({ theme }) => theme.elements.background};
            margin: .2em;
            font-size: .85em;
            transition: 0s;
        }
        
        .tagify__dropdown__item--active{
            color: ${({ theme }) => theme.elements.text};
        }
        
        .tagify__dropdown__item:hover{
            background: lightyellow;
            border-color: gold;
            color: ${({ theme }) => theme.colors.black};
        }
        
        .tagify__dropdown__item--hidden {
            max-width: 0;
            max-height: initial;
            padding: .3em 0;
            margin: .2em 0;
            white-space: nowrap;
            text-indent: -20px;
            border: 0;
        }

        .tagify__dropdown__wrapper {
            border: none;
            background: transparent;
        }
    }   


    ${StyledTagInput} {

        .tagify__tag {
            max-width: calc(100% - 10px);
            
            & > div:first-of-type, .tagify__tag__removeBtn {
                background: transparent;
                color: ${({ theme }) => theme.elements.text};
            }

            & > div:before {
                box-shadow: 0 0 0 var(--tag-inset-shadow-size) ${({ theme }) =>
					theme.elements.background} inset;
            }
        }
    }
`;
