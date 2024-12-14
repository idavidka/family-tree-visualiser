/* eslint-disable @typescript-eslint/no-explicit-any */
const debugAll = false;
const debugError = true;

export const implemented = (type: string, ...args: any[]) => {
	debugAll && console.info(`[Implemented] ${type}`, ...args);
};

export const notImplemented = (type: string, ...args: any[]) => {
	(debugAll || debugError) &&
		console.error(`[Not Implemented] ${type}`, ...args);
};
