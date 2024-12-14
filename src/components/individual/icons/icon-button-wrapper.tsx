import React, { type PropsWithChildren, useMemo, Children } from "react";
import { type IconButtonProps, StyledIconButtonWrapper } from "./icons.styles";
import Options from "./options";

type Props = PropsWithChildren<
	IconButtonProps & {
		optionsClassName?: string;
		alwaysVisibleChildren?: PropsWithChildren["children"];
		maxVisibleIcons?: number;
	}
>;

const IconButtonWrapper = ({
	children,
	alwaysVisibleChildren,
	isOuter,
	optionsClassName = "",
	maxVisibleIcons = Infinity,
}: Props) => {
	const buttons = useMemo(() => {
		const mappedChildren = (
			Children.map(children, (child) => child) ?? []
		).filter(Boolean);
		const mappedAlwaysVisibleChildren = (
			Children.map(alwaysVisibleChildren, (child) => child) ?? []
		).filter(Boolean);
		if (
			mappedChildren.length + mappedAlwaysVisibleChildren.length <=
				maxVisibleIcons ||
			isOuter
		) {
			return {
				visible: mappedChildren,
				hidden: null,
				alwaysVisibleChildren: mappedAlwaysVisibleChildren,
			};
		}

		return {
			visible: [
				<div key="option" className="visible-wrapper">
					<Options isOuter={isOuter} className={optionsClassName} />
				</div>,
			],
			hidden: mappedChildren,
			alwaysVisibleChildren: mappedAlwaysVisibleChildren,
		};
	}, [
		alwaysVisibleChildren,
		children,
		isOuter,
		maxVisibleIcons,
		optionsClassName,
	]);

	return (
		<StyledIconButtonWrapper
			isOuter={isOuter}
			length={buttons.hidden?.length ?? 0}
		>
			{buttons.visible}
			{buttons.hidden && (
				<div className="hidden-wrapper">{buttons.hidden}</div>
			)}
			{buttons.alwaysVisibleChildren}
		</StyledIconButtonWrapper>
	);
};

export default IconButtonWrapper;
