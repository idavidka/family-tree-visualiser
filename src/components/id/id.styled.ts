import styled from "styled-components";
import tw from "tailwind-styled-components";

const TwId = tw.div`
    transition-colors
    duration-500
    group-hover:text-indigo-900
    group-[.on-stage]:invisible
`;

export const Id = styled(TwId)`
	font-size: 0.5rem;
	margin-top: -8px;
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
	padding-bottom: 10px;
`;
