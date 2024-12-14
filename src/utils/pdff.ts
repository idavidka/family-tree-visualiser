import { jsPDF as JsToPdf } from "jspdf";
import { isDevelopment } from "./get-product-details";
import { printPdf } from "./print-pdf";
import { convertSvg } from "./svg-converter";

const isDev = isDevelopment();

export const pdff = async (
	svg: string,
	width: number,
	height: number,
	output: "blob" | "url" | "print" = "blob"
) => {
	const scaleUp = 3;

	const doc = new JsToPdf({
		orientation: width > height ? "landscape" : "portrait",
		unit: "px",
		format: [width, height],
	});

	const svgCanvas = await convertSvg(svg, "canvas", "white", scaleUp);

	if (svgCanvas instanceof HTMLCanvasElement) {
		doc.addImage(svgCanvas, 0, 0, width, height);

		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		if (output === "print") {
			if (isDev) {
				doc.output("dataurlnewwindow");
			} else {
				printPdf(doc.output("blob"));
			}
		}

		if (output === "url") {
			doc.output("dataurlnewwindow");
		}

		if (output === "blob") {
			return doc.output("blob");
		}
	}
};
