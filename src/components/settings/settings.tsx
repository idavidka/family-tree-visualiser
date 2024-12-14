/* eslint-disable max-len */
import { useTranslation } from "react-i18next";
import {
	actions,
	type Settings as SettingsType,
	DEFAULT_TREE_STATE,
	type TreeState,
} from "../../store/main/reducers";
import { useDispatch } from "react-redux";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Label } from "flowbite-react";
import Dropdown from "../dropdown/dropdown";
import {
	PEDIGREE_COLLAPSES,
	HEIGHT,
	NAME_ORDERS,
	WIDTH,
	PLACEHOLDERS,
} from "../../constants/constants";
import { type Color } from "../../types/colors";
import { usePrevious } from "react-use";
import { deepEqual } from "../../utils/deep-equal";
import { Toggle } from "../toggle/toggle";
import { Numeric } from "./numeric";

import { VscDiffAdded, VscDiffRemoved } from "react-icons/vsc";
import { FAMILY_COLORS, LINE_COLORS } from "../../colors";
import { filePicker } from "../../utils/file-picker";

const minName = 0;
const maxName = 10;
const minSpace = 1.01;
const maxSpace = 10;
const minLineSpace = 10;
const maxLineSpace = 60;
const minRounding = 0;
const maxRounding = 60;
const minScale = 0.1;
const maxScale = 4;
const minTotalAngle = 180;
const maxTotalAngle = 360;
const minHomeDiamater = 50;
const maxHomeDiameter = 200;
const minSliceWidth = 30;
const maxSliceWidth = 100;
interface Props {
	settings: SettingsType;
	isAncestry?: boolean;
	isMyHeritage?: boolean;
}

export const Settings = ({ settings, isAncestry, isMyHeritage }: Props) => {
	const { t } = useTranslation();
	const dispatch = useDispatch();
	const settingsTimeout = useRef<NodeJS.Timeout>();
	const manualSetting = useRef(false);

	const [localSettings, setLocalSettings] = useState(settings);
	const previousSettings = usePrevious(localSettings);

	useEffect(() => {
		if (!manualSetting.current && !deepEqual(localSettings, settings)) {
			setLocalSettings(settings);
		}
		manualSetting.current = false;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [settings]);

	const setNewSettings = useCallback(
		(newSettings: SettingsType) => {
			clearTimeout(settingsTimeout.current);

			setLocalSettings(newSettings);

			settingsTimeout.current = setTimeout(() => {
				manualSetting.current = true;
				dispatch(actions.setSettings(newSettings));

				if (!newSettings.cloudSync) {
					dispatch(actions.removeStates());
				} else if (!previousSettings?.cloudSync) {
					dispatch(actions.restoreStates());
				}
			}, 1000);
		},
		[dispatch, previousSettings?.cloudSync]
	);

	const focusLast = useCallback((t: EventTarget) => {
		const target = t as HTMLElement | null;

		setTimeout(() => {
			const colorElements =
				target?.parentElement?.parentElement?.querySelectorAll(
					'input[type="color"]'
				) as HTMLInputElement[] | undefined;

			colorElements?.[colorElements.length - 1]?.focus();
			colorElements?.[colorElements.length - 1]?.click();
		}, 100);
	}, []);

	const addColor = useCallback(
		(
			e: React.MouseEvent<SVGElement>,
			type: "familyColors" | "lineColors"
		) => {
			const newColors = [...localSettings[type]];
			const index = newColors.length;
			newColors[index] =
				(type === "familyColors" ? FAMILY_COLORS : LINE_COLORS)[
					index
				] ?? "#ffffff";
			setNewSettings({
				...localSettings,
				[type]: newColors,
			});

			focusLast(e.target);

			e.preventDefault();
		},
		[focusLast, localSettings, setNewSettings]
	);

	const removeColor = useCallback(
		(
			e: React.MouseEvent<SVGElement>,
			type: "familyColors" | "lineColors"
		) => {
			const newColors = [...localSettings[type]];

			if (newColors.length > 1) {
				setNewSettings({
					...localSettings,
					[type]: newColors.slice(0, -1),
				});
			}

			e.preventDefault();
		},
		[focusLast, localSettings, setNewSettings]
	);

	const doImport = useCallback(() => {
		filePicker<string>().then((r) => {
			dispatch(actions.importTreeStates(r));
		});
	}, [dispatch]);

	const doExport = useCallback(() => {
		dispatch(actions.exportTreeStates());
	}, [dispatch]);

	return (
		<>
			<Label className="text-white text-left text-xs mt-2">
				<button
					className="underline text-white cursor-pointer"
					onClick={doImport}
				>
					{t("Import")}
				</button>{" "}
				/{" "}
				<button
					className="underline text-white cursor-pointer"
					onClick={doExport}
				>
					{t("Export")}
				</button>
			</Label>
			<Toggle
				label={t("Sync to cloud")}
				checked={localSettings.cloudSync}
				onChange={(e) => {
					setNewSettings({
						...localSettings,
						cloudSync: e.target.checked,
					});
				}}
				className="text-white"
				required
			/>

			{isAncestry && (
				<Label className="text-white text-left text-xs mt-2">
					{t("Ancestry Space ID (required for content download)")}
					<input
						type="text"
						id="spaceId"
						className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-1"
						placeholder=""
						required
						value={localSettings.spaceId || ""}
						onChange={(e) => {
							const value = Number(e.target.value);

							setNewSettings({
								...localSettings,
								spaceId:
									value ||
									DEFAULT_TREE_STATE.settings.spaceId,
							});
						}}
					/>
				</Label>
			)}

			{isMyHeritage && (
				<Label className="text-white text-left text-xs mt-2">
					{t(
						"MyHeritage person ID pool (required for content download)"
					)}
					<input
						type="text"
						id="poolId"
						className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-1"
						placeholder=""
						required
						value={localSettings.poolId}
						onChange={(e) => {
							const value = Number(e.target.value);

							setNewSettings({
								...localSettings,
								poolId:
									value || DEFAULT_TREE_STATE.settings.poolId,
							});
						}}
					/>
				</Label>
			)}

			{(isAncestry && settings.spaceId) || isMyHeritage ? (
				<Toggle
					label={t("Download pictures automatically")}
					checked={localSettings.autoDownload}
					onChange={(e) => {
						setNewSettings({
							...localSettings,
							autoDownload: e.target.checked,
						});
					}}
					className="text-white"
					required
				/>
			) : null}
			<Label className="text-white text-left text-xs mt-2">
				{t("Name order")}
			</Label>
			<Dropdown
				label={t("Name order")}
				items={NAME_ORDERS.map(({ value, label }) => ({
					value,
					label: t(label),
				}))}
				className="mb-2"
				selected={localSettings.nameOrder}
				onSelect={(selected) => {
					setNewSettings({
						...localSettings,
						nameOrder:
							(selected as TreeState["settings"]["nameOrder"]) ||
							DEFAULT_TREE_STATE.settings.nameOrder,
					});
				}}
			/>

			<Numeric
				id="maxGivennames"
				label={t("Maximum givennames to show")}
				min={minName}
				max={maxName}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="maxSurnames"
				label={t("Maximum surnames to show")}
				min={minName}
				max={maxName}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Toggle
				label={t("Show suffix")}
				checked={localSettings.showSuffix}
				onChange={(e) => {
					setNewSettings({
						...localSettings,
						showSuffix: e.target.checked,
					});
				}}
				className="text-white"
				required
			/>
			<Toggle
				label={t("Show marriages")}
				checked={localSettings.showMarriages}
				onChange={(e) => {
					setNewSettings({
						...localSettings,
						showMarriages: e.target.checked,
					});
				}}
				className="text-white"
				required
			/>
			<Toggle
				label={t("Show kinship")}
				checked={localSettings.showKinship}
				onChange={(e) => {
					setNewSettings({
						...localSettings,
						showKinship: e.target.checked,
					});
				}}
				className="text-white"
				required
			/>

			<h3 className="pt-2 border-b border-b-white">
				{t("Tree settings")}
			</h3>
			<Toggle
				label={t("Colorize lines")}
				checked={localSettings.colorizeLines}
				onChange={(e) => {
					setNewSettings({
						...localSettings,
						colorizeLines: e.target.checked,
					});
				}}
				className="text-white"
				required
			/>
			<Label className="text-white text-left text-xs mt-2">
				{t("Line colors")}
				<div className="flex switch-group">
					{localSettings.lineColors.map((lineColor, index) => (
						<input
							key={index}
							type="color"
							className={`bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-0 ${
								!localSettings.colorizeLines
									? "cursor-not-allowed user-events-none opacity-50"
									: ""
							}`}
							style={{ backgroundColor: lineColor }}
							placeholder=""
							required
							disabled={!localSettings.colorizeLines}
							value={lineColor}
							onChange={(e) => {
								const newColors = [...localSettings.lineColors];
								newColors[index] = (e.target.value ||
									newColors[index]) as Color;
								setNewSettings({
									...localSettings,
									lineColors: newColors,
								});
							}}
						/>
					))}
					<div className="flex flex-col justify-center ml-0.5">
						<VscDiffAdded
							className={
								!localSettings.colorizeLines
									? "cursor-not-allowed user-events-none opacity-50"
									: "cursor-pointer"
							}
							title={t("Add new color")}
							onClick={(e) => {
								addColor(e, "lineColors");
							}}
						/>
						<VscDiffRemoved
							className={`${
								localSettings.lineColors.length <= 1 ||
								!localSettings.colorizeLines
									? "cursor-not-allowed user-events-none opacity-50"
									: "cursor-pointer"
							}`}
							title={t("Remove last color")}
							onClick={(e) => {
								removeColor(e, "lineColors");
							}}
						/>
					</div>
				</div>
			</Label>
			<Label className="text-white text-left text-xs mt-2">
				{t("Gender colors")}
				<div className="flex switch-group">
					{["M", "F", "U"].map((k, index) => {
						const genderColor =
							localSettings.genderColors[
								k as keyof typeof localSettings.genderColors
							];

						return (
							<input
								key={index}
								type="color"
								className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-0"
								style={{ backgroundColor: genderColor }}
								placeholder=""
								required
								value={genderColor}
								onChange={(e) => {
									const key = k as "F" | "M";
									const newColors = {
										...localSettings.genderColors,
									};
									newColors[key] = (e.target.value ||
										newColors[key]) as Color;
									setNewSettings({
										...localSettings,
										genderColors: newColors,
									});
								}}
							/>
						);
					})}
				</div>
			</Label>
			<Label className="text-white text-left text-md mt-4">
				{t(
					"Below settings are applied only after a tree generation or adding individual manually."
				)}
			</Label>

			<Toggle
				label={t("Draw descendants")}
				checked={localSettings.drawDescendants}
				onChange={(e) => {
					setNewSettings({
						...localSettings,
						drawDescendants: e.target.checked,
					});
				}}
				className="text-white"
				required
			/>

			<Label className="text-white text-left text-xs mt-2">
				{t("Individual size")}
				<div className="flex items-center">
					<input
						type="number"
						id="width"
						className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-1"
						placeholder=""
						min={WIDTH / 5}
						max={WIDTH * 10}
						required
						value={localSettings.individualSize.w}
						onChange={(e) => {
							setNewSettings({
								...localSettings,
								individualSize: {
									...localSettings.individualSize,
									w:
										Number(e.target.value) ||
										DEFAULT_TREE_STATE.settings
											.individualSize.w,
								},
							});
						}}
					/>
					&nbsp;X&nbsp;
					<input
						type="number"
						id="height"
						className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-1"
						placeholder=""
						min={HEIGHT / 5}
						max={HEIGHT * 10}
						required
						value={localSettings.individualSize.h}
						onChange={(e) => {
							setNewSettings({
								...localSettings,
								individualSize: {
									...localSettings.individualSize,
									h:
										Number(e.target.value) ||
										DEFAULT_TREE_STATE.settings
											.individualSize.h,
								},
							});
						}}
					/>
				</div>
			</Label>
			<Numeric
				id="horizontalSpace"
				label={t("Horizontal space")}
				min={minSpace}
				max={maxSpace}
				step={0.01}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="verticalSpace"
				label={t("Vertical space")}
				min={minSpace}
				max={maxSpace}
				step={0.01}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="lineSpace"
				label={t("Line space")}
				min={minLineSpace}
				max={maxLineSpace}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="cornerRounding"
				label={t("Line rounding")}
				min={minRounding}
				max={maxRounding}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="pdfScale"
				label={t("PDF Scale")}
				min={minScale}
				max={maxScale}
				step={0.1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<h3 className="pt-2 border-b border-b-white">
				{t("Fan chart settings")}
			</h3>

			<Label className="text-white text-left text-xs mt-2">
				{t("Placeholders")}
			</Label>
			<Dropdown
				label={t("Placeholders")}
				items={PLACEHOLDERS.map(({ value, label }) => ({
					value,
					label: t(label),
				}))}
				className="mb-2"
				selected={localSettings.pedigreeCollapse}
				onSelect={(selected) => {
					setNewSettings({
						...localSettings,
						collapsePlaceholder:
							(selected as TreeState["settings"]["collapsePlaceholder"]) ||
							DEFAULT_TREE_STATE.settings.collapsePlaceholder,
					});
				}}
			/>
			<Label className="text-white text-left text-xs mt-2">
				{t("Pedigree collapse")}
			</Label>
			<Dropdown
				label={t("Pedigree collapse")}
				items={PEDIGREE_COLLAPSES.map(({ value, label }) => ({
					value,
					label: t(label),
				}))}
				className="mb-2"
				selected={localSettings.pedigreeCollapse}
				onSelect={(selected) => {
					setNewSettings({
						...localSettings,
						pedigreeCollapse:
							(selected as TreeState["settings"]["pedigreeCollapse"]) ||
							DEFAULT_TREE_STATE.settings.pedigreeCollapse,
					});
				}}
			/>
			<Label className="text-white text-left text-xs mt-2">
				{t("Slice colors")}
				<div className="flex switch-group">
					{localSettings.familyColors.map((familyColor, index) => (
						<input
							key={index}
							type="color"
							className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-0"
							style={{ backgroundColor: familyColor }}
							placeholder=""
							required
							value={familyColor}
							onChange={(e) => {
								const newColors = [
									...localSettings.familyColors,
								];
								newColors[index] = (e.target.value ||
									newColors[index]) as Color;
								setNewSettings({
									...localSettings,
									familyColors: newColors,
								});
							}}
						/>
					))}
					<div className="flex flex-col justify-center ml-0.5">
						<VscDiffAdded
							className="cursor-pointer"
							title={t("Add new color")}
							onClick={(e) => {
								addColor(e, "familyColors");
							}}
						/>
						<VscDiffRemoved
							className={
								localSettings.familyColors.length <= 1
									? "cursor-not-allowed user-events-none opacity-50"
									: "cursor-pointer"
							}
							title={t("Remove last color")}
							onClick={(e) => {
								removeColor(e, "familyColors");
							}}
						/>
					</div>
				</div>
			</Label>
			<Numeric
				id="homeDiameter"
				label={t("Main person diameter")}
				min={minHomeDiamater}
				max={maxHomeDiameter}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="totalAngle"
				label={t("Total angle")}
				min={minTotalAngle}
				max={maxTotalAngle}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>

			<Numeric
				id="thinSliceWeight"
				label={t("Thin slice width")}
				min={minSliceWidth}
				max={maxSliceWidth}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="wideSliceWeight"
				label={t("Wide slice width")}
				min={minSliceWidth * 2}
				max={maxSliceWidth * 2}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
			<Numeric
				id="childrenSliceWeight"
				label={t("Children slice width")}
				min={minSliceWidth * 1.5}
				max={maxSliceWidth * 1.5}
				step={1}
				settings={localSettings}
				initial={DEFAULT_TREE_STATE.settings}
				onChange={setNewSettings}
			/>
		</>
	);
};
