// window.d.ts

import { type GedComType } from "./classes/gedcom/classes/gedcom";

export declare global {
	interface Window {
		dragged?: HTMLElement;
		isDragging?: boolean;
		wasDragging?: boolean;
		isRehydrating?: boolean;
		gedcom?: Record<string, GedComType | undefined>;
	}
}
