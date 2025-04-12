import { Anthropic } from "@anthropic-ai/sdk"
// Corrected relative path: Go up two levels from api_handler to modules, then down to assistant-message
import { AssistantMessageContent, ToolUse } from "../../../assistant-message"

// Helper function to convert AssistantMessageContent to Anthropic ContentBlock array
// Corrected return type and property access, and mapping from ToolUse (params) to ToolUseBlock (input)
export function formatAssistantContentForHistory(
	blocks: AssistantMessageContent[],
): Array<Anthropic.TextBlock | Anthropic.ToolUseBlock> {
	const historyBlocks: Array<Anthropic.TextBlock | Anthropic.ToolUseBlock> = []
	for (const block of blocks) {
		if (block.type === "text") {
			// Ensure it matches Anthropic.TextBlock structure, using citations: null
			historyBlocks.push({ type: "text", text: block.content ?? "", citations: null })
		} else if (block.type === "tool_use") {
			const toolUse = block as ToolUse // Cast to internal ToolUse type
			// Ensure it matches Anthropic.ToolUseBlock structure
			historyBlocks.push({
				type: "tool_use",
				id: toolUse.id || `toolu_${Date.now()}`, // Use internal id if present, else generate
				name: toolUse.name,
				input: toolUse.params || {}, // Map internal 'params' to Anthropic 'input'
			})
			// Removed 'function_calls' handling as it's not part of AssistantMessageContent
		}
		// Skip 'reasoning' blocks (no else if needed)
	}
	// If no actionable blocks were found, add a placeholder text block
	if (historyBlocks.length === 0) {
		// Ensure placeholder matches TextBlock structure, using citations: null
		historyBlocks.push({ type: "text", text: "(No actionable content generated)", citations: null })
	}
	return historyBlocks
}

export function formatErrorWithStatusCode(error: any): string {
	const statusCode = error.status || error.statusCode || (error.response && error.response.status)
	const message = error.message ?? JSON.stringify(error, null, 2)
	return statusCode && !message.includes(statusCode.toString()) ? `${statusCode} - ${message}` : message
}
