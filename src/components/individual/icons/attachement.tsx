import React, { type SVGProps } from "react";
import { Button } from "./icons.styles";
import { IoLink } from "react-icons/io5";

type AttachementProps = SVGProps<HTMLButtonElement> & { isOuter?: boolean };

const Attachement = ({ onClick, fill, isOuter }: AttachementProps) => {
	return (
		<Button
			className="attachement"
			type="button"
			isOuter={isOuter}
			onClick={onClick}
			style={{ textAlign: "center" }}
		>
			<IoLink color={fill} size={18} />
		</Button>
	);
};

export default Attachement;
