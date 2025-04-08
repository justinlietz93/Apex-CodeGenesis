import { McpHub } from "../../services/mcp/McpHub";
import { BrowserSettings } from "../../shared/BrowserSettings";
// Import the new assembler function
import { assembleSystemPrompt } from "./system/index";
import { formatResponse } from "./responses"; // Keep for addUserInstructions if needed elsewhere

// Main export now calls the assembler
export const SYSTEM_PROMPT = async (
	cwd: string,
	supportsComputerUse: boolean,
	mcpHub: McpHub,
	browserSettings: BrowserSettings,
    needsXmlToolInstructions?: boolean, // Pass this through
    // Pass through custom instruction parts
    settingsCustomInstructions?: string,
	apexRulesFileInstructions?: string,
	apexIgnoreInstructions?: string,
	preferredLanguageInstructions?: string,
): Promise<string> => {
    // Delegate to the assembler function
    return assembleSystemPrompt(
        cwd,
        supportsComputerUse,
        mcpHub,
        browserSettings,
        needsXmlToolInstructions,
        settingsCustomInstructions,
        apexRulesFileInstructions,
        apexIgnoreInstructions,
        preferredLanguageInstructions
    );
};


// Keep the original addUserInstructions function for potential external use or later removal
// If confirmed unused after refactoring, this can be deleted.
export function addUserInstructions(
	settingsCustomInstructions?: string,
	apexRulesFileInstructions?: string,
	apexIgnoreInstructions?: string,
	preferredLanguageInstructions?: string,
) {
	let customInstructions = ""
	if (preferredLanguageInstructions) {
		customInstructions += preferredLanguageInstructions + "\n\n"
	}
	if (settingsCustomInstructions) {
		customInstructions += settingsCustomInstructions + "\n\n"
	}
	if (apexRulesFileInstructions) {
		customInstructions += apexRulesFileInstructions + "\n\n"
	}
	if (apexIgnoreInstructions) {
		customInstructions += apexIgnoreInstructions
	}

	return `
====

USER'S CUSTOM INSTRUCTIONS

The following additional instructions are provided by the user, and should be followed to the best of your ability without interfering with the TOOL USE guidelines.

${customInstructions.trim()}`
}