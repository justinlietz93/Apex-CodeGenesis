import * as vscode from "vscode" // Needed for cwd fallback
import os from "os" // Needed for cwd fallback
import path from "path" // Needed for cwd fallback
import { McpHub } from "../../../services/mcp/McpHub"
import { BrowserSettings } from "../../../shared/BrowserSettings"
import { getIntroPrompt } from "./intro"
import { getToolUsagePrompt, getToolUseGuidelinesPrompt, getToolExamplesPrompt } from "./tool-usage"
import { getToolsPrompt } from "./tools"
import { getMcpPrompt } from "./mcp"
import { getEditingPrompt } from "./editing"
import { getModesPrompt } from "./modes"
import { getCapabilitiesPrompt } from "./capabilities"
import { getRulesPrompt } from "./rules"
import { getSystemInfoPrompt } from "./system-info"
import { getObjectivePrompt } from "./objective"
import { getCustomInstructionsPrompt } from "./custom-instructions"

// Main function to assemble the system prompt from modules
export const assembleSystemPrompt = async (
	cwd: string,
	supportsComputerUse: boolean,
	mcpHub: McpHub,
	browserSettings: BrowserSettings,
	needsXmlToolInstructions: boolean = true, // Default for safety
	settingsCustomInstructions?: string,
	apexRulesFileInstructions?: string,
	apexIgnoreInstructions?: string,
	preferredLanguageInstructions?: string,
	dynamicPersonaContent?: string, // Add new optional parameter
): Promise<string> => {
	// Assemble the prompt string from modules
	let prompt = getIntroPrompt()
	prompt += getToolUsagePrompt(needsXmlToolInstructions)
	prompt += getToolsPrompt(cwd, supportsComputerUse, mcpHub, browserSettings, needsXmlToolInstructions)
	prompt += getToolExamplesPrompt(needsXmlToolInstructions, mcpHub.getMode() !== "off")
	prompt += getToolUseGuidelinesPrompt()
	prompt += await getMcpPrompt(mcpHub) // Await async function
	prompt += getEditingPrompt()
	prompt += getModesPrompt()
	prompt += getCapabilitiesPrompt(cwd, supportsComputerUse, mcpHub)
	prompt += getRulesPrompt(cwd, supportsComputerUse, mcpHub)
	prompt += getSystemInfoPrompt(cwd)
	prompt += getObjectivePrompt()
	prompt += getCustomInstructionsPrompt(
		settingsCustomInstructions,
		apexRulesFileInstructions,
		apexIgnoreInstructions,
		preferredLanguageInstructions,
		dynamicPersonaContent, // Pass the persona content to the custom instructions assembler
	)

	// Return the assembled prompt
	return prompt
}
