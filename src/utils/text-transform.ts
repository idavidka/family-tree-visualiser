const specialMap: Record<string, string> = { ß: "#2#" };
const specialToUpper = Object.entries(specialMap).reduce<
	Record<string, string>
>((acc, [lower, upper]) => {
	acc[`(${lower})`] = upper;
	return acc;
}, {});
const upperToSpecial = Object.entries(specialMap).reduce<
	Record<string, string>
>((acc, [lower, upper]) => {
	acc[`(${upper})`] = lower;
	return acc;
}, {});

export const toUpperCase = (string?: string) => {
	return string
		?.replace(
			new RegExp(Object.keys(specialToUpper).join("|"), "g"),
			(m) => {
				return specialToUpper[`(${m})`] || m;
			}
		)
		?.toUpperCase()
		?.replace(
			new RegExp(Object.keys(upperToSpecial).join("|"), "g"),
			(m) => {
				return upperToSpecial[`(${m})`] || m;
			}
		);
};
