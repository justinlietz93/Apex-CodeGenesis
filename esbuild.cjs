const esbuild = require("esbuild")
const fs = require("fs")
const path = require("path")

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log("[watch] build started")
		})
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})
			console.log("[watch] build finished")
		})
	},
}

const copyWasmFiles = {
	name: "copy-wasm-files",
	setup(build) {
		build.onEnd(() => {
			// tree sitter
			const sourceDir = path.join(__dirname, "node_modules", "web-tree-sitter")
			const targetDir = path.join(__dirname, "dist")

			// Copy tree-sitter.wasm
			fs.copyFileSync(path.join(sourceDir, "tree-sitter.wasm"), path.join(targetDir, "tree-sitter.wasm"))
			// Removed logic for copying xhr-sync-worker.js as jsdom is no longer used

			// Copy language-specific WASM files
			const languageWasmDir = path.join(__dirname, "node_modules", "tree-sitter-wasms", "out")
			const languages = [
				"typescript",
				"tsx",
				"python",
				"rust",
				"javascript",
				"go",
				"cpp",
				"c",
				"c_sharp",
				"ruby",
				"java",
				"php",
				"swift",
				"kotlin",
			]

			languages.forEach((lang) => {
				const filename = `tree-sitter-${lang}.wasm`
				fs.copyFileSync(path.join(languageWasmDir, filename), path.join(targetDir, filename))
			})
		})
	},
}

// Plugin to copy static assets
const copyStaticAssets = {
	name: "copy-static-assets",
	setup(build) {
		const assetsDir = path.join(__dirname, "assets")
		const targetDir = path.join(__dirname, "dist", "assets")

		// Ensure target directory exists
		fs.mkdirSync(targetDir, { recursive: true })

		// Function to copy directory recursively
		const copyDirRecursive = (src, dest) => {
			const entries = fs.readdirSync(src, { withFileTypes: true })
			fs.mkdirSync(dest, { recursive: true })

			for (let entry of entries) {
				const srcPath = path.join(src, entry.name)
				const destPath = path.join(dest, entry.name)

				if (entry.isDirectory()) {
					copyDirRecursive(srcPath, destPath)
				} else {
					fs.copyFileSync(srcPath, destPath)
				}
			}
		}

		build.onEnd(() => {
			try {
				copyDirRecursive(assetsDir, targetDir)
				console.log("[copy-static-assets] Copied assets directory to dist.")
			} catch (error) {
				console.error("[copy-static-assets] Failed to copy assets:", error)
			}
		})
	},
}

// Plugin to copy python_backend directory
const copyPythonBackend = {
	name: "copy-python-backend",
	setup(build) {
		const sourceDir = path.join(__dirname, "python_backend")
		const targetDir = path.join(__dirname, "dist", "python_backend")

		// Function to copy directory recursively (same as copyStaticAssets)
		const copyDirRecursive = (src, dest) => {
			// Ensure source directory exists
			if (!fs.existsSync(src)) {
				console.warn(`[copy-python-backend] Source directory not found: ${src}`)
				return
			}
			const entries = fs.readdirSync(src, { withFileTypes: true })
			fs.mkdirSync(dest, { recursive: true })

			for (let entry of entries) {
				const srcPath = path.join(src, entry.name)
				const destPath = path.join(dest, entry.name)

				// Simple exclusion for __pycache__ and .pyc files
				if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) {
					continue
				}

				if (entry.isDirectory()) {
					copyDirRecursive(srcPath, destPath)
				} else {
					fs.copyFileSync(srcPath, destPath)
				}
			}
		}

		build.onEnd(() => {
			try {
				copyDirRecursive(sourceDir, targetDir)
				console.log("[copy-python-backend] Copied python_backend directory to dist.")
			} catch (error) {
				console.error("[copy-python-backend] Failed to copy python_backend:", error)
			}
		})
	},
}

const extensionConfig = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	logLevel: "silent",
	plugins: [
		copyWasmFiles,
		copyStaticAssets,
		copyPythonBackend, // Add the new plugin here
		/* add to the end of plugins array */
		esbuildProblemMatcherPlugin,
		{
			name: "alias-plugin",
			setup(build) {
				build.onResolve({ filter: /^pkce-challenge$/ }, (args) => {
					// Use index.js file to avoid the exports map issue
					return { path: require.resolve("pkce-challenge") }
				})
			},
		},
	],
	entryPoints: ["src/extension.ts"],
	format: "cjs",
	sourcesContent: false,
	platform: "node",
	outfile: "dist/extension.js",
	external: ["vscode"],
}

async function main() {
	const extensionCtx = await esbuild.context(extensionConfig)
	if (watch) {
		await extensionCtx.watch()
	} else {
		await extensionCtx.rebuild()
		await extensionCtx.dispose()
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
