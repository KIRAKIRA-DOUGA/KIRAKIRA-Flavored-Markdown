export default function (options = {}) {
	// extension code here

	return {
		extensions: [{
			name: "emoji",
			level: "inline",
			start(src) { return src.indexOf(":"); },
			tokenizer(src, tokens) {
				const rule = /^:(.+?):/;
				const match = rule.exec(src);
				if (!match)
					return;

				const name = match[1];
				const emoji = options.emojis[name];

				if (!emoji)
					return;


				return {
					type: "emoji",
					raw: match[0],
					name,
					emoji,
				};
			},
			renderer(token) {
				return `<img alt="${token.name}" src="${token.emoji}"${this.parser.options.xhtml ? " /" : ""}>`;
			},
		}],
	};
}
