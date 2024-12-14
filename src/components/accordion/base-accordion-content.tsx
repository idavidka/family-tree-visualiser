import type { FC, RefObject } from "react";
import { twMerge } from "tailwind-merge";
import { type AccordionContentProps } from "flowbite-react/lib/esm/components/Accordion/AccordionContent";
import React from "react";
import { useAccordionContext } from "flowbite-react/lib/esm/components/Accordion/AccordionPanelContext";
import { useTheme } from "flowbite-react";
import { mergeDeep } from "flowbite-react/lib/esm/helpers/merge-deep";

type Props = AccordionContentProps & {
	forwardRef?:
		| ((instance: HTMLDivElement | null) => void)
		| RefObject<HTMLDivElement>;
};

export const BaseAccordionContent: FC<Props> = ({
	children,
	className,
	theme: customTheme = {},
	forwardRef,
	...props
}) => {
	const { isOpen } = useAccordionContext();

	const theme = mergeDeep(useTheme().theme.accordion.content, customTheme);

	return (
		<div
			className={twMerge(theme.base, className)}
			data-testid="flowbite-accordion-content"
			hidden={!isOpen}
			ref={forwardRef}
			{...props}
		>
			{isOpen ? children : null}
		</div>
	);
};
