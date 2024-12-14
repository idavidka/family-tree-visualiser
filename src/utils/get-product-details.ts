import PKG from "../../package.json";

export const isDevelopment = () => {
	return !process.env.NODE_ENV || process.env.NODE_ENV === "development";
};

export const getVersion = () => PKG.version;

export const getName = () => PKG.name;
