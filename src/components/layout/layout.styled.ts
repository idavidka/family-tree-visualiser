import tw from "tailwind-styled-components";

interface Props {
	isLoggedIn?: boolean;
}

export const Layout = tw.div<Props>`
    flex
    relative
    flex-row
    w-screen
    h-screen
    ${({ isLoggedIn }) => (isLoggedIn ? "bg-indigo-600" : "bg-indigo-200")}
`;
