import React, { useMemo } from "react";
import { type ValidationDetails } from "../../hooks/use-drag-drop-zoom";
import { type IndiKey } from "../../types/types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type ErrorMessageType =
	| "CHILD"
	| "PARENT"
	| "SIBLING"
	| "SPOUSE"
	| "CHILD_IN_LAW"
	| "PARENT_IN_LAW";

const messageMap: Record<ErrorMessageType, string> = {
	CHILD: "children",
	PARENT: "parents",
	SPOUSE: "spouses",
	SIBLING: "siblings",
	CHILD_IN_LAW: "children in law",
	PARENT_IN_LAW: "parents in law",
};

interface Props {
	details: Array<ValidationDetails<ErrorMessageType, IndiKey>>;
}
const InvalidPlaces = ({ details }: Props) => {
	const { t } = useTranslation();
	const errorMessages = useMemo(() => {
		const globals: {
			occupied?: boolean;
			invalidUpperLevel?: boolean;
			invalidLowerLevel?: boolean;
			invalidSameLevel?: boolean;
		} = {};

		const containers: Record<
			IndiKey,
			{
				id: IndiKey;
				name: string;
				items: string[];
			}
		> = {};
		details.forEach(({ details: message, status, ...detail }) => {
			if (status === "RESERVED" && message && detail.id && detail.name) {
				if (!containers[detail.id]) {
					containers[detail.id] = {
						id: detail.id,
						name: detail.name.replaceAll("/", ""),
						items: [],
					};
				}

				containers[detail.id].items.push(messageMap[message]);
			}

			if (status === "INVALID_LEVEL" && message) {
				if (message === "SIBLING" || message === "SPOUSE") {
					globals.invalidSameLevel = true;
				}
				if (message === "PARENT") {
					globals.invalidUpperLevel = true;
				}
				if (message === "CHILD") {
					globals.invalidLowerLevel = true;
				}
			}

			if (status === "OCCUPIED") {
				globals.occupied = true;
			}
		});

		return { globals, containers };
	}, [details]);

	const errorCount = Object.keys(errorMessages.containers).length;
	const globalErrorCount = Object.keys(errorMessages.globals).length;
	const allErrorCount = errorCount + globalErrorCount;

	if (allErrorCount < 1) {
		return null;
	}

	return (
		<>
			{errorMessages.globals.occupied && (
				<div>{t("This place is already occupied")}</div>
			)}
			{errorMessages.globals.invalidSameLevel && (
				<div>
					{t(
						"This item must be placed on the same level as its siblings and spouses"
					)}
				</div>
			)}
			{errorMessages.globals.invalidUpperLevel && (
				<div>
					{t(
						"This item must be placed one level up than its children"
					)}
				</div>
			)}
			{errorMessages.globals.invalidLowerLevel && (
				<div>
					{t(
						"This item must be placed one level down than its parents"
					)}
				</div>
			)}
			{errorCount && !globalErrorCount ? (
				<div>
					{t("This place is reserved for")}{" "}
					{Object.values(errorMessages.containers).map(
						({ id, name, items }, index) => {
							return (
								<div key={index}>
									<Link to={id}>
										<strong>{t("names", { name })}</strong>{" "}
										{items
											.map((item) => t(`b-${item}`))
											.join(", ")}
									</Link>
								</div>
							);
						}
					)}
				</div>
			) : null}
		</>
	);
};

export default InvalidPlaces;
