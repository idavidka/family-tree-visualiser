import React, {
	useState,
	type CSSProperties,
	type SVGProps,
	type MouseEvent,
} from "react";
import { ButtonDiv } from "./icons.styles";
import { GiFamilyTree } from "react-icons/gi";

type HighlightTreeProps = SVGProps<HTMLDivElement> & {
	isOuter?: boolean;
	style?: CSSProperties;
	onToggle?: (e: MouseEvent, pressed?: boolean) => void;
	title?: string;
};

const HighlightTree = ({
	className = "",
	onToggle,
	fill,
	isOuter,
	style,
	title,
}: HighlightTreeProps) => {
	const [pressed, setPressed] = useState(false);
	return (
		<ButtonDiv
			title={title}
			className={`highlight-tree ${
				pressed ? "pressed" : ""
			} ${className}`}
			isOuter={isOuter}
			onClick={(e) => {
				setPressed(!pressed);
				onToggle?.(e, !pressed);
			}}
			style={{ textAlign: "center", ...style }}
		>
			<GiFamilyTree color={fill} size={18} />
		</ButtonDiv>
	);
};

export default HighlightTree;
