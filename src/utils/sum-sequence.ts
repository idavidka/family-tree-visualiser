export const sumSequence = (num: number, cb?: (n: number) => number) => {
	const func = cb || ((n) => n);
	let rval = func(0);
	for (let i = 1; i < Math.abs(num); i++) {
		rval = rval + func(i);
	}

	if (num < 0) {
		return -rval;
	}

	return rval;
};
