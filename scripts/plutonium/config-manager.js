/**
 * Plutonium Config Manager
 *
 * Handles automatic detection of project structure and configuration management.
 * - Discovers project root and dependency files locations
 * - Loads/saves configuration from plutonium-config.json
 * - Provides utilities for path resolution
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Default project structure relative to the scripts/plutonium directory
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "../..")
const CONFIG_FILENAME = "plutonium-config.json"
const CONFIG_PATH = path.join(DEFAULT_ROOT_DIR, CONFIG_FILENAME)

// Default configuration object
const DEFAULT_CONFIG = {
	projectRoot: DEFAULT_ROOT_DIR,
	paths: {
		javascript: {
			main: "package.json",
			webview: "webview-ui/package.json",
		},
		python: {
			requirements: "python_backend/requirements.txt",
		},
	},
	crossLanguageMappings: {
		openai: {
			jsPackage: "openai",
			pythonPackage: "openai",
		},
		anthropic: {
			jsPackage: "@anthropic-ai/sdk",
			pythonPackage: "anthropic",
		},
		"google-genai": {
			jsPackage: "@google/generative-ai",
			pythonPackage: "google-genai",
			versionMap: {
				"0.24.0": "1.11.0",
			},
		},
		ollama: {
			jsPackage: "ollama",
			pythonPackage: "ollama",
		},
	},
	scriptFixer: {
		maxLineLength: 500,
		autoFix: {
			eslintConfig: true,
			testDirConflicts: true,
		},
	},
}

/**
 * Load configuration from plutonium-config.json if it exists
 * Otherwise, returns the default configuration
 */
function loadConfig() {
	try {
		if (fs.existsSync(CONFIG_PATH)) {
			const configData = fs.readFileSync(CONFIG_PATH, "utf8")
			const config = JSON.parse(configData)

			// Support legacy format if paths not found but dependencies exists
			if (!config.paths && config.dependencies) {
				config.paths = config.dependencies
			}

			return config
		}
	} catch (error) {
		console.error(`Error loading config: ${error.message}`)
	}

	return DEFAULT_CONFIG
}

/**
 * Save configuration to plutonium-config.json
 */
function saveConfig(config) {
	try {
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
		return true
	} catch (error) {
		console.error(`Error saving config: ${error.message}`)
		return false
	}
}

/**
 * Auto-detect project structure by looking for key files
 * and create a configuration based on the findings
 */
function detectProjectStructure(rootDir = DEFAULT_ROOT_DIR, utils = null) {
	if (utils) {
		utils.heading("Detecting Project Structure")
		utils.log("Scanning for project files...")
	}

	const config = {
		projectRoot: rootDir,
		paths: {
			javascript: {},
			python: {},
		},
		crossLanguageMappings: { ...DEFAULT_CONFIG.crossLanguageMappings },
		scriptFixer: { ...DEFAULT_CONFIG.scriptFixer },
	}

	// Detect main package.json
	const mainPackageJsonPath = path.join(rootDir, "package.json")
	if (fs.existsSync(mainPackageJsonPath)) {
		config.paths.javascript.main = "package.json"
		if (utils) utils.log(`✓ Found main package.json`)

		// Look for potential webview UI package.json
		const potentialWebviewDirs = ["webview-ui", "webview", "ui", "frontend", "client"]

		for (const webviewDir of potentialWebviewDirs) {
			const webviewPackageJsonPath = path.join(rootDir, webviewDir, "package.json")
			if (fs.existsSync(webviewPackageJsonPath)) {
				config.paths.javascript.webview = `${webviewDir}/package.json`
				if (utils) utils.log(`✓ Found webview package.json in ${webviewDir}`)
				break
			}
		}
	}

	// Detect Python structures
	const potentialPythonDirs = ["python_backend", "backend", "python", "api", "server"]

	for (const pythonDir of potentialPythonDirs) {
		const requirementsPath = path.join(rootDir, pythonDir, "requirements.txt")
		const pyprojectPath = path.join(rootDir, pythonDir, "pyproject.toml")

		if (fs.existsSync(requirementsPath)) {
			config.paths.python.requirements = `${pythonDir}/requirements.txt`
			if (utils) utils.log(`✓ Found requirements.txt in ${pythonDir}`)
		}

		if (fs.existsSync(pyprojectPath)) {
			config.paths.python.pyproject = `${pythonDir}/pyproject.toml`
			if (utils) utils.log(`✓ Found pyproject.toml in ${pythonDir}`)
		}

		if (config.paths.python.requirements || config.paths.python.pyproject) {
			break
		}
	}

	return config
}

/**
 * Initialize configuration - load from file or auto-detect and save
 */
function initializeConfig(utils = null) {
	if (fs.existsSync(CONFIG_PATH)) {
		if (utils) utils.log(`Loading existing configuration from ${CONFIG_PATH}`)
		return loadConfig()
	} else {
		if (utils) utils.log(`No configuration found, auto-detecting project structure...`)
		const config = detectProjectStructure(DEFAULT_ROOT_DIR, utils)
		saveConfig(config)
		if (utils) {
			utils.log(`\nConfiguration saved to ${CONFIG_PATH}`)
			utils.log(`You can edit this file to customize your project structure detection.`)
		}
		return config
	}
}

/**
 * Get absolute path for a configuration path
 */
function resolveConfigPath(configPath, rootDir = DEFAULT_ROOT_DIR) {
	if (path.isAbsolute(configPath)) {
		return configPath
	}
	return path.join(rootDir, configPath)
}

/**
 * Get configuration with absolute paths
 */
function getConfigWithAbsolutePaths(config = null) {
	const cfg = config || loadConfig()
	const rootDir = cfg.projectRoot || DEFAULT_ROOT_DIR

	// Support legacy format
	const sourcePathsObj = cfg.paths || cfg.dependencies || {}

	return {
		...cfg,
		resolvedPaths: {
			javascript: {
				main: sourcePathsObj.javascript?.main ? resolveConfigPath(sourcePathsObj.javascript.main, rootDir) : null,
				webview: sourcePathsObj.javascript?.webview
					? resolveConfigPath(sourcePathsObj.javascript.webview, rootDir)
					: null,
			},
			python: {
				requirements: sourcePathsObj.python?.requirements
					? resolveConfigPath(sourcePathsObj.python.requirements, rootDir)
					: null,
				pyproject: sourcePathsObj.python?.pyproject ? resolveConfigPath(sourcePathsObj.python.pyproject, rootDir) : null,
			},
		},
	}
}

/**
 * Show the current configuration
 */
function showConfig(utils) {
	const config = getConfigWithAbsolutePaths()
	utils.heading("Current Plutonium Configuration")

	utils.log(`Project Root: ${config.projectRoot}`)

	utils.log("\nJavaScript Dependencies:")
	utils.log(`- Main package.json: ${config.resolvedPaths.javascript.main || "Not found"}`)
	utils.log(`- Webview package.json: ${config.resolvedPaths.javascript.webview || "Not found"}`)

	utils.log("\nPython Dependencies:")
	utils.log(`- requirements.txt: ${config.resolvedPaths.python.requirements || "Not found"}`)
	utils.log(`- pyproject.toml: ${config.resolvedPaths.python.pyproject || "Not found"}`)

	utils.log("\nCross-Language Mappings:")
	for (const [name, mapping] of Object.entries(config.crossLanguageMappings)) {
		if (mapping.jsPackage && mapping.pythonPackage) {
			utils.log(`- ${mapping.pythonPackage} => ${mapping.jsPackage}`)

			// Show version mappings if available
			if (mapping.versionMap) {
				utils.log(`  Version mappings:`)
				for (const [jsVer, pyVer] of Object.entries(mapping.versionMap)) {
					utils.log(`  - JS ${jsVer} => Python ${pyVer}`)
				}
			}
		} else {
			// Legacy format support
			utils.log(`- ${name} => ${mapping}`)
		}
	}

	return config
}

export {
	loadConfig,
	saveConfig,
	detectProjectStructure,
	initializeConfig,
	getConfigWithAbsolutePaths,
	showConfig,
	DEFAULT_CONFIG,
}
