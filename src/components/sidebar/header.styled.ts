import styled from "styled-components";
import tw from "tailwind-styled-components";

const StyledContainer = styled.div<{ width: number }>`
	width: calc(${({ width }) => width}px + 0.25rem);
	.tags-input {
		width: 100%;
	}

	.tagify__tag > div::before {
		--tag-inset-shadow-size: 50px;
	}

	padding-bottom: 10px;
`;

export const Container = tw(StyledContainer)`
    w-full
    flex
    flex-col
    items-center
    text-sm
    text-gray-800
    dark:text-gray-50
    rounded-lg
    bg-gray-50
    dark:bg-gray-800
    space-y-2
`;
