import React, { type SVGProps } from "react";
import { IoCheckmark } from "react-icons/io5";
import { Button } from "./icons.styles";

type TickProps = SVGProps<HTMLButtonElement> & {
	isOuter?: boolean;
	disabled?: boolean;
};

const Tick = ({
	onClick,
	fill,
	isOuter,
	className = "",
	disabled,
}: TickProps) => {
	return (
		<Button
			disabled={disabled}
			className={`check ${className}`}
			type="button"
			isOuter={isOuter}
			onClick={onClick}
		>
			<IoCheckmark color={fill} size={24} />
		</Button>
	);
};

export default Tick;
