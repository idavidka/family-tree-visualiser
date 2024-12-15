import useDragDropZoom from "../../hooks/use-drag-drop-zoom";
import React, {
	useMemo,
	type ChangeEventHandler,
	useCallback,
	useRef,
	useEffect,
	useState,
	Fragment,
	type MutableRefObject,
	memo,
} from "react";
import { type MultiTag, type IndiKey, type FamKey } from "../../types/types";
import { Container, List, Wrapper } from "./sidebar.styled";
import Header from "./header";
import Individual from "../individual/individual";
import {
	actions,
	type AccordionId,
	type Settings,
	type TreeState,
} from "../../store/main/reducers";
import { useDispatch, useSelector } from "react-redux";
import {
	selectSelected,
	selectAllIndis,
	selectIndiPositions,
	selectSearched,
	selectAllOpened,
	selectSearchHistory,
	selectSidebarOpen,
	selectRawIds,
	selectSelectedRaw,
	selectSelectedForKinship,
	selectRaw,
	selectPinned,
} from "../../store/main/selectors";
import {
	type TagNameType,
	type TagInputData,
	type TagSpecifierType,
} from "../search-input/types";
import { Individuals } from "../../classes/gedcom/classes/indis";
import {
	filterCacheMap,
	filterMap,
	getSearchedConfig,
	typeSpecifiers,
} from "../search-input/utils";
import Accordion from "../accordion/accordion";
import { type BaseOpenedPanels } from "../accordion/base-accordion";
import { useNavigate, useParams } from "react-router";
import { AGE_ASC, getNameAscAndBirth } from "../../constants/orders";
import { useTranslation } from "react-i18next";
import { isDevelopment } from "../../utils/get-product-details";
import { Typeahead } from "../inputs/typeahead-input";
import { nameFormatter } from "../../utils/name-formatter";
import useAppWorker from "../../hooks/use-app-worker";
import { useLocale } from "../../translation/useLocale";
import { Loading } from "../loading/loading";
import { type MultiKinshipMessageResponsePayload } from "../../workers/types";
import { dateFormatter } from "../../utils/date-formatter";
import { intersection, sum, uniq } from "lodash";
import HighlightTree from "../individual/icons/highlight-tree";
import Play from "../individual/icons/play";
import { type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import Reverse from "../individual/icons/reverse";
import { getLineLength } from "../../utils/line";
import { useDebounce } from "react-use";
import ErrorComponent from "../error/error";
import { Name } from "../individual/name";

const {
	setOpened,
	addRaw,
	renameRaw,
	setSelectedRaw,
	setSearched,
	setSelected,
	setSelectedForKinship,
	deleteRaw,
} = actions;

const isDev = isDevelopment();

const TRAVEL_DURATION = 5000;
const TRAVEL_DELAY = 5000;

interface Props {
	transRef?: MutableRefObject<ReactZoomPanPinchContentRef | null>;
	onSelect?: (
		e: React.MouseEvent | undefined,
		selected: IndiKey,
		source?: "stage" | "sidebar",

		pin?: "add" | "remove",
		changeUrl?: boolean
	) => void;
	onHover?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar",
		type?: "leave" | "enter"
	) => void;
	onContext?: (
		e: React.MouseEvent,
		selected: IndiKey,
		source?: "stage" | "sidebar"
	) => void;
	settings: Settings;
}

const Sidebar = ({
	onSelect: onSelectProp,
	onHover,
	onContext,
	settings,
	transRef,
}: Props) => {
	const { language } = useLocale();
	const { t } = useTranslation();
	const mainListRef = useRef<HTMLDivElement>(null);
	const animationIndicatorRef = useRef<HTMLDivElement>(null);
	const accordionsRef = useRef<
		Record<string, Record<number, HTMLDivElement | null>>
	>({});
	const { indi: selectedByRoute } = useParams<{ indi: IndiKey }>();
	const navigate = useNavigate();

	useDragDropZoom({
		dragTarget: ".individual-draggable",
		clone: true,
		cloneDelay: 500,
	});

	const { sendKinshipMessage, sendValidationMessage } = useAppWorker();

	const items = useSelector(selectAllIndis);
	const itemsOnStage = useSelector(selectIndiPositions);
	const selected = useSelector(selectSelected);
	const pinnedIndis = useSelector(selectPinned);
	const forKinship = useSelector(selectSelectedForKinship);
	const searched = useSelector(selectSearched);
	const opened = useSelector(selectAllOpened);
	const history = useSelector(selectSearchHistory);
	const sidebarOpen = useSelector(selectSidebarOpen);
	const raw = useSelector(selectRaw);
	const raws = useSelector(selectRawIds);
	const rawId = useSelector(selectSelectedRaw);
	const dispatch = useDispatch();

	const selectedForKinship = useMemo(
		() => selected && forKinship,
		[forKinship, selected]
	);

	const pinned = useMemo(
		() =>
			pinnedIndis
				?.split(",")
				.reduce<Record<string, boolean>>((acc, curr) => {
					acc[curr] = true;

					return acc;
				}, {}),
		[pinnedIndis]
	);

	const typeaheadList = useMemo(() => {
		return (
			items?.map((item) => {
				const name = nameFormatter(item, settings).inOrder.join(" ");
				const dates = dateFormatter(item, settings.showMarriages);
				return {
					key: item.id || name,
					label: `${name} ${
						dates?.inOrder ? `(${dates.inOrder})` : ""
					}`,
				};
			}) ?? []
		).toSorted((a, b) => a.label.localeCompare(b.label));
	}, [items, settings]);

	const [kinshipLoading, setKinshipLoading] = useState(false);
	const [kinship, setKinship] =
		useState<MultiKinshipMessageResponsePayload>();

	const onSelectForKinship = useCallback(
		(s?: IndiKey) => {
			dispatch(setSelectedForKinship(s));
		},
		[dispatch]
	);

	const onSelect = useCallback(
		(
			e: React.MouseEvent | undefined,
			s: IndiKey,
			src?: "stage" | "sidebar",
			p?: "add" | "remove",
			f?: boolean
		) => {
			onSelectProp?.(e, s, src, p, f);

			if (s && s === selectedForKinship && f) {
				onSelectForKinship();
			}
		},
		[onSelectProp, selectedForKinship, onSelectForKinship]
	);

	const onCenter = useCallback(
		(
			e: React.MouseEvent<Element, MouseEvent>,
			s: `@I${number}@`,
			src?: "stage" | "sidebar",
			p?: "add" | "remove"
		) => {
			onSelect(e, s, src, p, false);
		},
		[onSelect]
	);

	useEffect(() => {
		const selectedRoute = selectedByRoute?.split(",") as
			| [IndiKey?, IndiKey?]
			| undefined;
		const [routeSelected, routeKinship] = selectedRoute ?? [];
		const usedSelected =
			routeSelected && routeSelected !== selected
				? routeSelected
				: selected;

		const usedKinship =
			routeKinship && routeKinship !== selectedForKinship
				? routeKinship
				: selectedForKinship;

		setKinshipLoading(Boolean(usedSelected && usedKinship));
		setKinship(undefined);

		if (usedSelected && usedKinship) {
			sendKinshipMessage({
				first: usedSelected,
				second: usedKinship,
				raw,
				lang: language,
				entirePath: true,
				displayName: "all",
			})
				.then((response) => {
					setKinshipLoading(false);
					const data = response.response?.data as
						| MultiKinshipMessageResponsePayload
						| undefined;
					setKinship(
						data?.long && data.long.length > 1 ? data : undefined
					);
				})
				.catch(() => {
					setKinshipLoading(false);
					setKinship(undefined);
				});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected, selectedByRoute, selectedForKinship]);

	const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
		(e) => {
			if (!e.target.files?.length) {
				return;
			}

			const reader = new FileReader();
			reader.addEventListener("load", (event) => {
				if (
					!e.target.files?.[0].name ||
					!event.target?.result ||
					typeof event.target.result !== "string"
				) {
					return;
				}

				dispatch(
					addRaw({
						id: e.target.files[0].name,
						raw: event.target.result,
					})
				);
			});
			reader.readAsText(e.target.files[0]);
		},
		[dispatch]
	);

	const getCacheKey = useCallback(
		(config?: { selected?: string; searched?: TagInputData[] }) => {
			if (config?.selected) {
				return `s/${config.selected}`;
			}

			if (config?.searched) {
				return getSearchedConfig(config.searched);
			}

			return "default";
		},
		[]
	);

	const onDeselect = useCallback(() => {
		navigate(`/`);
		dispatch(setSelected());
	}, [dispatch, navigate]);

	const onSearch = useCallback(
		(items: TagInputData[]) => {
			dispatch(setSearched(items));
			onDeselect();
		},
		[dispatch, onDeselect]
	);

	const onSetRaw = useCallback(
		(id?: string, newId?: string) => {
			if (id && newId) {
				dispatch(renameRaw({ id, newId }));
			} else {
				dispatch(setSelectedRaw(id));

				navigate("/");
			}
		},
		[dispatch, navigate]
	);

	const onDeleteRaw = useCallback(
		(id: string) => {
			dispatch(deleteRaw(id));
		},
		[dispatch]
	);

	const groupKey = useMemo(() => {
		return getCacheKey({ selected, searched });
	}, [getCacheKey, searched, selected]);

	const onAccordionToggle = useCallback(
		(indices: BaseOpenedPanels, id: AccordionId) => {
			dispatch(
				setOpened({
					id,
					key: id === "main" ? "default" : groupKey,
					state: indices,
				})
			);
		},
		[dispatch, groupKey]
	);

	const prevHoveredFamId = useRef<FamKey[]>();
	const onKinshipAction = useCallback(
		(
			event: React.MouseEvent<Element, MouseEvent>,
			kinshipHighlighted?: boolean
		) => {
			const target = event.target as HTMLElement;
			const contentWrapper = target?.closest(".content-button")
				?.nextElementSibling as HTMLElement | undefined;
			const individuals = Array.from(
				contentWrapper?.querySelectorAll("div.individual") ?? []
			) as HTMLElement[];

			const famId = uniq(
				individuals
					?.map(
						(element) =>
							element.dataset.famId?.split(",").filter(Boolean)
					)
					.flat() ?? []
			) as FamKey[];

			if (!kinshipHighlighted || !famId?.length) {
				prevHoveredFamId.current = famId;
				document
					?.querySelectorAll(
						`[data-fam-id].not-hovered,[data-fam-id].hovered`
					)
					.forEach((element) => {
						element.classList.remove("hovered");
						element.classList.remove("main-hovered");
						element.classList.remove("not-hovered");
					});
				return;
			}

			if (
				intersection(famId, prevHoveredFamId.current).length &&
				event.type !== "click"
			) {
				return;
			}

			prevHoveredFamId.current = famId;

			Array.from<HTMLElement>(
				document?.querySelectorAll(`[data-fam-id]`) ?? []
			).forEach((element) => {
				element.classList.remove("hovered");
				element.classList.remove("main-hovered");
				element.classList.add("not-hovered");

				if (
					famId.length &&
					intersection(
						element.dataset?.famId?.split(",").filter(Boolean),
						famId
					).length
				) {
					element.classList.remove("not-hovered");
					element.classList.add("hovered");
					element.classList.add("main-hovered");
				}
			});
		},
		[]
	);

	const onKinshipReverse = useCallback(
		(event: React.MouseEvent) => {
			if (selected && selectedForKinship) {
				onSelect(event, selectedForKinship, "sidebar");
				dispatch(setSelectedForKinship(selected));
			}
		},
		[dispatch, onSelect, selected, selectedForKinship]
	);

	const [travelStarted, setTravelStarted] = useState(false);
	const allowedToTravel = useRef(false);
	allowedToTravel.current = travelStarted;
	const travelTimeout = useRef<NodeJS.Timeout>();
	const onKinshipTravel = useCallback(
		(event: React.MouseEvent) => {
			const target = event.target as HTMLElement;
			const contentWrapper = target?.closest(".content-button")
				?.nextElementSibling as HTMLElement | undefined;
			const individuals = Array.from(
				contentWrapper?.querySelectorAll("div.individual") ?? []
			) as HTMLElement[];

			let animateIndicatorTimeout: NodeJS.Timeout | undefined;

			const ids = uniq(
				individuals?.map((element) => ({
					id: element.id.replace(/^[^.]+\./, "") as
						| IndiKey
						| undefined,
					famId: element.dataset?.famId as FamKey | undefined,
				})) ?? []
			);

			if (!ids?.length || allowedToTravel.current) {
				onKinshipAction(event, false);
				allowedToTravel.current = false;
				setTravelStarted(false);
				clearTimeout(travelTimeout.current);
				clearInterval(animateIndicatorTimeout);
				document.querySelectorAll(".individual.pulse").forEach((e) => {
					e.classList.remove("pulse");
				});
				return;
			}

			const elements = ids
				.map((id) => {
					const element =
						id.id && document.getElementById(`dropped.${id.id}`);
					const additional =
						id.id &&
						(document.getElementById(`neutral.${id.id}`) ||
							document.getElementById(`draggable.${id.id}`));

					return (
						element && {
							element,
							additional,
							id: id.id,
							famId: id.famId,
						}
					);
				})
				.filter(Boolean) as Array<{
				element: HTMLElement;
				additional?: HTMLElement;
				id: string;
				famId: string;
			}>;

			const animation = elements.reduce<
				Array<{
					element: HTMLElement | SVGPathElement;
					additionalElement?: HTMLElement;
					mainElement: HTMLElement;
					duration: number;
					delay: number;
				}>
			>((acc, { element: target, additional, id, famId }, index) => {
				const { element: prev, id: prevId } = elements[index - 1] ?? {};

				if (!target) {
					return acc;
				}

				const positionPrev = prev?.getBoundingClientRect();
				const positionTarget = target.getBoundingClientRect();

				let distance = 0;

				if (positionPrev) {
					const a = positionPrev.x - positionTarget.x;
					const b = positionPrev.y - positionTarget.y;

					distance = Math.sqrt(a * a + b * b);
				}
				let corners: SVGPathElement[] | undefined;
				let lines: SVGLineElement[] | undefined;
				if (prevId && id && positionPrev && distance > 500) {
					const toTop = positionPrev.top > positionTarget.bottom;
					corners = Array.from(
						document.querySelectorAll(
							`path.corner-normal[data-p1-id="${prevId}"][data-p2-id="${id}"],
							path.corner-normal[data-p1-id="${id}"][data-p2-id="${prevId}"],${famId
								?.split(",")
								.map(
									(f) =>
										`path.corner-normal[data-fam-id*="${f}"][data-p2-id="${
											toTop ? prevId : id
										}"]`
								)
								.join(",")}`
						)
					);
					lines = Array.from(
						document.querySelectorAll(
							`line.line-normal.line-main[data-p1-id="${prevId}"][data-p2-id="${id}"],
							line.line-normal.line-main[data-p1-id="${id}"][data-p2-id="${prevId}"],${famId
								?.split(",")
								.map(
									(f) =>
										`line.line-normal.line-main[data-fam-id*="${f}"][data-p2-id="${
											toTop ? prevId : id
										}"]`
								)
								.join(",")}`
						)
					);

					if (toTop) {
						corners = corners.toReversed();
						lines = lines.toReversed();
					}
				}

				if (corners?.length && lines?.length) {
					const lineLengths = lines.map((line) =>
						getLineLength(line)
					);
					const totalLength = sum(lineLengths);

					lineLengths.forEach((lineLength, lineIndex) => {
						const duration =
							(lineLength / totalLength) * TRAVEL_DURATION;

						acc.push({
							element: corners?.[lineIndex] || target,
							mainElement: target,
							additionalElement: additional,
							duration,
							delay:
								index === 0
									? 100
									: prev && corners?.[lineIndex] && !lineIndex
									? TRAVEL_DELAY
									: 100,
						});
					});

					return acc;
				}

				return acc.concat({
					element: target,
					mainElement: target,
					additionalElement: additional,
					duration: TRAVEL_DURATION,
					delay: index === 0 ? 100 : TRAVEL_DELAY,
				});
			}, []);

			const totalDuration = animation.reduce((acc, curr, index) => {
				return (
					acc +
					((curr.duration || 200) +
						(animation[index + 1]?.delay ?? TRAVEL_DELAY))
				);
			}, 0);

			const animateIndicator = (
				_time: number,
				type: "start" | "end" | "progress" = "progress"
			) => {
				if (type === "start" || type === "end") {
					const indicator =
						animationIndicatorRef.current?.querySelector(
							".indicator"
						) as HTMLDivElement | undefined;
					animationIndicatorRef.current?.classList.remove("animated");
					clearInterval(animateIndicatorTimeout);

					if (type === "start") {
						let actualTime = 0;
						animateIndicatorTimeout = setInterval(() => {
							if (actualTime >= totalDuration) {
								animationIndicatorRef.current?.classList.remove(
									"animated"
								);
								clearInterval(animateIndicatorTimeout);
								return;
							}

							if (indicator) {
								const newWidth = actualTime / totalDuration;
								indicator.style.width = `${newWidth * 100}%`;
								if (newWidth) {
									animationIndicatorRef.current?.classList.add(
										"animated"
									);
								} else {
									animationIndicatorRef.current?.classList.remove(
										"animated"
									);
								}
							}

							actualTime += 500;
						}, 500);
					}
				}
			};

			const zoomToElement = (
				animationElements: Array<{
					element: HTMLElement | SVGPathElement;
					additionalElement?: HTMLElement;
					mainElement: HTMLElement;
					duration: number;
					delay: number;
				}>,
				pointer = 0,
				scale = 0.6
			) => {
				const animationElement = animationElements[pointer];
				const nextAnimationElement = animationElements[pointer + 1];

				if (
					!animationElement ||
					!allowedToTravel.current ||
					!transRef?.current
				) {
					onKinshipAction(event, false);
					allowedToTravel.current = false;
					setTravelStarted(false);
					clearTimeout(travelTimeout.current);
					animateIndicator(0, "end");
					document
						.querySelectorAll(".individual.pulse")
						.forEach((e) => {
							e.classList.remove("pulse");
						});

					return;
				}

				animationElement.mainElement.classList.remove("not-hovered");
				animationElement.mainElement.classList.add("pulse");
				animationElement.additionalElement?.classList.remove(
					"not-hovered"
				);
				animationElement.additionalElement?.classList.add("pulse");
				animationElement.additionalElement?.scrollIntoView({
					block: "nearest",
				});
				animateIndicator(animationElement.duration || 200);
				transRef.current.zoomToElement(
					animationElement.element as HTMLElement,
					scale,
					animationElement.duration || 200,
					"easeInOutQuad"
				);

				travelTimeout.current = setTimeout(
					() => {
						animateIndicator(
							nextAnimationElement?.delay ?? TRAVEL_DELAY
						);
						animationElement.mainElement.classList.remove("pulse");
						animationElement.additionalElement?.classList.remove(
							"pulse"
						);
						zoomToElement(animationElements, pointer + 1, scale);
					},
					(animationElement.duration || 200) +
						(nextAnimationElement?.delay ?? TRAVEL_DELAY)
				);
			};

			allowedToTravel.current = true;
			setTravelStarted(true);
			onKinshipAction(event, true);
			document
				.querySelectorAll(".individual:not(.not-hovered)")
				.forEach((element) => {
					element.classList.add("not-hovered");
				});

			animateIndicator(0, "start");
			zoomToElement(animation);
		},
		[transRef, onKinshipAction]
	);

	const getOpenedConfig = useCallback(
		(id: AccordionId) => {
			const usedKey = id === "main" ? "default" : groupKey;
			if (selected && id === "selected") {
				return {
					...opened[id]?.[usedKey],
					...(!selectedForKinship ? { 0: true } : {}),
				};
			}

			if (selected && id === "main") {
				return opened[id]?.[usedKey] ?? { 0: false };
			}

			return (
				opened[id]?.[usedKey] ??
				(!selectedForKinship ? { 0: true } : {})
			);
		},
		[opened, selected, groupKey, selectedForKinship]
	);

	const [overlappedSelection, setOverlappedSelection] =
		useState<Individuals>();

	const selectedItems = useMemo(() => {
		const selectedRoute = selectedByRoute?.split(",") as
			| [IndiKey?, IndiKey?]
			| undefined;
		const [routeSelected] = selectedRoute ?? [];
		const usedSelected =
			routeSelected && routeSelected !== selected
				? routeSelected
				: selected;

		const pinnedIndis = items && new Individuals();
		const main = items && new Individuals();
		const onStage = items && new Individuals();
		const unattached = items && new Individuals();
		const unknown = items && new Individuals();
		const surnames: Record<string, Individuals | undefined> = {};

		const sortedItems = items?.orderBy(
			getNameAscAndBirth(settings?.nameOrder)
		);
		sortedItems?.forEach((item, key) => {
			let notUsed = false;
			if (item.id && pinned?.[item.id]) {
				pinnedIndis?.append(item);
			}
			if (item.isUnattachedMember()) {
				unattached?.append(item);
				notUsed = true;
			}
			if (item.isUnknownAncestor()) {
				unknown?.append(item);
				notUsed = true;
			}
			if (itemsOnStage[key]) {
				onStage?.append(item);
			} else {
				if (!notUsed) {
					main?.append(item);
				}
			}

			const surname = item.NAME?.SURN?.toValue() || t("Unknown");
			if (!surnames[surname]) {
				surnames[surname] = new Individuals();
			}
			surnames[surname]?.append(item);
		});

		const sortedSurnames = Object.entries(surnames)
			.sort(([_ak, a], [_bk, b]) => (b?.length ?? 0) - (a?.length ?? 0))
			.reduce<Record<string, Individuals | undefined>>(
				(acc, [key, value]) => {
					if ((value?.length ?? 0) < 5) {
						const otherKey = "Surnames occurring less than 5 times";
						acc[otherKey] =
							acc[otherKey] && value
								? acc[otherKey].merge(value)
								: value;
					} else {
						acc[key] = value;
					}

					return acc;
				},
				{}
			);

		const accordionItems: Record<
			keyof TreeState["opened"],
			Record<
				string,
				| Record<string, Individuals | undefined>
				| Individuals
				| undefined
			>
		> = {
			pinned: {
				Pinned: pinnedIndis,
			},
			selected: {},
			searched: {},
			main: {
				"On tree": onStage,
				"Not on tree": main,
				Unattached: unattached,
				Unknown: unknown,
				Surnames: sortedSurnames,
			},
		};

		if (usedSelected) {
			const selectedItem = sortedItems?.item(usedSelected);
			const parents = selectedItem?.getParents().orderBy(AGE_ASC);
			const children = selectedItem?.getChildren().orderBy(AGE_ASC);
			const siblings = selectedItem?.getSiblings().orderBy(AGE_ASC);
			const spouses = selectedItem?.getSpouses().orderBy(AGE_ASC);

			const filteredList = sortedItems?.filter({ id: usedSelected });

			accordionItems.selected = {
				Selected: filteredList,
				Parents: parents,
				Children: children,
				Siblings: siblings,
				Spouses: spouses,
			};
		}

		if (searched?.length) {
			const filteredItems: Record<string, Individuals | undefined> = {};
			searched.forEach((searchConfig) => {
				if (!searchConfig.type || !searchConfig?.displayValue) {
					return;
				}

				let [nameSpecifier, typeSpecifier] = searchConfig.type as [
					TagNameType | undefined,
					TagSpecifierType,
				];
				const value = searchConfig.displayValue
					.toLowerCase()
					.replace(/^"|"$/g, "");

				if (
					typeSpecifiers.includes(nameSpecifier as TagSpecifierType)
				) {
					typeSpecifier = nameSpecifier as TagSpecifierType;
					nameSpecifier = undefined;
				}

				const results = sortedItems?.filter((item) => {
					const keys = nameSpecifier
						? [nameSpecifier]
						: (Object.keys(filterMap) as TagNameType[]);

					return !!keys.find((key) => {
						const [tag, conditionValue, trueTag] = (
							Array.isArray(filterMap[key])
								? filterMap[key]
								: [filterMap[key]]
						) as [MultiTag] | [MultiTag, string, MultiTag];

						const itemValueList = (
							conditionValue && trueTag
								? item?.getIf(tag, conditionValue, trueTag)
								: item?.get(tag)
						)?.toList();

						return !!Object.values(itemValueList?.items ?? {}).find(
							(itemValueObj) => {
								let itemValue = itemValueObj
									?.toValue()
									?.toLowerCase();

								if (nameSpecifier === "Fullname") {
									itemValue = itemValue?.replaceAll("/", "");
								}

								if (!itemValue) {
									return false;
								}

								if (typeSpecifier === "Contains") {
									return !!itemValue?.includes(value);
								} else if (typeSpecifier === "Exact") {
									return itemValue === value;
								} else if (typeSpecifier === "Starts with") {
									return !!itemValue?.startsWith(value);
								} else if (typeSpecifier === "Ends with") {
									return !!itemValue?.endsWith(value);
								}

								return false;
							}
						);
					});
				});

				// eslint-disable-next-line max-len
				let key = `${t("Results of")} "${
					nameSpecifier || ""
				} ${typeSpecifier}: ${searchConfig.displayValue}"`;
				Object.keys(filterCacheMap).forEach((filter) => {
					key = key.replace(filter, t(filter));
				});
				filteredItems[key] = results;
			});

			accordionItems.searched = filteredItems;
		}

		return accordionItems;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		items?.length,
		itemsOnStage,
		pinned,
		searched,
		selected,
		selectedByRoute,
		settings?.nameOrder,
		t,
	]);

	useDebounce(
		() => {
			setOverlappedSelection(undefined);

			sendValidationMessage({
				indis: itemsOnStage,
				missing: (
					selectedItems.main?.["Not on tree"] as
						| Individuals
						| undefined
				)?.keys(),
				rects: (
					Array.from(
						document.querySelectorAll(".individual-dropped")
					) as HTMLElement[]
				).map((element) => ({
					id: element.id,
					rect: element.getBoundingClientRect(),
				})),
			})
				// eslint-disable-next-line @typescript-eslint/promise-function-async
				.then((resp) => {
					const overlaps: Record<
						string,
						Array<HTMLElement | undefined | null>
					> = {};
					const overlappedInvididuals = new Individuals();
					Object.keys(resp.response.data.overlaps).forEach((ids) => {
						overlaps[ids] = ids.split(",").map((id) => {
							const indiId = id.replace(/^[^.]+\./, "") as
								| IndiKey
								| undefined;
							const indi = indiId && items?.item(indiId);
							indi && overlappedInvididuals.append(indi);

							return document.getElementById(id);
						});
					});
					setOverlappedSelection(
						resp.response.data.isValid
							? undefined
							: overlappedInvididuals
					);
					console.info("Validation Status", {
						...resp.response.data,
						overlaps,
					});
					return Promise.resolve(resp);
				})
				// eslint-disable-next-line @typescript-eslint/promise-function-async
				.catch((e) => {
					setOverlappedSelection(undefined);

					return Promise.reject(e);
				});
		},
		5000,
		[itemsOnStage, selectedItems.main, sendValidationMessage]
	);

	const canPlay = useMemo(() => {
		return (
			kinship?.long?.length &&
			kinship.long.length ===
				kinship.long.filter(
					(kinshipItem) =>
						kinshipItem.id && itemsOnStage[kinshipItem.id]
				).length
		);
	}, [itemsOnStage, kinship?.long]);

	const getAccordion = useCallback(
		(
			key: string,
			main: Record<
				string,
				| Record<string, Individuals | undefined>
				| Individuals
				| undefined
			>
		) => {
			const openedIndices = getOpenedConfig(key as AccordionId);
			return (
				<Accordion
					width={settings.individualSize.w}
					key={key}
					openedIndices={openedIndices}
					onToggle={(items) => {
						onAccordionToggle(items, key as AccordionId);
					}}
					items={Object.entries(main ?? {}).map(
						([label, group], index) => {
							const isSingle = group instanceof Individuals;
							const length = isSingle
								? group.length
								: Object.entries(group ?? {}).length;
							const indiForKinship =
								selectedForKinship &&
								items?.item(selectedForKinship);

							return {
								label: (
									<div className="flex items-center justify-center">
										<span className="font-bold mr-2">
											{t(label)}
										</span>
										<span className="text-xs">
											(
											{length +
												(label === "Selected"
													? kinship?.long?.length ?? 0
													: 0)}
											)
										</span>
									</div>
								),
								titleBottom:
									label === "Selected" &&
									kinship?.long?.length ? (
										<div
											className="animation-indicator"
											ref={animationIndicatorRef}
										>
											<div className="indicator" />
										</div>
									) : null,
								ref: (ref) => {
									if (!accordionsRef.current[key]) {
										accordionsRef.current[key] = {};
									}

									accordionsRef.current[key][index] = ref;
								},

								icon: (
									<>
										{label === "Selected" &&
										openedIndices[0] ? (
											<div className="flex">
												<Reverse
													title={t("Reverse")}
													// eslint-disable-next-line max-len
													className="avoid-gestures text-gray-500 dark:text-gray-50 hover:bg-gray-200 hover:text-indigo-900 dark:hover:text-indigo-900 [&.pressed]:bg-gray-200 [&.pressed]:text-indigo-900 group-hover:text-indigo-900"
													onClick={onKinshipReverse}
												/>
												{canPlay && (
													<>
														<HighlightTree
															title={t(
																"Highlight kinship"
															)}
															// eslint-disable-next-line max-len
															className="avoid-gestures text-gray-500 dark:text-gray-50 hover:bg-gray-200 hover:text-indigo-900 dark:hover:text-indigo-900 [&.pressed]:bg-gray-200 [&.pressed]:text-indigo-900 group-hover:text-indigo-900"
															onToggle={
																onKinshipAction
															}
														/>
														<Play
															title={t(
																travelStarted
																	? "Stop"
																	: "Play"
															)}
															// eslint-disable-next-line max-len
															className="avoid-gestures text-gray-500 dark:text-gray-50 hover:bg-gray-200 hover:text-indigo-900 dark:hover:text-indigo-900 [&.pressed]:bg-gray-200 [&.pressed]:text-indigo-900 group-hover:text-indigo-900"
															onClick={
																onKinshipTravel
															}
															pressed={
																travelStarted
															}
														/>
													</>
												)}
											</div>
										) : null}
									</>
								),
								disableCollapsing:
									label === "Selected" && !selectedForKinship,
								disableOpening: !length,
								isNested: !isSingle,
								children:
									!group || isSingle ? (
										<>
											{group?.map((item, key) => {
												return (
													<div key={key}>
														<Individual
															settings={settings}
															isOnStage={
																!!itemsOnStage?.[
																	key
																]
															}
															type={
																itemsOnStage?.[
																	key
																]
																	? "neutral"
																	: "draggable"
															}
															record={item}
															relatedTo={selected}
															connectedTo={
																selectedForKinship
															}
															isSelected={
																label ===
																	"Selected" &&
																key === selected
															}
															isPinned={
																pinned?.[key]
															}
															onSelect={
																[
																	"Selected",
																	"Custom",
																].includes(
																	label
																)
																	? onCenter
																	: onSelect
															}
															onHover={onHover}
															onContext={
																onContext
															}
															onClose={onDeselect}
														/>
													</div>
												);
											})}
											{key === "selected" &&
											label === "Selected" ? (
												selectedForKinship &&
												indiForKinship ? (
													<Fragment key={key}>
														{kinshipLoading && (
															<div className="flex justify-center">
																<Loading
																	visible
																	inline
																	showLabel={
																		false
																	}
																	transparent
																/>
															</div>
														)}
														{kinship?.long &&
														!kinshipLoading ? (
															kinship?.long?.map(
																(
																	kinshipItem,
																	index
																) => {
																	const kinshipLoopItem =
																		kinshipItem.id &&
																		items?.item(
																			kinshipItem.id
																		);
																	const isFirst =
																		index ===
																		0;
																	const isLast =
																		index >=
																		(kinship
																			.long
																			?.length ??
																			0) -
																			1;

																	return isFirst ||
																		!kinshipLoopItem ? null : (
																		<div
																			key={`kinship${index}`}
																		>
																			<Individual
																				settings={
																					settings
																				}
																				isOnStage={
																					!!itemsOnStage?.[
																						kinshipItem.id!
																					]
																				}
																				type={
																					itemsOnStage?.[
																						kinshipItem.id!
																					]
																						? "neutral"
																						: "draggable"
																				}
																				record={
																					kinshipLoopItem
																				}
																				connectedTo={
																					selectedForKinship
																				}
																				isSelected={
																					isLast
																				}
																				isPinned={
																					pinned?.[
																						key
																					]
																				}
																				onSelect={
																					onCenter
																				}
																				onHover={
																					onHover
																				}
																				onContext={
																					onContext
																				}
																				onClose={() => {
																					if (
																						isLast
																					) {
																						onSelectForKinship();
																					}
																				}}
																				topLabel={
																					kinshipItem.relative
																				}
																				bottomLabel={
																					isLast &&
																					kinshipItem.relative !==
																						kinshipItem.absolute
																						? kinshipItem.absolute
																						: undefined
																				}
																			/>
																		</div>
																	);
																}
															)
														) : (
															<div
																key={`kinship${index}`}
															>
																<Individual
																	settings={
																		settings
																	}
																	isOnStage={
																		!!itemsOnStage?.[
																			selectedForKinship
																		]
																	}
																	type={
																		itemsOnStage?.[
																			selectedForKinship
																		]
																			? "neutral"
																			: "draggable"
																	}
																	record={
																		indiForKinship
																	}
																	connectedTo={
																		selectedForKinship
																	}
																	isSelected
																	isPinned={
																		pinned?.[
																			key
																		]
																	}
																	onSelect={
																		onCenter
																	}
																	onHover={
																		onHover
																	}
																	onContext={
																		onContext
																	}
																	onClose={() => {
																		onSelectForKinship();
																	}}
																	topLabel={
																		!kinshipLoading &&
																		t(
																			selectedForKinship ===
																				selected
																				? "Self"
																				: "Not relatives"
																		)
																	}
																/>
															</div>
														)}
													</Fragment>
												) : (
													<Typeahead
														placeholder={t(
															"Get kinship for"
														)}
														list={typeaheadList}
														onSelect={(
															value: string
														) => {
															onSelectForKinship(
																value as IndiKey
															);
														}}
													/>
												)
											) : null}
										</>
									) : (
										getAccordion(label, group)
									),
							};
						}
					)}
				/>
			);
		},
		[
			settings,
			getOpenedConfig,
			onAccordionToggle,
			selectedForKinship,
			items,
			t,
			kinship?.long,
			onKinshipReverse,
			canPlay,
			onKinshipAction,
			onKinshipTravel,
			travelStarted,
			kinshipLoading,
			itemsOnStage,
			pinned,
			onCenter,
			onHover,
			onContext,
			typeaheadList,
			selected,
			onSelect,
			onDeselect,
			onSelectForKinship,
		]
	);

	return (
		<>
			<Container
				id="default-sidebar"
				aria-label="Sidebar"
				opened={sidebarOpen}
			>
				<Wrapper>
					<List>
						<Header
							settings={settings}
							length={items?.length || 0}
							searched={searched}
							history={history}
							raws={raws}
							selectedId={rawId}
							onSetRaw={onSetRaw}
							onDeleteRaw={onDeleteRaw}
							onChange={onChange}
							onSearch={onSearch}
							quickList={typeaheadList}
							onQuickListSelect={(s) => {
								onSelect(undefined, s as IndiKey, "sidebar");
							}}
						/>
					</List>
					{rawId ? (
						<List
							ref={mainListRef}
							className="overflow-y-auto flex-auto h-full step-3"
						>
							{Object.entries(selectedItems).map(([key, main]) =>
								(main instanceof Individuals && main.length) ||
								Object.values(main).some((l) => l?.length)
									? getAccordion(key, main)
									: null
							)}
						</List>
					) : null}
					<a
						className="underline text-gray-800 dark:text-gray-50 hover:text-blue-500 cursor-pointer"
						href={
							isDev
								? "https://localhost:5556"
								: "https://matricula.idavid.hu/"
						}
						target="_blank"
						rel="noreferrer"
					>
						Matricula
					</a>
				</Wrapper>
			</Container>
			{overlappedSelection?.length ? (
				<ErrorComponent
					title={t("Overlapped individuals")}
					className="animate-none left-2"
				>
					{t(
						// eslint-disable-next-line max-len
						"In the depicted family tree, there are a few individuals who cannot be placed in the correct positions using graph theory. This may be due to generational shifts, ancestral loss, or possibly branches merging in the case of closer relatives. The program attempts to draw the family tree in the most ideal way possible, but due to the unique characteristics of each family tree, this may be impossible in certain cases. The following individuals overlap with each other; please manually move them to the appropriate positions:"
					)}
					{overlappedSelection.map((overlapped, overlappedIndex) => (
						<button
							type="button"
							key={overlappedIndex}
							className="inline-flex mr-1 underline text-gray-900 cursor-pointer"
							onClick={(e) => {
								onSelect(
									e,
									overlapped.id!,
									"sidebar",
									undefined,
									false
								);
							}}
						>
							<Name name={overlapped} settings={settings} />
						</button>
					))}
				</ErrorComponent>
			) : null}
		</>
	);
};

export default memo(Sidebar);
