import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index"
import { formatResponse } from "../../../prompts/responses"
import { BrowserAction, browserActions, BrowserActionResult } from "../../../../shared/ExtensionMessage"

// Define types used within the module
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

/**
 * Implementation of the browser_action tool.
 */
export async function executeBrowserActionTool(
	task: Task,
	params: { action?: BrowserAction; coordinate?: string; text?: string; [key: string]: any }, // Allow other params
): Promise<ToolResponse> {
	if (!params.action) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("action"))
	}

	const action = params.action
	if (!browserActions.includes(action)) {
		return formatResponse.toolError(`Invalid browser action: ${action}`)
	}

	try {
		let result: BrowserActionResult
		switch (action) {
			case "launch":
				await task.browserSession.launchBrowser()
				// Launch doesn't return the standard result, provide confirmation
				result = { currentUrl: "Browser launched." }
				break
			case "click":
				if (!params.coordinate) {
					return formatResponse.toolError(formatResponse.missingToolParameterError("coordinate"))
				}
				result = await task.browserSession.click(params.coordinate)
				break
			case "type":
				if (!params.text) {
					return formatResponse.toolError(formatResponse.missingToolParameterError("text"))
				}
				result = await task.browserSession.type(params.text)
				break
			case "scroll_down":
				result = await task.browserSession.scrollDown()
				break
			case "scroll_up":
				result = await task.browserSession.scrollUp()
				break
			case "close":
				result = await task.browserSession.closeBrowser()
				break
			default: {
				// Ensure exhaustive check for BrowserAction type
				const exhaustiveCheck: never = action
				return formatResponse.toolError(`Unhandled browser action: ${exhaustiveCheck}`)
			}
		}
		// Use the placeholder formatter from responses.ts
		return formatResponse.formatBrowserActionResult(result)
	} catch (error: any) {
		return formatResponse.toolError(`Error executing browser action ${action}: ${error.message}`)
	}
}
