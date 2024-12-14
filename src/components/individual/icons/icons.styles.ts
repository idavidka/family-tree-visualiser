import styled from "styled-components";
import tw from "tailwind-styled-components";

export interface IconButtonProps {
	isOuter?: boolean;
}

const TwIconButtonWrapper = tw.div<IconButtonProps>`
    flex
    gap-1
`;

export const Button = tw.button<IconButtonProps>`
    h-6
    w-6
    text-white
    rounded-md
    cursor-pointer
    group-[.dragging]:invisible
    pointer-events-auto
    flex
    justify-center
    items-center
    hover:bg-gray-200
    hover:text-indigo-900
    [&.pressed]:bg-gray-200
    [&.pressed]:text-indigo-900
    ${({ isOuter }) =>
		isOuter
			? `
        bg-gray-600
    `
			: `
        group-hover:text-indigo-900
    `}
`;

export const ButtonDiv = tw.div<IconButtonProps>`
    h-6
    w-6
    text-white
    rounded-md
    cursor-pointer
    group-[.dragging]:invisible
    pointer-events-auto
    flex
    justify-center
    items-center
    hover:bg-gray-200
    hover:text-indigo-900
    [&.pressed]:bg-gray-200
    [&.pressed]:text-indigo-900
    ${({ isOuter }) =>
		isOuter
			? `
        bg-gray-600
    `
			: `
        group-hover:text-indigo-900
    `}
`;

export const StyledIconButtonWrapper = styled(TwIconButtonWrapper)<{
	length: number;
}>`
	${({ isOuter, length }) =>
		isOuter
			? `
        position: absolute;
        top: -0.75rem;
        right: -0.75rem;
    `
			: `
        transition-property: width, padding-right;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 300ms;
        overflow: hidden;
        margin-right: -4px;
        ${length ? "gap: 0;" : ""}

        .hidden-wrapper, .visible-wrapper {
            display: flex;
            width: 0;
            transition-delay: 3s;
            transition-property: width, padding-right;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
            transition-duration: 300ms;
            overflow: hidden;
        }

        .visible-wrapper {
            width: 24px;
        }

        &:hover {
            .hidden-wrapper {
                width: calc(24px * ${length});
                transition-delay: 0s;
            }
            .visible-wrapper {
                width: 0;
                transition-delay: 0s;
            }
        }
    `}
`;
