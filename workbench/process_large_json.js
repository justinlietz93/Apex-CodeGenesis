// workbench/process_large_json.js
const fs = require("fs")
const path = require("path")

const inputJsonPath = path.join(__dirname, "intercept_copilot_panel.validated.json")
const outputDir = path.join(__dirname, "intercept_parts")

// Helper function to sanitize filenames
function sanitizeFilename(name) {
	// Remove phase/task numbering like "Phase X: " or "Task X.Y: "
	let baseName = name.replace(/^(phase|task)\s*\d+(\.\d+)?\s*:\s*/i, "")
	// Replace common problematic characters with underscores
	let sanitized = baseName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase()
	// Avoid starting/ending with underscore or hyphen, remove multiple consecutive underscores
	sanitized = sanitized.replace(/^[_.-]+|[_.-]+$/g, "").replace(/_+/g, "_")
	// Limit length
	return sanitized.substring(0, 80) // Shorter limit for clarity
}

// Function to format qa_info object into Markdown notes
function formatQaInfo(qaInfo, level) {
	let notes = ""
	const indent = "  ".repeat(level)
	const noteIndent = "  ".repeat(level + 1) // Indent for items within the note

	if (!qaInfo || typeof qaInfo !== "object") {
		return ""
	}

	notes += `${indent}> **QA Info:**\n` // Use blockquote for the whole section

	if (qaInfo.step_critique && typeof qaInfo.step_critique === "object") {
		notes += `${noteIndent}*Critique:*\n`
		for (const critiqueKey in qaInfo.step_critique) {
			if (qaInfo.step_critique.hasOwnProperty(critiqueKey)) {
				const formattedKey = critiqueKey.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
				notes += `${noteIndent}  - **${formattedKey}:** ${qaInfo.step_critique[critiqueKey]}\n`
			}
		}
	}

	if (qaInfo.resource_analysis && typeof qaInfo.resource_analysis === "object") {
		notes += `${noteIndent}*Resource Analysis:*\n`
		for (const analysisKey in qaInfo.resource_analysis) {
			if (qaInfo.resource_analysis.hasOwnProperty(analysisKey)) {
				const formattedKey = analysisKey.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
				const value = qaInfo.resource_analysis[analysisKey]
				if (Array.isArray(value) && value.length > 0) {
					notes += `${noteIndent}  - **${formattedKey}:** ${value.join(", ")}\n`
				} else if (!Array.isArray(value) && value) {
					notes += `${noteIndent}  - **${formattedKey}:** ${value}\n`
				}
			}
		}
	}
	notes += `${indent}>\n` // Add a line break after the blockquote
	return notes
}

// Function to generate Markdown for Tasks and Steps within a Phase
function generatePhaseContent(phaseData) {
	let markdown = ""
	if (typeof phaseData !== "object" || phaseData === null) {
		return markdown
	}

	for (const taskKey in phaseData) {
		if (phaseData.hasOwnProperty(taskKey)) {
			const taskSteps = phaseData[taskKey]
			markdown += `- [ ] **${taskKey}**\n` // Task Name

			if (Array.isArray(taskSteps)) {
				taskSteps.forEach((stepObj, index) => {
					if (typeof stepObj === "object" && stepObj !== null) {
						// Find the key that starts with "step" (case-insensitive)
						const stepKey = Object.keys(stepObj).find((k) => k.toLowerCase().startsWith("step"))
						const stepDescription = stepKey ? stepObj[stepKey] : `Unnamed Step ${index + 1}`
						markdown += `  - [ ] ${stepDescription}\n` // Step Description

						// Format and add qa_info notes
						if (stepObj.qa_info) {
							markdown += formatQaInfo(stepObj.qa_info, 2) // Indent level 2 for notes under steps
						}
					} else if (typeof stepObj === "string") {
						markdown += `  - [ ] ${stepObj}\n` // Simple string step
					}
				})
			}
			markdown += "\n" // Add space between tasks
		}
	}
	return markdown
}

try {
	console.log(`Reading large JSON file: ${inputJsonPath}`)
	const rawData = fs.readFileSync(inputJsonPath, "utf8")
	console.log(`Successfully read ${rawData.length} characters.`)

	console.log("Parsing JSON data...")
	const data = JSON.parse(rawData)
	console.log("JSON parsed successfully.")

	// Ensure output directory exists, clear existing MD files
	if (!fs.existsSync(outputDir)) {
		console.log(`Creating directory: ${outputDir}`)
		fs.mkdirSync(outputDir, { recursive: true })
	} else {
		console.log(`Clearing existing Markdown files in: ${outputDir}`)
		fs.readdirSync(outputDir).forEach((file) => {
			if (file.endsWith(".md")) {
				fs.unlinkSync(path.join(outputDir, file))
			}
			// Also remove old JSON parts if they exist
			if (file.startsWith("part_") && file.endsWith(".json")) {
				fs.unlinkSync(path.join(outputDir, file))
			}
		})
	}

	// --- Generate Markdown file per Phase ---
	let phaseCounter = 1
	if (data && typeof data === "object") {
		for (const phaseKey in data) {
			if (data.hasOwnProperty(phaseKey)) {
				console.log(`Processing Phase: ${phaseKey}`)
				const phaseData = data[phaseKey]
				const sanitizedPhaseName = sanitizeFilename(phaseKey)
				// Use phase number and sanitized name for filename
				const outputMarkdownPath = path.join(outputDir, `phase_${phaseCounter}_${sanitizedPhaseName}.md`)

				let markdownContent = `# ${phaseKey}\n\n` // Phase Name as H1

				// Generate checklist for Tasks and Steps within the Phase
				markdownContent += generatePhaseContent(phaseData)

				console.log(`Generating Markdown for Phase "${phaseKey}"...`)
				fs.writeFileSync(outputMarkdownPath, markdownContent, "utf8")
				console.log(`Markdown file generated at: ${outputMarkdownPath}`)
				phaseCounter++
			}
		}
		if (Object.keys(data).length === 0) {
			console.warn("Input JSON was empty or had no top-level keys (Phases).")
		}
	} else {
		throw new Error("Could not parse top-level structure of JSON or JSON was not an object.")
	}

	// Remove the old high-level checklist if it exists
	const oldChecklistPath = path.join(__dirname, "intercept_checklist.md")
	if (fs.existsSync(oldChecklistPath)) {
		console.log(`Removing old checklist file: ${oldChecklistPath}`)
		fs.unlinkSync(oldChecklistPath)
	}

	console.log("Script finished successfully.")
} catch (error) {
	console.error("Error processing JSON file:", error)
	process.exit(1) // Indicate failure
}
