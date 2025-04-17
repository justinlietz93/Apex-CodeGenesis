import { Anthropic } from "@anthropic-ai/sdk"
import * as vscode from "vscode"

/**
 * Safely converts a value into a plain object.
 */
function asObjectSafe(value: any): object {
	// Handle null/undefined
	if (!value) {
		return {}
	}

	try {
		// Handle strings that might be JSON
		if (typeof value === "string") {
			return JSON.parse(value)
		}

		// Handle pre-existing objects
		if (typeof value === "object") {
			return Object.assign({}, value)
		}

		return {}
	} catch (error) {
		console.warn("Apex <Language Model API>: Failed to parse object:", error)
		return {}
	}
}

export function convertToVsCodeLmMessages(
	anthropicMessages: Anthropic.Messages.MessageParam[],
): vscode.ApexLanguageModelChatMessage[] {
	const vsCodeLmMessages: vscode.ApexLanguageModelChatMessage[] = []

	for (const anthropicMessage of anthropicMessages) {
		// Handle simple string messages
		if (typeof anthropicMessage.content === "string") {
			vsCodeLmMessages.push(
				anthropicMessage.role === "assistant"
					? vscode.ApexLanguageModelChatMessage.Assistant(anthropicMessage.content)
					: vscode.ApexLanguageModelChatMessage.User(anthropicMessage.content),
			)
			continue
		}

		// Handle complex message structures
		switch (anthropicMessage.role) {
			case "user": {
				const { nonToolMessages, toolMessages } = anthropicMessage.content.reduce<{
					nonToolMessages: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]
					toolMessages: Anthropic.ToolResultBlockParam[]
				}>(
					(acc, part) => {
						if (part.type === "tool_result") {
							acc.toolMessages.push(part)
						} else if (part.type === "text" || part.type === "image") {
							acc.nonToolMessages.push(part)
						}
						return acc
					},
					{ nonToolMessages: [], toolMessages: [] },
				)

				// Process tool messages first then non-tool messages
				const contentParts = [
					// Convert tool messages to ToolResultParts
					...toolMessages.map((toolMessage) => {
						// Process tool result content into TextParts
						const toolContentParts: vscode.ApexLanguageModelTextPart[] =
							typeof toolMessage.content === "string"
								? [new vscode.ApexLanguageModelTextPart(toolMessage.content)]
								: (toolMessage.content?.map((part) => {
										if (part.type === "image") {
											// Add type guard for media_type property
											const mediaType =
												part.source && "media_type" in part.source
													? part.source.media_type
													: "unknown media-type"

											return new vscode.ApexLanguageModelTextPart(
												`[Image (${part.source?.type || "Unknown source-type"}): ${mediaType} not supported by VSCode LM API]`,
											)
										}
										return new vscode.ApexLanguageModelTextPart(part.text)
									}) ?? [new vscode.ApexLanguageModelTextPart("")])

						// We need to add a wrapper for the toolResult case
						return {
							callId: toolMessage.tool_use_id,
							content: toolContentParts,
						}
					}),

					// Convert non-tool messages to TextParts after tool messages
					...nonToolMessages.map((part) => {
						if (part.type === "image") {
							// Add type guard for media_type property
							const mediaType =
								part.source && "media_type" in part.source ? part.source.media_type : "unknown media-type"

							return new vscode.ApexLanguageModelTextPart(
								`[Image (${part.source?.type || "Unknown source-type"}): ${mediaType} not supported by VSCode LM API]`,
							)
						}
						return new vscode.ApexLanguageModelTextPart(part.text)
					}),
				]

				// Add single user message with all content parts
				vsCodeLmMessages.push(vscode.ApexLanguageModelChatMessage.User(contentParts))
				break
			}

			case "assistant": {
				const { nonToolMessages, toolMessages } = anthropicMessage.content.reduce<{
					nonToolMessages: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]
					toolMessages: Anthropic.ToolUseBlockParam[]
				}>(
					(acc, part) => {
						if (part.type === "tool_use") {
							acc.toolMessages.push(part)
						} else if (part.type === "text" || part.type === "image") {
							acc.nonToolMessages.push(part)
						}
						return acc
					},
					{ nonToolMessages: [], toolMessages: [] },
				)

				// Process tool messages first then non-tool messages
				const contentParts = [
					// Convert tool messages to ToolCallParts first
					...toolMessages.map(
						(toolMessage) =>
							new vscode.ApexLanguageModelToolCallPart(
								toolMessage.id,
								toolMessage.name,
								asObjectSafe(toolMessage.input),
							),
					),

					// Convert non-tool messages to TextParts after tool messages
					...nonToolMessages.map((part) => {
						if (part.type === "image") {
							return new vscode.ApexLanguageModelTextPart("[Image generation not supported by VSCode LM API]")
						}
						return new vscode.ApexLanguageModelTextPart(part.text)
					}),
				]

				// Add the assistant message to the list of messages
				vsCodeLmMessages.push(vscode.ApexLanguageModelChatMessage.Assistant(contentParts))
				break
			}
		}
	}

	return vsCodeLmMessages
}

// Convert vscode role (1 or 2) to Anthropic role string
export function convertToAnthropicRole(vsCodeLmMessageRole: 1 | 2): string | null {
	switch (vsCodeLmMessageRole) {
		case 2: // Assistant
			return "assistant"
		case 1: // User
			return "user"
		default:
			return null
	}
}

export async function convertToAnthropicMessage(
	vsCodeLmMessage: vscode.ApexLanguageModelChatMessage,
): Promise<Anthropic.Messages.Message> {
	const anthropicRole: string | null = convertToAnthropicRole(vsCodeLmMessage.role)
	if (anthropicRole !== "assistant") {
		throw new Error("Apex <Language Model API>: Only assistant messages are supported.")
	}

	return {
		id: crypto.randomUUID(),
		type: "message",
		model: "vscode-lm",
		role: anthropicRole,
		content: vsCodeLmMessage.content
			.map((part): Anthropic.ContentBlock | null => {
				if (part instanceof vscode.ApexLanguageModelTextPart) {
					return {
						type: "text",
						text: part.value,
						citations: null,
					}
				}

				if (part instanceof vscode.ApexLanguageModelToolCallPart) {
					return {
						type: "tool_use",
						id: part.callId || crypto.randomUUID(),
						name: part.name,
						input: asObjectSafe(part.input),
					}
				}

				return null
			})
			.filter((part): part is Anthropic.ContentBlock => part !== null),
		stop_reason: null,
		stop_sequence: null,
		usage: {
			input_tokens: 0,
			output_tokens: 0,
			cache_creation_input_tokens: null,
			cache_read_input_tokens: null,
		},
	}
}
