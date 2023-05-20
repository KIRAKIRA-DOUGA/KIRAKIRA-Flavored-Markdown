import MarkdownIt from "markdown-it";
const md = new MarkdownIt();

test("marked", () => {
	expect(md.render("**hello world**")).toBe("<p><strong>hello world</strong></p>");
});
