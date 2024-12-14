/* eslint-disable max-len */
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import styled, { createGlobalStyle } from "styled-components";
import tw from "tailwind-styled-components";
import { Button, FakeButton } from "../button/button.styled";
import Coffee from "../buymeacoffee";
import { type Theme } from "../../theme";

const TwContainer = tw(TransformWrapper)`
    select-none
    flex-auto
    w-full
    h-screen
    cursor-grab
    relative
    bg-gray-700
`;

export const TransformStyle = createGlobalStyle`
    .main-stage {
        position: relative;
        background: ${({ theme }) => theme.elements.background};
        cursor: grab;
        height: 100vh;
        width: 100%;
    }

    .wrapper {
        width: 100%;
        height: 100%;
    }
`;

export const Container = styled(TwContainer)`
	background: ${({ theme }) => theme.elements.background};
`;

export const Wrapper = styled(tw(TransformComponent)`
    absolute 
    w-full 
    h-full 
    wrapper
`)``;

export const StageButton = styled(tw(Button)<{ column?: boolean }>`
    flex
    flex-row
    flex-wrap
    ${({ column }) => (column ? "h-auto" : "h-[32px]")}
    w-auto
    items-center
    justify-start
`)`
	.icon + span,
	span:not(.icon):first-child {
		transition:
			width 0.3s ease-in-out,
			padding-left 0.3s ease-in-out;
		padding-left: 0;
		width: 0;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

export const DebugButton = styled(tw(StageButton)`
    bg-black
    text-white
    dark:bg-white
    dark:text-black
    hover:bg-blue-700 
    dark:hover:bg-blue-700 
    hover:text-white
    dark:hover:text-white
`)`
	& > .icon + span {
		display: flex;
		justify-content: space-between;
		align-items: center;

		& > svg {
			&:hover {
				color: ${({ theme }) => theme.elements.background};
			}
		}
	}
`;

export const FakeStageButton = styled(tw(FakeButton)<{ column?: boolean }>`
    flex
    flex-row
    flex-wrap
    ${({ column }) => (column ? "h-auto" : "h-[32px]")}
    w-auto
    items-center
    justify-start
`)`
	.icon + span,
	span:not(.icon):first-child {
		transition:
			width 0.3s ease-in-out,
			padding-left 0.3s ease-in-out;
		padding-left: 0;
		width: 0;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

export const ThemeButton = styled(StageButton)<{ mode: Theme }>`
	background: ${({ theme, mode }) =>
		mode === "dark" ? theme.colors.grey4 : theme.colors.grey5};
	color: ${({ theme, mode }) =>
		mode !== "dark" ? theme.colors.grey4 : theme.colors.grey5};

	&:hover {
		background: ${({ theme, mode }) =>
			mode === "dark" ? theme.colors.grey3 : theme.colors.white};
	}
`;

export const SideBarToggleButton = styled(StageButton)`
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
`;

export const StageCoffeeButton = styled(tw(Coffee)`
    flex
    flex-row
    w-auto
    items-center
    justify-start
`)`
	.icon {
		& + span {
			transition:
				width 0.3s ease-in-out,
				padding 0.3s ease-in-out;
			padding-left: 0;
			width: 0;
			text-align: left;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
`;

export const StageButtonContentContainer = styled(tw.div<{
	opened?: boolean;
	maxHeight?: number;
}>`
    flex
    flex-col
    align-items-left
    text-white 
    font-bold 
    text-xs
    rounded-md
`)`
	transition:
		height 0.3s ease-in-out,
		width 0.3s ease-in-out,
		padding 0.3s ease-in-out;
	flex-basis: 100%;
	overflow: auto;
	width: 0;
	height: 0;

	${({ opened, maxHeight = 600 }) => {
		if (!opened) {
			return "";
		}

		return `
            height: ${maxHeight}px;
        `;
	}}

	.switch-group {
		input {
			&:not(:first-of-type):not(:last-of-type) {
				border-radius: 0;
				border-left: none;
				border-right: none;
			}

			&:first-of-type {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
				border-right: none;
			}

			&:last-of-type {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
				border-left: none;
			}

			&:first-of-type:last-of-type {
				border-radius: 0.5rem;
				border-width: 1px;
			}
		}
	}
`;

export const ButtonWrapper = styled(tw.div<{
	horizontal?: string;
	spanWidth?: number | number[];
	isRow?: boolean;
}>`
    absolute
    flex
    flex-col
    items-end
    top-2
    gap-2
    ${({ horizontal = "right-2" }) => horizontal}
    ${({ isRow }) => (isRow ? "flex-row items-start gap-0" : "")}
`)`
	${({ spanWidth = 200, isRow }) => {
		const isArray = Array.isArray(spanWidth);
		const widths = Array.isArray(spanWidth) ? spanWidth : [spanWidth];

		return widths.map(
			(width, index) => `
            transition: left .3s ease-in-out;
            height: ${isRow ? "auto" : "calc(100vh - 40px)"};
            overflow: auto;
            ${!isRow ? "&:hover {" : ""}
			.dropdown, ${StageButton}, ${FakeStageButton}, ${StageCoffeeButton} {
					${isRow ? "&:hover {" : ""}
						${isArray ? `&:nth-child(${index + 1}) {` : ""}
						.icon+span,span:not(.icon):first-child {
							padding-left: 4px;
							width: ${width}px;
						}
						${isArray ? `}` : ""}
					${isRow ? "}" : ""}
                }
			${!isRow ? "}" : ""}

			${!isRow ? "&.opened {" : ""}
				.dropdown, ${StageButton}, ${FakeStageButton}, ${StageCoffeeButton} {
					${isRow ? "&:hover {" : ""}
						${isArray ? `&:nth-child(${index + 1}) {` : ""}
						span.opened-button {
							padding-left: 4px;
							width: ${width}px;
						}
						${isArray ? `}` : ""}
					${isRow ? "}" : ""}
				}
			${!isRow ? "}" : ""}

			.dropdown.no-collapse, ${StageButton}.no-collapse, ${FakeStageButton}.no-collapse, ${StageCoffeeButton}.no-collapse {
				${isArray ? `&:nth-child(${index + 1}) {` : ""}
				span {
					padding-left: 4px;
					width: ${width}px;
				}
				${isArray ? `}` : ""}
			}            
        `
		);
	}}

	&.overflow-visible {
		overflow: visible;
	}
`;

export const SvgFanChartContainer = styled.div`
	width: 100%;
	height: 100%;

	svg g.member.empty path {
		fill: ${({ theme }) => theme.elements.fanBg};
	}
`;

export const SvgContainer = styled.div`
	position: absolute;
	z-index: 100;
	circle.connect {
		stroke: ${({ theme }) => theme.elements.mainLine};
		fill: ${({ theme }) => theme.elements.background};
	}

	path {
		&.corner-normal {
			&.corner.corner-color-0 {
				stroke: ${({ theme }) => theme.elements.mainLine};
			}
		}
	}

	line {
		&.line-normal {
			&.line-main.line-color-0 {
				stroke: ${({ theme }) => theme.elements.mainLine};
			}
		}

		&.line-background {
			stroke: ${({ theme }) => theme.elements.background};
		}
	}

	line,
	circle,
	path {
		&.hovered:not(.line-background) {
			stroke: red !important;
			cursor: pointer;
		}

		&.not-hovered {
			opacity: 0.3;
			cursor: pointer;
		}
	}
`;
