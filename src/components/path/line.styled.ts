import styled from "styled-components";


export const StyledLine = styled.div`
    z-index: 400;
    position: absolute;
    transform-origin: 50% 50%;

    &.straight {
        z-index: 401;
    }

    &.line-background {
        background-color: ${({ theme }) => theme.elements.background}
    }
`;