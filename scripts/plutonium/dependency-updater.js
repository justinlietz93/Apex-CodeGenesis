/**
 * Plutonium Dependency Updater Module
 *
 * Advanced dependency management for cross-language projects.
 * Features:
 * - Update JavaScript and Python dependencies automatically
 * - Handle cross-language version mapping
 * - Preserve comments and structure in dependency files
 * - Intelligently update to compatible versions
 * - Auto-install updated dependencies when requested
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"
// Import directly from dependency-checker.cjs
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const dependencyChecker = require("./dependency-checker.cjs")
const { parseVersion, getHigherVersion } = dependencyChecker

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import configuration manager to get paths
import { getConfigWithAbsolutePaths } from "./config-manager.js"

// Get config with resolved paths
const CONFIG = getConfigWithAbsolutePaths()

// Set path constants dynamically from config
const ROOT_DIR = CONFIG.projectRoot
const MAIN_PACKAGE_JSON = CONFIG.resolvedPaths.javascript.main
const WEBVIEW_PACKAGE_JSON = CONFIG.resolvedPaths.javascript.webview
const PYTHON_REQUIREMENTS = CONFIG.resolvedPaths.python.requirements
const PYTHON_PYPROJECT = CONFIG.resolvedPaths.python.pyproject

// Cross-language package mapping from config
const CROSS_LANGUAGE_MAPPING = CONFIG.crossLanguageMappings

// Latest version cache to avoid redundant API calls
const latestVersionCache = new Map()

/**
 * Parse requirements.txt file and extract packages with versions and comments
 */
function parseRequirementsTxt(filePath) {
	if (!fs.existsSync(filePath)) {
		return []
	}

	const content = fs.readFileSync(filePath, "utf8")
	const lines = content.split("\n")
	const packages = []

	for (const line of lines) {
		const trimmedLine = line.trim()

		// Skip empty lines
		if (!trimmedLine) {
			packages.push({ type: "empty", content: line })
			continue
		}

		// Handle comments
		if (trimmedLine.startsWith("#")) {
			packages.push({ type: "comment", content: line })
			continue
		}

		// Extract inline comments
		const [packageSpec, ...commentParts] = trimmedLine.split("#")
		const inlineComment = commentParts.length > 0 ? "#" + commentParts.join("#") : ""

		// Parse package name and version
		let packageName = packageSpec.trim()
		let versionSpec = ""
		let extras = ""

		// Handle package with extras like requests[security]
		if (packageName.includes("[") && packageName.includes("]")) {
			const extrasMatch = packageName.match(/\[(.*?)\]/)
			if (extrasMatch) {
				extras = extrasMatch[0]
				packageName = packageName.replace(extras, "")
				extras = extras.trim()
			}
		}

		// Handle version specifications
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

		if (packageName) {
			packages.push({
				type: "package",
				name: packageName,
				extras,
				version: versionSpec.trim(),
				inlineComment,
				originalLine: line,
			})
		}
	}

	return packages
}

/**
 * Find the latest version of a Python package using PyPI API
 */
async function getLatestPythonPackageVersion(packageName) {
	// Check cache first
	const cacheKey = `python:${packageName}`
	if (latestVersionCache.has(cacheKey)) {
		return latestVersionCache.get(cacheKey)
	}

	try {
		// Use node-fetch or similar to contact PyPI
		const response = await fetch(`https://pypi.org/pypi/${packageName}/json`)
		const data = await response.json()

		// Get the latest version
		const latestVersion = data.info.version

		// Cache the result
		latestVersionCache.set(cacheKey, latestVersion)

		return latestVersion
	} catch (error) {
		console.error(`Error fetching version for ${packageName}: ${error.message}`)
		return null
	}
}

/**
 * Find the latest version of an npm package
 */
async function getLatestNpmPackageVersion(packageName) {
	// Check cache first
	const cacheKey = `npm:${packageName}`
	if (latestVersionCache.has(cacheKey)) {
		return latestVersionCache.get(cacheKey)
	}

	try {
		// Use npm view to get the latest version
		const latestVersion = execSync(`npm view ${packageName} version`, { encoding: "utf8" }).trim()

		// Cache the result
		latestVersionCache.set(cacheKey, latestVersion)

		return latestVersion
	} catch (error) {
		console.error(`Error fetching npm version for ${packageName}: ${error.message}`)
		return null
	}
}

/**
 * Map a JavaScript package version to equivalent Python package version
 * This is needed because the same library might use different versioning schemes
 */
async function mapJsVersionToPython(packageName, jsVersion) {
	// For OpenAI specifically, handle the special case
	if (packageName === "openai") {
		// JS OpenAI SDK is at v4.x.x while Python is at v1.x.x
		// Get the latest Python version instead
		return await getLatestPythonPackageVersion(packageName)
	}

	// For anthropic, similar situation
	if (packageName === "anthropic") {
		return await getLatestPythonPackageVersion(packageName)
	}

	// For other packages, try to use the same version if available
	// but fall back to latest if needed
	try {
		// Check if the JS version exists for Python
		const response = await fetch(`https://pypi.org/pypi/${packageName}/${jsVersion}/json`)
		if (response.ok) {
			return jsVersion
		} else {
			// If not, get the latest Python version
			return await getLatestPythonPackageVersion(packageName)
		}
	} catch (error) {
		// Fall back to latest Python version
		return await getLatestPythonPackageVersion(packageName)
	}
}

/**
 * Update requirements.txt with latest package versions
 */
async function updateRequirementsTxt(options, utils) {
	const { log, heading, colors } = utils
	const dryRun = !options.fix

	heading("Updating Python Dependencies")
	log("Analyzing requirements.txt for updates...")

	if (!fs.existsSync(PYTHON_REQUIREMENTS)) {
		log("No requirements.txt found at " + PYTHON_REQUIREMENTS, "warning")
		return { changes: 0 }
	}

	const packages = parseRequirementsTxt(PYTHON_REQUIREMENTS)
	const updates = []
	let changeCount = 0

	// Count only package entries, not comments or empty lines
	const pythonPackages = packages.filter((pkg) => pkg.type === "package")
	const totalPackages = pythonPackages.length
	let currentPackage = 0

	log(`Processing ${PYTHON_REQUIREMENTS}: ${totalPackages} packages to check`)

	// Process each package and show progress
	for (const pkg of packages) {
		if (pkg.type !== "package") continue

		currentPackage++
		// Use a consistent width for the text to avoid ghosting
		process.stdout.write(
			`\r${colors.cyan}${createProgressBar(currentPackage, totalPackages)}${colors.reset} - Checking ${pkg.name}${" ".repeat(40)}`,
		)

		const pythonPackageName = pkg.name

		if (CROSS_LANGUAGE_MAPPING[pythonPackageName]) {
			const jsPackageName = CROSS_LANGUAGE_MAPPING[pythonPackageName]

			// Read the JS package version from package.json
			const mainPkg = JSON.parse(fs.readFileSync(MAIN_PACKAGE_JSON, "utf8"))
			const jsVersion =
				(mainPkg.dependencies && mainPkg.dependencies[jsPackageName]) ||
				(mainPkg.devDependencies && mainPkg.devDependencies[jsPackageName])

			if (jsVersion) {
				// Strip off version prefix like ^ or ~
				const cleanJsVersion = jsVersion.replace(/^[\^~]/, "")

				// Get appropriate Python version
				const mappedVersion = await mapJsVersionToPython(pythonPackageName, cleanJsVersion)

				if (mappedVersion && (!pkg.version || !pkg.version.includes(mappedVersion))) {
					const oldVersion = pkg.version ? pkg.version.replace(/^==/, "") : "not pinned"
					const newSpec = `==${mappedVersion}`

					updates.push({
						name: pythonPackageName,
						oldVersion,
						newVersion: mappedVersion,
						reason: "cross-language mapping",
					})

					// Update the package version
					pkg.version = newSpec
					changeCount++

					// Clear progress bar line before logging the update
					process.stdout.write("\r" + " ".repeat(80) + "\r")
					log(
						`${colors.yellow}${pythonPackageName}${colors.reset}: ${oldVersion} → ${colors.green}${mappedVersion}${colors.reset} (mapped from JS ${jsPackageName}@${cleanJsVersion})`,
					)
					// Redraw progress bar after logging
					process.stdout.write(
						`\r${colors.cyan}${createProgressBar(currentPackage, totalPackages)}${colors.reset} - Checking ${pythonPackageName}${" ".repeat(40)}`,
					)
				}
			}
		} else {
			// For non-mapped packages, just get the latest version
			if (pkg.version && pkg.version.startsWith("==")) {
				const currentVersion = pkg.version.replace(/^==/, "")
				const latestVersion = await getLatestPythonPackageVersion(pkg.name)

				if (latestVersion && currentVersion !== latestVersion) {
					updates.push({
						name: pkg.name,
						oldVersion: currentVersion,
						newVersion: latestVersion,
						reason: "outdated",
					})

					// Update the package version
					pkg.version = `==${latestVersion}`
					changeCount++

					// Clear progress bar line before logging the update
					process.stdout.write("\r" + " ".repeat(80) + "\r")
					log(
						`${colors.yellow}${pkg.name}${colors.reset}: ${currentVersion} → ${colors.green}${latestVersion}${colors.reset}`,
					)
					// Redraw progress bar after logging
					process.stdout.write(
						`\r${colors.cyan}${createProgressBar(currentPackage, totalPackages)}${colors.reset} - Checking ${pythonPackageName}`,
					)
				}
			} else if (!pkg.version || pkg.version === "") {
				// Package without version - pin it
				const latestVersion = await getLatestPythonPackageVersion(pkg.name)

				if (latestVersion) {
					updates.push({
						name: pkg.name,
						oldVersion: "not pinned",
						newVersion: latestVersion,
						reason: "unpinned",
					})

					// Update the package version
					pkg.version = `==${latestVersion}`
					changeCount++

					// Clear progress bar line before logging the update
					process.stdout.write("\r" + " ".repeat(80) + "\r")
					log(`${colors.yellow}${pkg.name}${colors.reset}: not pinned → ${colors.green}${latestVersion}${colors.reset}`)
					// Redraw progress bar after logging
					process.stdout.write(
						`\r${colors.cyan}${createProgressBar(currentPackage, totalPackages)}${colors.reset} - Checking ${pythonPackageName}`,
					)
				}
			}
		}
	}

	// Clear the progress line and move to next line
	process.stdout.write("\r" + " ".repeat(80) + "\r")

	if (changeCount === 0) {
		log("✅ All Python dependencies are up-to-date", "success")
		return { changes: 0 }
	}

	// Write the updated requirements.txt if not in dry run mode
	if (!dryRun) {
		const newContent = packages
			.map((pkg) => {
				if (pkg.type === "package") {
					// Reconstruct the package line with updated version
					let packageLine = pkg.name
					if (pkg.extras) {
						packageLine += pkg.extras
					}
					if (pkg.version) {
						packageLine += pkg.version
					}
					if (pkg.inlineComment) {
						packageLine += " " + pkg.inlineComment
					}
					return packageLine
				} else {
					// Return comments and empty lines as-is
					return pkg.content
				}
			})
			.join("\n")

		fs.writeFileSync(PYTHON_REQUIREMENTS, newContent)
		log(`\nUpdated requirements.txt with ${changeCount} changes`, "success")

		// Suggest next steps
		log("\nTo install the updated packages, run:")
		log(`  ${colors.yellow}pip install -r ${PYTHON_REQUIREMENTS}${colors.reset}`)
	} else {
		log(`\n${colors.yellow}Found ${changeCount} potential updates. Run with --fix to apply these changes${colors.reset}`)
	}

	return {
		changes: changeCount,
		updates,
	}
}

/**
 * Create a progress bar string
 */
function createProgressBar(current, total, width = 30) {
	const percent = Math.floor((current / total) * 100)
	const filledWidth = Math.floor((current / total) * width)
	const emptyWidth = width - filledWidth

	const filled = "█".repeat(filledWidth)
	const empty = "░".repeat(emptyWidth)

	return `[${filled}${empty}] ${percent}% (${current}/${total})`
}

/**
 * Update package.json with latest npm package versions
 */
async function updatePackageJson(packageJsonPath, options, utils) {
	const { log, colors } = utils
	const dryRun = !options.fix

	if (!fs.existsSync(packageJsonPath)) {
		log(`No package.json found at ${packageJsonPath}`, "warning")
		return { changes: 0 }
	}

	try {
		// Read and parse package.json
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
		const updates = []
		let changeCount = 0

		// Count total packages to check
		const depCount = Object.keys(packageJson.dependencies || {}).length
		const devDepCount = Object.keys(packageJson.devDependencies || {}).length
		const totalPackages = depCount + devDepCount

		let currentPackage = 0

		log(`Processing ${packageJsonPath}: ${totalPackages} packages to check`)

		// Update dependencies
		if (packageJson.dependencies) {
			for (const [name, versionSpec] of Object.entries(packageJson.dependencies)) {
				currentPackage++
				// Use a consistent width for the text to avoid ghosting
				process.stdout.write(
					`\r${colors.cyan}${createProgressBar(currentPackage, totalPackages)}${colors.reset} - Checking ${name}${" ".repeat(40)}`,
				)

				const result = await updateNpmDependency(name, versionSpec, options, utils)
				if (result.updated) {
					packageJson.dependencies[name] = result.newVersionSpec
					updates.push(result)
					changeCount++
				}
			}
		}

		// Update devDependencies
		if (packageJson.devDependencies) {
			for (const [name, versionSpec] of Object.entries(packageJson.devDependencies)) {
				currentPackage++
				// Use a consistent width for the text to avoid ghosting
				process.stdout.write(
					`\r${colors.cyan}${createProgressBar(currentPackage, totalPackages)}${colors.reset} - Checking ${name}${" ".repeat(40)}`,
				)

				const result = await updateNpmDependency(name, versionSpec, options, utils)
				if (result.updated) {
					packageJson.devDependencies[name] = result.newVersionSpec
					updates.push(result)
					changeCount++
				}
			}
		}

		// Clear the progress line and move to next line
		process.stdout.write("\r" + " ".repeat(80) + "\r")

		// Write changes if not in dry run mode
		if (changeCount > 0 && !dryRun) {
			fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
			log(`\nUpdated ${path.basename(packageJsonPath)} with ${changeCount} changes`, "success")

			// Suggest next steps
			log("\nTo install the updated packages, run:")
			log(
				`  ${colors.yellow}npm install${packageJsonPath.includes("webview-ui") ? " (in webview-ui directory)" : ""}${colors.reset}`,
			)
		} else if (changeCount > 0) {
			log(
				`\n${colors.yellow}Found ${changeCount} potential updates in ${path.basename(packageJsonPath)}. Run with --fix to apply these changes${colors.reset}`,
			)
		} else {
			log(`All dependencies in ${path.basename(packageJsonPath)} are up-to-date`, "success")
		}

		return {
			changes: changeCount,
			updates,
		}
	} catch (error) {
		log(`Error updating ${packageJsonPath}: ${error.message}`, "error")
		return { changes: 0, error: error.message }
	}
}

/**
 * Update a single npm dependency
 */
async function updateNpmDependency(name, versionSpec, options, utils) {
	const { log, colors } = utils

	// Skip packages that are marked as *, latest, or file: references
	if (versionSpec === "*" || versionSpec === "latest" || versionSpec.startsWith("file:")) {
		return { name, updated: false, reason: "special reference" }
	}

	// Get the latest version
	const latestVersion = await getLatestNpmPackageVersion(name)
	if (!latestVersion) {
		return { name, updated: false, reason: "version fetch failed" }
	}

	// Extract the base version (without ^ or ~)
	const currentVersion = versionSpec.replace(/^[\^~]/, "")

	// Keep the same version prefix (^ or ~)
	const prefix = versionSpec.startsWith("^") ? "^" : versionSpec.startsWith("~") ? "~" : ""

	// Check if update is needed
	if (currentVersion !== latestVersion) {
		const newVersionSpec = `${prefix}${latestVersion}`

		log(`${colors.yellow}${name}${colors.reset}: ${versionSpec} → ${colors.green}${newVersionSpec}${colors.reset}`)

		return {
			name,
			updated: true,
			oldVersion: currentVersion,
			newVersion: latestVersion,
			oldVersionSpec: versionSpec,
			newVersionSpec: newVersionSpec,
			reason: "outdated",
		}
	}

	return { name, updated: false, reason: "up-to-date" }
}

/**
 * Update both main and webview-ui package.json files
 */
async function updateNpmDependencies(options, utils) {
	const { heading, log } = utils

	heading("Updating npm Dependencies")
	log("Analyzing package.json files...")

	const results = {
		main: await updatePackageJson(MAIN_PACKAGE_JSON, options, utils),
		webview: await updatePackageJson(WEBVIEW_PACKAGE_JSON, options, utils),
	}

	return {
		changes: results.main.changes + results.webview.changes,
		results,
	}
}

/**
 * Install updated npm dependencies
 */
async function installNpmDependencies(packageJsonPath, updates, utils) {
	const { log, colors } = utils

	if (!updates || updates.length === 0) {
		log("No npm dependencies to install", "info")
		return { success: true }
	}

	log(`\n${colors.cyan}Installing npm package updates in ${path.basename(packageJsonPath)}...${colors.reset}`)

	try {
		// Determine if we're in the main directory or webview-ui
		const isWebview = packageJsonPath.includes("webview-ui")

		// Construct and execute the install command
		const command = isWebview ? "cd webview-ui && npm install" : "npm install"

		log(`Executing: ${command}`)
		const output = execSync(command, { encoding: "utf8" })

		log(`${colors.green}✓ Successfully installed npm dependencies${colors.reset}`)
		log(output)

		return { success: true, output }
	} catch (error) {
		log(`${colors.red}✖ Failed to install npm dependencies: ${error.message}${colors.reset}`, "error")
		return { success: false, error: error.message }
	}
}

/**
 * Install updated Python dependencies
 */
async function installPythonDependencies(requirementsPath, updates, utils) {
	const { log, colors } = utils

	if (!updates || updates.length === 0) {
		log("No Python dependencies to install", "info")
		return { success: true }
	}

	log(`\n${colors.cyan}Installing Python package updates...${colors.reset}`)

	try {
		// Construct and execute the install command
		const command = `pip install -r ${requirementsPath}`

		log(`Executing: ${command}`)
		const output = execSync(command, { encoding: "utf8" })

		log(`${colors.green}✓ Successfully installed Python dependencies${colors.reset}`)
		log(output)

		return { success: true, output }
	} catch (error) {
		log(`${colors.red}✖ Failed to install Python dependencies: ${error.message}${colors.reset}`, "error")
		return { success: false, error: error.message }
	}
}

export {
	parseRequirementsTxt,
	getLatestPythonPackageVersion,
	getLatestNpmPackageVersion,
	updateRequirementsTxt,
	updateNpmDependencies,
	installNpmDependencies,
	installPythonDependencies,
}
