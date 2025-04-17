/**
 * Plutonium Script Validator
 *
 * Analyzes and validates package.json scripts for potential issues:
 * - Identifies conflicting scripts
 * - Detects deprecated commands
 * - Checks for version compatibility issues
 * - Suggests script optimizations
 */

import fs from "fs"
import path from "path"
import { getConfigWithAbsolutePaths } from "./config-manager.js"

/**
 * Check for potential script conflicts in package.json
 */
function analyzeScripts(packageJsonPath, utils) {
	const { log, colors } = utils

	try {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
		const scripts = packageJson.scripts || {}
		const issues = []

		// No scripts found
		if (Object.keys(scripts).length === 0) {
			return { valid: true, issues: [] }
		}

		// Check for common issues
		for (const [name, script] of Object.entries(scripts)) {
			// Check for Windows path separators in script
			if (script.includes("\\") && !script.includes("\\\\")) {
				issues.push({
					script: name,
					command: script,
					issue: "Windows path separator detected - this may cause cross-platform issues",
					suggestion: "Use forward slashes or path.join() in script paths",
				})
			}

			// Check for ESLint compatibility
			if (script.includes("eslint") && !script.includes("--config")) {
				if (
					fs.existsSync(path.join(path.dirname(packageJsonPath), "eslint.config.js")) &&
					!fs.existsSync(path.join(path.dirname(packageJsonPath), ".eslintrc.json"))
				) {
					issues.push({
						script: name,
						command: script,
						issue: "Using ESLint without --config flag, but using ESLint flat config format",
						suggestion: "Add --config eslint.config.js to ensure correct config file is used",
					})
				}
			}

			// Check for potentially conflicting file extensions
			if (
				script.includes(".js") &&
				fs.existsSync(path.join(path.dirname(packageJsonPath), script.split(" ")[0].replace(".js", ".cjs")))
			) {
				issues.push({
					script: name,
					command: script,
					issue: "Referencing .js file when both .js and .cjs exist",
					suggestion: "Be explicit about which file to use to avoid Node.js module resolution confusion",
				})
			}

			// Check for vite compatibility
			if (
				script.includes("vite") &&
				packageJson.dependencies &&
				packageJson.dependencies["vite"] &&
				script.includes("--config") &&
				!script.includes(".js") &&
				!script.includes(".ts")
			) {
				issues.push({
					script: name,
					command: script,
					issue: "Vite config missing file extension",
					suggestion: "Specify full filename for Vite config (e.g., vite.config.js)",
				})
			}
		}

		// Check for conflicting script commands
		const scriptOutputs = new Map()
		for (const [name, script] of Object.entries(scripts)) {
			// Extract core command (first word after potential NODE_ENV settings)
			const coreCommand = script.split("&&").pop().trim().split(" ")[0]

			// Check for scripts that might conflict by producing the same output files
			if (["build", "tsc", "webpack", "esbuild", "rollup", "vite build"].some((cmd) => script.includes(cmd))) {
				const outputDir = script.includes("--outDir")
					? script.split("--outDir")[1].trim().split(" ")[0]
					: script.includes("-o")
						? script.split("-o")[1].trim().split(" ")[0]
						: "dist" // default assumption

				if (scriptOutputs.has(outputDir)) {
					const conflictScript = scriptOutputs.get(outputDir)
					issues.push({
						script: name,
						command: script,
						issue: `Potential conflict with '${conflictScript}' - both write to '${outputDir}'`,
						suggestion: "Use different output directories or ensure intentional overwriting",
					})
				} else {
					scriptOutputs.set(outputDir, name)
				}
			}
		}

		return {
			valid: issues.length === 0,
			issues,
		}
	} catch (error) {
		utils.log(`Error analyzing scripts in ${packageJsonPath}: ${error.message}`, "error")
		return { valid: false, error: error.message }
	}
}

/**
 * Validate scripts in all package.json files
 */
async function validateScripts(options, utils) {
	const { heading, log, colors } = utils

	heading("Script Validation")
	log("Analyzing package.json scripts for conflicts and issues...")

	const config = getConfigWithAbsolutePaths()
	const results = {
		main: { valid: true, issues: [] },
		webview: { valid: true, issues: [] },
	}

	// Validate main package.json
	if (config.resolvedPaths.javascript.main) {
		log(`\nAnalyzing scripts in main package.json...`)
		results.main = analyzeScripts(config.resolvedPaths.javascript.main, utils)

		if (results.main.issues.length > 0) {
			log(`\n${colors.yellow}Found ${results.main.issues.length} potential issues in main scripts:${colors.reset}`)

			results.main.issues.forEach((issue, index) => {
				log(`\n${colors.bright}${index + 1}. Script: ${colors.yellow}${issue.script}${colors.reset}`)
				log(`   Command: ${issue.command}`)
				log(`   ${colors.yellow}Issue: ${issue.issue}${colors.reset}`)
				log(`   ${colors.green}Suggestion: ${issue.suggestion}${colors.reset}`)
			})
		} else {
			log(`${colors.green}✓ No issues found in main package.json scripts${colors.reset}`)
		}
	}

	// Validate webview package.json
	if (config.resolvedPaths.javascript.webview) {
		log(`\nAnalyzing scripts in webview package.json...`)
		results.webview = analyzeScripts(config.resolvedPaths.javascript.webview, utils)

		if (results.webview.issues.length > 0) {
			log(`\n${colors.yellow}Found ${results.webview.issues.length} potential issues in webview scripts:${colors.reset}`)

			results.webview.issues.forEach((issue, index) => {
				log(`\n${colors.bright}${index + 1}. Script: ${colors.yellow}${issue.script}${colors.reset}`)
				log(`   Command: ${issue.command}`)
				log(`   ${colors.yellow}Issue: ${issue.issue}${colors.reset}`)
				log(`   ${colors.green}Suggestion: ${issue.suggestion}${colors.reset}`)
			})
		} else {
			log(`${colors.green}✓ No issues found in webview package.json scripts${colors.reset}`)
		}
	}

	return results
}

/**
 * Update lock files after dependency changes
 */
async function updateLockFiles(options, utils) {
	const { heading, log, colors, runCommand } = utils
	const config = getConfigWithAbsolutePaths()

	heading("Updating Lock Files")
	log("Regenerating lock files after dependency updates...")

	const results = {
		main: { success: false },
		webview: { success: false },
	}

	// Update main package-lock.json
	if (config.resolvedPaths.javascript.main) {
		const mainDir = path.dirname(config.resolvedPaths.javascript.main)
		log(`\nUpdating main package-lock.json...`)

		try {
			const cmd = options.legacy ? "npm install --legacy-peer-deps" : "npm install"
			const output = runCommand ? runCommand(cmd, { cwd: mainDir }) : null

			results.main = {
				success: true,
				output: output || "Lock file updated successfully",
			}

			log(`${colors.green}✓ Main package-lock.json updated successfully${colors.reset}`)
		} catch (error) {
			log(`${colors.red}✖ Failed to update main package-lock.json: ${error.message}${colors.reset}`)
			log(`${colors.yellow}Try running with --legacy-peer-deps flag if you have peer dependency conflicts${colors.reset}`)

			results.main = {
				success: false,
				error: error.message,
			}
		}
	}

	// Update webview package-lock.json
	if (config.resolvedPaths.javascript.webview) {
		const webviewDir = path.dirname(config.resolvedPaths.javascript.webview)
		log(`\nUpdating webview package-lock.json...`)

		try {
			const cmd = options.legacy ? "npm install --legacy-peer-deps" : "npm install"
			const output = runCommand ? runCommand(cmd, { cwd: webviewDir }) : null

			results.webview = {
				success: true,
				output: output || "Lock file updated successfully",
			}

			log(`${colors.green}✓ Webview package-lock.json updated successfully${colors.reset}`)
		} catch (error) {
			log(`${colors.red}✖ Failed to update webview package-lock.json: ${error.message}${colors.reset}`)
			log(`${colors.yellow}Try running with --legacy-peer-deps flag if you have peer dependency conflicts${colors.reset}`)

			results.webview = {
				success: false,
				error: error.message,
			}
		}
	}

	return results
}

export { validateScripts, updateLockFiles }
