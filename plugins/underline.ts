export default function (): MarkedExtension {
	return {
		extensions: [{
			name: "underline",
			level: "inline",
			start(src) { return src.indexOf("_"); },
			tokenizer(src, tokens) {
				console.log(src, tokens);
				const rule = /^_(.+?)_/;
				const match = rule.exec(src);
				if (!match) return;
				const content = match[1];
				return {
					type: "underline",
					raw: match[0],
					content,
				};
			},
			renderer(token) {
				return `<u>${token.content}</u>`;
			},
		}],
	};
}
