import React, { type CSSProperties, type SVGProps } from "react";
import { Button } from "./icons.styles";
import { SlOptionsVertical } from "react-icons/sl";

type AttachementProps = SVGProps<HTMLButtonElement> & {
	isOuter?: boolean;
	style?: CSSProperties;
};

const Options = ({ onClick, fill, isOuter, style }: AttachementProps) => {
	return (
		<Button
			className="details"
			type="button"
			isOuter={isOuter}
			onClick={onClick}
			style={{ textAlign: "center", ...style }}
		>
			<SlOptionsVertical color={fill} size={18} />
		</Button>
	);
};

export default Options;
