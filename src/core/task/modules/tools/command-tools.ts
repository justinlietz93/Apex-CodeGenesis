import * as vscode from "vscode"
import * as path from "path"
import * as os from "os"
import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index"
import { formatResponse } from "../../../prompts/responses"
import { ApexAsk } from "../../../../shared/ExtensionMessage"

// Define types used within the module
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

// Define cwd at the module level (or pass it as an argument if preferred)
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

/**
 * Implementation of the execute_command tool.
 * Note: This function now returns only the ToolResponse, as the approval/rejection
 * logic is handled before calling the specific tool execution function.
 */
export async function executeCommandTool(task: Task, params: { command?: string }): Promise<ToolResponse> {
	if (!params.command) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("command"))
	}

	// Access shared services via task instance
	const terminalInfo = await task.terminalManager.getOrCreateTerminal(cwd)
	terminalInfo.terminal.show()
	const process = task.terminalManager.runCommand(terminalInfo, params.command)

	let userFeedback: { text?: string; images?: string[] } | undefined
	let didContinue = false

	// Define sendCommandOutput within the method scope
	const sendCommandOutput = async (line: string): Promise<void> => {
		try {
			// Use WebviewCommunicator for interaction
			const { response, text, images } = await task.webviewCommunicator.ask("command_output" as ApexAsk, line)
			if (response === "yesButtonClicked") {
				// proceed while running
			} else {
				userFeedback = { text, images }
			}
			didContinue = true
			process.continue() // continue past the await
		} catch {
			// This can only happen if this ask promise was ignored, so ignore this error
		}
	}

	let result = ""
	process.on("line", (line) => {
		result += line + "\n"
		if (!didContinue) {
			sendCommandOutput(line)
		} else {
			// Use WebviewCommunicator
			task.webviewCommunicator.say("command_output", line)
		}
	})

	let completed = false
	process.once("completed", () => {
		completed = true
	})

	process.once("no_shell_integration", async () => {
		// Use WebviewCommunicator
		await task.webviewCommunicator.say("shell_integration_warning")
	})

	await process

	await setTimeoutPromise(50)

	result = result.trim()

	if (userFeedback) {
		// Use WebviewCommunicator
		await task.webviewCommunicator.say("user_feedback", userFeedback.text, userFeedback.images)
		return formatResponse.toolResult(
			`Command is still running in the user's terminal.${
				result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
			}\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text}\n</feedback>`,
			userFeedback.images,
		)
	}

	if (completed) {
		return `Command executed.${result.length > 0 ? `\nOutput:\n${result}` : ""}`
	} else {
		return `Command is still running in the user's terminal.${
			result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
		}\n\nYou will be updated on the terminal status and new output in the future.`
	}
}
