// eslint-disable max-len
import { Label } from "flowbite-react";
import React, { useCallback, useEffect, useState } from "react";
import { usePrevious } from "react-use";

interface Props {
	as?: React.FC;
	checked?: boolean;
	onChange?: React.ChangeEventHandler<HTMLInputElement>;
	label: string;
	required?: boolean;
	className?: string;
	labelClassName?: string;
	native?: boolean;
}

export const Toggle = ({
	as,
	checked: checkedProp,
	label,
	onChange: onChangeProp,
	required,
	className = "",
	labelClassName = "",
	native,
}: Props) => {
	const [checked, setChecked] = useState(checkedProp);

	const previousChecked = usePrevious(checked);

	useEffect(() => {
		if (previousChecked !== checkedProp) {
			setChecked(checkedProp);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [checkedProp]);

	const onChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
		(e) => {
			setChecked(e.target.checked);
			onChangeProp?.(e);
		},
		[onChangeProp]
	);

	const Component = as || Label;

	return (
		<Component
			// eslint-disable-next-line max-len
			className={`text-left text-xs mt-2 relative inline-flex items-center cursor-pointer ${className}`}
		>
			<input
				type="checkbox"
				value=""
				className={`${native ? "" : "sr-only"} peer`}
				checked={checked}
				onChange={onChange}
				required={required}
			/>
			{/* eslint-disable-next-line max-len */}
			{native ? null : (
				<div className="relative w-11 min-w-[2.75rem] h-6 bg-white rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6cdb78]" />
			)}
			<span className={`ms-3 text-xs font-medium ${labelClassName}`}>
				{label}
			</span>
		</Component>
	);
};
