/**
 * Plutonium Script Fixer
 *
 * Auto-fixes common issues with package.json scripts based on
 * validator analysis. This includes:
 * - Adding missing config flags
 * - Resolving output directory conflicts
 * - Fixing cross-platform path issues
 */

import fs from "fs"
import path from "path"
import { validateScripts } from "./script-validator.js"
import { getConfigWithAbsolutePaths } from "./config-manager.js"

/**
 * Apply fixes to package.json scripts
 */
async function fixScripts(options, utils) {
	const { log, heading, colors } = utils

	heading("Auto-fixing Script Issues")
	log("Analyzing and fixing package.json scripts...")

	// First validate to get the issues
	const validation = await validateScripts(options, utils)
	const config = getConfigWithAbsolutePaths()

	// Variables to track changes
	let mainFixCount = 0
	let webviewFixCount = 0

	// Fix main package.json issues
	if (validation.main.issues.length > 0 && config.resolvedPaths.javascript.main) {
		try {
			log(`\nFixing ${validation.main.issues.length} issues in main package.json...`)
			const packageJsonPath = config.resolvedPaths.javascript.main
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

			// Apply fixes for each issue
			for (const issue of validation.main.issues) {
				const { script, command, issue: issueText, suggestion } = issue

				if (packageJson.scripts && packageJson.scripts[script]) {
					let newCommand = command
					let fixed = false

					// Apply appropriate fix based on issue type
					if (issueText.includes("ESLint without --config flag") && suggestion.includes("--config")) {
						// Fix ESLint config issue
						newCommand = command.replace("eslint", "eslint --config eslint.config.js")
						fixed = true
					} else if (issueText.includes("Windows path separator")) {
						// Fix Windows path separator issues
						newCommand = command.replace(/\\/g, "/")
						fixed = true
					} else if (issueText.includes("Potential conflict") && suggestion.includes("output directories")) {
						// For conflict issues, we need to be more careful
						// Only fix specific known cases where it's safe

						// For TypeScript conflicts, we can use different outDir values
						if (command.includes("tsc") && command.includes("--outDir")) {
							const scriptKey = script.toLowerCase()
							if (scriptKey.includes("test")) {
								// For test scripts, use test-output directory
								newCommand = command.replace(/--outDir\s+\S+/, "--outDir test-output")
								fixed = true
							}
						}
					}

					if (fixed) {
						log(`  ${colors.green}✓ Fixed:${colors.reset} ${script}`)
						log(`    ${colors.yellow}From:${colors.reset} ${command}`)
						log(`    ${colors.green}To:${colors.reset} ${newCommand}`)
						packageJson.scripts[script] = newCommand
						mainFixCount++
					} else {
						log(`  ${colors.yellow}⚠ No auto-fix available for:${colors.reset} ${script}`)
						log(`    ${colors.dim}Issue: ${issueText}${colors.reset}`)
					}
				}
			}

			// Write changes to file if fixes were applied
			if (mainFixCount > 0 && !options.dryRun) {
				fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
				log(`\n${colors.green}✓ Applied ${mainFixCount} fixes to main package.json${colors.reset}`)
			} else if (mainFixCount > 0) {
				log(`\n${colors.yellow}Found ${mainFixCount} potential fixes for main package.json (dry run)${colors.reset}`)
			}
		} catch (error) {
			log(`Error fixing main package.json: ${error.message}`, "error")
		}
	}

	// Fix webview package.json issues
	if (validation.webview.issues.length > 0 && config.resolvedPaths.javascript.webview) {
		try {
			log(`\nFixing ${validation.webview.issues.length} issues in webview package.json...`)
			const packageJsonPath = config.resolvedPaths.javascript.webview
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))

			// Apply fixes for each issue
			for (const issue of validation.webview.issues) {
				const { script, command, issue: issueText, suggestion } = issue

				if (packageJson.scripts && packageJson.scripts[script]) {
					let newCommand = command
					let fixed = false

					// Apply appropriate fix based on issue type
					if (issueText.includes("ESLint without --config flag") && suggestion.includes("--config")) {
						// Fix ESLint config issue
						newCommand = command.replace("eslint", "eslint --config eslint.config.js")
						fixed = true
					} else if (issueText.includes("Windows path separator")) {
						// Fix Windows path separator issues
						newCommand = command.replace(/\\/g, "/")
						fixed = true
					} else if (issueText.includes("Potential conflict") && suggestion.includes("output directories")) {
						// For conflict issues, we need to be more careful
						// Only fix specific known cases where it's safe

						// For TypeScript conflicts, we can use different outDir values
						if (command.includes("tsc") && command.includes("--outDir")) {
							const scriptKey = script.toLowerCase()
							if (scriptKey.includes("test")) {
								// For test scripts, use test-output directory
								newCommand = command.replace(/--outDir\s+\S+/, "--outDir test-output")
								fixed = true
							}
						}
					}

					if (fixed) {
						log(`  ${colors.green}✓ Fixed:${colors.reset} ${script}`)
						log(`    ${colors.yellow}From:${colors.reset} ${command}`)
						log(`    ${colors.green}To:${colors.reset} ${newCommand}`)
						packageJson.scripts[script] = newCommand
						webviewFixCount++
					} else {
						log(`  ${colors.yellow}⚠ No auto-fix available for:${colors.reset} ${script}`)
						log(`    ${colors.dim}Issue: ${issueText}${colors.reset}`)
					}
				}
			}

			// Write changes to file if fixes were applied
			if (webviewFixCount > 0 && !options.dryRun) {
				fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
				log(`\n${colors.green}✓ Applied ${webviewFixCount} fixes to webview package.json${colors.reset}`)
			} else if (webviewFixCount > 0) {
				log(
					`\n${colors.yellow}Found ${webviewFixCount} potential fixes for webview package.json (dry run)${colors.reset}`,
				)
			}
		} catch (error) {
			log(`Error fixing webview package.json: ${error.message}`, "error")
		}
	}

	// Summary
	const totalFixes = mainFixCount + webviewFixCount
	if (totalFixes > 0) {
		log(`\n${colors.green}✓ Total fixes applied: ${totalFixes}${colors.reset}`)
	} else {
		log(`\n${colors.yellow}No script issues were automatically fixed${colors.reset}`)
		log(`Some issues require manual attention as they involve build system configuration`)
	}

	if (options.dryRun) {
		log(`\nThis was a dry run. Run with --fix to apply these changes.`)
	}

	return {
		fixed: totalFixes,
		mainFixCount,
		webviewFixCount,
		remainingIssues: validation.main.issues.length + validation.webview.issues.length - totalFixes,
	}
}

export { fixScripts }
