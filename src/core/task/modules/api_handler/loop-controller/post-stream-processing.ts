import { Anthropic } from "@anthropic-ai/sdk"
import { FunctionCall, FunctionResponsePart } from "@google/generative-ai"
import { Task } from "../../../index" // Adjust path
import { ToolUse, AssistantMessageContent, ToolUseName } from "../../../../assistant-message" // Adjust path
import { formatAssistantContentForHistory } from "../helpers" // Adjust path
import { telemetryService } from "../../../../../services/telemetry/TelemetryService" // Adjust path

// Define types locally
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>
type AutonomyMode = "turnBased" | "stepLimited" | "full"

export interface PostStreamProcessingResult {
	shouldContinueLoop: boolean
	executedTool: boolean
	detectedTaskCompletion: boolean
	recoveryNeededError: Error | null // Error detected during tool execution
	userContentForNextLoop: Anthropic.ContentBlockParam[] | null // Content for recovery instruction
}

/**
 * Handles processing after the API stream finishes: tool execution, history updates,
 * determining if the loop should continue or if recovery is needed.
 */
export async function handlePostStreamProcessing(
	task: Task,
	streamResult: { accumulatedNativeCalls: FunctionCall[] }, // Pass relevant results from stream processing
	finalAssistantBlocks: AssistantMessageContent[],
	autonomyMode: AutonomyMode,
	// Callbacks for state updates managed by the main loop/ApiHandlerModule
	setConsecutiveMistakeCount: (count: number) => void,
	setConsecutiveRecoveryFailures: (count: number) => void,
): Promise<PostStreamProcessingResult> {
	let executedTool = false
	let toolResultsContent: Anthropic.MessageParam | null = null
	let detectedTaskCompletion = false
	let recoveryNeededError: Error | null = null
	let userContentForNextLoop: Anthropic.ContentBlockParam[] | null = null // Initialize

	const supportsNativeTools = task.api.supportsNativeFunctionCalling()
	const usedNativeToolsThisTurn = supportsNativeTools // Assuming native tools were attempted if supported

	// Path 1: Native Function Calls (Gemini-like)
	if (streamResult.accumulatedNativeCalls.length > 0 && usedNativeToolsThisTurn) {
		console.log(`[PostStream] Processing ${streamResult.accumulatedNativeCalls.length} native tool calls.`)
		const nativeToolResultParts: FunctionResponsePart[] = []
		for (const call of streamResult.accumulatedNativeCalls) {
			try {
				const result: ToolResponse = await task.toolExecutor.executeToolByName(call.name as ToolUseName, call.args)
				nativeToolResultParts.push({
					functionResponse: {
						name: call.name,
						response: { content: typeof result === "string" ? result : JSON.stringify(result) },
					},
				})
				executedTool = true
			} catch (error: any) {
				console.error(`[PostStream] Error executing native tool ${call.name}:`, error)
				nativeToolResultParts.push({
					functionResponse: { name: call.name, response: { content: `[Tool Error]: ${error.message}` } },
				})
				if (autonomyMode === "full") {
					recoveryNeededError = new Error(`Tool execution failed for ${call.name}: ${error.message}`)
				}
			}
		}
		const toolResultBlocks: Anthropic.ToolResultBlockParam[] = nativeToolResultParts.map((part, index) => {
			const toolUseId = `func_${Date.now()}_${index}`
			let responseContent = "[Tool Error]: Missing response content"
			let isError = true
			const resp = part.functionResponse?.response as any
			if (resp?.content) {
				responseContent = typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content)
				isError = responseContent.startsWith("[Tool Error]:")
			}
			return {
				type: "tool_result",
				tool_use_id: toolUseId,
				content: [{ type: "text", text: responseContent, citations: null }],
				is_error: isError,
			}
		})
		toolResultsContent = { role: "user", content: toolResultBlocks }

		// Path 2: Tool Use Blocks (Anthropic Native & XML)
	} else if (finalAssistantBlocks.some((b) => b.type === "tool_use")) {
		console.log("[PostStream] Processing tool_use blocks from stream.")
		const toolResultBlocksForHistory: Anthropic.ToolResultBlockParam[] = []
		let toolBlockIndex = 0
		// Assistant message with tool_use was already added in stream processing part (if applicable)
		// Now, just process the results
		for (const block of finalAssistantBlocks) {
			if (block.type === "tool_use") {
				const toolUse = block as ToolUse
				const approvalStatus = task.streamProcessor.getToolApprovalStatus(toolBlockIndex)
				const toolUseId = toolUse.id
				if (!toolUseId) {
					console.error("Tool use block missing ID:", toolUse)
					toolBlockIndex++
					continue
				}

				if (approvalStatus?.approved) {
					try {
						const result: ToolResponse = await task.toolExecutor.executeToolByName(toolUse.name, toolUse.params)
						const resultBlock: Anthropic.ToolResultBlockParam = {
							type: "tool_result",
							tool_use_id: toolUseId,
							content:
								typeof result === "string"
									? [{ type: "text", text: result || "(No output)", citations: null }]
									: result
											.map((resBlock): Anthropic.TextBlockParam | Anthropic.ImageBlockParam | null => {
												if (resBlock.type === "text") {
													return { type: "text", text: resBlock.text ?? "", citations: null }
												}
												if (resBlock.type === "image" && resBlock.source) {
													const source: Anthropic.ImageBlockParam.Source = {
														type: resBlock.source.type,
														media_type: resBlock.source.media_type,
														data: resBlock.source.data,
													}
													return { type: "image", source: source }
												}
												return {
													type: "text",
													text: `(Unsupported tool output block type)`,
													citations: null,
												}
											})
											.filter((b): b is Anthropic.TextBlockParam | Anthropic.ImageBlockParam => b !== null),
						}
						toolResultBlocksForHistory.push(resultBlock)
						executedTool = true
					} catch (error: unknown) {
						const errorMessage = error instanceof Error ? error.message : String(error)
						console.error(`[PostStream] Error executing tool ${toolUse.name}:`, error)
						const errorResultBlock: Anthropic.ToolResultBlockParam = {
							type: "tool_result",
							tool_use_id: toolUseId,
							content: [{ type: "text", text: `[Tool Error]: ${errorMessage}`, citations: null }],
							is_error: true,
						}
						toolResultBlocksForHistory.push(errorResultBlock)
						if (autonomyMode === "full") {
							recoveryNeededError = new Error(`Tool execution failed for ${toolUse.name}: ${errorMessage}`)
						}
					}
				} else {
					toolResultBlocksForHistory.push({
						type: "tool_result",
						tool_use_id: toolUseId,
						content: [
							{
								type: "text",
								text: `[Tool Skipped: ${toolUse.name} - ${approvalStatus?.feedback || "Not approved"}]`,
								citations: null,
							},
						],
					})
				}
				toolBlockIndex++
			}
		}
		toolResultsContent = { role: "user", content: toolResultBlocksForHistory }

		// Check for attempt_completion tool use
		if (finalAssistantBlocks.some((b) => b.type === "tool_use" && (b as ToolUse).name === "attempt_completion")) {
			console.log("[PostStream] Detected 'attempt_completion' tool use.")
			detectedTaskCompletion = true
		}
	} else {
		// Path 3: No Tools Executed - History already updated in stream processing
		console.log("[PostStream] No tool execution requested.")
		executedTool = false
	}

	// --- Determine if loop should continue based on tool execution ---
	let shouldContinueLoop = false
	if (executedTool && toolResultsContent && !recoveryNeededError) {
		// Tool executed successfully
		setConsecutiveMistakeCount(0)
		setConsecutiveRecoveryFailures(0) // Reset recovery counter
		await task.stateManager.addToApiConversationHistory(toolResultsContent)
		telemetryService.captureConversationTurnEvent(
			task.taskId,
			task.apiProvider,
			task.api.getModel().id,
			toolResultsContent.role,
		)
		shouldContinueLoop = true
	} else if (toolResultsContent && recoveryNeededError) {
		// Tool executed but resulted in an error needing recovery
		await task.stateManager.addToApiConversationHistory(toolResultsContent) // Add error result to history
		telemetryService.captureConversationTurnEvent(
			task.taskId,
			task.apiProvider,
			task.api.getModel().id,
			toolResultsContent.role,
		)
		shouldContinueLoop = false // Recovery needed
	} else if (finalAssistantBlocks.some((b: AssistantMessageContent) => b.type === "text" && b.content?.trim())) {
		// Assistant provided text response
		setConsecutiveRecoveryFailures(0) // Reset recovery counter
		shouldContinueLoop = false // Default to not continuing unless autonomy logic overrides
	} else {
		// No tool executed, no text response, or other unexpected state
		shouldContinueLoop = false
	}

	return {
		shouldContinueLoop,
		executedTool,
		detectedTaskCompletion,
		recoveryNeededError,
		userContentForNextLoop, // Will be null unless recovery sets it
	}
}
