import styled from "styled-components";
import { BaseAccordion } from "./base-accordion";

export const StyledAccordion = styled(BaseAccordion)<{ width: number }>`
	width: calc(${({ width }) => width}px + 0.5rem + 2px);
	::-webkit-scrollbar {
		width: 0px;
		background: transparent; /* make scrollbar transparent */
	}

	.animation-indicator {
		width: calc(100% + 1rem);
		margin: 0px auto 0 -0.5rem;
		transition: margin-bottom 0.3s;

		.indicator {
			background: ${({ theme }) => theme.colors.blue1};
			width: 0;
			transition:
				width 0.1s,
				height 0.3s;
		}

		&.animated {
			margin: 0px auto -0.5rem -0.5rem;

			.indicator {
				height: 10px;
			}
		}
	}
`;

export const StyledAccordionContent = styled(BaseAccordion.Content)`
	::-webkit-scrollbar {
		width: 0px;
		background: transparent; /* make scrollbar transparent */
	}
	&.nested-content {
		border-radius: 0 !important;
		padding: 0 !important;

		& > .content-wrapper {
			& > * {
				border-radius: 0 !important;
				padding: 0 !important;
				border: 0px !important;
			}

			& .content-button {
				border-radius: 0 !important;
			}

			& .content-container {
				border: 0px !important;
			}
		}
	}
`;
