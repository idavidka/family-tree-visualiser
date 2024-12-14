export const blobToBase64 = async (blob: Blob) => {
	return await new Promise<string>((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			resolve(reader.result?.toString() || "");
		};
		reader.readAsDataURL(blob);
	});
};
