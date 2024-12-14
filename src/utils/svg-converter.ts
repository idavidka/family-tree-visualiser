const maxSize = 14400;

export const convertSvg = async (
	svgStr: string,
	output: "jpg" | "png" | "canvas" = "png",
	background?: string,
	scaleUp = 10
) =>
	await new Promise<Blob | HTMLCanvasElement | null>((resolve, reject) => {
		const img = new Image();

		img.onload = () => {
			const canvas = document.createElement("canvas");

			let w = img.width * scaleUp;
			let h = img.height * scaleUp;

			if (w > maxSize) {
				const scale = maxSize / w;
				w = maxSize;
				h = h * scale;
			}

			if (h > maxSize) {
				const scale = maxSize / h;
				h = maxSize;
				w = w * scale;
			}

			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("No context"));
				return;
			}

			if (background) {
				ctx.fillStyle = background;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			}

			ctx.drawImage(img, 0, 0, w, h);

			if (output === "canvas") {
				resolve(canvas);
			} else {
				canvas.toBlob(resolve, `image/${output}`, 1);
			}
		};
		img.src = `data:image/svg+xml;base64,${btoa(
			unescape(encodeURIComponent(svgStr))
		)}`;
	});
