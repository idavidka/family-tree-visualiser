import styled from "styled-components";

export const Container = styled.div`
	display: grid;
	grid-template-columns: 25% 25% 1fr;
	margin: 0 -0.5rem -0.5rem;
	width: calc(100% + 1rem);
`;

export const Row = styled.div`
	display: contents;

	> div,
	> span {
		padding-top: 0.25rem;
		padding-bottom: 0.25rem;
		&:first-child {
			padding-left: 0.5rem;
		}
		&:last-child {
			padding-right: 0.5rem;
		}
	}

	&:not(.no-bg):nth-child(even) > * {
		background: #eee;
	}
`;

export const Separator = styled.div`
	grid-column: 1 / span 3;
	border-bottom: 1px solid black;
	margin-bottom: 10px;
	padding-bottom: 10px;
`;

export const Label = styled.div`
	font-weight: bold;
`;
