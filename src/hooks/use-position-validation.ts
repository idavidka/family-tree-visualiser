import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
	selectHorizontalIndis,
	selectIndiPosition,
	selectIndiPositions,
	selectIndisOnStage,
	selectSettings,
} from "../store/main/selectors";
import { type IndiDimensions } from "../store/main/reducers";
import { type IndiKey } from "../types/types";
import { fixBounds } from "../utils/bounds";
import throttle from "lodash/throttle";
import { type ValidationDetails } from "./use-drag-drop-zoom";
import { type ErrorMessageType } from "../components/invalid-places/invalid-places";

type Details = ValidationDetails<ErrorMessageType, IndiKey>;

const usePositionValidation = () => {
	const settings = useSelector(selectSettings);
	const indis = useSelector(selectIndisOnStage);
	const indiPositions = useSelector(selectIndiPositions);
	const getIndiOnPosition = useSelector(selectIndiPosition);
	const getHorizontalIndis = useSelector(selectHorizontalIndis);

	const [validationDetails, setValidationState] = useState<Details[]>([]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const setValidation = useCallback(
		throttle(
			(detail: Details[]) => {
				setValidationState(detail);
			},
			100,
			{ trailing: true }
		),
		[]
	);

	const checkIsValid = useCallback((details: Details[]) => {
		return (
			details.length === 0 ||
			details.every(({ status }) => status === "VALID")
		);
	}, []);

	const validator = useCallback(
		(
			position: IndiDimensions["position"],
			size: IndiDimensions["size"]
		) => {
			const width = (size.w / 2) * settings.horizontalSpace;
			const height = size.h * settings.verticalSpace;
			const prev = position.x - width;
			const next = position.x + width;
			const over = position.y - height;
			const under = position.y + height;
			const draggedId = window.dragged?.id?.replace(/^[^.]+\./, "") as
				| IndiKey
				| undefined;

			const details: Details[] = [];
			const indiOnPosition = getIndiOnPosition(
				fixBounds(position),
				fixBounds({
					...position,
					x: next,
				}),
				fixBounds({
					...position,
					x: prev,
				})
			);

			if (indiOnPosition && indiOnPosition.id !== draggedId) {
				details.push({ status: "OCCUPIED" });
			}

			const indiUnderPosition = getIndiOnPosition(
				fixBounds({
					...position,
					y: under,
				}),
				fixBounds({
					x: next,
					y: under,
				}),
				fixBounds({
					x: prev,
					y: under,
				})
			);

			const isChildOf = indiUnderPosition?.isChildOf(draggedId);
			const isChildInLawOf = indiUnderPosition?.isChildInLawOf(draggedId);
			if (
				isChildOf === false &&
				isChildInLawOf === false &&
				indiUnderPosition?.id !== draggedId
			) {
				details.push(
					{
						status: "RESERVED",
						details: "PARENT",
						id: indiUnderPosition?.id,
						name: indiUnderPosition?.NAME?.toValue(),
					},
					{
						status: "RESERVED",
						details: "PARENT_IN_LAW",
						id: indiUnderPosition?.id,
						name: indiUnderPosition?.NAME?.toValue(),
					}
				);
			}

			const indiOverPosition = getIndiOnPosition(
				fixBounds({
					...position,
					y: over,
				}),
				fixBounds({
					x: next,
					y: over,
				}),
				fixBounds({
					x: prev,
					y: over,
				})
			);
			const isParentOf = indiOverPosition?.isParentOf(draggedId);
			const isParentInLawOf =
				indiOverPosition?.isParentInLawOf(draggedId);

			if (
				isParentOf === false &&
				isParentInLawOf === false &&
				indiOverPosition?.id !== draggedId
			) {
				details.push(
					{
						status: "RESERVED",
						details: "CHILD",
						id: indiOverPosition?.id,
						name: indiOverPosition?.NAME?.toValue(),
					},
					{
						status: "RESERVED",
						details: "CHILD_IN_LAW",
						id: indiOverPosition?.id,
						name: indiOverPosition?.NAME?.toValue(),
					}
				);
			}

			const indiNextToPosition = getIndiOnPosition(
				fixBounds({
					...position,
					x: position.x + width * 2,
				}),
				fixBounds({
					...position,
					x: position.x - width * 2,
				})
			);

			const isSiblingOf = indiNextToPosition?.isSiblingOf(draggedId);
			const isSpouseOf = indiNextToPosition?.isSpouseOf(draggedId);
			if (
				isSiblingOf === false &&
				isSpouseOf === false &&
				indiNextToPosition?.id !== draggedId
			) {
				details.push(
					{
						status: "RESERVED",
						details: "SIBLING",
						id: indiNextToPosition?.id,
						name: indiNextToPosition?.NAME?.toValue(),
					},
					{
						status: "RESERVED",
						details: "SPOUSE",
						id: indiNextToPosition?.id,
						name: indiNextToPosition?.NAME?.toValue(),
					}
				);
			}

			const isSiblingOfStaged = indis?.isSiblingOf(draggedId);
			const isSpouseOfStaged = indis?.isSpouseOf(draggedId);
			const isParentOfStaged = indis?.isParentOf(draggedId);
			const isChildOfStaged = indis?.isChildOf(draggedId);

			if (isParentOfStaged) {
				const horizontalUpperIndis = getHorizontalIndis(
					position.y - height
				);
				const isParentOfHorizontal =
					horizontalUpperIndis?.isParentOf(draggedId);

				if (!isParentOfHorizontal) {
					details.push({
						status: "INVALID_LEVEL",
						details: "CHILD",
						y:
							indiPositions[isParentOfStaged as IndiKey]?.position
								.y + height,
						height: size.h,
					});
				}
			}

			if (isChildOfStaged) {
				const horizontalLowerIndis = getHorizontalIndis(
					position.y + height
				);
				const isChildOfHorizontal =
					horizontalLowerIndis?.isChildOf(draggedId);

				if (!isChildOfHorizontal) {
					details.push({
						status: "INVALID_LEVEL",
						details: "PARENT",
						y:
							indiPositions[isChildOfStaged as IndiKey]?.position
								.y - height,
						height: size.h,
					});
				}
			}

			if (isSiblingOfStaged || isSpouseOfStaged) {
				const horizontalIndis = getHorizontalIndis(position.y);
				const isSibilingOfHorizontal =
					horizontalIndis?.isSiblingOf(draggedId);
				const isSpouseOfHorizontal =
					horizontalIndis?.isSpouseOf(draggedId);

				if (!isSibilingOfHorizontal && !isSpouseOfHorizontal) {
					details.push(
						{
							status: "INVALID_LEVEL",
							details: "SIBLING",
							y: indiPositions[isSiblingOfStaged as IndiKey]
								?.position.y,
							height: size.h,
						},
						{
							status: "INVALID_LEVEL",
							details: "SPOUSE",
							y: indiPositions[isSpouseOfStaged as IndiKey]
								?.position.y,
							height: size.h,
						}
					);
				}
			}

			setValidation(details);
			return details;
		},
		[
			getHorizontalIndis,
			getIndiOnPosition,
			indiPositions,
			indis,
			setValidation,
			settings.horizontalSpace,
			settings.verticalSpace,
		]
	);

	const isValid = useMemo(
		() => checkIsValid(validationDetails),
		[checkIsValid, validationDetails]
	);

	return { isValid, validator, setValidation, validationDetails };
};

export default usePositionValidation;
