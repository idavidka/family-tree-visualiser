import styled from "styled-components";
import tw from "tailwind-styled-components";
import { type Settings } from "../../store/main/reducers";
import React, { useMemo } from "react";
import { nameFormatter } from "../../utils/name-formatter";
import { Indi, type IndiType } from "../../classes/gedcom/classes/indi";

interface Props {
	hasCloseIcon?: boolean;
	name?: ReturnType<typeof nameFormatter> | string | IndiType;
	settings: Settings;
	className?: string;
	rawText?: boolean;
}

const TwName = tw.div`
    transition-colors
    duration-500
    group-hover:text-indigo-900
    group-[.on-stage]:invisible
`;

export const StyledName = styled(TwName)<Pick<Props, "hasCloseIcon">>`
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
	font-weight: lighter;
`;

export const Name = ({
	hasCloseIcon,
	name,
	className = "",
	settings,
	rawText,
}: Props) => {
	const formattedName = useMemo<
		ReturnType<typeof nameFormatter> | undefined
	>(() => {
		if (typeof name === "string" || name instanceof Indi) {
			return nameFormatter(name, settings);
		}
		return name;
	}, [name, settings]);

	if (!formattedName) {
		return null;
	}

	const { suffix, surname, givenname } = formattedName;

	const text = (
		<>
			{settings.showSuffix && suffix ? `${suffix} ` : ""}
			{settings.nameOrder === "last-first" ? (
				<>
					{surname && <strong>{surname}</strong>} {givenname}
				</>
			) : (
				<>
					{givenname} {surname && <strong>{surname}</strong>}
				</>
			)}
		</>
	);

	if (rawText) {
		return text;
	}

	return (
		<StyledName
			className={`individual-name ${className}`}
			hasCloseIcon={hasCloseIcon}
		>
			{text}
		</StyledName>
	);
};
