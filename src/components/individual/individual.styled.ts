import styled, { keyframes } from "styled-components";
import tw from "tailwind-styled-components";
import { type Color } from "../../types/colors";
import { GENDER_COLORS } from "../../colors";
import { StyledName } from "./name";
import { Date } from "./date.styled";
import { getContrastColor } from "../../utils/colors";
import { Id } from "../id/id.styled";

const colorMap: Record<"F" | "M" | "U", Color> = {
	...GENDER_COLORS,
	U: "currentColor",
};

export interface ContainerProps {
	sex?: "F" | "M";
	isOnStage?: boolean;
	isHomePerson?: boolean;
	isConnectedPerson?: boolean;
	type: "neutral" | "draggable" | "dragging" | "dropped" | "overlay";
	width: number;
	height: number;
	color?: Color;
	hasTopLabel?: boolean;
	hasBottomLabel?: boolean;
}

export const Label = styled(tw.div`
    font-bold
    text-xs
    text-gray-900
    dark:text-gray-50
`)`
	border-radius: 4px;
	padding: 0 0.1rem 0.06rem;
	color: ${({ theme }) => theme.elements.text};
	font-size: 0.5rem;
	line-height: 0.55rem;
	width: 100%;
	text-align: center;
`;

export const BottomLabel = styled(Label)`
	margin-top: 14px;
`;

export const TopLabel = styled(Label)`
	margin-top: -19px;
	margin-bottom: 10px;
`;

const TwContainer = tw.div<ContainerProps>`
    individual
    ${({ type }) => `individual-${type}`}
    w-full
    relative
    flex
    flex-col
    items-start
    p-2
    rounded-lg
    font-bold
    transition-colors
	transition-opacity
    duration-500
    bg-gray-100

    ${({ isOnStage }) => {
		if (isOnStage) {
			return `
                opacity-70
                cursor-pointer
            `;
		} else {
			return `  
                group         
                hover:bg-gray-300
                cursor-grab
            `;
		}
	}}
`;

export const NameWrapper = styled(tw.div`
    flex
    justify-between
    w-full
`)``;

export const IconWrapper = styled(tw.div`
	flex
    absolute
    bottom-2
    right-2
    text-white
    transition-colors
    duration-500
    group-hover:text-indigo-900
`)`
	.warning-sign-1 {
		stroke: black;
		stroke-width: 20px;
		fill: yellow;
	}
	.warning-sign-2 {
		stroke: black;
		stroke-width: 20px;
		fill: orange;
	}
`;

const pulsingIn = keyframes`
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
`;

const pulsingOut = keyframes`
    0% {
        transform: scale(1.05);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
    }

    70% {
        transform: scale(1);
        box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
    }

    100% {
        transform: scale(1.05);
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
    }
`;

export const Container = styled(TwContainer)<ContainerProps>`
	z-index: 700;
	/* opacity: .2; */

	${({
		theme,
		type,
		sex,
		isHomePerson,
		isConnectedPerson,
		width,
		height,
		color: colorProp,
		hasBottomLabel,
		hasTopLabel,
	}) => {
		const color = colorProp || colorMap[sex || "U"];

		const usedColor: Color = isHomePerson
			? theme.colors.green1
			: isConnectedPerson
			? theme.colors.orange1
			: color;

		return `
            width: ${width}px;
            height: ${height}px; 
            background-color: ${usedColor};

			${hasBottomLabel ? "margin-bottom: 10px;" : ""}
			${hasTopLabel ? "margin-top: 10px;" : ""}

            ${
				type === "dropped"
					? `
                border: 1px solid ${
					isHomePerson || isConnectedPerson
						? theme.colors.black
						: theme.elements.bgInverse
				};
                box-shadow: 2px 2px 10px ${theme.colors.black};
            `
					: ""
			}

			${StyledName}, ${Date}, ${IconWrapper}, ${Id}, &:not(.individual-dropped) button {
				color: ${getContrastColor(usedColor)};
			}

            ${
				type === "overlay"
					? `
                width: ${width * 2}px;
                height: auto;
                background: white;
                color: black;
                transform: translateX(-50%);
                max-height: calc(100vh - 20px);
                overflow: auto;

				${StyledName}, ${Date}, ${IconWrapper}, ${Id}, &:not(.individual-dropped) button {
                	color: black;
                }
            `
					: ""
			}
        `;
	}}

	&.waiting {
		cursor: wait;
	}

	&.dragging {
		cursor: grabbing;
	}

	&.dragged-off {
		opacity: 0.5;
	}

	&.suggestion-placeholder {
		background-color: ${({ theme }) => theme.colors.green2};
		opacity: 0.5;
	}

	&.error-placeholder {
		background-color: ${({ theme }) => theme.colors.red2};
		opacity: 0.5;
		color: ${({ theme }) => theme.colors.white};
		display: flex;
		justify-content: center;
		align-items: center;

		& > svg {
			width: 2em !important;
			height: 2em !important;
		}
	}

	& > *:not(:hover, .close, ${TopLabel}, ${BottomLabel}),
	& > ${NameWrapper} > *:not(:hover, .close, ${TopLabel}, ${BottomLabel}) {
		color: ${({ theme, isHomePerson, isConnectedPerson }) =>
			isHomePerson || isConnectedPerson ? `${theme.colors.black}` : ""};
	}

	&.hovered {
		border-color: red !important;
		box-shadow: 0px 0px 15px 10px #ff000055;
	}

	&.not-hovered {
		opacity: 0.3 !important;
	}

	transform-origin: 50%;
	&.pulse {
		animation-name: ${({ type }) =>
			type === "dropped" ? pulsingOut : pulsingIn};
		animation-duration: 2s;
		animation-iteration-count: infinite;
	}
`;

export const Arrow = styled.div`
	width: 25px;
	height: 25px;
	position: absolute;
	transform: rotate(45deg);
	background: white;
`;
