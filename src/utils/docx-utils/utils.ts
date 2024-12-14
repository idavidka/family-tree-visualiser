export const defProp = Object.defineProperty;
export const defNormalProp = (obj: object, key: string, value: unknown) =>
	key in obj
		? defProp(obj, key, {
				enumerable: true,
				configurable: true,
				writable: true,
				value,
		  })
		: ((obj as any)[key as any] = value);
export const publicField = (obj: object, key: string, value: unknown) => {
	defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
	return value;
};
