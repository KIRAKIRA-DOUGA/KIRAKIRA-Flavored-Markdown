import { marked } from "marked";

declare global {
	type MarkedExtension = Parameters<typeof marked["use"]>[0];
}
