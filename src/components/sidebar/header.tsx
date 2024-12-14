import React, { useCallback, useMemo, useRef, useState } from "react";
import { Container } from "./header.styled";
import { FileInput } from "../inputs/file-input.styled";
import SearchTagInput from "../search-input/search-tag-input";
import { type TagInputType, type TagInputData } from "../search-input/types";
import Sample from "./sample";
import { type ChangeEventData } from "@yaireo/tagify";
import { SampleContainer } from "./sample.styled";
import uniqBy from "lodash/uniqBy";
import LogoutButton from "../login/logout-button";
import { useSelector } from "react-redux";
import { selectUserId } from "../../store/main/selectors";
import { filterCacheMap } from "../search-input/utils";

import { type Settings } from "../../store/main/reducers";
import { useLocale } from "../../translation/useLocale";
import Close from "../individual/icons/close";
import Tick from "../individual/icons/tick";
import { Typeahead } from "../inputs/typeahead-input";

interface HeaderProps {
	length: number;
	searched?: TagInputData[];
	history?: TagInputData[][];
	onChange?: React.ChangeEventHandler<HTMLInputElement>;
	onSetRaw?: (id?: string, newId?: string) => void;
	onDeleteRaw?: (id: string) => void;
	onSearch?: (items: TagInputData[]) => void;
	settings: Settings;
	raws?: string[];
	selectedId?: string;
	quickList: string[] | Array<{ key: string; label: string }>;
	onQuickListSelect?: (value: string) => void;
}

const Header = ({
	length,
	history = [],
	searched: searchedProp = [],
	onChange: onFileChange,
	onSearch,
	settings,
	raws,
	onSetRaw,
	onDeleteRaw,
	selectedId,
	quickList,
	onQuickListSelect,
}: HeaderProps) => {
	const { language, t } = useLocale();
	const userId = useSelector(selectUserId);
	const searchRef = useRef<Tagify<TagInputData>>();
	const [selectedToEdit, setSelectedToEdit] = useState<string>();
	const [useAdvancedSearch, setUsedAdvancedSearch] = useState(false);

	const onChange = useCallback(
		(e: CustomEvent<ChangeEventData<TagInputData>>) => {
			onSearch?.(JSON.parse(e.detail?.value || "[]") as TagInputData[]);
		},
		[onSearch]
	);

	const suggestion = useMemo(() => {
		const suggestionUniq = uniqBy(
			history.flat(),
			({ displayValue }) => displayValue
		);

		return suggestionUniq;
	}, [history]);

	const input = useMemo(() => {
		const translatedSuggestion = suggestion.map((item) => {
			const newItem = { ...item };
			Object.keys(filterCacheMap).forEach((filter) => {
				newItem.display = newItem.display?.replace(
					filter,
					t(filter)
				) as TagInputType;
			});

			return newItem;
		});

		const transpatedSearch = searchedProp.map((item) => {
			const newItem = { ...item };
			Object.keys(filterCacheMap).forEach((filter) => {
				newItem.display = newItem.display?.replace(
					filter,
					t(filter)
				) as TagInputType;
			});

			return newItem;
		});
		return (
			<SearchTagInput
				tagifyRef={searchRef}
				className="indi-search step-2"
				onChange={onChange}
				suggestion={translatedSuggestion}
				value={transpatedSearch}
				custom={{ lang: language }}
			/>
		);
	}, [language, onChange, searchedProp, suggestion, t]);

	return (
		<Container width={settings.individualSize.w}>
			<div className="w-full flex items-center justify-between">
				<span>{userId}</span>
				<LogoutButton />
			</div>
			<FileInput className="step-1" onChange={onFileChange} />
			{raws?.length ? (
				<div className="w-full flex flex-col items-start justify-center">
					{raws.map((id) => {
						if (!id) {
							return null;
						}

						return (
							<div
								key={id}
								className={`w-full mb-2 ${
									selectedId === id
										? ""
										: "cursor-pointer hover:text-indigo-900  dark:hover:text-indigo-400 underline"
								} flex items-center justify-between`}
							>
								<span
									onClick={() => {
										if (selectedId === id) {
											return;
										}

										onSetRaw?.(id);
									}}
								>
									{selectedId === id && selectedToEdit ? (
										<input
											id="tree-name"
											name="tree-name"
											type="text"
											value={selectedToEdit || ""}
											onChange={(e) => {
												setSelectedToEdit(
													e.target.value || ""
												);
											}}
											required
											// eslint-disable-next-line max-len
											className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
										/>
									) : (
										<span
											onDoubleClick={() => {
												setSelectedToEdit(id);
											}}
										>
											{id}
										</span>
									)}
								</span>
								{selectedId === id && selectedToEdit ? (
									<Tick
										disabled={!selectedToEdit}
										onClick={() => {
											selectedToEdit &&
												onSetRaw?.(id, selectedToEdit);
											setSelectedToEdit(undefined);
										}}
									/>
								) : null}
								<Close
									// eslint-disable-next-line max-len
									className="text-indigo-900 dark:text-white hover:text-indigo-900 dark:hover:text-indigo-900"
									onClick={() => {
										if (selectedId === id) {
											onSetRaw?.(undefined);
										} else {
											if (
												window.confirm(
													t(
														"Are you sure you want to delete?"
													)
												)
											) {
												onDeleteRaw?.(id);
											}
										}
									}}
								/>
							</div>
						);
					})}
				</div>
			) : null}

			{!length ? (
				<span className="font-medium"></span>
			) : (
				<>
					{useAdvancedSearch || !quickList.length ? (
						<>
							{input}
							<SampleContainer>
								<Sample
									target=".indi-search"
									value="Contains"
								/>
								<Sample
									target=".indi-search"
									value="Starts with"
								/>
								<Sample
									target=".indi-search"
									value="Ends with"
								/>
								<Sample target=".indi-search" value="Exact" />
								<Sample target=".indi-search" value="Surname" />
								<Sample
									target=".indi-search"
									value="Givenname"
								/>
								<Sample
									target=".indi-search"
									value="Also known as"
								/>
								<Sample target=".indi-search" value="Suffix" />
							</SampleContainer>
						</>
					) : (
						<Typeahead
							placeholder={t("Quick search")}
							list={quickList}
							onSelect={onQuickListSelect}
							containerClassName="w-full mb-2 mt-0"
						/>
					)}
					<button
						// eslint-disable-next-line max-len
						className="underline text-gray-800 dark:text-gray-50 hover:text-blue-500 cursor-pointer self-end"
						onClick={() => {
							setUsedAdvancedSearch((prev) => !prev);
						}}
					>
						{t(
							useAdvancedSearch
								? "Quick search"
								: "Advanced search"
						)}
					</button>
				</>
			)}
		</Container>
	);
};

export default Header;
