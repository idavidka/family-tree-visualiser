import tw from "tailwind-styled-components";

export const Button = tw.button<{
	disabled?: boolean;
	visuallyDisabled?: boolean;
}>`
    bg-blue-500
    hover:bg-blue-700 
    text-white 
    font-bold 
    text-xs
    py-2 
    px-2 
    mx-1
    rounded-md
    h-[32px]
    transition-colors

    ${({ disabled }) =>
		disabled &&
		`
        disabled
        pointer-events-none
        opacity-70
        cursor-not-allowed
    `}

    ${({ visuallyDisabled }) =>
		visuallyDisabled &&
		`
        opacity-70
        cursor-not-allowed
    `}
`;

export const FakeButton = tw.div<{ disabled?: boolean }>`
    bg-blue-500
    hover:bg-blue-700 
    text-white 
    font-bold 
    text-xs
    py-2 
    px-2 
    mx-1
    rounded-md
    h-[32px]
    transition-colors
    cursor-pointer

    ${({ disabled }) =>
		disabled &&
		`
        disabled
        pointer-events-none
        opacity-70
        cursor-not-allowed
    `}
`;
