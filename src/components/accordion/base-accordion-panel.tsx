import { type AccordionPanelProps } from "flowbite-react/lib/esm/components/Accordion/AccordionPanel";
import { AccordionPanelContext } from "flowbite-react/lib/esm/components/Accordion/AccordionPanelContext";
import type { FC } from "react";
import React, { useEffect, useState } from "react";

export interface BaseAccordionPanelProps
	extends Omit<AccordionPanelProps, "alwaysOpen"> {
	disableCollapsing?: boolean;
	disableOpening?: boolean;
}
export const BaseAccordionPanel: FC<BaseAccordionPanelProps> = ({
	children,
	disableCollapsing,
	disableOpening,
	...props
}) => {
	const [isOpen, setOpen] = useState(props.isOpen);

	useEffect(() => {
		setOpen(props.isOpen);
	}, [props.isOpen]);

	return (
		<AccordionPanelContext.Provider
			value={{
				...props,
				isOpen,
				setOpen: () => {
					if (
						(isOpen && disableCollapsing) ||
						(!isOpen && disableOpening)
					) {
						return;
					}

					setOpen(!isOpen);
					props.setOpen?.();
				},
			}}
		>
			{children}
		</AccordionPanelContext.Provider>
	);
};
