import React, {
	useCallback,
	type CSSProperties,
	useState,
	useEffect,
	useRef,
	useMemo,
	type ReactNode,
	memo,
} from "react";
import { type IndiKey } from "../../types/types";
import {
	Container,
	IconWrapper,
	type ContainerProps,
	NameWrapper,
	BottomLabel,
	TopLabel,
} from "./individual.styled";
import Close from "./icons/close";
import { Name } from "./name";
import { type IndiType } from "../../classes/gedcom/classes/indi";
import { IoIosWarning, IoMdFemale, IoMdMale } from "react-icons/io";
import { type Settings } from "../../store/main/reducers";
import Attachement from "./icons/attachement";
import { openInNewTab } from "../../utils/link";
import { useInView } from "react-intersection-observer";
import { dateFormatter } from "../../utils/date-formatter";
import { nameFormatter } from "../../utils/name-formatter";
import { Kinship } from "./kinship.styled";
import { Loading } from "../loading/loading";
import {
	type SingleKinshipMessageResponsePayload,
	type KinshipMessageResponsePayload,
} from "../../workers/types";
import Facts from "./facts";
import { usePrevious } from "react-use";
import Details from "./icons/details";
import IconButtonWrapper from "./icons/icon-button-wrapper";
import { refReady } from "../../utils/ref-ready";
import { useTranslation } from "react-i18next";
import Pin from "./icons/pin";

interface FixedStyle {
	left?: number;
	top?: number;
}
interface IndividualProps {
	type?: ContainerProps["type"];
	record: IndiType;
	relatedTo?: IndiKey;
	connectedTo?: IndiKey;
	showFacts?: boolean;
	onAction?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar"
	) => void;
	onSelect?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar",
		pin?: "add" | "remove"
	) => void;
	onContext?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar"
	) => void;
	onHover?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar",
		type?: "leave" | "enter"
	) => void;
	onClose?: (e: React.MouseEvent, selected: IndiKey) => void;
	isSelected?: boolean;
	isOnStage?: boolean;
	isPinned?: boolean;
	className?: string;
	style?: CSSProperties;
	settings: Settings;
	getKinship?: (indi: IndiType) => Promise<KinshipMessageResponsePayload>;
	index?: number;
	topLabel?: ReactNode;
	bottomLabel?: ReactNode;
}

const Individual = ({
	type = "draggable",
	className = "",
	record: item,
	relatedTo,
	connectedTo,
	isSelected,
	isPinned,
	isOnStage,
	showFacts,
	onSelect,
	onClose,
	onAction,
	onHover,
	onContext,
	style,
	settings,
	getKinship,
	topLabel,
	bottomLabel,
}: IndividualProps) => {
	const { t } = useTranslation();
	const { inView, ref: containerRef } = useInView({
		threshold: 0,
	});
	const ref = useRef<HTMLDivElement | null>(null);

	const kinshipReader = useRef<Promise<KinshipMessageResponsePayload>>();
	const [kinshipStatus, setKinshipStatus] = useState<"idle" | "loading">();
	const [kinshipText, setKinshipText] =
		useState<SingleKinshipMessageResponsePayload>();

	const [fixedStyle, setFixedStyle] = useState<FixedStyle>({});

	const isOuter = useMemo(() => type === "dropped", [type]);
	const isOverlay = useMemo(() => type === "overlay", [type]);
	useEffect(() => {
		let stylingTimeout: NodeJS.Timeout | undefined;
		if (isOverlay) {
			if (ref.current) {
				ref.current.style.opacity = "0";
			}
			setFixedStyle({});
			stylingTimeout = refReady(
				ref,
				() => {
					setTimeout(() => {
						if (!ref.current) {
							return;
						}
						if (isOverlay) {
							const topMost = 10;
							const bottomMost = window.innerHeight - 10;
							const leftMost = 10;
							const rightMost = window.innerWidth - 10;

							const checkBounds =
								ref.current.getBoundingClientRect();
							const newFixedStyle: FixedStyle = {};
							if (checkBounds.top < topMost) {
								newFixedStyle.top = topMost;
							}
							if (
								checkBounds.top >
								bottomMost - checkBounds.height
							) {
								newFixedStyle.top =
									bottomMost - checkBounds.height;
							}
							if (checkBounds.left < leftMost) {
								newFixedStyle.left =
									leftMost + checkBounds.width / 2;
							}
							if (
								checkBounds.left >
								rightMost - checkBounds.width
							) {
								newFixedStyle.left =
									rightMost - checkBounds.width / 2;
							}

							setFixedStyle(newFixedStyle);

							ref.current.style.opacity = "1";
						}
					}, 100);
				},
				50,
				20
			);
		}

		return () => {
			clearTimeout(stylingTimeout);
		};
	}, [item.id, isOverlay]);

	const previousRelatedTo = usePrevious(relatedTo);
	useEffect(() => {
		if (topLabel || bottomLabel) {
			return;
		}
		if (relatedTo !== previousRelatedTo) {
			setKinshipStatus("idle");
			setKinshipText(undefined);
			kinshipReader.current = undefined;
		}

		if (inView && item && getKinship) {
			setKinshipStatus("loading");
			setKinshipText(undefined);
			kinshipReader.current = getKinship(item);
		}

		kinshipReader.current
			?.then((kinship) => {
				setKinshipStatus("idle");
				setKinshipText(kinship as SingleKinshipMessageResponsePayload);
			})
			.catch(() => {
				setKinshipStatus("idle");
				setKinshipText(undefined);
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		bottomLabel,
		getKinship,
		inView,
		item.id,
		previousRelatedTo,
		relatedTo,
		topLabel,
	]);

	const onDoubleClick = useCallback(
		(e: React.MouseEvent, selected: IndiKey) => {
			onAction?.(e, selected);
		},
		[onAction]
	);

	const onClick = useCallback(
		(e: React.MouseEvent, selected: IndiKey) => {
			const target = e.target as HTMLDivElement | undefined;

			if (target?.closest(".close")) {
				onClose?.(e, selected);
			} else if (target?.closest(".attachement")) {
				const link = item?.link(settings.poolId);
				link && openInNewTab(link);
			} else if (target?.closest(".details")) {
				onContext?.(
					e,
					selected,
					type === "dropped" ? "stage" : "sidebar"
				);
			} else {
				onSelect?.(
					e,
					selected,
					type === "dropped" ? "stage" : "sidebar",
					target?.closest(".pin")
						? target?.closest(".unpinned")
							? "add"
							: "remove"
						: undefined
				);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[item.id, onClose, onContext, onSelect, settings.poolId, type]
	);

	const ids = useMemo(() => {
		const spouse = Object.keys(item?.FAMS?.toValueList().items ?? {}).join(
			","
		);
		const child = Object.keys(item?.FAMC?.toValueList().items ?? {}).join(
			","
		);
		return { spouse, child };
	}, [item.FAMC, item.FAMS]);

	const hasFacts = useMemo(
		() => inView && item.hasFacts(),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[inView, item.id]
	);

	const { link, sex, dates, formattedName, title } = useMemo(() => {
		if (!item) {
			return {};
		}

		const link = item.link(settings.poolId);
		const sex = item.SEX?.toValue();
		const dates = dateFormatter(item, settings.showMarriages);

		const formattedName = nameFormatter(item, settings);
		const { inOrder } = formattedName;

		const title = [
			...inOrder,
			dates?.inOrder ? `(${dates.inOrder})` : undefined,
		].filter(Boolean);

		return { link, sex, dates, inOrder, formattedName, title };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.id, settings]);

	if (!hasFacts && isOverlay && inView) {
		return null;
	}

	return (
		<Container
			ref={(r) => {
				ref.current = r;
				containerRef(r);
			}}
			width={settings.individualSize.w}
			height={settings.individualSize.h}
			title={title?.join(" ") ?? ""}
			id={`${type}.${item.id}`}
			type={type}
			sex={sex}
			isHomePerson={item.id === relatedTo}
			isConnectedPerson={item.id === connectedTo}
			isOnStage={isOnStage}
			className={`avoid-stage-gesture ${className}`}
			data-fam-id={`${ids.spouse},${ids.child}`}
			style={{ ...style, ...fixedStyle }}
			hasTopLabel={!!topLabel}
			hasBottomLabel={!!bottomLabel}
			onDoubleClick={(e) => {
				item.id && onDoubleClick?.(e, item.id);
			}}
			onClick={(e) => {
				item.id && onClick?.(e, item.id);
			}}
			onContextMenu={(e) => {
				if (item.id) {
					onContext?.(e, item.id);

					e.preventDefault();
				}
			}}
			onMouseEnter={(e) => {
				if (item.id) {
					onHover?.(e, item.id, undefined, "enter");

					e.preventDefault();
				}
			}}
			onMouseLeave={(e) => {
				if (item.id) {
					onHover?.(e, item.id, undefined, "leave");

					e.preventDefault();
				}
			}}
			color={settings.genderColors[sex ?? "U"]}
		>
			{inView ? (
				<>
					{topLabel && <TopLabel>{topLabel}</TopLabel>}
					{/* {isDev && (
						<Id>
							{index !== undefined ? `${index};` : ""}
							{ids.spouse}; {ids.child}; 
							{item.id}
						</Id>
					)} */}
					<NameWrapper>
						<Name
							hasCloseIcon={isSelected}
							className="avoid-stage-gesture"
							settings={settings}
							name={formattedName}
						/>
						<IconButtonWrapper
							isOuter={isOuter}
							optionsClassName="avoid-stage-gesture"
							maxVisibleIcons={2}
							alwaysVisibleChildren={
								isSelected || isOuter ? (
									<Close
										className="avoid-stage-gesture"
										isOuter={isOuter}
									/>
								) : null
							}
						>
							{link ? (
								<Attachement
									className="avoid-stage-gesture"
									isOuter={isOuter}
								/>
							) : null}
							{hasFacts && !isOverlay ? (
								<Details
									className="avoid-stage-gesture"
									isOuter={isOuter}
								/>
							) : null}
							{!isOverlay ? (
								<Pin
									className="avoid-stage-gesture"
									isOuter={isOuter}
									isPressed={isPinned}
								/>
							) : null}
						</IconButtonWrapper>
					</NameWrapper>
					<Facts
						onlyDates={!showFacts}
						item={item}
						itemDates={dates}
						settings={settings}
					/>
					{!showFacts ? (
						<>
							<IconWrapper className="avoid-stage-gesture">
								{sex === "F" && <IoMdFemale />}
								{sex === "M" && <IoMdMale />}
								{item.isUnknownAncestor() ? (
									<IoIosWarning
										className="warning-sign-2"
										title={t("Unknown person")}
									/>
								) : null}
								{item.isUnattachedMember() ? (
									<IoIosWarning
										className="warning-sign-1"
										title={t("Unattached person")}
									/>
								) : null}
							</IconWrapper>

							{kinshipText?.short ||
							kinshipStatus === "loading" ? (
								<Kinship title={kinshipText?.long}>
									{kinshipStatus === "loading" ? (
										<Loading
											visible
											inline
											showLabel={false}
										/>
									) : (
										kinshipText?.short
									)}
								</Kinship>
							) : null}
						</>
					) : null}
					{bottomLabel && <BottomLabel>{bottomLabel}</BottomLabel>}
				</>
			) : null}
		</Container>
	);
};

export default memo(Individual);
