import styled from "styled-components";
import tw from "tailwind-styled-components";

export const Container = styled(tw.aside`
    absolute
    select-none
    top-0
    left-0
    z-40
    w-fit
    h-screen
    flex
`)<{ opened?: boolean }>`
	transition: transform 0.3s ease-in-out;
	transform: translateX(${({ opened }) => (opened ? "0" : "-100%")});
`;

const StyledWrapper = styled.div`
	::-webkit-scrollbar {
		width: 0px;
		background: transparent; /* make scrollbar transparent */
	}
`;

export const Wrapper = tw(StyledWrapper)`
    h-full
    px-3
    py-2
    overflow-hidden
    bg-gray-50
    dark:bg-gray-800
    flex
    flex-col
    w-full
`;

export const List = tw.div`
    flex
    flex-col
    items-center
    w-full
    space-y-2
    font-medium
    w-full
`;
