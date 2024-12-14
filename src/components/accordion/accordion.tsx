import React, {
	type UIEventHandler,
	type PropsWithChildren,
	type RefObject,
	type ReactNode,
} from "react";
import { BaseAccordion, type BaseOpenedPanels } from "./base-accordion";
import { HiChevronDown } from "react-icons/hi";
import { StyledAccordion, StyledAccordionContent } from "./accordion.styled";

export type AccordionItem = PropsWithChildren<{
	label: PropsWithChildren["children"];
	titleBottom?: PropsWithChildren["children"];
	disableCollapsing?: boolean;
	disableOpening?: boolean;
	isNested?: boolean;
	icon?: ReactNode;
	onScroll?: UIEventHandler<HTMLDivElement>;
	ref?:
		| ((instance: HTMLDivElement | null) => void)
		| RefObject<HTMLDivElement>;
}>;

export interface AccordionProps {
	items: AccordionItem[];
	openedIndices?: BaseOpenedPanels;
	onToggle?: (indices: BaseOpenedPanels) => void;
	width: number;
}

const Accordion = ({
	items,
	openedIndices = {},
	onToggle,
	width,
}: AccordionProps) => {
	if (!items.length) {
		return null;
	}

	return (
		<StyledAccordion
			width={width}
			openedIndices={openedIndices}
			onToggle={onToggle}
			className="w-full accordion"
		>
			{items.map((item, index) => {
				const itemDisabled =
					item.disableCollapsing || item.disableOpening;

				return (
					<BaseAccordion.Panel
						key={index}
						disableCollapsing={item.disableCollapsing}
						disableOpening={item.disableOpening}
					>
						<BaseAccordion.Title
							arrowIcon={
								itemDisabled ? () => null : HiChevronDown
							}
							className={`content-button ${
								itemDisabled ? "pointer-events-none" : ""
								// eslint-disable-next-line max-len
							} flex flex-col items-center justify-between w-full p-2 font-medium text-left bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-50 focus:ring-0`}
							titleBottom={item.titleBottom}
						>
							{item.label} {item.icon}
						</BaseAccordion.Title>
						<StyledAccordionContent
							className={`content-container ${
								item.isNested ? "nested-content" : ""
							} p-1 max-h-80 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-800`}
							onScroll={item.onScroll}
							forwardRef={item.ref}
						>
							<div className="content-wrapper flex flex-col gap-1">
								{item.children}
							</div>
						</StyledAccordionContent>
					</BaseAccordion.Panel>
				);
			})}
		</StyledAccordion>
	);
};

export default Accordion;
