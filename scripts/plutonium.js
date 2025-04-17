#!/usr/bin/env node
/**
 * Plutonium - A comprehensive development toolkit for Apex CodeGenesis
 *
 * This unified CLI tool provides multiple operations to enhance development workflow:
 *  - Dependency analysis and harmonization
 *  - Cross-language dependency checking
 *  - Performance profiling and optimization
 *  - Project structure analysis
 *
 * Usage: node scripts/plutonium.js [command] [options]
 *
 * Commands:
 *   deps:check     - Analyze dependencies across JavaScript and Python
 *   deps:harmonize - Synchronize versions of shared dependencies
 *   deps:update    - Intelligently update dependencies with compatibility checks
 *   perf:analyze   - Analyze extension performance metrics
 *   struct:analyze - Analyze project structure and suggest optimizations
 *
 * Global Options:
 *   --verbose      - Show detailed output
 *   --json         - Output results as JSON
 *   --help         - Show help information for a command
 */

// Load utility modules
import * as utils from "./plutonium/utils.js"
// Import dependency-checker using require to handle CommonJS modules
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const dependencyChecker = require("./plutonium/dependency-checker.cjs")
const { checkDependencies } = dependencyChecker
import { harmonizeDependencies } from "./plutonium/dependency-harmonizer.js"
import {
	updateRequirementsTxt,
	updateNpmDependencies,
	installNpmDependencies,
	installPythonDependencies,
} from "./plutonium/dependency-updater.js"
import { initializeConfig, showConfig, detectProjectStructure, saveConfig } from "./plutonium/config-manager.js"
import { validateScripts, updateLockFiles } from "./plutonium/script-validator.js"
import { fixScripts } from "./plutonium/script-fixer.js"
import { fixCrossLanguageDependencies } from "./plutonium/cross-language-fixer.js"

// Default project directories
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..")

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0] || "help"
const options = {
	verbose: args.includes("--verbose"),
	json: args.includes("--json"),
	fix: args.includes("--fix"),
	help: args.includes("--help"),
	force: args.includes("--force"),
	legacy: args.includes("--legacy-peer-deps"),
	updateLocks: args.includes("--update-locks"),
}

/**
 * Analyze project structure and generate reports
 */
function analyzeStructure() {
	utils.heading("Project Structure Analysis")
	utils.log("Analyzing project structure and organization...")

	// Implementation for project structure analysis
	// This would analyze:
	// - Directory structure
	// - File organization
	// - Import graphs
	// - Module dependencies

	utils.log("Project structure analysis not yet implemented", "warning")
	return { status: "not implemented" }
}

/**
 * Analyze performance metrics
 */
function analyzePerformance() {
	utils.heading("Performance Analysis")
	utils.log("Analyzing extension performance metrics...")

	// Implementation for performance analysis
	// This would analyze:
	// - Extension activation time
	// - Memory usage
	// - Command execution time
	// - Webview rendering performance

	utils.log("Performance analysis not yet implemented", "warning")
	return { status: "not implemented" }
}

/**
 * Update dependencies across JavaScript and Python packages
 * This is a comprehensive updater that handles:
 * - Cross-language package version mappings
 * - Smart updates that preserve comments and structure
 * - Pinning unpinned dependencies for better reproducibility
 */
async function updateDependencies(options, utils) {
	utils.heading("Intelligent Dependency Updates")
	utils.log("Analyzing dependency files across languages...")

	// Define file paths directly
	const CONFIG = {
		resolvedPaths: {
			javascript: {
				main: path.join(DEFAULT_ROOT_DIR, "package.json"),
				webview: path.join(DEFAULT_ROOT_DIR, "webview-ui", "package.json"),
			},
			python: {
				requirements: path.join(DEFAULT_ROOT_DIR, "python_backend", "requirements.txt"),
			},
		},
	}

	const results = {
		python: { changes: 0, updates: [] },
		npm: { changes: 0, updates: [] },
		scripts: { valid: true, issues: [] },
		locks: { success: false },
	}

	// Update Python dependencies
	try {
		utils.log("\n📦 Checking Python dependencies in requirements.txt...")
		const pythonResult = await updateRequirementsTxt(options, utils)
		results.python = pythonResult
	} catch (error) {
		utils.log(`Error updating Python dependencies: ${error.message}`, "error")
	}

	// Update npm dependencies
	try {
		utils.log("\n📦 Checking npm dependencies in package.json files...")
		const npmResult = await updateNpmDependencies(options, utils)
		results.npm = npmResult
	} catch (error) {
		utils.log(`Error updating npm dependencies: ${error.message}`, "error")
	}

	// Validate scripts for conflicts or issues
	if (options.fix) {
		try {
			const scriptResults = await validateScripts(options, utils)
			results.scripts = scriptResults
		} catch (error) {
			utils.log(`Error validating scripts: ${error.message}`, "error")
		}
	}

	// Auto-install dependencies if in fix mode
	if (options.fix) {
		// Install npm main dependencies if needed
		if (results.npm.results && results.npm.results.main && results.npm.results.main.changes > 0) {
			try {
				utils.log("\nInstalling main npm dependencies...")
				const npmInstallResult = await installNpmDependencies(
					CONFIG.resolvedPaths.javascript.main,
					results.npm.results.main.updates,
					utils,
				)
				results.installs = { ...results.installs, npmMain: npmInstallResult }
			} catch (error) {
				utils.log(`Error installing main npm dependencies: ${error.message}`, "error")
			}
		}

		// Install webview npm dependencies if needed
		if (results.npm.results && results.npm.results.webview && results.npm.results.webview.changes > 0) {
			try {
				utils.log("\nInstalling webview npm dependencies...")
				const webviewInstallResult = await installNpmDependencies(
					CONFIG.resolvedPaths.javascript.webview,
					results.npm.results.webview.updates,
					utils,
				)
				results.installs = { ...results.installs, npmWebview: webviewInstallResult }
			} catch (error) {
				utils.log(`Error installing webview npm dependencies: ${error.message}`, "error")
			}
		}

		// Install Python dependencies if needed
		if (results.python && results.python.changes > 0) {
			try {
				utils.log("\nInstalling Python dependencies...")
				const pythonInstallResult = await installPythonDependencies(
					CONFIG.resolvedPaths.python.requirements,
					results.python.updates,
					utils,
				)
				results.installs = { ...results.installs, python: pythonInstallResult }
			} catch (error) {
				utils.log(`Error installing Python dependencies: ${error.message}`, "error")
			}
		}

		// Update lock files if requested - should be less needed now with direct install
		if (options.updateLocks) {
			try {
				const lockResults = await updateLockFiles(options, utils)
				results.locks = lockResults
			} catch (error) {
				utils.log(`Error updating lock files: ${error.message}`, "error")
			}
		}
	}

	// Show summary
	utils.heading("\nUpdate Summary", "subheading")
	utils.log(`Python packages: ${results.python.changes} updates`)
	utils.log(`npm packages: ${results.npm.changes} updates`)

	if (results.python.changes === 0 && results.npm.changes === 0) {
		utils.log("\n✅ All dependencies are up-to-date!", "success")
	} else if (!options.fix) {
		utils.log(`\n${utils.colors.yellow}Run with --fix to apply these changes${utils.colors.reset}`)
		utils.log(`${utils.colors.yellow}Use --update-locks to also update lock files automatically${utils.colors.reset}`)
	} else if (!options.updateLocks) {
		utils.log(`\n${utils.colors.yellow}Don't forget to update lock files with npm install${utils.colors.reset}`)
		utils.log(`${utils.colors.yellow}Or run with --update-locks next time to do it automatically${utils.colors.reset}`)
	}

	return results
}

/**
 * Show help information
 */
function showHelp(command) {
	console.log(
		`${utils.colors.bright}${utils.colors.cyan}Plutonium - Apex CodeGenesis Development Toolkit${utils.colors.reset}\n`,
	)

	if (command === "deps:check") {
		console.log("Usage: node scripts/plutonium.js deps:check [options]\n")
		console.log("Analyze dependencies across JavaScript and Python components\n")
		console.log("Options:")
		console.log("  --verbose    Show detailed analysis")
		console.log("  --json       Output results as JSON")
	} else if (command === "deps:harmonize") {
		console.log("Usage: node scripts/plutonium.js deps:harmonize [options]\n")
		console.log("Synchronize versions of shared dependencies between main and webview packages\n")
		console.log("Options:")
		console.log("  --fix        Apply the recommended changes")
		console.log("  --verbose    Show detailed changes")
	} else if (command === "deps:update") {
		console.log("Usage: node scripts/plutonium.js deps:update [options]\n")
		console.log("Intelligently update dependencies with compatibility checks\n")
		console.log("Options:")
		console.log("  --fix                 Apply the recommended updates")
		console.log("  --update-locks        Also update lock files after dependency changes")
		console.log("  --legacy-peer-deps    Use legacy peer deps flag when updating lock files")
	} else if (command === "perf:analyze") {
		console.log("Usage: node scripts/plutonium.js perf:analyze [options]\n")
		console.log("Analyze extension performance metrics\n")
		console.log("Options:")
		console.log("  --verbose    Show detailed metrics")
	} else if (command === "struct:analyze") {
		console.log("Usage: node scripts/plutonium.js struct:analyze [options]\n")
		console.log("Analyze project structure and suggest optimizations\n")
		console.log("Options:")
		console.log("  --verbose    Show detailed analysis")
	} else if (command === "config:init") {
		console.log("Usage: node scripts/plutonium.js config:init\n")
		console.log("Initialize project configuration by auto-detecting structure\n")
		console.log("This will create a plutonium-config.json file in your project root")
	} else if (command === "config:show") {
		console.log("Usage: node scripts/plutonium.js config:show\n")
		console.log("Display current project configuration\n")
	} else if (command === "config:detect") {
		console.log("Usage: node scripts/plutonium.js config:detect [options]\n")
		console.log("Detect project structure without saving configuration\n")
		console.log("Options:")
		console.log("  --fix        Save detected configuration to plutonium-config.json")
	} else if (command === "scripts:fix") {
		console.log("Usage: node scripts/plutonium.js scripts:fix [options]\n")
		console.log("Automatically fix script issues in package.json files\n")
		console.log("Options:")
		console.log("  --fix        Apply the recommended fixes")
		console.log("  --verbose    Show detailed fix information")
	} else if (command === "deps:fix-cross-lang") {
		console.log("Usage: node scripts/plutonium.js deps:fix-cross-lang [options]\n")
		console.log("Fix cross-language dependency conflicts between JavaScript and Python\n")
		console.log("Options:")
		console.log("  --fix         Apply the recommended fixes")
		console.log("  --autoInstall Automatically install updated Python packages")
		console.log("  --verbose     Show detailed changes")
	} else if (command === "fix-all") {
		console.log("Usage: node scripts/plutonium.js fix-all [options]\n")
		console.log("Comprehensive fix command that automatically fixes ALL issues in the project\n")
		console.log("This will:")
		console.log("  1. Fix cross-language dependency conflicts")
		console.log("  2. Install updated Python packages automatically")
		console.log("  3. Update dependencies to latest compatible versions")
		console.log("  4. Fix script issues in package.json files")
		console.log("  5. Update lock files if requested\n")
		console.log("Options:")
		console.log("  --update-locks Update npm lock files after fixing dependencies")
		console.log("  --verbose     Show detailed information during the fix process")
	} else {
		// General help
		console.log(`A comprehensive development toolkit for Apex CodeGenesis\n`)
		console.log("Usage: node scripts/plutonium.js <command> [options]\n")
		console.log("Commands:")
		console.log("  deps:check          Analyze dependencies across JavaScript and Python")
		console.log("  deps:harmonize      Synchronize versions of shared dependencies")
		console.log("  deps:update         Intelligently update dependencies with compatibility checks")
		console.log("  deps:fix-cross-lang Fix cross-language dependency conflicts")
		console.log("  scripts:fix         Automatically fix script issues in package.json files")
		console.log("  fix-all             Fix ALL dependency and script issues in a single command")
		console.log("  perf:analyze        Analyze extension performance metrics")
		console.log("  struct:analyze      Analyze project structure and suggest optimizations")
		console.log("  config:init         Initialize project configuration by auto-detecting structure")
		console.log("  config:show         Display current project configuration")
		console.log("  config:detect       Detect project structure without saving configuration")
		console.log("\nGlobal Options:")
		console.log("  --verbose         Show detailed output")
		console.log("  --json            Output results as JSON")
		console.log("  --fix             Apply recommended changes (for applicable commands)")
		console.log("  --help            Show help information for a command")
		console.log("\nExamples:")
		console.log("  node scripts/plutonium.js deps:check")
		console.log("  node scripts/plutonium.js deps:harmonize --fix")
		console.log("  node scripts/plutonium.js deps:check --help")
	}
}

/**
 * Main function that runs the CLI
 */
async function main() {
	console.log(
		`${utils.colors.bright}${utils.colors.magenta}🚀 Plutonium ${utils.colors.dim}v0.1.0 ${utils.colors.reset}${utils.colors.bright}${utils.colors.magenta}(Development Preview)${utils.colors.reset}`,
	)

	// If help flag is used, show help and exit
	if (options.help) {
		showHelp(command)
		return
	}

	let result = null

	// Pass utils to each command for consistent logging and formatting
	const utilsWithHelpers = {
		...utils,
		colors: utils.colors,
		log: utils.log,
		heading: utils.heading,
		runCommand: utils.runCommand,
	}

	try {
		switch (command) {
			case "deps:check":
				result = checkDependencies(options, utilsWithHelpers)
				break
			case "deps:harmonize":
				result = harmonizeDependencies(options, utilsWithHelpers)
				break
			case "deps:update":
				result = await updateDependencies(options, utilsWithHelpers)
				break
			case "perf:analyze":
				result = analyzePerformance()
				break
			case "struct:analyze":
				result = analyzeStructure()
				break
			case "config:init":
				result = initializeConfig(utilsWithHelpers)
				break
			case "config:show":
				result = showConfig(utilsWithHelpers)
				break
			case "config:detect":
				result = detectProjectStructure(DEFAULT_ROOT_DIR, utilsWithHelpers)
				if (options.fix) {
					saveConfig(result)
					utilsWithHelpers.log("Configuration saved to plutonium-config.json", "success")
				}
				break
			case "scripts:fix":
				result = await fixScripts(options, utilsWithHelpers)
				break
			case "deps:fix-cross-lang":
				result = await fixCrossLanguageDependencies(options, utilsWithHelpers)
				break
			case "fix-all":
				// Comprehensive fix command to handle all issues in one go
				utils.heading("Comprehensive Project Fix")
				utils.log("Running all fix operations to resolve all issues...\n")

				// Force fix option to true
				const fixOptions = { ...options, fix: true }

				// First fix cross-language dependencies
				const crossLangResult = await fixCrossLanguageDependencies(
					{ ...fixOptions, command, autoInstall: true },
					utilsWithHelpers,
				)

				// Then update dependencies
				utils.log("\n") // Add spacing
				const dependencyResult = await updateDependencies(fixOptions, utilsWithHelpers)

				// Fix scripts
				utils.log("\n") // Add spacing
				const scriptResult = await fixScripts(fixOptions, utilsWithHelpers)

				// Update lock files if requested
				if (options.updateLocks) {
					utils.log("\n") // Add spacing
					const lockResult = await updateLockFiles(fixOptions, utilsWithHelpers)
					dependencyResult.locks = lockResult
				}

				// Consolidate results
				result = {
					crossLanguage: crossLangResult,
					dependencies: dependencyResult,
					scripts: scriptResult,
				}

				// Final summary
				// Generate a final report
				utils.log("\n") // Add spacing
				const reportResult = checkDependencies(fixOptions, utilsWithHelpers)

				// Final summary
				utils.heading("\nFix-All Summary", "subheading")
				utils.log(`${utils.colors.green}Cross-language issues fixed:${utils.colors.reset} ${crossLangResult.fixed}`)
				utils.log(
					`${utils.colors.green}Python dependencies updated:${utils.colors.reset} ${dependencyResult.python.changes}`,
				)
				utils.log(`${utils.colors.green}npm dependencies updated:${utils.colors.reset} ${dependencyResult.npm.changes}`)
				utils.log(`${utils.colors.green}Script issues fixed:${utils.colors.reset} ${scriptResult.fixed}`)
				utils.log(`${utils.colors.green}Report generated:${utils.colors.reset} ${reportResult.reportPath}`)
				utils.log(`\n${utils.colors.green}✓ Project successfully fixed!${utils.colors.reset}`)
				break
			case "help":
				showHelp(args[1])
				break
			default:
				utils.log(`Unknown command: ${command}`, "error")
				console.log("\nRun node scripts/plutonium.js help for available commands.")
				process.exit(1)
		}

		// Output JSON if requested
		if (options.json && result) {
			console.log(JSON.stringify(result, null, 2))
		}
	} catch (error) {
		utils.log(`${utils.colors.red}Error executing command: ${error.message}${utils.colors.reset}`, "error")
		if (options.verbose) {
			console.error(error)
		}
		process.exit(1)
	}
}

// Run the CLI as an async IIFE
;(async () => {
	try {
		await main()
	} catch (error) {
		console.error(`${utils.colors.red}Unhandled error: ${error.message}${utils.colors.reset}`)
		process.exit(1)
	}
})()
