import React, { type PropsWithChildren } from "react";
import { Container, Message, Title } from "./error.styled";

type Props = PropsWithChildren<{
	title: string;
	className?: string;
}>;
const Error = ({ title, children, className = "" }: Props) => {
	return (
		<Container className={className}>
			<Title>{title}</Title>
			<Message>{children}</Message>
		</Container>
	);
};

export default Error;
