export const printPdf = (blob: Blob) => {
	const blobURL = URL.createObjectURL(blob);

	let iframe = document.getElementById(
		"print-pdf"
	) as HTMLIFrameElement | null;

	if (!iframe) {
		iframe = document.createElement("iframe"); // load content in an iframe to print later
		document.body.appendChild(iframe);

		iframe.id = "print-pdf";
		iframe.style.display = "none";
		iframe.onload = function () {
			setTimeout(function () {
				iframe!.focus();
				iframe!.contentWindow?.print();
			}, 1);
		};
	}

	iframe!.src = blobURL;
};
