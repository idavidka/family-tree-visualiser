import { useTheme, type AccordionProps } from "flowbite-react";
import { mergeDeep } from "flowbite-react/lib/esm/helpers/merge-deep";
import type { FC } from "react";
import React, {
	Children,
	cloneElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { HiChevronDown } from "react-icons/hi";
import { twMerge } from "tailwind-merge";
import { BaseAccordionPanel } from "./base-accordion-panel";
import { BaseAccordionTitle } from "./base-accordion-title";
import { BaseAccordionContent } from "./base-accordion-content";

export type BaseOpenedPanels = Record<number, boolean | undefined>;

export type BaseAccordionProps = Omit<AccordionProps, "isOpen"> & {
	onToggle?: (indices: BaseOpenedPanels) => void;
	openedIndices?: BaseOpenedPanels;
};

const AccordionComponent: FC<BaseAccordionProps> = ({
	alwaysOpen = false,
	arrowIcon = HiChevronDown,
	children,
	flush = false,
	collapseAll = false,
	className,
	theme: customTheme = {},
	onToggle: onToggleProp,
	openedIndices,
	...props
}) => {
	const [opened, setOpened] = useState<BaseOpenedPanels>(
		openedIndices || (collapseAll ? {} : { 0: true })
	);

	useEffect(() => {
		if (openedIndices) {
			setOpened(openedIndices);
		}
	}, [openedIndices]);

	const onToggle = useCallback(
		(index: number) => {
			const newOpenedState = { ...opened, [index]: !opened[index] };

			setOpened(newOpenedState);
			onToggleProp?.(newOpenedState);
		},
		[onToggleProp, opened]
	);

	const panels = useMemo(
		() =>
			Children.map(children, (child, i) =>
				cloneElement(child, {
					alwaysOpen,
					arrowIcon,
					flush,
					isOpen: opened[i],
					setOpen: () => {
						onToggle(i);
					},
				})
			),
		[alwaysOpen, arrowIcon, children, flush, onToggle, opened]
	);

	const theme = mergeDeep(useTheme().theme.accordion.root, customTheme);

	return (
		<div
			className={twMerge(
				theme.base,
				theme.flush[flush ? "on" : "off"],
				className
			)}
			data-testid="flowbite-accordion"
			{...props}
		>
			{panels}
		</div>
	);
};

export const BaseAccordion = Object.assign(AccordionComponent, {
	Panel: BaseAccordionPanel,
	Title: BaseAccordionTitle,
	Content: BaseAccordionContent,
});
