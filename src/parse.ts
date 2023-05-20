export default function parse(html: string): string {
	const lines = (html + "\n").replaceAll(/<(?!!--)/g, "&gt;").split("\n");
	let result = "";
	let bold = false,
		italic = false,
		underline = false,
		highlight = false,
		superscript = false,
		subscript = false,
		strikethrough = false,
		inlineCode = false,
		quoteLayer = 0,
		stopAddBr = false;
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
			result += "<hr>\n";
			continue;
		}
		let prevFirstChar = "", unchange = false, paraTimes = 0;
		// 段落样式
		while (!unchange) {
			const firstChar = line[0];
			if (prevFirstChar === firstChar) break;
			// 段落
			if (firstChar === "#")
				line = line.replace(/^#+\s+|^#+$/, hash => {
					const hashCount = hash.trimEnd().length;
					lineResult += `<h${hashCount}>`;
					lineStack = `</h${hashCount}>` + lineStack;
					return "";
				});
			else if (firstChar === ">" || quoteLayer > 0 && !paraTimes)
				if (firstChar === ">")
					line = line.replace(/^[>\s]+/, gt => {
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
			unchange = prevFirstChar === firstChar;
			prevFirstChar = firstChar;
			paraTimes++;
		}
		// 行内文字格式
		for (let charIndex = 0; charIndex < line.length; charIndex++) {
			const char = line[charIndex];
			// 转义
			if (tryRead("\\", line, charIndex)) {
				charIndex++;
				const escaped = line[charIndex];
				if (escaped === undefined) // 反斜杠在行末尾，表示不换行。
					stopAddBr = true;
				else if (escaped === "|") // `\|`，表示插入一个 <wbr> 零宽空格，用于拆分语法容易混淆的语句。
					lineResult += "<wbr>";
				else if (escaped === " ") { // `\ `，反斜杠后任意个数空格，表示保留这些个数的空格而不是缩短为一个空格。
					const space = readMultiple(" ", line, charIndex);
					lineResult += "&nbsp;".repeat(space);
					charIndex += space - 1;
				} else if (escaped === "*") { // `\*`，反斜杠后任意个数星号，表示保留这些个数的星号。
					const asterisk = readMultiple("*", line, charIndex);
					lineResult += "*".repeat(asterisk);
					charIndex += asterisk - 1;
				} else // 无意义，将下一个字符原样返回。
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
			// 行内代码
			if (tryRead("`", line, charIndex)) {
				inlineCode = !inlineCode;
				lineResult += inlineCode ? "<code>" : "</code>";
				continue;
			}
			lineResult += char;
		}
		lineResult += lineStack + "\n";
		stopAddBr = false;
		result += lineResult;
	}
	return result;
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
	return (str.match(new RegExp(char, "g")) || []).length;
}
