import React, {
	type FC,
	type PropsWithChildren,
	type MouseEventHandler,
	useCallback,
} from "react";
import { twMerge } from "tailwind-merge";
import { type AccordionTitleProps } from "flowbite-react/lib/esm/components/Accordion/AccordionTitle";
import { useAccordionContext } from "flowbite-react/lib/esm/components/Accordion/AccordionPanelContext";
import { mergeDeep } from "flowbite-react/lib/esm/helpers/merge-deep";
import { useTheme } from "flowbite-react";

export const BaseAccordionTitle: FC<
	AccordionTitleProps & {
		titleBottom?: PropsWithChildren["children"];
	}
> = ({
	as: Heading = "h2",
	children,
	className,
	theme: customTheme = {},
	arrowIcon,
	titleBottom,
	...props
}) => {
	const {
		arrowIcon: contextArrowIcon,
		flush,
		isOpen,
		setOpen,
	} = useAccordionContext();
	const onClick = useCallback<MouseEventHandler>(
		(e) => {
			const target = e.target as HTMLElement | undefined;
			if (target?.closest(".avoid-gestures")) {
				return;
			}

			setOpen?.();
		},
		[setOpen]
	);

	const theme = mergeDeep(useTheme().theme.accordion.title, customTheme);

	const ArrowIcon = arrowIcon || contextArrowIcon;

	return (
		<button
			className={twMerge(
				theme.base,
				theme.flush[flush ? "on" : "off"],
				theme.open[isOpen ? "on" : "off"],
				className
			)}
			onClick={onClick}
			type="button"
			{...props}
		>
			<div className="w-full flex">
				<Heading
					className={`w-full flex justify-between ${theme.heading}`}
					data-testid="flowbite-accordion-heading"
				>
					{children}
				</Heading>
				{ArrowIcon && arrowIcon && (
					<ArrowIcon
						aria-hidden
						className={`flex-none ${twMerge(
							theme.arrow.base,
							theme.arrow.open[isOpen ? "on" : "off"]
						)}`}
						data-testid="flowbite-accordion-arrow"
					/>
				)}
			</div>
			{titleBottom}
		</button>
	);
};
