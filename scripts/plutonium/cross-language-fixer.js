/**
 * Plutonium Cross-Language Dependency Fixer
 *
 * Automatically fixes cross-language dependencies by harmonizing
 * versions between JavaScript and Python packages.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { getConfigWithAbsolutePaths } from "./config-manager.js"
// Import directly from dependency-checker.cjs
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const dependencyChecker = require("./dependency-checker.cjs")
const { parseVersion, getHigherVersion } = dependencyChecker
import { execSync } from "child_process"

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Parse requirements.txt file
 */
function parseRequirementsTxt(filePath) {
	if (!fs.existsSync(filePath)) {
		return []
	}

	const content = fs.readFileSync(filePath, "utf8")
	const lines = content.split("\n")
	const result = []

	for (const line of lines) {
		const trimmedLine = line.trim()

		// Skip empty lines
		if (!trimmedLine) {
			result.push({ type: "empty", content: line })
			continue
		}

		// Handle comments
		if (trimmedLine.startsWith("#")) {
			result.push({ type: "comment", content: line })
			continue
		}

		// Extract package info
		const commentSplit = line.split("#")
		const packagePart = commentSplit[0].trim()
		const comment = commentSplit.length > 1 ? "#" + commentSplit.slice(1).join("#") : ""

		// Parse package name and version
		let packageName = packagePart
		let versionSpec = ""

		if (packageName.includes("==")) {
			;[packageName, versionSpec] = packageName.split("==")
			versionSpec = "==" + versionSpec
		} else if (packageName.includes(">=")) {
			;[packageName, versionSpec] = packageName.split(">=")
			versionSpec = ">=" + versionSpec
		} else if (packageName.includes(">")) {
			;[packageName, versionSpec] = packageName.split(">")
			versionSpec = ">" + versionSpec
		} else if (packageName.includes("<=")) {
			;[packageName, versionSpec] = packageName.split("<=")
			versionSpec = "<=" + versionSpec
		} else if (packageName.includes("<")) {
			;[packageName, versionSpec] = packageName.split("<")
			versionSpec = "<" + versionSpec
		}

		packageName = packageName.trim()
		versionSpec = versionSpec.trim()

		result.push({
			type: "package",
			name: packageName,
			version: versionSpec,
			comment,
			raw: line,
		})
	}

	return result
}

/**
 * Write requirements back to file
 */
function writeRequirementsTxt(filePath, requirements) {
	const content = requirements
		.map((item) => {
			if (item.type === "empty" || item.type === "comment") {
				return item.content
			}

			let line = item.name
			if (item.version) {
				line += item.version
			}
			if (item.comment) {
				line += " " + item.comment
			}
			return line
		})
		.join("\n")

	fs.writeFileSync(filePath, content)
}

/**
 * Get the latest version of a Python package from PyPI
 */
async function getLatestPythonPackageVersion(packageName) {
	try {
		// Try to get the latest version from PyPI using pip
		const latestVersion = execSync(`pip index versions ${packageName} | head -n 1`, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		}).trim()

		// Extract version number from output
		const match = latestVersion.match(/\d+\.\d+\.\d+/)
		if (match) {
			return match[0]
		}

		// Fallback for specific packages
		if (packageName === "openai") {
			return "1.75.0"
		} else if (packageName === "anthropic") {
			return "0.49.0"
		} else if (packageName === "google-genai") {
			return "1.11.0"
		} else if (packageName === "ollama") {
			return "0.4.8"
		}

		return null
	} catch (error) {
		console.error(`Error getting latest version for ${packageName}: ${error.message}`)
		return null
	}
}

/**
 * Fix cross-language dependencies by harmonizing versions
 */
async function fixCrossLanguageDependencies(options, utils) {
	const { log, heading, colors } = utils
	const dryRun = !options.fix

	heading("Cross-Language Dependency Fixing")
	log("Harmonizing versions between JavaScript and Python packages...")

	const config = getConfigWithAbsolutePaths()
	const crossLangMappings = config.crossLanguageMappings

	if (!fs.existsSync(config.resolvedPaths.python.requirements)) {
		log(`Python requirements file not found at ${config.resolvedPaths.python.requirements}`, "error")
		return { fixed: 0, issues: [] }
	}

	if (!fs.existsSync(config.resolvedPaths.javascript.main)) {
		log(`Main package.json not found at ${config.resolvedPaths.javascript.main}`, "error")
		return { fixed: 0, issues: [] }
	}

	// Read the requirements.txt file
	const requirements = parseRequirementsTxt(config.resolvedPaths.python.requirements)

	// Read the package.json file
	const packageJson = JSON.parse(fs.readFileSync(config.resolvedPaths.javascript.main, "utf8"))
	const npmDeps = {
		...(packageJson.dependencies || {}),
		...(packageJson.devDependencies || {}),
	}

	// Find and fix cross-language inconsistencies
	const issues = []
	let fixCount = 0

	for (const [mapKey, mapping] of Object.entries(crossLangMappings)) {
		// Handle both new and legacy formats
		const npmPkg = mapping.jsPackage || mapping
		const pythonPkg = mapping.pythonPackage || mapKey

		// Check if both packages exist
		if (npmDeps[npmPkg]) {
			const npmVersion = npmDeps[npmPkg].replace(/^[\^~]/, "") // Remove prefix

			// Find the Python package in requirements
			const pythonReq = requirements.find((r) => r.type === "package" && r.name === pythonPkg)

			if (pythonReq) {
				// Check if versions match or need updating
				const pythonVersionMatch = pythonReq.version.match(/==([0-9\.]+)/)
				const pythonVersion = pythonVersionMatch ? pythonVersionMatch[1] : null

				if (!pythonVersion || pythonVersion !== npmVersion) {
					const originalVersion = pythonVersion || "unpinned"

					if (!dryRun) {
						// Before updating, let's check if this version is available in PyPI
						// Check version mappings from config or use hardcoded known mappings
						let targetVersion = npmVersion

						// Check if this package has version mappings in the config
						const mappings = mapping.versionMap || {}

						if (mappings[npmVersion]) {
							// Use the mapped version from config
							targetVersion = mappings[npmVersion]
							log(
								`${colors.yellow}⚠ Warning:${colors.reset} ${pythonPkg} version ${npmVersion} mapped to ${targetVersion}`,
								"warning",
							)
						}
						// Try to determine best version if no mapping exists
						else {
							// Special cases for known problematic packages
							if (pythonPkg === "openai" && npmVersion.startsWith("4.")) {
								// OpenAI npm package uses major version 4, but Python is still on 1.x
								targetVersion = await getLatestPythonPackageVersion("openai")
								log(
									`${colors.yellow}⚠ Warning:${colors.reset} openai npm v${npmVersion} not compatible with Python, using v${targetVersion}`,
									"warning",
								)
							} else if (pythonPkg === "anthropic") {
								// Anthropic versions don't align 1:1 between JS and Python
								targetVersion = await getLatestPythonPackageVersion("anthropic")
								log(
									`${colors.yellow}⚠ Warning:${colors.reset} anthropic npm v${npmVersion} using latest Python version v${targetVersion}`,
									"warning",
								)
							} else if (pythonPkg === "google-genai") {
								// Google Genai has different versioning
								targetVersion = await getLatestPythonPackageVersion("google-genai")
								log(
									`${colors.yellow}⚠ Warning:${colors.reset} google-genai npm v${npmVersion} using latest Python version v${targetVersion}`,
									"warning",
								)
							} else if (pythonPkg === "ollama") {
								// Ollama might have version mismatches
								targetVersion = await getLatestPythonPackageVersion("ollama")
								log(
									`${colors.yellow}⚠ Warning:${colors.reset} ollama npm v${npmVersion} using available Python version v${targetVersion}`,
									"warning",
								)
							}
						}

						// Get the current mapped version from config, if any
						const mappedVersion = mappings[npmVersion]

						// Only update if the version is different AND it's not a correctly mapped version
						if (
							originalVersion !== targetVersion &&
							!(pythonVersion && mappedVersion && pythonVersion === mappedVersion)
						) {
							// Update the Python requirement with the compatible version
							pythonReq.version = `==${targetVersion}`
							fixCount++

							// Create an issue only if we're actually changing something
							issues.push({
								pythonPackage: pythonPkg,
								npmPackage: npmPkg,
								pythonVersion: pythonVersion || "unpinned",
								npmVersion: npmVersion,
								requirementsLine: pythonReq.raw,
								targetVersion: targetVersion,
							})

							log(`${colors.green}✓ Fixed:${colors.reset} ${pythonPkg}`, "success")
							log(
								`  ${colors.dim}From:${colors.reset} ${originalVersion} ${colors.dim}To:${colors.reset} ${targetVersion}`,
							)
						} else {
							// Version is already correct, no need to update
							log(
								`${colors.green}✓ Version already correct:${colors.reset} ${pythonPkg} (${targetVersion})`,
								"info",
							)
						}
					} else {
						log(`${colors.yellow}Would fix:${colors.reset} ${pythonPkg}`, "warning")
						log(
							`  ${colors.dim}From:${colors.reset} ${pythonVersion || "unpinned"} ${colors.dim}To:${colors.reset} ${npmVersion}`,
						)
					}
				} else {
					if (options.verbose) {
						log(`${colors.green}✓ Already in sync:${colors.reset} ${pythonPkg} (${pythonVersion})`, "info")
					}
				}
			} else {
				// Python package not found in requirements, should we add it?
				log(
					`${colors.yellow}⚠ Warning:${colors.reset} Python package ${pythonPkg} mapped to npm ${npmPkg} not found in requirements.txt`,
					"warning",
				)
			}
		}
	}

	// Write the updated requirements.txt file
	if (fixCount > 0 && !dryRun) {
		writeRequirementsTxt(config.resolvedPaths.python.requirements, requirements)
		log(`\n${colors.green}✓ Successfully fixed ${fixCount} cross-language dependency issues${colors.reset}`, "success")

		// If auto-install is requested or we're in fix-all mode, install Python packages
		if (options.autoInstall || options.command === "fix-all") {
			log(`\n${colors.blue}▶ Installing updated Python packages...${colors.reset}`)
			try {
				const pipCommand = `pip install -r ${config.resolvedPaths.python.requirements}`
				const { error, stdout, stderr } = utils.runCommand(pipCommand)

				if (error) {
					log(`${colors.red}Error installing Python packages: ${error.message}${colors.reset}`, "error")
					if (stderr) {
						log(`${colors.red}${stderr}${colors.reset}`, "error")
					}
				} else {
					log(`${colors.green}✓ Python packages successfully installed${colors.reset}`, "success")
					if (options.verbose && stdout) {
						log(`${colors.dim}${stdout}${colors.reset}`)
					}
				}
			} catch (err) {
				log(`${colors.red}Failed to install Python packages: ${err.message}${colors.reset}`, "error")
			}
		}
	} else if (issues.length > 0) {
		log(
			`\n${colors.yellow}Found ${issues.length} cross-language dependency issues. Run with --fix to apply fixes.${colors.reset}`,
			"warning",
		)
	} else {
		log(`\n${colors.green}✓ No cross-language dependency issues found${colors.reset}`, "success")
	}

	return {
		fixed: fixCount,
		issues: issues,
	}
}

export { fixCrossLanguageDependencies, parseRequirementsTxt, writeRequirementsTxt }
