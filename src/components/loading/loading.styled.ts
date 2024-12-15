import styled from "styled-components";

export const Container = styled.div<{
	inline?: boolean;
	transparent?: boolean;
	horizontal?: boolean;
}>`
	display: flex;
	flex-direction: ${({ horizontal }) => (horizontal ? "row" : "column")};
	gap: ${({ horizontal }) => (horizontal ? "10px" : "0")};
	justify-content: ${({ horizontal }) =>
		horizontal ? "flex-start" : "center"};
	align-items: center;
	position: ${({ inline }) => (inline ? "static" : "fixed")};
	top: 0;
	left: 0;
	width: ${({ inline, horizontal }) =>
		horizontal ? "auto" : inline ? "20px" : "100vw"};
	height: ${({ inline }) => (inline ? "20px" : "100vh")};
	z-index: 200;
	pointer-events: all;
	background: ${({ theme, transparent }) =>
		transparent ? "transparent" : theme.elements.background}CC;
	color: ${({ theme }) => theme.elements.text};

	${({ inline }) => {
		if (inline) {
			return `
                & > svg {
                    width: 20px;
                    height: 20px;
                    margin: 0;
                }
            `;
		}

		return "";
	}}
`;
