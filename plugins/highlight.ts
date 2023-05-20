export default function (): MarkedExtension {
	return {
		extensions: [{
			name: "highlight",
			level: "inline",
			start(src) { return src.indexOf("="); },
			tokenizer(src, tokens) {
				console.log(src, tokens);
				const rule = /^==(.+?)==/;
				const match = rule.exec(src);
				if (!match) return;
				const content = match[1];
				return {
					type: "highlight",
					raw: match[0],
					content,
				};
			},
			renderer(token) {
				return `<mark>${token.content}</mark>`;
			},
		}],
	};
}
