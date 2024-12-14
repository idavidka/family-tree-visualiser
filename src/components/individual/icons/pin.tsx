import React, {
	useState,
	type CSSProperties,
	type SVGProps,
	type MouseEvent,
	useEffect,
} from "react";
import { Button } from "./icons.styles";
import { RiPushpinLine, RiUnpinLine } from "react-icons/ri";

type HighlightTreeProps = SVGProps<HTMLButtonElement> & {
	isOuter?: boolean;
	style?: CSSProperties;
	onToggle?: (e: MouseEvent, pressed?: boolean) => void;
	isPressed?: boolean;
};

const Pin = ({
	onToggle,
	fill,
	isOuter,
	isPressed,
	style,
}: HighlightTreeProps) => {
	const [pressed, setPressed] = useState(isPressed);

	useEffect(() => {
		setPressed(isPressed);
	}, [isPressed]);

	return (
		<Button
			className={`pin ${pressed ? "pinned" : "unpinned"}`}
			type="button"
			isOuter={isOuter}
			onClick={(e) => {
				setPressed(!pressed);
				onToggle?.(e, !pressed);
			}}
			style={{ textAlign: "center", ...style }}
		>
			{pressed ? (
				<RiUnpinLine color={fill} size={18} />
			) : (
				<RiPushpinLine color={fill} size={18} />
			)}
		</Button>
	);
};

export default Pin;
