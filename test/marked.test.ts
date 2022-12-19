import { marked } from "marked";

test("marked", () => {
	expect(marked.parse("**hello world**")).toBe("<p><strong>hello world</strong></p>");
});
