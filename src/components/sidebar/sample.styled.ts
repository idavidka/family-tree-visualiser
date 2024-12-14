import styled from "styled-components";
import tw from "tailwind-styled-components";

const StyledTag = styled.div`
	cursor: pointer;
	white-space: nowrap;
`;

export const Tag = tw(StyledTag)`
    text-gray-900
    dark:text-gray-100
    bg-gray-200
    dark:bg-gray-700
    hover:bg-gray-300
    dark:hover:bg-gray-500
    p-1
    mr-1
    mb-1
    rounded-md
`;

const StyledTagContainer = styled.div`
	margin-bottom: -18px !important;
`;

export const SampleContainer = tw(StyledTagContainer)`
    text-[8px]
    w-full
    overflow-auto
    flex
`;
