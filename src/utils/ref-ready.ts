import { type MutableRefObject } from "react";

export const refReady = (
	value: MutableRefObject<unknown>,
	callback: () => void,
	delay = 10,
	maxAttempts = 10,
	attempt = 0
) => {
	if (value.current) {
		callback();
	} else if (attempt < maxAttempts) {
		return setTimeout(() => {
			refReady(value, callback, delay, maxAttempts, attempt + 1);
		}, delay);
	}
};
