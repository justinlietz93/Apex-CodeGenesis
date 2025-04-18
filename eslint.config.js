const js = require("@eslint/js")
const tseslint = require("typescript-eslint")
const globals = require("globals")

module.exports = tseslint.config(
	{ ignores: ["out", "dist", "**/*.d.ts"] },
	{
		files: ["**/*.{ts,tsx}"],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		languageOptions: {
			ecmaVersion: 6,
			sourceType: "module",
			globals: globals.node,
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			"@typescript-eslint/naming-convention": [
				"warn",
				{
					selector: "import",
					format: ["camelCase", "PascalCase"],
				},
			],
			"@typescript-eslint/semi": "off",
			curly: "warn",
			eqeqeq: "warn",
			"no-throw-literal": "warn",
			semi: "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-non-null-asserted-optional-chain": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"prefer-const": "off",
		},
	},
)
