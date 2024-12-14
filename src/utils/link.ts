export const openInNewTab = (url: string, download?: string) => {
	const link = document.createElement("a");
	Object.assign(link, {
		target: "_blank",
		rel: "noopener noreferrer",
		href: url,
	});

	if (download) {
		link.download = download;
	}

	link.click();
};
