import uniqueId from "lodash/uniqueId";
import { useEffect, useMemo, useRef } from "react";
import { getBounds } from "../utils/bounds";
import { type Size, type Position } from "../types/graphic-types";
import { type IndiDimensions } from "../store/main/reducers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars, max-len
const ERROR_PLACEHOLDER_CONTENT = `<svg stroke="currentColor" fill="white" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16.707 2.293A.996.996 0 0 0 16 2H8a.996.996 0 0 0-.707.293l-5 5A.996.996 0 0 0 2 8v8c0 .266.105.52.293.707l5 5A.996.996 0 0 0 8 22h8c.266 0 .52-.105.707-.293l5-5A.996.996 0 0 0 22 16V8a.996.996 0 0 0-.293-.707l-5-5zM13 17h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>`;

export type ValidPosition = "VALID" | "OCCUPIED" | "RESERVED" | "INVALID_LEVEL";

export interface ValidationDetails<
	T extends string = string,
	I extends string = string,
> {
	status: ValidPosition;
	details?: T;
	id?: I;
	name?: string;
	y?: number;
	height?: number;
}

export interface Dragging {
	x: number;
	y: number;
}

export interface Zooming {
	scale: number;
	origo?: Position;
}

export type DraggingAndZooming = Dragging & Zooming;

export interface UseDragDropZoomProps {
	clone?: boolean;
	dragTarget?: string;
	dropTarget?: string;
	avoidTarget?: string;
	zoomTarget?: string;
	zoomEndDelay?: number;
	cloneDelay?: number;
	onUpdate?: () => DraggingAndZooming;
	onCancel?: () => void;
	onDragStart?: (
		e: MouseEvent,
		d: DraggingAndZooming,
		clone?: HTMLElement
	) => void;
	onDragging?: (
		e: MouseEvent,
		d: DraggingAndZooming,
		clone?: HTMLElement
	) => void;
	onDragEnd?: (
		e: MouseEvent,
		d: DraggingAndZooming,
		clone?: HTMLElement
	) => void;
	onDrop?: (
		e: MouseEvent,
		d: DraggingAndZooming,
		c?: HTMLElement,
		p?: Position,
		s?: Size
	) => void;
	onZoom?: (e: WheelEvent, d: DraggingAndZooming) => void;
	onZoomEnd?: (e: WheelEvent, d: DraggingAndZooming) => void;
	onReset?: (d: DraggingAndZooming) => void;
	snapTo?: Size | ((placeholder: HTMLElement) => Size);
	isValidPosition?: (
		position: IndiDimensions["position"],
		size: IndiDimensions["size"],
		clone?: HTMLElement
	) => ValidationDetails[];
	avoidPhysicalDrop?: boolean;
	avoidOnCtrl?: boolean;
}

const useDragDropZoom = (props?: UseDragDropZoomProps) => {
	const id = useMemo(() => uniqueId(), []);
	const {
		clone,
		onUpdate,
		onCancel,
		onDragStart,
		onDragging,
		onDragEnd,
		onDrop,
		onZoom,
		onZoomEnd,
		onReset,
		dragTarget,
		dropTarget,
		avoidTarget,
		zoomTarget,
		zoomEndDelay = 10,
		cloneDelay = 100,
		snapTo,
		avoidPhysicalDrop,
		avoidOnCtrl,
		isValidPosition,
	} = props ?? {};
	const zoomTimer = useRef<NodeJS.Timeout>();
	const clickTimer = useRef<NodeJS.Timeout>();
	const placeholder = useRef<HTMLElement>();
	const errorPlaceholder = useRef<HTMLElement>();
	const suggestionPlaceholder = useRef<HTMLElement>();
	const droppedElement = useRef<HTMLElement>();
	const lastValidPosition = useRef<Position>();
	const lastPosition = useRef<Position>();

	useEffect(() => {
		let { x, y, scale } = onUpdate?.() ?? { x: 0, y: 0, scale: 1 };

		let down = false;
		const start = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			if (
				window.isDragging ||
				(avoidOnCtrl && (e.ctrlKey || e.metaKey))
			) {
				return;
			}

			const closest = dragTarget
				? (target.closest(dragTarget) as HTMLElement)
				: undefined;
			const avoid = avoidTarget
				? (target.closest(avoidTarget) as HTMLElement)
				: undefined;

			if (avoid) {
				return;
			}

			if (closest) {
				if (clone) {
					closest.classList.add("waiting");
					clickTimer.current = setTimeout(() => {
						down = true;
						const { left, top } = getBounds(closest);
						closest.classList.add("dragging");
						window.dragged = closest.cloneNode(true) as HTMLElement;
						closest.classList.add("dragged-off");
						const style = getComputedStyle(closest);
						x = left;
						y = top;

						window.dragged.id = window.dragged.id.replace(
							"draggable.",
							"dragging."
						);
						window.dragged.style.width = style.width;
						window.dragged.style.zIndex = "1000";
						window.dragged.style.position = "absolute";
						window.dragged.style.left = `${x}px`;
						window.dragged.style.top = `${y}px`;

						document.body.appendChild(window.dragged);
						onDragStart?.(e, { x, y, scale }, window.dragged);
					}, cloneDelay);
				} else {
					down = true;
					onDragStart?.(e, { x, y, scale }, window.dragged);
				}

				window.isDragging = true;
			}
		};
		const move = (e: MouseEvent) => {
			clearTimeout(clickTimer.current);
			if (window.dragged) {
				const dropZone = dropTarget
					? (document.querySelector(dropTarget) as HTMLElement)
					: undefined;
				const closest = dragTarget
					? (dropZone?.closest(dragTarget) as HTMLElement)
					: undefined;
				if (closest && dropZone) {
					const closestBounds = getBounds(closest);
					const draggedBounds = getBounds(window.dragged);
					const dropZoneBounds = getBounds(dropZone);
					if (
						draggedBounds.right >= closestBounds.left &&
						draggedBounds.left <= closestBounds.right &&
						draggedBounds.bottom >= closestBounds.top &&
						draggedBounds.top <= closestBounds.bottom
					) {
						const style = getComputedStyle(window.dragged);
						if (!placeholder.current) {
							placeholder.current = window.dragged.cloneNode(
								true
							) as HTMLElement;
							placeholder.current.id =
								placeholder.current.id.replace(
									"dragging.",
									"placeholder."
								);
							placeholder.current.style.zIndex = "900";
							placeholder.current.style.width = style.width;
							placeholder.current.style.height = style.height;

							dropZone?.appendChild(placeholder.current);
						}

						if (!errorPlaceholder.current) {
							errorPlaceholder.current =
								placeholder.current.cloneNode(
									true
								) as HTMLElement;
							errorPlaceholder.current.id =
								placeholder.current.id.replace(
									"placeholder.",
									"error-placeholder."
								);
							errorPlaceholder.current.style.opacity = "0";
							errorPlaceholder.current.style.zIndex = "800";
							errorPlaceholder.current.style.width = style.width;
							errorPlaceholder.current.style.height =
								style.height;
							errorPlaceholder.current.innerHTML =
								ERROR_PLACEHOLDER_CONTENT;
							errorPlaceholder.current.classList.add(
								"error-placeholder",
								"animate-pulse2",
								"animate-ping2"
							);
							dropZone?.appendChild(errorPlaceholder.current);
						}
						if (!suggestionPlaceholder.current) {
							suggestionPlaceholder.current =
								placeholder.current.cloneNode(
									true
								) as HTMLElement;
							suggestionPlaceholder.current.id =
								suggestionPlaceholder.current.id.replace(
									"placeholder.",
									"suggestion-placeholder."
								);
							suggestionPlaceholder.current.style.display =
								"none";
							suggestionPlaceholder.current.style.zIndex = "600";
							suggestionPlaceholder.current.style.width =
								"20000px";
							suggestionPlaceholder.current.style.left =
								"-10000px";
							suggestionPlaceholder.current.style.height = "0";
							suggestionPlaceholder.current.innerHTML = "";
							suggestionPlaceholder.current.classList.add(
								"suggestion-placeholder",
								"animate-pulse2",
								"animate-ping2"
							);
							dropZone?.appendChild(
								suggestionPlaceholder.current
							);
						}

						const draggedScaledSize: Size = {
							w:
								draggedBounds.width / scale -
								draggedBounds.width,
							h:
								draggedBounds.height / scale -
								draggedBounds.height,
						};
						const placeholderPosition: Position = {
							x:
								(draggedBounds.left - dropZoneBounds.left) /
									scale +
								draggedScaledSize.w / 2,
							y:
								(draggedBounds.top - dropZoneBounds.top) /
									scale +
								draggedScaledSize.h / 2,
						};

						if (
							snapTo &&
							!(e.shiftKey && (e.ctrlKey || e.metaKey))
						) {
							const snapToSize =
								typeof snapTo === "function"
									? snapTo(placeholder.current)
									: snapTo;
							placeholderPosition.x =
								Math.floor(
									(placeholderPosition.x + snapToSize.w / 2) /
										snapToSize.w
								) * snapToSize.w;
							placeholderPosition.y =
								Math.floor(
									(placeholderPosition.y + snapToSize.h / 2) /
										snapToSize.h
								) * snapToSize.h;
						}

						if (
							lastPosition.current?.x !== placeholderPosition.x ||
							lastPosition.current?.y !== placeholderPosition.y
						) {
							const isValid = isValidPosition
								? isValidPosition(
										placeholderPosition,
										{
											w: draggedBounds.width,
											h: draggedBounds.height,
										},
										window.dragged
								  )
								: [];

							const hasOccupied = isValid.find(
								({ status }) => status === "OCCUPIED"
							);
							if (
								(e.shiftKey && !hasOccupied) ||
								isValid.length === 0 ||
								!lastValidPosition.current
							) {
								lastValidPosition.current = placeholderPosition;
							}

							const invalidLevel = isValid.find(
								({ status, y, height }) =>
									status === "INVALID_LEVEL" &&
									y !== undefined &&
									height !== undefined
							);

							placeholder.current.style.left = `${lastValidPosition.current.x}px`;
							placeholder.current.style.top = `${lastValidPosition.current.y}px`;
							errorPlaceholder.current.style.left = `${placeholderPosition.x}px`;
							errorPlaceholder.current.style.top = `${placeholderPosition.y}px`;
							errorPlaceholder.current.style.display =
								isValid.length > 0 ? "flex" : "none";

							if (invalidLevel) {
								suggestionPlaceholder.current.style.top = `${invalidLevel.y}px`;
								suggestionPlaceholder.current.style.height = `${invalidLevel.height}px`;
								suggestionPlaceholder.current.style.display =
									"flex";
							}

							lastPosition.current = placeholderPosition;
						}
					} else {
						placeholder.current?.remove();
						placeholder.current = undefined;
						errorPlaceholder.current?.remove();
						errorPlaceholder.current = undefined;
						suggestionPlaceholder.current?.remove();
						suggestionPlaceholder.current = undefined;
					}

					if (
						draggedBounds.left >= closestBounds.left &&
						draggedBounds.top >= closestBounds.top
					) {
						window.dragged.classList.add("on-stage");
						window.dragged.style.opacity = "0.2";
					} else {
						window.dragged.classList.remove("on-stage");
						window.dragged.style.opacity = "1";
					}
				}
			}

			if (down) {
				window.wasDragging = true;
				x += e.movementX;
				y += e.movementY;

				if (window.dragged) {
					window.dragged.style.left = `${x}px`;
					window.dragged.style.top = `${y}px`;
				}

				onDragging?.(e, { x, y, scale });
			}
		};
		const end = (e: MouseEvent) => {
			clearTimeout(clickTimer.current);
			down = false;

			onDragEnd?.(e, { x, y, scale });

			const target = e.target as HTMLElement;
			const dropZone = dropTarget
				? (document.querySelector(dropTarget) as HTMLElement)
				: undefined;
			const closest = dragTarget
				? (target.closest(dragTarget) as HTMLElement)
				: undefined;
			closest?.classList.remove("waiting", "dragging", "dragged-of");
			document
				.querySelector(".dragging")
				?.classList.remove("waiting", "dragging", "dragged-off");
			document
				.querySelector(".waiting")
				?.classList.remove("waiting", "dragging", "dragged-off");

			if (placeholder.current && dropZone) {
				if (
					errorPlaceholder.current?.style.display !== "flex" ||
					e.shiftKey
				) {
					droppedElement.current = placeholder.current.cloneNode(
						true
					) as HTMLElement;
					droppedElement.current.id =
						droppedElement.current.id.replace(
							"placeholder.",
							"dropped."
						);
					dropZone.appendChild(droppedElement.current);
				}

				placeholder.current?.remove();
				placeholder.current = undefined;
				errorPlaceholder.current?.remove();
				errorPlaceholder.current = undefined;
				suggestionPlaceholder.current?.remove();
				suggestionPlaceholder.current = undefined;
			}

			if (!dropTarget || dropZone) {
				if (droppedElement.current) {
					onDrop?.(
						e,
						{ x, y, scale },
						droppedElement.current,
						droppedElement.current && {
							x: droppedElement.current.offsetLeft,
							y: droppedElement.current.offsetTop,
						},
						droppedElement.current && {
							w: droppedElement.current.offsetWidth,
							h: droppedElement.current.offsetHeight,
						}
					);

					if (avoidPhysicalDrop && droppedElement.current) {
						dropZone?.removeChild(droppedElement.current);
					}
					droppedElement.current?.remove();
					droppedElement.current = undefined;
				}
			}

			if (window.dragged) {
				document.body.removeChild(window.dragged);
				window.dragged = undefined;
			}

			lastValidPosition.current = undefined;

			window.isDragging = false;

			setTimeout(() => {
				window.wasDragging = false;
			}, 100);
		};

		const zoom = (event: WheelEvent) => {
			const e = event as WheelEvent & { layerX: number; layerY: number };
			const target = e.target as HTMLElement;

			if (!zoomTarget || target.closest(zoomTarget)) {
				if (!e.ctrlKey && !e.metaKey) {
					return;
				}

				const dir = e.deltaY > 0 ? 0.01 : -0.01;
				scale += dir;

				if (scale < 0.1) {
					scale = 0.1;
				}

				onZoom?.(e, { x, y, scale });

				clearTimeout(zoomTimer.current);
				zoomTimer.current = setTimeout(() => {
					onZoomEnd?.(e, { x, y, scale });
				}, zoomEndDelay);

				e.preventDefault();
			}
		};

		const reset = (e: KeyboardEvent) => {
			if (e.key !== "Escape") {
				return;
			}

			if (e.ctrlKey || e.metaKey) {
				x = 0;
				y = 0;
				scale = 0;

				onReset?.({ x, y, scale });
			} else {
				window.dragged && document.body.removeChild(window.dragged);
				window.dragged = undefined;
				placeholder.current?.remove();
				placeholder.current = undefined;
				errorPlaceholder.current?.remove();
				errorPlaceholder.current = undefined;
				suggestionPlaceholder.current?.remove();
				suggestionPlaceholder.current = undefined;
				droppedElement.current?.remove();
				droppedElement.current = undefined;
				lastValidPosition.current = undefined;
				onCancel?.();
			}
		};

		window.addEventListener("mousedown", start);
		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", end);
		window.addEventListener("wheel", zoom);
		window.addEventListener("keyup", reset);

		return () => {
			window.removeEventListener("mousedown", start);
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseup", end);
			window.removeEventListener("wheel", zoom);
			window.removeEventListener("keyup", reset);

			clearTimeout(zoomTimer.current);
		};
	}, [
		dragTarget,
		onDragStart,
		onDragging,
		onDragEnd,
		dropTarget,
		onDrop,
		zoomTarget,
		onZoom,
		onUpdate,
		zoomEndDelay,
		onZoomEnd,
		onReset,
		clone,
		id,
		cloneDelay,
		snapTo,
		avoidPhysicalDrop,
		isValidPosition,
		avoidTarget,
		onCancel,
		avoidOnCtrl,
	]);
};

export default useDragDropZoom;
