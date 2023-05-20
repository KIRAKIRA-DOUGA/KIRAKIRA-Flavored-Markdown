import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import pkg from "./package.json" assert { type: "json" };

const enableTerser = false;

const banner = `/**
 * Copyright (c) 2023~${new Date().getFullYear()}, KIRAKIRA Project Team.
 */
`;

export default {
	input: "test/browser.marked.test.ts",
	output: {
		file: "./dist-test/index.js",
		format: "iife",
		banner,
	},
	external: Object.keys(pkg.dependencies),
	plugins: [
		nodeResolve(),
		commonjs(),
		copy({
			targets: [
				{ src: "public/*", dest: "dist-test" },
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
