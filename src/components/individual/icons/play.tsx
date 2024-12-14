import React, {
	useState,
	type CSSProperties,
	type SVGProps,
	useEffect,
} from "react";
import { ButtonDiv } from "./icons.styles";
import { GiPlainSquare, GiPlayButton } from "react-icons/gi";

type PlayProps = SVGProps<HTMLDivElement> & {
	isOuter?: boolean;
	style?: CSSProperties;
	pressed?: boolean;
	title?: string;
};

const Play = ({
	className = "",
	fill,
	isOuter,
	style,
	pressed: pressedProp,
	onClick,
	title,
}: PlayProps) => {
	const [pressed, setPressed] = useState(pressedProp);

	useEffect(() => {
		setPressed(pressedProp);
	}, [pressedProp]);

	return (
		<ButtonDiv
			title={title}
			className={`play ${className}`}
			isOuter={isOuter}
			onClick={(e) => {
				onClick?.(e);
				setPressed(!pressed);
			}}
			style={{ textAlign: "center", ...style }}
		>
			{pressed ? (
				<GiPlainSquare color={fill} size={18} />
			) : (
				<GiPlayButton color={fill} size={18} />
			)}
		</ButtonDiv>
	);
};

export default Play;
