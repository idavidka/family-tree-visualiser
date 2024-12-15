import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ThemeProvider } from "styled-components";
import { changeTheme, DARK_THEME, LIGHT_THEME } from "./theme";
import { Layout } from "./components/layout/layout.styled";
import Sidebar from "./components/sidebar/sidebar";
import Stage from "./components/stage/stage";
import { decompress, getToken, subscribe } from "./utils/firebase";
import { useDispatch, useSelector } from "react-redux";
import {
	selectUserId,
	selectSnapshotId,
	selectLoading,
	selectGuided,
	selectSettings,
	selectType,
	selectSelected,
	selectMode,
	selectLoadingTime,
	selectLoadingText,
	selectRawSnapshotId,
	selectAllIndis,
} from "./store/main/selectors";
import { limit, where } from "firebase/firestore";
import Login from "./components/login/login";
import { type State, actions } from "./store/main/reducers";
import { v4 as uuid } from "uuid";
import { type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { type IndiKey } from "./types/types";
import { useNavigate, useParams } from "react-router";
import { Loading } from "./components/loading/loading";

import _i18n from "./translation/i18n";
import { TourProvider } from "@reactour/tour";
import { stepsHU, stepsEN } from "./components/tour/steps";
import { useLocale } from "./translation/useLocale";
import { usePrevious } from "react-use";
import {
	type State as DebugStates,
	type DebugState,
	actions as debugActions,
} from "./store/debug/reducers";
import { value } from "./store/main/utils";
import { FAKE_USER } from "./constants/constants";
import { copyTextToClipboard } from "./utils/copy";
import Individual from "./components/individual/individual";
import { isDevelopment } from "./utils/get-product-details";

const isDev = isDevelopment();

const App = (): JSX.Element => {
	const params = useParams<{ indi?: IndiKey }>();
	const { language } = useLocale();
	const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
	const transformFanRef = useRef<ReactZoomPanPinchContentRef | null>(null);
	const [detailed, setDetailed] = useState<{
		id: IndiKey;
		x: number;
		y: number;
	}>();

	const indis = useSelector(selectAllIndis);
	const type = useSelector(selectType);
	const selected = useSelector(selectSelected);
	const userId = useSelector(selectUserId);
	const settings = useSelector(selectSettings);
	const snapshotId = useSelector(selectSnapshotId);
	const rawSnapshotId = useSelector(selectRawSnapshotId);
	const loading = useSelector(selectLoading);
	const loadingTime = useSelector(selectLoadingTime);
	const loadingText = useSelector(selectLoadingText);
	const guided = useSelector(selectGuided);
	const mode = useSelector(selectMode);
	const dispatch = useDispatch();
	const navigate = useNavigate();

	const snapshotIdRef = useRef<string>();
	const rawSnapshotIdRef = useRef<string>();

	useEffect(() => {
		if (!userId || userId === FAKE_USER.userId) {
			return;
		}

		getToken()
			.then((_?: string) => {
				// Ok
			})
			.catch(() => {
				dispatch(actions.logout());
			});
	}, [dispatch, userId]);

	useEffect(() => {
		snapshotIdRef.current = snapshotId;
	}, [snapshotId]);
	useEffect(() => {
		rawSnapshotIdRef.current = rawSnapshotId;
	}, [rawSnapshotId]);

	useEffect(() => {
		changeTheme(mode);
	}, [mode]);

	const previousLoading = usePrevious(loading);
	// const previousType = usePrevious(type);
	useEffect(() => {
		if (
			selected &&
			type !== "manual" &&
			!loading &&
			loading !== previousLoading
		) {
			const target = document.getElementById(`dropped.${selected}`) as
				| HTMLElement
				| undefined;

			if (
				target &&
				transformRef.current &&
				// (!isDev || previousType === type)
				!isDev
			) {
				transformRef.current.zoomToElement(target, 0.6);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, selected, type]);

	const onSelect = useCallback(
		(
			e: React.MouseEvent | undefined,
			selectedKey: IndiKey,
			source?: "stage" | "sidebar",
			pin?: "add" | "remove",
			changeUrl = true
		) => {
			if (pin) {
				dispatch(actions.setPinned({ id: selectedKey, type: pin }));
			} else {
				const target = document.getElementById(
					`dropped.${selectedKey}`
				) as HTMLElement | undefined;

				if (changeUrl && !e?.ctrlKey && !e?.metaKey) {
					navigate(`/${selectedKey}`);
					dispatch(actions.setSelected(selectedKey));
				}

				if (source === "sidebar" && target && transformRef.current) {
					transformRef.current.zoomToElement(target, 0.6);
				}
			}
		},
		[dispatch, navigate]
	);

	const hoverTimer = useRef<NodeJS.Timeout>();
	const onHover = useCallback(
		(
			e: React.MouseEvent,
			selectedKey: IndiKey,
			_s?: string,
			type?: "leave" | "enter"
		) => {
			const isManual = e.type === "click" || e.type === "contextmenu";
			clearTimeout(hoverTimer.current);
			hoverTimer.current = setTimeout(
				() => {
					const target = (
						e.type === "mouseover" && type === "leave"
							? e.relatedTarget
							: e.target
					) as HTMLElement;
					const parent = (target?.closest(".individual") ||
						target?.closest("a")) as HTMLElement | undefined;
					const bounds = parent?.getBoundingClientRect();

					setDetailed(
						(type === "enter" || e.type === "contextmenu") && bounds
							? {
									id: selectedKey,
									x: bounds.left + bounds.width / 2,
									y: bounds.bottom + 10,
							  }
							: undefined
					);
				},
				isManual ? 0 : detailed ? 100 : 1000
			);
		},
		[detailed]
	);

	const onContext = useCallback(
		(
			e: React.MouseEvent,
			selectedKey: IndiKey,
			source?: "stage" | "sidebar"
		) => {
			isDev && copyTextToClipboard(selectedKey);

			onHover(
				e,
				selectedKey,
				source,
				detailed && detailed.id === selectedKey ? "leave" : "enter"
			);
		},
		[onHover, detailed]
	);

	useEffect(() => {
		const selectedRoute = params.indi?.split(",") as
			| [IndiKey?, IndiKey?]
			| undefined;
		const [routeSelected, routeKinship] = selectedRoute ?? [];

		if (routeSelected) {
			dispatch(actions.setSelected(routeSelected));
		}
		if (routeKinship) {
			dispatch(actions.setSelectedForKinship(routeKinship));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!userId) {
			return;
		}

		const subMain = () =>
			subscribe<State>(
				"state",
				(state) => {
					if (
						!snapshotIdRef.current ||
						state[0]?.snapshotId !== snapshotIdRef.current
					) {
						if (state[0]) {
							const newState = decompress(state[0]);
							dispatch(
								actions.rehydrate({
									...newState,
									snapshotId: uuid(),
									callback: (
										appliedStage,
										appliedFanStage
									) => {
										transformRef.current?.setTransform(
											appliedStage.x,
											appliedStage.y,
											appliedStage.scale
										);
										transformFanRef.current?.setTransform(
											appliedFanStage.x,
											appliedFanStage.y,
											appliedFanStage.scale
										);
									},
								})
							);
							window.isRehydrating = true;
						} else {
							dispatch(
								actions.rehydrate({
									snapshotId: uuid(),
								})
							);
						}
					}
				},
				[where("userId", "==", userId), limit(1)]
			);
		const unsubscribeMain = subMain();

		const subRaw = () => {
			const states: Record<number, string> = {};

			let rehydrateRawTimer: NodeJS.Timeout | undefined;
			return subscribe<State>(
				"raw",
				(state) => {
					const indexedState = state as Array<
						State & {
							name?: string;
							raw?: string;
							index: number;
							total: number;
						}
					>;
					indexedState.forEach((data) => {
						states[data.index] = data.raw || "";
					});
					if (
						Object.keys(states).length ===
						(indexedState[0]?.total ?? 0)
					) {
						if (indexedState[0]) {
							const joinedRaw = JSON.parse(
								Object.values(states).join("")
							) as Record<string, string>;

							clearTimeout(rehydrateRawTimer);
							rehydrateRawTimer = setTimeout(() => {
								dispatch(
									actions.rehydrateRaw(
										decompress({
											...indexedState[0],
											treeState: joinedRaw,
											rawSnapshotId: uuid(),
										})
									)
								);
							}, 1000);
						} else {
							dispatch(
								actions.rehydrateRaw(
									decompress({
										rawSnapshotId: uuid(),
									})
								)
							);
						}
					}
				},
				[where("userId", "==", userId)]
			);
		};
		const unsubscribeRaw = subRaw();

		const subDebug = () => {
			let rehydrateDebugTimer: NodeJS.Timeout | undefined;
			return subscribe<DebugState>(
				"debug",
				(state) => {
					const states: DebugStates["states"] = {};

					state.forEach((s) => {
						const docId =
							s.docId !== undefined ? Number(s.docId) : undefined;
						if (docId && !states[docId]) {
							states[docId] = s;
						}
					});

					clearTimeout(rehydrateDebugTimer);
					rehydrateDebugTimer = setTimeout(() => {
						dispatch(
							debugActions.rehydrate({
								states,
							})
						);
					}, 1000);
				},
				[where("userId", "==", userId)]
			);
		};
		const unsubscribeDebug = subDebug();

		return () => {
			unsubscribeMain();
			unsubscribeRaw();
			unsubscribeDebug();
		};
	}, [dispatch, settings.cloudSync, userId]);

	const steps = useMemo(() => {
		const onDone = () => {
			dispatch(actions.setGuidded(true));
		};
		return language === "en"
			? stepsEN(onSelect, onDone)
			: stepsHU(onSelect, onDone);
	}, [dispatch, language, onSelect]);

	const detailedItem = useMemo(() => {
		const detailedIndi = detailed && indis?.item(detailed?.id);
		if (detailedIndi) {
			return {
				detailed,
				indi: detailedIndi,
			};
		}
	}, [detailed, indis]);

	return (
		<TourProvider
			steps={steps}
			defaultOpen={!!userId && !guided}
			disableInteraction
			onClickClose={() => {
				dispatch(actions.setGuidded(true));
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			}}
		>
			<ThemeProvider theme={mode === "dark" ? DARK_THEME : LIGHT_THEME}>
				<Layout isLoggedIn={!!userId}>
					{!userId ? (
						<Login />
					) : (
						<>
							{detailedItem ? (
								<Individual
									record={detailedItem.indi}
									settings={settings}
									type="overlay"
									className="absolute"
									showFacts
									onClose={(e, se) => {
										onHover(e, se, undefined, "leave");
									}}
									style={{
										left: detailedItem.detailed.x,
										top: detailedItem.detailed.y,
									}}
									isSelected
								/>
							) : null}
							<Sidebar
								onSelect={onSelect}
								onContext={onContext}
								settings={settings}
								transRef={transformRef}
							/>
							<Stage
								onSelect={onSelect}
								onContext={onContext}
								settings={settings}
								transRef={transformRef}
								transFanRef={transformFanRef}
							/>
						</>
					)}
				</Layout>
				<Loading
					visible={loading}
					time={loadingTime}
					text={loadingText}
				/>
			</ThemeProvider>
		</TourProvider>
	);
};

export default App;
