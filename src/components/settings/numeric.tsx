import { Label } from "flowbite-react";
import React from "react";
import { type Settings } from "../../store/main/reducers";

type ObjectKey<O, T> = { [K in keyof O]: O[K] extends T ? K : never }[keyof O &
	string];
type Id = Exclude<ObjectKey<Settings, number>, undefined>;
interface Props {
	label: string;
	id: Id;
	min: number;
	max: number;
	step?: number;
	settings: Settings;
	initial: Settings;
	onChange?: (newSettings: Settings) => void;
}

export const Numeric = ({
	label,
	id,
	min,
	max,
	step = 1,
	settings,
	initial,
	onChange,
}: Props) => {
	return (
		<Label className="text-white text-left text-xs mt-2">
			{label}
			<input
				type="number"
				id={id}
				// eslint-disable-next-line max-len
				className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full px-2.5 py-1"
				placeholder=""
				min={min}
				max={max}
				step={step}
				required
				value={settings[id]}
				onChange={(e) => {
					const value = Number(e.target.value);
					if (value < min || value > max) {
						return;
					}

					onChange?.({
						...settings,
						[id]: value !== undefined ? value : initial[id],
					});
				}}
			/>
		</Label>
	);
};
