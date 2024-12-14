import styled from "styled-components";
import tw from "tailwind-styled-components";

export const AvoidMobile = styled(tw.div`
    fixed
    w-screen
    h-screen
    top-0
    left-0
    text-6xl
    flex
    flex-col
    justify-center
    items-center
    text-white
    text-center
    p-10
    mc:hidden
`)`
	background: ${({ theme }) => theme.elements.background};
	z-index: 9999;
	pointer-events: all;
`;
