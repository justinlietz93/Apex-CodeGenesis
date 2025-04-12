export const getCustomInstructionsPrompt = (
	settingsCustomInstructions?: string,
	apexRulesFileInstructions?: string,
	apexIgnoreInstructions?: string,
	preferredLanguageInstructions?: string,
	dynamicPersonaContent?: string, // Add dynamic persona content
): string => {
	let customInstructionsSection = ""
	let mainInstructions = "" // To hold either dynamic or settings instructions

	// Prioritize dynamic persona content
	if (dynamicPersonaContent) {
		mainInstructions = dynamicPersonaContent.trim()
		// Optional: Add a comment indicating dynamic persona usage if desired
		// mainInstructions = `<!-- Dynamic Persona Active -->\n${mainInstructions}`;
	} else if (settingsCustomInstructions) {
		// Fallback to settings instructions only if dynamic content is absent
		mainInstructions = settingsCustomInstructions.trim()
	}

	// Build the final content string
	let contentParts: string[] = []
	if (preferredLanguageInstructions) {
		contentParts.push(preferredLanguageInstructions.trim())
	}
	if (mainInstructions) {
		contentParts.push(mainInstructions) // Add the prioritized instructions
	}
	if (apexRulesFileInstructions) {
		contentParts.push(apexRulesFileInstructions.trim())
	} // Correctly close the if block here
	// Remove the extra closing brace that was here

	if (apexIgnoreInstructions) {
		// This block should be at the same level
		contentParts.push(apexIgnoreInstructions.trim())
	}

	// Join parts with double newlines, then trim final result
	let content = contentParts.join("\n\n").trim()

	if (content) {
		customInstructionsSection = `
====

USER'S CUSTOM INSTRUCTIONS

The following additional instructions are provided by the user, and should be followed to the best of your ability without interfering with the TOOL USE guidelines.

${content}`
	}

	return customInstructionsSection
}
