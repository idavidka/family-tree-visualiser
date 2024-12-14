import React, {
	type MouseEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type HTMLAttributes,
	type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { BiChevronDown } from "react-icons/bi";
import { Toggle } from "../toggle/toggle";
import { useDispatch, useSelector } from "react-redux";
import { selectAdditionalSettings } from "../../store/main/selectors";
import { actions } from "../../store/main/reducers";

export interface DropdownDivider {
	label?: string;
	isDivider: true;
}
export interface DropdownItem<T extends string> {
	label: string;
	value: T;
	child?: boolean;
	disabled?: boolean;
	icon?: ReactNode;
	settings?: Record<string, string>;
}
export type DropdownItemWithChildren<
	T extends string,
	C extends string,
> = DropdownItem<T> & {
	children?: Array<DropdownItems<C>>;
};
export type DropdownItems<T extends string> = DropdownItem<T> | DropdownDivider;

export type DropdownItemsWithChildren<T extends string, C extends string> =
	| DropdownItemWithChildren<T, C>
	| DropdownDivider;

interface OnClickProp {
	onClick?: MouseEventHandler<HTMLButtonElement>;
}
interface Props<T extends string, C extends string> {
	as?: React.ReactElement | React.FC<HTMLAttributes<HTMLElement>>;
	className?: string;
	selected?: string;
	label?: string;
	items: Array<DropdownItems<T>> | Array<DropdownItemsWithChildren<T, C>>;
	onSelect?: (
		selected: T | C,
		settings?: Record<string, boolean | undefined>
	) => void | Promise<void>;
	blocked?: boolean;
	preventActionIfParent?: boolean;
	showSelectedOnTarget?: boolean;
}
const Dropdown = <T extends string, C extends string>({
	as: AsComponent,
	className = "",
	items,
	label,
	selected: selectedProp,
	onSelect: onSelectProp,
	blocked,
	preventActionIfParent = true,
	showSelectedOnTarget,
}: Props<T, C>) => {
	const dispatch = useDispatch();
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState(selectedProp);
	const [openParent, setOpenParent] = useState<T>();

	const additionalSettings = useSelector(selectAdditionalSettings);

	const toggleSettings = useCallback(
		(type: string, name: string, value?: boolean) => {
			dispatch(actions.setAdditionalSettings({ type, name, value }));
		},
		[dispatch]
	);

	const flatItems = useMemo(() => {
		return items.reduce<
			Array<
				(DropdownItem<T | C> | DropdownDivider) & {
					variables?: Record<string, unknown>;
				}
			>
		>((acc, curr) => {
			if (!("children" in curr)) {
				return [...acc, curr];
			}

			const newAcc = [...acc, curr];

			curr.children?.forEach((child) => {
				newAcc.push(child);
			});

			return newAcc;
		}, []);
	}, [items]);

	useEffect(() => {
		if (blocked) {
			setOpen(false);
			setOpenParent(undefined);
		}
	}, [blocked]);

	useEffect(() => {
		setSelected(selectedProp);
	}, [selectedProp]);

	const onSelect = useCallback(
		(selected: T | C, hasChildren?: boolean) => {
			if (!preventActionIfParent || !hasChildren) {
				onSelectProp?.(
					selected,
					additionalSettings[selected] ||
						additionalSettings[selected.replace(/-.+$/, "")]
				);
				setSelected(selected);
				setOpen(false);
			} else if (hasChildren) {
				setOpenParent(selected as T);
			}
		},
		[onSelectProp, preventActionIfParent, additionalSettings]
	);

	const selectedItem = useMemo(() => {
		return flatItems.find(
			(item) => !("isDivider" in item) && item.value === selected
		) as DropdownItem<T> | undefined;
	}, [flatItems, selected]);

	const component = useMemo(() => {
		if (!AsComponent) {
			return (
				<div>
					<button
						onClick={(e) => {
							const target = e.target as HTMLElement | undefined;
							if (!target?.closest(".close")) {
								setOpen((prev) => !prev);
							}
						}}
						type="button"
						// eslint-disable-next-line max-len
						className="flex items-center w-full justify-center gap-x-1.5 rounded-md bg-white py-1 text-s font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
						id="menu-button"
						aria-expanded={open ? "true" : "false"}
						aria-haspopup={open ? "true" : "false"}
					>
						{showSelectedOnTarget ? (
							<>
								{selectedItem?.icon || null}
								<span>{t(selectedItem?.label ?? "")}</span>
							</>
						) : (
							<>
								{selectedItem?.label || label || ""}
								<BiChevronDown />
							</>
						)}
					</button>
				</div>
			);
		}

		if (!React.isValidElement(AsComponent)) {
			const AsFc = AsComponent as React.FC<OnClickProp>;
			return (
				<AsFc
					onClick={(e) => {
						const target = e.target as HTMLElement | undefined;
						if (!target?.closest(".close")) {
							setOpen((prev) => !prev);
						}
					}}
				/>
			);
		}

		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return React.cloneElement(
			AsComponent,
			{
				...(AsComponent.props as object),
				onClick: (e) => {
					const target = e.target as HTMLElement | undefined;
					if (!target?.closest(".close")) {
						setOpen((prev) => !prev);
					}
				},
			} as OnClickProp,
			showSelectedOnTarget ? (
				<>
					{selectedItem?.icon || null}
					<span>{t(selectedItem?.label ?? "")}</span>
				</>
			) : (
				(AsComponent.props as any)?.children
			)
		);
	}, [
		AsComponent,
		label,
		open,
		selectedItem?.icon,
		selectedItem?.label,
		showSelectedOnTarget,
	]);

	return (
		<div className={`relative inline-block text-left ${className}`}>
			{component}

			{open && (
				<div
					// eslint-disable-next-line max-len
					className="absolute right-0 z-10 mt-1 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-inset ring-gray-300 focus:outline-none"
					role="menu"
					aria-orientation="vertical"
					aria-labelledby="menu-button"
				>
					<div className="py-1" role="none">
						{flatItems.map((item, index) => {
							if ("isDivider" in item) {
								return (
									<div
										key={index}
										className={`${
											item.label ? "px-2" : ""
										} bg-gray-100 text-gray-700 border-b border-gray-900 min-h-[1px] w-full`}
									>
										{t(item.label ?? "", item.variables)}
									</div>
								);
							}

							const {
								value,
								label,
								disabled,
								child,
								variables,
								icon = null,
							} = item;
							const hasChildren =
								"children" in item
									? !!(item.children as unknown[] | undefined)
											?.length
									: false;
							const hasSettings = "settings" in item;

							return (
								<>
									{hasSettings ? (
										<>
											{Object.entries(
												(item.settings as Record<
													string,
													string
												>) ?? {}
											).map(([name, sLabel], sIndex) => (
												<Toggle
													className={`text-gray-700 dark:text-gray-700 py-1 px-2 m-0 w-full text-[10px] hover:bg-gray-200 ${
														child
															? !value.startsWith(
																	`${openParent}-`
															  )
																? "hidden"
																: ""
															: ""
													} ${
														disabled
															? "disabled cursor-not-allowed pointer-events-none opacity-50"
															: "cursor-pointer "
													}`}
													labelClassName="text-gray-700 dark:text-gray-700"
													key={`${sIndex}_${name}`}
													label={t(sLabel)}
													checked={
														additionalSettings[
															value
														]?.[name]
													}
													native
													onChange={(e) => {
														toggleSettings(
															value,
															name,
															e.target.checked
														);
													}}
												/>
											))}
										</>
									) : null}
									<div
										key={index}
										className={`text-gray-700 flex justify-start items-center gap-2 px-4 py-2 text-xs hover:bg-gray-200 ${
											value === selected
												? "bg-gray-100 text-gray-900"
												: ""
										} ${
											child
												? `pl-8 ${
														!value.startsWith(
															`${openParent}-`
														)
															? "hidden"
															: ""
												  }`
												: ""
										} ${
											disabled
												? "disabled cursor-not-allowed pointer-events-none opacity-50"
												: "cursor-pointer "
										}`}
										role="menuitem"
										id="menu-item-0"
										onClick={() => {
											onSelect(value, hasChildren);
										}}
									>
										{icon}
										{t(label, variables)}
									</div>
								</>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};

export default Dropdown;
