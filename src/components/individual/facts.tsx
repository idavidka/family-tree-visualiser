import React, { type ReactNode } from "react";
import { type IndiType } from "../../classes/gedcom/classes/indi";
import { Date } from "./date.styled";
import { dateFormatter, noteDateFormatter } from "../../utils/date-formatter";
import { useSelector } from "react-redux";
import { selectSettings } from "../../store/main/selectors";
import { Container, Label, Row, Separator } from "./facts.styled";
import { useTranslation } from "react-i18next";
import { placeTranslator } from "../../utils/place-translator";
import { CommonName } from "../../classes/gedcom/classes/name";
import { type Settings } from "../../store/main/reducers";
import { Name } from "./name";
import { nameFormatter } from "../../utils/name-formatter";

interface Props {
	item: IndiType;
	itemDates?: ReturnType<typeof dateFormatter>;
	onlyDates?: boolean;
	settings: Settings;
}
const Facts = ({ item, onlyDates, itemDates, settings }: Props) => {
	const { t } = useTranslation();

	if (onlyDates) {
		const dates = itemDates ?? dateFormatter(item, true);
		return (
			<Date className="avoid-stage-gesture">{dates.inOrder || "-"}</Date>
		);
	}

	const facts = item.getFacts();

	const factChildren = facts.map((fact, index) => {
		const label = (fact.get("_LABEL")?.toValue() || "") as string;
		const factPlace = placeTranslator(
			fact.get("PLAC")?.toValue() as string | undefined
		);

		const noteCommon = fact.get("NOTE");
		let note = noteCommon?.toValue() as string | undefined;
		let noteComponent: ReactNode;

		if (noteCommon instanceof CommonName) {
			noteComponent = (
				<Name
					className="avoid-stage-gesture"
					settings={settings}
					name={nameFormatter(note, settings)}
					rawText
				/>
			);
		} else if (
			note?.toLowerCase()?.includes("marital status") ||
			note?.toLowerCase()?.includes("relation to head")
		) {
			note = undefined;
		}

		const value = (noteComponent || fact.toValue() || note) as ReactNode;

		if (!value && !factPlace) {
			return [];
		}

		const factDate = noteDateFormatter(
			fact.get("DATE"),
			t("dateFormat"),
			"",
			false
		) as string | undefined;

		const valueStrings = (
			<>
				{value ?? ""}
				{factPlace ? `${value ? "   " : ""}${factPlace}` : ""}
			</>
		);

		return (
			<Row key={index}>
				<span>{factDate || null}</span>
				<Label>{t(label)}:</Label>
				<span>{valueStrings}</span>
			</Row>
		);
	});

	const {
		birth: rawBirth,
		birthPlace,
		death: rawDeath,
		deathPlace,
		marriages,
		marriagePlaces,
	} = dateFormatter(item, true, true, true, false, true);

	const birth = rawBirth || (birthPlace ? "*?" : "");
	const death = rawDeath || (deathPlace ? "†?" : "");

	return (
		<Container>
			{birth && (
				<Row>
					<Label>{t("Birth")}: </Label>
					<span>{birth}</span>
					<span>{birthPlace}</span>
				</Row>
			)}
			{death && (
				<Row>
					<Label>{t("Death")}: </Label>
					<span>{death}</span>
					<span>{deathPlace}</span>
				</Row>
			)}
			{marriages?.map((rawMarriage, index) => {
				const marriagePlace = marriagePlaces?.[index];
				const marriage = rawMarriage || (marriagePlace ? "∞?" : "");

				return marriage ? (
					<Row key={index}>
						<Label>{t("Marriage")}:</Label>
						<span>{marriage}</span>
						<span>{marriagePlace}</span>
					</Row>
				) : null;
			})}

			{factChildren.length ? (
				<Row className="no-bg">
					<Separator />
				</Row>
			) : null}
			{factChildren}
		</Container>
	);
};

export default Facts;
