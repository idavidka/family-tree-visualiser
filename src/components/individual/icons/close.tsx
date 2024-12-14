import React, { type SVGProps } from "react";
import { IoClose } from "react-icons/io5";
import { Button } from "./icons.styles";

type CloseProps = SVGProps<HTMLButtonElement> & {
	isOuter?: boolean;
	disabled?: boolean;
};

const Close = ({
	onClick,
	fill,
	isOuter,
	className = "",
	disabled,
}: CloseProps) => {
	return (
		<Button
			disabled={disabled}
			className={`close ${className}`}
			type="button"
			isOuter={isOuter}
			onClick={onClick}
		>
			<IoClose color={fill} size={24} />
		</Button>
	);
};

export default Close;
