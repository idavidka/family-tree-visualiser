import styled from "styled-components";

interface StyledConnectProps {
    weight: number
}

export const StyledConnect = styled.div<StyledConnectProps>`
    z-index: 404;
    position: absolute;
    border-radius: 50%;


    &.straight {
        z-index: 405;
    }

    ${({ theme, weight }) => {

        return `
            background: ${theme.elements.background};
            width: ${weight * 4}px;
            height: ${weight * 4}px;
        `;
    }}
`;