import React, { type SVGProps } from "react";
import { ButtonDiv } from "./icons.styles";
import { FiRefreshCcw } from "react-icons/fi";

type AttachementProps = SVGProps<HTMLDivElement> & {
	isOuter?: boolean;
	title?: string;
};

const Reverse = ({
	className = "",
	onClick,
	fill,
	isOuter,
	title,
}: AttachementProps) => {
	return (
		<ButtonDiv
			title={title}
			className={`reverse ${className}`}
			isOuter={isOuter}
			onClick={onClick}
			style={{ textAlign: "center" }}
		>
			<FiRefreshCcw color={fill} size={18} />
		</ButtonDiv>
	);
};

export default Reverse;
