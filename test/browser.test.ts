import parse from "../src/parse";

const mdEdit = document.getElementById("md-edit") as HTMLTextAreaElement;
const htmlPreview = document.getElementById("html-preview")!;
const resultPreview = document.getElementById("result-preview")!;

mdEdit.addEventListener("input", function () {
	const text = this.value;
	const result = parse(text);
	htmlPreview.innerText = result;
	resultPreview.innerHTML = result;
});
