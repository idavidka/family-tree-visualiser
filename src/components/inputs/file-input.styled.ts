import styled from "styled-components";
import tw from "tailwind-styled-components";

const StyledInput = styled.input.attrs({ id: 'file_input', type: 'file' })``;

export const FileInput = tw(StyledInput)`
    block
    w-full
    text-sm
    text-gray-900
    dark:text-gray-50
    border
    border-gray-300
    dark:border-gray-700
    rounded-lg
    cursor-pointer
    bg-gray-50
    dark:bg-gray-800
    focus:outline-none
`;