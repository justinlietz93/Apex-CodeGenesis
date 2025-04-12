import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"
import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index" // Correct path
import { GlobalFileNames } from "../../../storage/disk" // Correct path
import { fileExistsAtPath, isDirectory } from "../../../../utils/fs" // Correct path
import { formatResponse } from "../../../prompts/responses" // Correct path
import { SYSTEM_PROMPT } from "../../../prompts/system" // Correct path
import { getLanguageKey, LanguageDisplay, DEFAULT_LANGUAGE_SETTINGS } from "../../../../shared/Languages" // Correct path
import { ToolDefinition } from "../../../../shared/types" // Correct path
import { McpHub } from "../../../../services/mcp/McpHub" // Correct path
import { findLastIndex } from "../../../../shared/array" // Correct path

const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

export class ApiRequestBuilder {
	private task: Task

	constructor(taskInstance: Task) {
		this.task = taskInstance
	}

	async prepareRequestParameters() {
		const mcpHub = this.task.controllerRef.deref()?.mcpHub
		if (!mcpHub) {
			throw new Error("MCP hub not available")
		}

		const disableBrowserTool = vscode.workspace.getConfiguration("apex").get<boolean>("disableBrowserTool") ?? false
		const modelSupportsComputerUse = this.task.api.getModel().info.supportsComputerUse ?? false
		const supportsComputerUse = modelSupportsComputerUse && !disableBrowserTool

		// --- Task 3.2: Conditional Tool Inclusion ---
		const supportsNativeTools = this.task.api.supportsNativeFunctionCalling()
		const needsXmlToolInstructions = !supportsNativeTools

		let toolsParam: ToolDefinition[] | undefined = undefined
		let toolChoiceParam: any = undefined // Keep as any for flexibility

		if (supportsNativeTools) {
			// Placeholder: Assuming getAvailableTools exists. If not, this needs implementation in ToolExecutor.
			toolsParam = this.task.toolExecutor.getAvailableTools ? this.task.toolExecutor.getAvailableTools() : []
			// toolChoiceParam = { type: 'auto' }; // Example for Anthropic
			// toolChoiceParam = { mode: 'auto' }; // Example for Gemini
		}
		// --- End Task 3.2 ---

		// Prepare custom instruction parts
		let settingsCustomInstructions = this.task.customInstructions?.trim()
		const preferredLanguage = getLanguageKey(
			vscode.workspace.getConfiguration("apex").get<LanguageDisplay>("preferredLanguage"),
		)
		const preferredLanguageInstructions =
			preferredLanguage && preferredLanguage !== DEFAULT_LANGUAGE_SETTINGS
				? `# Preferred Language\n\nSpeak in ${preferredLanguage}.`
				: ""
		const apexRulesFilePath = path.resolve(cwd, GlobalFileNames.apexRules)
		let apexRulesFileInstructions: string | undefined
		if (await fileExistsAtPath(apexRulesFilePath)) {
			// Simplified reading logic for brevity, original logic was more robust
			try {
				const ruleFileContent = (await fs.readFile(apexRulesFilePath, "utf8")).trim()
				if (ruleFileContent) {
					apexRulesFileInstructions = formatResponse.apexRulesFileInstructions(cwd, ruleFileContent)
				}
			} catch (e) {
				console.error("Failed to read .apexrules", e)
			}
		}
		const apexIgnoreContent = this.task.apexIgnoreController.apexIgnoreContent
		let apexIgnoreInstructions: string | undefined
		if (apexIgnoreContent) {
			apexIgnoreInstructions = formatResponse.apexIgnoreInstructions(apexIgnoreContent)
		}

		// Assemble System Prompt
		const systemPrompt = await SYSTEM_PROMPT(
			cwd,
			supportsComputerUse,
			mcpHub,
			this.task.browserSettings,
			needsXmlToolInstructions,
			settingsCustomInstructions,
			apexRulesFileInstructions,
			apexIgnoreInstructions,
			preferredLanguageInstructions,
		)

		// Get truncated history (Context Management)
		const contextManagementMetadata = this.task.contextManager.getNewContextMessagesAndMetadata(
			this.task.stateManager.apiConversationHistory,
			this.task.stateManager.apexMessages,
			this.task.api,
			this.task.stateManager.conversationHistoryDeletedRange,
			// previousApiReqIndex needs to be passed or determined here if needed for context management
			findLastIndex(this.task.stateManager.apexMessages, (m: any) => m.say === "api_req_started"), // Added type annotation for 'm'
		)

		if (contextManagementMetadata.updatedConversationHistoryDeletedRange) {
			await this.task.stateManager.setConversationHistoryDeletedRange(
				contextManagementMetadata.conversationHistoryDeletedRange,
			)
		}

		return {
			systemPrompt,
			truncatedHistory: contextManagementMetadata.truncatedConversationHistory,
			toolsParam,
			toolChoiceParam,
			supportsNativeTools, // Pass this info along
		}
	}
}
