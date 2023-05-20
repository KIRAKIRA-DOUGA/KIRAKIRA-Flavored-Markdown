import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
// import pkg from "./package.json" assert { type: "json" };

const enableTerser = false;

const banner = `/**
 * Copyright (c) 2023~${new Date().getFullYear()}, KIRAKIRA Project Team.
 */
`;

export default {
	input: "test/browser.test.ts",
	output: {
		file: "./dist/index.js",
		format: "iife",
		banner,
	},
	onwarn(warning) {
		console.warn(warning.message);
	},
	// external: Object.keys(pkg.dependencies),
	plugins: [
		copy({
			targets: [
				{ src: "public/*", dest: "dist" },
			],
		}),
		typescript({
			module: "esnext",
			target: "esnext",
			noImplicitAny: true,
			moduleResolution: "node",
			strict: true,
		}),
		enableTerser && terser(),
	],
};
