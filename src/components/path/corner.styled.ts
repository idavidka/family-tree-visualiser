import styled from "styled-components";
import { type CornerType } from "./corner";

interface StyledCornerProps {
    weight: number
    radius: number
    type?: CornerType,
}

export const StyledCorner = styled.div<StyledCornerProps>`
    z-index: 400;
    position: absolute;
    border-radius: 50%;

    &.straight {
        z-index: 401;
    }

    ${({ radius, weight }) => {

        return `
            border: ${weight}px solid transparent;
            width: ${radius * 2}px;
            height: ${radius * 2}px;
        `;
    }}

    &.corner-background {
        border-bottom-color: ${({ theme }) => theme.elements.background}
    }
`;