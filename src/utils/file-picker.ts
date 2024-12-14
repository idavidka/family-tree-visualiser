export const filePicker = async <T>(): Promise<T> =>
	await new Promise((resolve, reject) => {
		const input = document.createElement("input");
		input.type = "file";
		input.addEventListener("change", (e) => {
			const target = e.target as HTMLInputElement | undefined;
			target?.files?.[0]
				?.text()
				.then((r) => {
					resolve(r as T);
					return r;
				})
				.catch(reject);
		});
		input.click();
	});
