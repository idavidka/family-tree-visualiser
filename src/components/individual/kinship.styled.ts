import styled from "styled-components";
import tw from "tailwind-styled-components";

export const Kinship = styled(tw.div`
    font-bold
    text-xs
    text-gray-900
    dark:text-gray-50
    absolute 
`)`
	border-radius: 4px;
	padding: 0 0.1rem 0.06rem;
	background: ${({ theme }) => theme.elements.background};
	color: ${({ theme }) => theme.elements.text};
	font-size: 0.5rem;
	line-height: 0.55rem;
	top: calc(100% + 0.5rem);
	left: 50%;
	transform: translateX(-50%);
`;
