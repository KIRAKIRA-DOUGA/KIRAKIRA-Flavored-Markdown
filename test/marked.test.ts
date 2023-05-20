import parse from "../src/parse";

test("marked", () => {
	expect(parse("**hello world**")).toBe("<p><strong>hello world</strong></p>");
});
