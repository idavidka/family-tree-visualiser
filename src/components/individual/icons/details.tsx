import React, { type SVGProps } from "react";
import { Button } from "./icons.styles";
import { BiDetail } from "react-icons/bi";

type AttachementProps = SVGProps<HTMLButtonElement> & { isOuter?: boolean };

const Details = ({ onClick, fill, isOuter }: AttachementProps) => {
	return (
		<Button
			className="details"
			type="button"
			isOuter={isOuter}
			onClick={onClick}
			style={{ textAlign: "center" }}
		>
			<BiDetail color={fill} size={18} />
		</Button>
	);
};

export default Details;
