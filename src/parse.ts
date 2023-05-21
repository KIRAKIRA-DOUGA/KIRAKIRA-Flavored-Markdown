const ulRegexp = /\*( |$)/, olRegexp = /\d+\.( |$)/, headingRegexp = /^#+\s+|^#+$/;

export default function parse(html: string): string {
	const lines = (html + "\n".repeat(2)) // 文件末尾空行
		.replaceAll(/\n{3,}/g, "\n\n") // 移除多余的换行
		.replaceAll(/<!--.*?-->/g, "") // 移除注释
		.replaceAll(/</g, "&lt;") // 转义左尖括号/小于号
		.split("\n");
	const result: string[] = [];
	let bold = false,
		italic = false,
		underline = false,
		highlight = false,
		superscript = false,
		subscript = false,
		strikethrough = false,
		inlineCode = false,
		keyboard = false,
		spoiler = false,
		quoteLayer = 0,
		addedBr: "" | "p" | "li" = "";
	const listLayer: ("ul" | "ol")[] = [],
		spanLayer: ("color" | "attr")[] = [];
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		let line = lines[lineIndex];
		let lineResult = "", lineStack = "";
		let indent = 0;
		// 缩进
		line = line.replace(/^\s+/, indentSpace => {
			const spaceCount = countChar(indentSpace, " ");
			const tabCount = countChar(indentSpace, "\t");
			indent = spaceCount + tabCount * 2;
			return "";
		}).trim();
		// 分割线
		if (line.match(/^-{3,}$/)) {
			result.push("<hr>\n");
			continue;
		}
		let prevFirstChar = "", usedHeading = false, usedList = false, paraTimes = 0;
		const lastLine = lines[lineIndex - 1]?.replaceAll(">", "").trim(), nextLine = lines[lineIndex + 1]?.replaceAll(">", "").trim();
		const getQuoteLayer = (s: string | undefined) => countChar(s?.match(/^[>\s]*/)?.[0], ">");
		const lastQuoteLayer = getQuoteLayer(lines[lineIndex - 1]), nextQuoteLayer = getQuoteLayer(lines[lineIndex + 1]);
		const paraStart = () => lastQuoteLayer !== quoteLayer || !lastLine || !addedBr,
			paraEnd = () => nextQuoteLayer !== quoteLayer || !nextLine || !!nextLine.match(ulRegexp) || !!nextLine.match(olRegexp) || !!nextLine.match(headingRegexp);
		// 段落格式
		while (true) {
			const firstChar = line[0];
			if (prevFirstChar === firstChar || usedHeading) break;
			prevFirstChar = firstChar;
			// 引用
			if (firstChar === ">" || quoteLayer > 0 && !paraTimes)
				if (firstChar === ">")
					line = line.replace(/^[>\s]*> ?/, gt => {
						const gtCount = countChar(gt, ">");
						const differ = gtCount - quoteLayer;
						lineResult += differ === 0 ? "" : (differ > 0 ? "<blockquote>\n" : "</blockquote>\n").repeat(Math.abs(differ));
						quoteLayer = gtCount;
						return "";
					});
				else {
					lineResult += "</blockquote>\n".repeat(quoteLayer);
					quoteLayer = 0;
				}
			// 列表
			if (firstChar === "*" || "0123456789".includes(firstChar) || listLayer.length && !paraTimes) {
				const isUl = !!line.match(ulRegexp), isOl = !!line.match(olRegexp);
				if (isUl || isOl) {
					const listIndent = Math.floor(indent / 2) + 1;
					const differ = listIndent - listLayer.length;
					if (differ <= 0) {
						for (let i = 0; i > differ; i--)
							lineResult += `</${listLayer.pop()}>\n`;
						if (isUl && listLayer.at(-1) === "ol") {
							lineResult += "</ol>\n<ul>\n";
							listLayer[listLayer.length - 1] = "ul";
						} else if (isOl && listLayer.at(-1) === "ul") {
							lineResult += "</ul>\n<ol>\n";
							listLayer[listLayer.length - 1] = "ol";
						}
					} else if (isUl) {
						lineResult += "<ul>\n".repeat(differ);
						listLayer.push(...Array(differ).fill("ul"));
					} else if (isOl) {
						lineResult += "<ol>\n".repeat(differ);
						listLayer.push(...Array(differ).fill("ol"));
					}
					if (!addedBr)
						lineResult += "<li>";
					if (paraEnd())
						lineStack = "</li>" + lineStack;
					else {
						if (line.at(-1) !== "\\")
							lineStack = "<br>" + lineStack;
						addedBr = "li";
					}
					usedList = true;
					if (isUl) line = line.replace(ulRegexp, "");
					else if (isOl) line = line.replace(olRegexp, "");
				} else if (paraStart())
					while (listLayer.length)
						lineResult += `</${listLayer.pop()}>\n`;
			}
			// 段落
			if (firstChar === "#")
				line = line.replace(headingRegexp, hash => {
					const hashCount = hash.trimEnd().length;
					lineResult += `<h${hashCount}>`;
					lineStack = `</h${hashCount}>` + lineStack;
					usedHeading = true;
					return "";
				});
			paraTimes++;
		}
		// 普通段落
		if (!usedHeading && !usedList && line.length !== 0) {
			if (paraStart()) {
				lineResult += "<p>";
				addedBr = "";
			}
			if (paraEnd()) {
				lineStack = `</${addedBr || "p"}>` + lineStack;
				addedBr = "";
			} else {
				if (line.at(-1) !== "\\")
					lineStack = "<br>" + lineStack;
				addedBr ||= "p";
			}
		}
		line = line.trim();
		// 块级样式
		if (line[0] === "{")
			line = line.replace(/^{[A-Za-z0-9-_.# ]*}\s*/, brace => {
				const selector = readSelector(brace);
				if (selector && lineResult.at(-1) === ">" && lineResult.match(/<[A-Za-z0-9-]+>$/)) {
					const attrs = getSelectorAttrs(selector);
					lineResult = lineResult.replace(/\b(?=>$)/, attrs);
				}
				return "";
			});
		// 行内文字格式
		for (let charIndex = 0; charIndex < line.length; charIndex++) {
			const char = line[charIndex];
			// 转义
			if (tryRead("\\", line, charIndex)) {
				charIndex++;
				const escaped = line[charIndex];
				if (escaped === undefined) continue;
				else if (escaped === "n") // `\n`，表示显式插入一个换行，用于在标题插入换行等迷惑行为。
					lineResult += "<br>";
				else if (escaped === "/") // `\/`，表示插入一个 <wbr> 零宽空格，用于拆分语法容易混淆的语句。
					lineResult += "<wbr>";
				else if (" *_=~^`!".includes(escaped)) { // 反斜杠后任意个数特殊字符，表示保留这些个数的字符。
					const length = readMultiple(escaped, line, charIndex);
					lineResult += (escaped === " " ? "&nbsp;" : escaped).repeat(length);
					// `\ `，反斜杠后任意个数空格，表示保留这些个数的空格而不是缩短为一个空格。
					charIndex += length - 1;
				} else // 无意义，按原样将下一个字符返回。
					lineResult += escaped;
				continue;
			}
			// 加粗、倾斜
			const asterisk = readMultiple("*", line, charIndex);
			if (asterisk) {
				const isBold = asterisk >= 2, isItalic = asterisk % 2 === 1;
				if (italic && isBold && isItalic) {
					bold = !bold;
					italic = !italic;
					lineResult += "</i>" + (bold ? "<b>" : "</b>");
				} else {
					if (isBold) {
						bold = !bold;
						lineResult += bold ? "<b>" : "</b>";
					}
					if (isItalic) {
						italic = !italic;
						lineResult += italic ? "<i>" : "</i>";
					}
				}
				charIndex += asterisk - 1;
				continue;
			}
			// 下划线
			if (tryRead("_", line, charIndex)) {
				underline = !underline;
				lineResult += underline ? "<u>" : "</u>";
				continue;
			}
			// 高亮
			if (tryRead("==", line, charIndex)) {
				highlight = !highlight;
				lineResult += highlight ? "<mark>" : "</mark>";
				charIndex += 1;
				continue;
			}
			// 上标
			if (tryRead("^", line, charIndex)) {
				superscript = !superscript;
				lineResult += superscript ? "<sup>" : "</sup>";
				continue;
			}
			// 下标、删除线
			const tilde = readMultiple("~", line, charIndex);
			if (tilde) {
				const isStrikethrough = tilde >= 2, isSubscript = tilde % 2 === 1;
				if (subscript && isStrikethrough && isSubscript) {
					strikethrough = !strikethrough;
					subscript = !subscript;
					lineResult += "</sub>" + (strikethrough ? "<s>" : "</s>");
				} else {
					if (isStrikethrough) {
						strikethrough = !strikethrough;
						lineResult += strikethrough ? "<s>" : "</s>";
					}
					if (isSubscript) {
						subscript = !subscript;
						lineResult += subscript ? "<sub>" : "</sub>";
					}
				}
				charIndex += tilde - 1;
				continue;
			}
			// 行内代码、键盘按键
			{
				const keyboardOn = tryRead("`|", line, charIndex), keyboardOff = tryRead("|`", line, charIndex);
				if (keyboardOn && !keyboard || keyboardOff && keyboard) {
					keyboard = !keyboard;
					lineResult += keyboard ? "<kbd>" : "</kbd>";
					charIndex++;
					continue;
				}
			}
			if (tryRead("`", line, charIndex)) {
				inlineCode = !inlineCode;
				lineResult += inlineCode ? "<code>" : "</code>";
				continue;
			}
			// 黑幕
			if (tryRead("!!", line, charIndex)) {
				spoiler = !spoiler;
				lineResult += spoiler ? "<kira-spoiler>" : "</kira-spoiler>";
				charIndex += 1;
				continue;
			}
			// 颜色、行内样式
			if (tryRead("$", line, charIndex)) {
				if (tryRead("$color{", line, charIndex)) {
					const brace = readBrace(line, charIndex + "$color".length);
					if (brace) {
						spanLayer.push("color");
						charIndex = brace.newIndex;
						let tag = "<span";
						const [textColor, backgroundColor] = brace.result;
						const styles: string[] = [];
						if (textColor) styles.push("color: " + textColor);
						if (backgroundColor) styles.push("background-color: " + backgroundColor);
						if (styles.length) tag += ` style="${styles.join("; ")}"`;
						tag += ">";
						lineResult += tag;
						continue;
					}
				} else if (tryRead("$attr{", line, charIndex)) {
					const selector = readSelector(line, charIndex + "$attr".length);
					if (selector) {
						spanLayer.push("attr");
						charIndex = selector.newIndex;
						const tag = `<span${getSelectorAttrs(selector)}>`;
						lineResult += tag;
						continue;
					}
				}
				if (spanLayer.length) {
					lineResult += "</span>";
					spanLayer.pop();
					continue;
				}
			}
			lineResult += char;
		}
		lineResult += lineStack;
		result.push(lineResult);
	}
	return result.join("\n").replaceAll(/[ \t]+/g, " ").replaceAll(/\n+/g, "\n").replace(/\n+$/, "");
}

function tryRead(expect: string, text: string, currentIndex: number) {
	return text.slice(currentIndex).startsWith(expect);
}

function readMultiple(symbol: string, text: string, currentIndex: number) {
	let count = 0;
	for (let i = currentIndex; i < text.length; i++)
		if (text[i] === symbol) count++;
		else break;
	return count;
}

function countChar(str: string, char: string) {
	if (!str) return 0;
	return (str.match(new RegExp(char, "g")) || []).length;
}

function checkBraceValid(text: string, currentIndex: number = 0) {
	return text.slice(currentIndex).match(/^{{(?!{).*?(?<!})}}|^{(?!{).*?(?<!})}/)?.[0];
}

function readBrace(text: string, currentIndex: number, sep: string = "|") {
	let brace = checkBraceValid(text, currentIndex);
	if (!brace) return null;
	const newIndex = currentIndex + brace.length - 1;
	brace = brace.replace(/^{+|}+$/g, "");
	let result: string[];
	if (sep === " ") result = brace.trim().replace(/\s+/g, " ").split(" ");
	else result = brace.split(sep);
	result = result.map(i => i.replace(/[;'"].*/, "").trim()).filter(i => i);
	if (!result.length) return null;
	return { result, newIndex };
}

function readSelector(text: string, currentIndex: number = 0) {
	text = checkBraceValid(text, currentIndex);
	if (!text) return null;
	return {
		id: text.match(/#[A-Za-z0-9-_]+/)?.[0].slice(1),
		classes: [...text.match(/\.[A-Za-z0-9-_]+/g) ?? []].map(i => i.slice(1)),
		newIndex: currentIndex + text.length - 1,
	};
}

function getSelectorAttrs(selector: { id?: string; classes: string[] }) {
	const { id, classes } = selector;
	let attrs = "";
	if (id) attrs += ` id="${id}"`;
	if (classes.length) attrs += ` class="${classes.join(" ")}"`;
	return attrs;
}
