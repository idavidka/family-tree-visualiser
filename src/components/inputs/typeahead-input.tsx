import React, {
	useMemo,
	type InputHTMLAttributes,
	useState,
	useCallback,
	useEffect,
	useRef,
} from "react";

import { TextInput } from "./text-input.styled";

type Props = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"list" | "onSelect"
> & {
	list: string[] | Array<{ key: string; label: string }>;
	onSelect?: (value: string) => void;
	containerClassName?: string;
};

export const Typeahead = ({
	list,
	onSelect,
	containerClassName = "",
	...props
}: Props) => {
	const blurTimeout = useRef<NodeJS.Timeout>();
	const usedList = useMemo(() => {
		return list.map((item) => {
			if (typeof item === "string") {
				return { key: item, label: item };
			}

			return item;
		});
	}, [list]);

	const [value, setValue] = useState("");
	const [preselected, setPreselected] = useState(0);

	const filteredList = useMemo(() => {
		if (value.length < 3) {
			return [];
		}

		return usedList
			.filter(
				(item) =>
					item.key.toLowerCase().includes(value.toLowerCase()) ||
					item.label.toLowerCase().includes(value.toLowerCase())
			)
			.map((item, index) => {
				return {
					id: item.key,
					element: (
						<div
							key={item.key}
							className={`m-1 p-1 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
								preselected === index
									? "bg-gray-100 dark:bg-gray-700 typeahead-selected"
									: ""
							}`}
							dangerouslySetInnerHTML={{
								__html: item.label.replace(
									new RegExp(`(${value})`, "i"),
									`<b class="bg-yellow-200 text-black">$1</b>`
								),
							}}
							onMouseEnter={() => {
								setPreselected(index);
							}}
							onClick={() => {
								clearTimeout(blurTimeout.current);
								setValue("");
								setPreselected(0);
								setTimeout(() => {
									onSelect?.(item.key);
								}, 100);
							}}
						></div>
					),
				};
			});
	}, [onSelect, preselected, usedList, value]);

	useEffect(() => {
		const element = document.querySelector(".typeahead-selected");

		if (
			element &&
			"scrollIntoViewIfNeeded" in element &&
			typeof element.scrollIntoViewIfNeeded === "function"
		) {
			element.scrollIntoViewIfNeeded();
		}
	}, [preselected]);

	const setPreselection = useCallback(
		(up: boolean) => {
			setPreselected((prev) => {
				let next = prev + (up ? -1 : 1);

				if (up && next < 0) {
					next = filteredList.length - 1;
				}

				if (!up && next > filteredList.length - 1) {
					next = 0;
				}

				return next;
			});
		},
		[filteredList.length]
	);

	return (
		<div className={`relative ${containerClassName}`}>
			<TextInput
				{...props}
				value={value}
				onKeyDown={(e) => {
					if (e.code === "Escape") {
						setValue("");
						onSelect?.("");
					}
					if (e.code === "Enter") {
						onSelect?.(filteredList[preselected].id);
						setPreselected(0);
					}
					if (e.code === "ArrowDown" || e.code === "ArrowUp") {
						setPreselection(e.code === "ArrowUp");
						e.preventDefault();
						return false;
					}
				}}
				onChange={(e) => {
					setValue(e.target.value);
				}}
				onBlur={() => {
					blurTimeout.current = setTimeout(() => {
						setValue("");
						onSelect?.("");
					}, 100);
				}}
				autoComplete="off"
			/>
			{filteredList.length ? (
				<div
					style={{ zIndex: 1000 }}
					// eslint-disable-next-line max-len
					className="result-container sticky block w-full max-h-[150px] overflow-auto mt-2 text-sm text-gray-900 dark:text-gray-50 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
				>
					{filteredList.map(({ element }) => element)}
				</div>
			) : null}
		</div>
	);
};
