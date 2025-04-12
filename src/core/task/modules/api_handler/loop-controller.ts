import * as vscode from "vscode"
import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index"
import { ApexApiReqCancelReason, ApexMessage } from "../../../../shared/ExtensionMessage"
import { formatResponse } from "../../../prompts/responses"
import { showSystemNotification } from "../../../../integrations/notifications"
import { calculateApiCostAnthropic } from "../../../../utils/cost"
import { telemetryService } from "../../../../services/telemetry/TelemetryService"
import { findLastIndex } from "../../../../shared/array"
import { FunctionCall, FunctionResponsePart } from "@google/generative-ai"
import { ToolUse, AssistantMessageContent, ToolUseName } from "../../../assistant-message"
import { formatContentBlockToMarkdown } from "../../../../integrations/misc/export-markdown"
import { formatAssistantContentForHistory, formatErrorWithStatusCode } from "./helpers"
// Removed attemptApiRequest import as it's now called within processApiStream
// import { attemptApiRequest } from "./api-request";
import { ApexAskResponse } from "../../../../shared/WebviewMessage"
import {
	AnalyzeAndRecoverParams,
	RecoveryAction,
	SelectPersonaParams, // Import for persona suggestion placeholder
	GetPersonaContentByNameRequest, // Import for fetching content
} from "../../../../shared/BackendProtocol" // Import recovery types
// Import necessary functions from controller modules
import { postStateToWebview } from "../../../controller/modules/state-updater"
import { getTaskWithId } from "../../../controller/modules/history-manager"
import { initApexWithHistoryItem } from "../../../controller/modules/task-lifecycle"
import { handleLimitChecks } from "./loop-controller/limit-checks"
import { prepareApiRequest } from "./loop-controller/request-preparation"
import { processApiStream, StreamProcessingResult } from "./loop-controller/stream-processing"
import { handlePostStreamProcessing, PostStreamProcessingResult } from "./loop-controller/post-stream-processing" // Import post-stream module
// NOTE: ApexAsk is not exported from WebviewMessage, use string literals for ask type

// Define types locally
type UserContent = Array<Anthropic.ContentBlockParam>
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>
type AutonomyMode = "turnBased" | "stepLimited" | "full"

export async function recursivelyMakeApexRequests(
	task: Task,
	// State passed via callbacks
	consecutiveMistakeCount: number,
	setConsecutiveMistakeCount: (count: number) => void,
	consecutiveAutoApprovedRequestsCount: number,
	setConsecutiveAutoApprovedRequestsCount: (count: number) => void,
	didAutomaticallyRetryFailedApiRequest: boolean,
	setDidAutomaticallyRetryFailedApiRequest: (value: boolean) => void,
	consecutiveRecoveryFailures: number, // Added for Step 5.7.1
	setConsecutiveRecoveryFailures: (count: number) => void, // Added for Step 5.7.1
	// Autonomy state
	autonomyMode: AutonomyMode,
	maxAutonomousSteps: number,
	autonomousStepsRemaining: number,
	setAutonomousStepsRemaining: (count: number) => void,
	isTaskComplete: boolean,
	setIsTaskComplete: (value: boolean) => void, // Callback to signal completion
	// Call parameters
	userContent: UserContent | null, // Null indicates continuation after tool use
	includeFileDetails: boolean = false,
): Promise<boolean> {
	// Returns true if the loop *explicitly* decided to end here

	const isContinuationFromNativeTool = userContent === null

	if (task.abort) {
		throw new Error("Apex instance aborted")
	}

	// --- Step 5.7.5: Task Token Limit Check ---
	const maxTaskTokens = vscode.workspace.getConfiguration("apex.agent").get<number | null>("maxTaskTokens", null)
	if (maxTaskTokens !== null && task.stateManager.totalTaskTokens >= maxTaskTokens) {
		console.warn(
			`[LoopController] Task token limit (${maxTaskTokens}) reached. Current total: ${task.stateManager.totalTaskTokens}. Pausing.`,
		)
		const { response } = await task.webviewCommunicator.ask(
			"task_token_limit_reached",
			`Task has exceeded the configured token limit (${maxTaskTokens}). Continue anyway? (This may incur further costs)`,
		)
		if (response !== "yesButtonClicked") {
			console.log("[LoopController] User chose not to continue after token limit reached. Aborting task.")
			task.abortTask()
			return true // End loop
		}
		console.log("[LoopController] User chose to continue despite token limit.")
		// If user continues, we don't reset the counter, allowing the task to proceed further,
		// but the check will happen again next turn. Consider adding a way to temporarily disable the check.
	}
	// --- End Step 5.7.5 Check ---

	// --- Handle Limit Checks (Refactored) ---
	const limitCheckResult = await handleLimitChecks(
		task,
		consecutiveMistakeCount,
		setConsecutiveMistakeCount,
		consecutiveAutoApprovedRequestsCount,
		setConsecutiveAutoApprovedRequestsCount,
		userContent, // Pass current userContent
	)

	if (limitCheckResult.shouldEndLoop) {
		return true // End loop if checks determined it
	}
	userContent = limitCheckResult.updatedUserContent // Update userContent if modified by checks

	// --- Prepare Request & Handle Pre-API Logic (Refactored) ---
	const previousApiReqIndex = findLastIndex(task.stateManager.apexMessages, (m: ApexMessage) => m.say === "api_req_started")
	const isFirstRequest = previousApiReqIndex === -1

	if (isFirstRequest) {
		await task.checkpointManager.saveCheckpoint() // Save checkpoint before first request prep
	}

	// Hold initial content for the first API request's persona selection
	const initialUserContentForPersona = isFirstRequest && userContent ? [...userContent] : null

	// Prepare the request: adds user message to history, loads context, handles persona switching
	await prepareApiRequest(task, userContent, isContinuationFromNativeTool, isFirstRequest, includeFileDetails)
	// Note: The actual API call uses history from stateManager.

	// --- Process API Stream (Refactored) ---
	const lastApiReqIndex = findLastIndex(task.stateManager.apexMessages, (m: ApexMessage) => m.say === "api_req_started")
	let shouldContinueLoop = false // Initialize loop control flag
	let recoveryNeededError: Error | null = null // Initialize recovery flag

	const streamResult: StreamProcessingResult = await processApiStream(
		task,
		previousApiReqIndex,
		didAutomaticallyRetryFailedApiRequest,
		setDidAutomaticallyRetryFailedApiRequest,
		initialUserContentForPersona,
		lastApiReqIndex,
	)

	// --- Handle Stream Errors (Refactored) ---
	if (streamResult.streamError) {
		if (streamResult.streamError.message !== "User cancelled" && streamResult.streamError.message !== "User rejected tool") {
			// Check if we should attempt recovery in full autonomy mode
			if (autonomyMode === "full") {
				console.warn(
					`[LoopController] Stream error occurred in full autonomy mode: ${streamResult.streamError.message}. Attempting recovery.`,
				)
				recoveryNeededError = streamResult.streamError // Store error for recovery logic below
				shouldContinueLoop = false // Prevent normal continuation
			} else if (!task.abandoned) {
				// Non-recoverable stream error outside full autonomy (abort handled in processApiStream)
				console.error("[LoopController] Non-recoverable stream error occurred outside full autonomy.")
			}
		}
		// If recoveryNeededError is set, the autonomy logic below will handle it.
		// Otherwise (user cancel/reject or non-full auto error), end the loop.
		if (!recoveryNeededError) {
			return true // End loop immediately for user cancel/reject or non-full-auto errors
		}
	}

	// --- Post-Stream Processing (Refactored) ---
	// This block runs only if there wasn't an immediate loop-ending stream error handled above
	const postStreamResult: PostStreamProcessingResult = await handlePostStreamProcessing(
		task,
		streamResult, // Pass stream results
		task.streamProcessor.assistantMessageContent, // Pass final blocks
		autonomyMode,
		setConsecutiveMistakeCount,
		setConsecutiveRecoveryFailures,
	)

	// Update state based on post-processing results
	shouldContinueLoop = postStreamResult.shouldContinueLoop
	// Prioritize recovery error from post-processing (e.g., tool execution failure)
	recoveryNeededError = postStreamResult.recoveryNeededError || recoveryNeededError
	const detectedTaskCompletion = postStreamResult.detectedTaskCompletion
	// Update userContent if recovery provided an instruction (will be used in recursive call)
	if (postStreamResult.userContentForNextLoop) {
		userContent = postStreamResult.userContentForNextLoop
	}

	// --- Autonomy Logic: Decide whether to continue or end ---
	let explicitlyEndLoop = false // Flag to determine if the loop should stop here

	// Check for detected completion *before* other autonomy logic
	if (detectedTaskCompletion) {
		console.log("[LoopController] Task completion detected via tool. Ending loop.")
		setIsTaskComplete(true) // Update the main task completion state
		explicitlyEndLoop = true
	} else if (isTaskComplete) {
		// Check existing flag if completion wasn't just detected
		console.log("[LoopController] Task marked as complete. Ending loop.")
		explicitlyEndLoop = true
	} else if (autonomyMode === "turnBased") {
		console.log("[LoopController] Turn-based mode: Ending loop.")
		explicitlyEndLoop = true
	} else if (autonomyMode === "stepLimited") {
		// Only decrement steps if no recovery is needed
		if (!recoveryNeededError) {
			let currentStepsRemaining = autonomousStepsRemaining - 1
			setAutonomousStepsRemaining(currentStepsRemaining)
			console.log(`[LoopController] Step-limited mode: ${currentStepsRemaining} steps remaining.`)
			if (currentStepsRemaining <= 0) {
				console.log("[LoopController] Step limit reached. Pausing for user input.")
				const { response } = await task.webviewCommunicator.ask(
					"autonomy_step_limit_reached",
					`Agent has completed ${maxAutonomousSteps} autonomous steps. Continue? (Yes/No)`,
				)
				if (response === "yesButtonClicked" || response === "messageResponse") {
					console.log("[LoopController] User chose to continue. Resetting step count.")
					setAutonomousStepsRemaining(maxAutonomousSteps)
					explicitlyEndLoop = !shouldContinueLoop // End only if no tool ran
				} else {
					console.log("[LoopController] User chose to pause. Ending loop.")
					explicitlyEndLoop = true
				}
			} else if (!shouldContinueLoop) {
				console.log("[LoopController] Step-limited: Text response received or error occurred. Ending turn.")
				explicitlyEndLoop = true // End loop if no tool ran
			}
			// If shouldContinueLoop is true and steps remain, loop continues implicitly
		} else {
			// Recovery needed, don't decrement steps, end this turn to attempt recovery
			console.log("[LoopController] Step-limited: Recovery needed. Ending turn.")
			explicitlyEndLoop = true
		}
	} else if (autonomyMode === "full") {
		console.log("[LoopController] Full autonomy mode logic executing...")
		// Step 5.7.1: Enhanced recovery logic
		if (recoveryNeededError || !shouldContinueLoop) {
			// Trigger recovery if error occurred OR no tool ran
			const currentFailures = consecutiveRecoveryFailures + 1
			setConsecutiveRecoveryFailures(currentFailures) // Increment failure count

			if (currentFailures > 3) {
				// Recovery attempt limit
				console.error(`[LoopController] Maximum recovery attempts (${currentFailures - 1}) reached. Aborting task.`)
				await task.webviewCommunicator.say(
					"error",
					`Agent failed to recover after ${currentFailures - 1} attempts. Task aborted.`,
				)
				task.abortTask()
				explicitlyEndLoop = true
			} else {
				const errorDescription = recoveryNeededError
					? `Error occurred: ${recoveryNeededError.message}`
					: "Agent produced text response instead of expected action/tool use."
				console.log(
					`[LoopController] Full Autonomy: Attempting recovery (Attempt ${currentFailures}). Error: ${errorDescription}`,
				)

				try {
					// Prepare parameters for the backend call
					const recoveryParams: AnalyzeAndRecoverParams = {
						task_goal: task.taskGoal || "Unknown Task Goal",
						agent_state: JSON.stringify(task.stateManager.apiConversationHistory.slice(-4)),
						error_details: errorDescription,
						action_history: JSON.stringify(task.stateManager.apiConversationHistory),
						plan_state: null, // Plan state not yet tracked here
					}

					// Call the backend
					const recoveryResult = await task.backendCommunicator.analyzeAndRecover(recoveryParams)
					console.log("[LoopController] Received recovery result:", recoveryResult)

					// Process the recovery result
					if (recoveryResult.next_actions && recoveryResult.next_actions.length > 0) {
						const nextAction = recoveryResult.next_actions[0]
						if (nextAction.type === "clarification_request") {
							console.log("[LoopController] Recovery suggests asking user for clarification.")
							await task.webviewCommunicator.say(
								"info",
								`Recovery Analysis: ${recoveryResult.analysis}\nSuggested Question: ${nextAction.details?.question || "Please provide guidance."}`,
							)
							explicitlyEndLoop = true // Pause for user input
						} else if (nextAction.type === "instruction") {
							console.log("[LoopController] Recovery suggests new instruction. Resetting failure count.")
							setConsecutiveRecoveryFailures(0) // Reset counter on successful recovery instruction
							const instructionText = nextAction.details?.instruction_text || recoveryResult.analysis
							userContent = [{ type: "text", text: `[Autonomous Recovery]: ${instructionText}` }]
							shouldContinueLoop = true // Signal to continue with this new content
							explicitlyEndLoop = false
						} else if (nextAction.type === "tool_use") {
							console.warn("[LoopController] Recovery suggested direct tool_use, asking user.")
							await task.webviewCommunicator.say(
								"info",
								`Recovery Analysis: ${recoveryResult.analysis}\nAgent wants to use tool: ${nextAction.details?.toolName}. Please advise.`,
							)
							explicitlyEndLoop = true
						} else {
							console.warn(`[LoopController] Unknown recovery action type: ${nextAction.type}. Ending loop.`)
							explicitlyEndLoop = true
						}
					} else {
						console.warn("[LoopController] Recovery analysis did not provide actionable next steps. Ending loop.")
						await task.webviewCommunicator.say(
							"info",
							`Recovery Analysis: ${recoveryResult.analysis}\nNo clear next action proposed.`,
						)
						explicitlyEndLoop = true
					}
				} catch (recoveryError: any) {
					console.error("[LoopController] Error during analysis/recovery call:", recoveryError)
					await task.webviewCommunicator.say("error", `Failed to perform recovery analysis: ${recoveryError.message}`)
					explicitlyEndLoop = true // End loop if recovery fails
				}
			} // End of recovery attempt limit check
		} else {
			// Tool executed successfully, continue implicitly
			console.log("[LoopController] Full Autonomy: Tool executed successfully, continuing loop.")
			explicitlyEndLoop = false
		}
	}

	// --- Final Decision ---
	if (explicitlyEndLoop) {
		console.log("[LoopController] Explicitly ending loop based on autonomy logic or recovery outcome.")
		task.streamProcessor.userMessageContentReady = true // Allow user input
		const controllerForEndLoopState = task.controllerRef.deref()
		if (controllerForEndLoopState) {
			await postStateToWebview(controllerForEndLoopState)
		} // Use imported function
		return true // Signal loop end
	} else if (shouldContinueLoop) {
		// Make the recursive call if we decided to continue based on tool execution OR recovery instruction
		console.log("[LoopController] Continuing loop recursively...")
		// Ensure userContent is passed correctly if recovery generated an instruction
		const nextUserContent =
			userContent && userContent.some((b) => b.type === "text" && b.text.startsWith("[Autonomous Recovery]:"))
				? userContent
				: null // Pass null if continuing after normal tool use

		return await recursivelyMakeApexRequests(
			task,
			consecutiveMistakeCount,
			setConsecutiveMistakeCount,
			consecutiveAutoApprovedRequestsCount,
			setConsecutiveAutoApprovedRequestsCount,
			didAutomaticallyRetryFailedApiRequest,
			setDidAutomaticallyRetryFailedApiRequest,
			consecutiveRecoveryFailures,
			setConsecutiveRecoveryFailures, // Pass recovery state
			autonomyMode,
			maxAutonomousSteps,
			autonomousStepsRemaining,
			setAutonomousStepsRemaining, // Pass updated remaining steps
			isTaskComplete,
			setIsTaskComplete,
			nextUserContent, // Pass null or recovery instruction
			includeFileDetails,
		)
	} else {
		// Should not be reached if logic is correct, but acts as a safety stop.
		console.warn("[LoopController] Reached unexpected state at end of loop. Ending.")
		task.streamProcessor.userMessageContentReady = true
		const controllerForUnexpectedEnd = task.controllerRef.deref()
		if (controllerForUnexpectedEnd) {
			await postStateToWebview(controllerForUnexpectedEnd)
		} // Use imported function
		return true
	}
} // End of recursivelyMakeApexRequests function
