export type RGB = `rgb(${string})`;
export type RGBA = `rgba(${string})`;
export type HEX = `#${string}`;
export type HSL = `hsl(${string})`;
export type HSLA = `hsla(${string})`;
export type VAR = `var(${string})`;

export type Color =
	| "currentColor"
	| "transparent"
	| RGB
	| RGBA
	| HEX
	| HSL
	| HSLA
	| VAR;
