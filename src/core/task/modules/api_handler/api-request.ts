import * as vscode from "vscode"
import pWaitFor from "p-wait-for"
import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"
import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index" // Correct path
import { ApiStream } from "../../../../api/transform/stream" // Correct path: up four levels
import { GlobalFileNames } from "../../../storage/disk" // Correct path
import { fileExistsAtPath, isDirectory } from "../../../../utils/fs" // Correct path
import { formatResponse } from "../../../prompts/responses" // Correct path
import { SYSTEM_PROMPT } from "../../../prompts/system" // Correct path
import { getLanguageKey, LanguageDisplay, DEFAULT_LANGUAGE_SETTINGS } from "../../../../shared/Languages" // Correct path
import { OpenRouterHandler } from "../../../../api/providers/openrouter" // Correct path: up four levels
import { AnthropicHandler } from "../../../../api/providers/anthropic" // Correct path: up four levels
import {
	checkIsOpenRouterContextWindowError,
	checkIsAnthropicContextWindowError,
} from "../../../context-management/context-error-handling" // Correct path
// Import needed backend protocol types
import {
	SelectPersonaParams,
	SelectPersonaResult, // Ensure SelectPersonaResult is imported if needed, or adjust assumption
	GetPersonaContentByNameRequest,
	GetPersonaContentByNameResult, // Import new types
	KnowledgeSearchParams,
	GeneratePlanParams,
} from "../../../../shared/BackendProtocol" // Correct path
// Using the placeholder ToolDefinition from our shared types
import { ToolDefinition } from "../../../../shared/types" // Correct path: up four levels
// Import helper
import { formatErrorWithStatusCode } from "./helpers"
// Import ApiHandlerModule type for 'this' context if needed, or pass necessary state/methods as args
// For now, assume 'task' provides access to needed properties/methods.
// import { ApiHandlerModule } from "../api-handler"; // Avoid circular dependency if possible

const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

// Define UserContent locally if not imported from elsewhere
type UserContent = Array<Anthropic.ContentBlockParam>

// Extracted function - needs access to task instance properties/methods
export async function* attemptApiRequest(
	task: Task, // Pass task instance
	previousApiReqIndex: number,
	// Pass flags/state previously accessed via this. from ApiHandlerModule
	didAutomaticallyRetryFailedApiRequest: boolean,
	setDidAutomaticallyRetryFailedApiRequest: (value: boolean) => void, // Callback to update state
	// Add initialUserContent specifically for the first request's persona selection
	initialUserContentForPersona?: UserContent | null,
): ApiStream {
	await pWaitFor(() => task.controllerRef.deref()?.mcpHub?.isConnecting !== true, { timeout: 10_000 }).catch(() => {
		console.error("MCP servers failed to connect in time")
	})

	const mcpHub = task.controllerRef.deref()?.mcpHub
	if (!mcpHub) {
		throw new Error("MCP hub not available")
	}

	const disableBrowserTool = vscode.workspace.getConfiguration("apex").get<boolean>("disableBrowserTool") ?? false
	const modelSupportsComputerUse = task.api.getModel().info.supportsComputerUse ?? false
	const supportsComputerUse = modelSupportsComputerUse && !disableBrowserTool

	// --- Task 3.2: Conditional Tool Inclusion ---
	const supportsNativeTools = task.api.supportsNativeFunctionCalling()
	const needsXmlToolInstructions = !supportsNativeTools // XML needed if native not supported

	let toolsParam: ToolDefinition[] | undefined = undefined // Use ToolDefinition type
	let toolChoiceParam: any = undefined // Keep as any for flexibility

	if (supportsNativeTools) {
		// Placeholder: Add check for getAvailableTools existence before calling
		toolsParam = typeof task.toolExecutor?.getAvailableTools === "function" ? task.toolExecutor.getAvailableTools() : []
		// Optionally set toolChoiceParam if needed (e.g., 'auto', 'any', specific tool)
		// toolChoiceParam = { type: 'auto' }; // Example for Anthropic
		// toolChoiceParam = { mode: 'auto' }; // Example for Gemini
	}
	// --- End Task 3.2 ---

	// Prepare custom instruction parts
	let settingsCustomInstructions = task.customInstructions?.trim()
	const preferredLanguage = getLanguageKey(vscode.workspace.getConfiguration("apex").get<LanguageDisplay>("preferredLanguage"))
	const preferredLanguageInstructions =
		preferredLanguage && preferredLanguage !== DEFAULT_LANGUAGE_SETTINGS
			? `# Preferred Language\n\nSpeak in ${preferredLanguage}.`
			: ""
	const apexRulesFilePath = path.resolve(cwd, GlobalFileNames.apexRules)
	let apexRulesFileInstructions: string | undefined
	if (await fileExistsAtPath(apexRulesFilePath)) {
		if (await isDirectory(apexRulesFilePath)) {
			try {
				const ruleFiles = await fs
					.readdir(apexRulesFilePath, { withFileTypes: true, recursive: true })
					.then((files) => files.filter((file) => file.isFile()))
					.then((files) => files.map((file) => path.resolve(file.parentPath, file.name)))
				const ruleFilesTotalContent = await Promise.all(
					ruleFiles.map(async (file) => {
						const ruleFilePath = path.resolve(apexRulesFilePath, file)
						const ruleFilePathRelative = path.relative(cwd, ruleFilePath)
						return `${ruleFilePathRelative}\n` + (await fs.readFile(ruleFilePath, "utf8")).trim()
					}),
				).then((contents) => contents.join("\n\n"))
				apexRulesFileInstructions = formatResponse.apexRulesDirectoryInstructions(cwd, ruleFilesTotalContent)
			} catch {
				console.error(`Failed to read .apexrules directory at ${apexRulesFilePath}`)
			}
		} else {
			try {
				const ruleFileContent = (await fs.readFile(apexRulesFilePath, "utf8")).trim()
				if (ruleFileContent) {
					apexRulesFileInstructions = formatResponse.apexRulesFileInstructions(cwd, ruleFileContent)
				}
			} catch {
				console.error(`Failed to read .apexrules file at ${apexRulesFilePath}`)
			}
		}
	}
	const apexIgnoreContent = task.apexIgnoreController.apexIgnoreContent // Corrected property access
	let apexIgnoreInstructions: string | undefined
	if (apexIgnoreContent) {
		apexIgnoreInstructions = formatResponse.apexIgnoreInstructions(apexIgnoreContent) // Assuming formatResponse handles this correctly
	}

	// --- Step 4.5.5: Configurable Initial Persona Fetch ---
	const dynamicPersonaMode = vscode.workspace.getConfiguration("apex.agent").get<string>("dynamicPersonaMode") || "initial"
	const isFirstRequest = previousApiReqIndex === -1 // Determine if it's the first request

	// Only fetch initial persona on the first request and if mode is 'initial' or 'threshold'
	if (
		isFirstRequest &&
		(dynamicPersonaMode === "initial" || dynamicPersonaMode === "threshold") &&
		initialUserContentForPersona
	) {
		try {
			// Extract initial goal from the first user message
			const firstTextBlock = initialUserContentForPersona.find(
				(block: Anthropic.ContentBlockParam) => block.type === "text",
			) as Anthropic.TextBlockParam | undefined
			const initialGoal = firstTextBlock?.text?.replace(/<\/?task>/g, "").trim()

			if (initialGoal) {
				// Step 4.5.5.2: Call selectPersona to get the name
				console.log("[ApiRequest] Requesting initial persona selection (name) from backend...")
				const personaNameParams: SelectPersonaParams = { goal: initialGoal }
				// *** Assumption: selectPersona returns { persona_name: string | null } ***
				// This might require backend/protocol changes later.
				const personaNameResult = (await task.backendCommunicator.selectPersona(personaNameParams)) as unknown as {
					persona_name: string | null
				} // Cast based on assumption

				if (personaNameResult && personaNameResult.persona_name) {
					const selectedName = personaNameResult.persona_name
					console.log(`[ApiRequest] Backend suggested initial persona name: ${selectedName}`)

					// Step 4.5.5.3: Call getPersonaContentByName to get the content
					console.log(`[ApiRequest] Fetching content for persona: ${selectedName}`)
					const personaContentParams: GetPersonaContentByNameRequest = { name: selectedName }
					const personaContentResult = await task.backendCommunicator.getPersonaContentByName(personaContentParams)

					if (personaContentResult.content !== null) {
						// Step 4.5.5.4: Store name and content in state
						task.stateManager.currentActivePersonaName = selectedName
						task.stateManager.currentActivePersonaContent = personaContentResult.content
						console.log(`[ApiRequest] Stored initial persona '${selectedName}' in state.`)
					} else {
						console.warn(
							`[ApiRequest] Backend returned null content for persona: ${selectedName}. Persona not activated.`,
						)
						task.stateManager.currentActivePersonaName = null // Ensure state is cleared
						task.stateManager.currentActivePersonaContent = null
					}
				} else {
					console.warn("[ApiRequest] Backend did not return a persona name from selectPersona. Cannot fetch content.")
					task.stateManager.currentActivePersonaName = null // Ensure state is cleared
					task.stateManager.currentActivePersonaContent = null
				}
			} else {
				console.warn("[ApiRequest] Could not extract initial goal for persona selection.")
			}

			// --- Optional: Keep Initial Plan Generation (from Task 4.1) ---
			// This can run regardless of persona selection success/failure if desired
			if (initialGoal) {
				try {
					console.log("[ApiHandlerModule] Requesting initial plan generation from backend...")
					const planParams: GeneratePlanParams = { goal: initialGoal }
					// TODO: Decide how to use/store the generated plan. For now, just log it.
					const generatedPlan = await task.backendCommunicator.generatePlan(planParams)
					console.log("[ApiRequest] Received generated plan:", JSON.stringify(generatedPlan, null, 2))
					// Store the plan in task state if needed:
					// await task.stateManager.updatePlan(generatedPlan);
				} catch (planError) {
					console.error("[ApiRequest] Error during initial plan generation:", planError)
					task.webviewCommunicator.say(
						"error",
						`Failed to generate initial plan: ${planError instanceof Error ? planError.message : "Unknown error"}`,
					)
					// Decide if this error should halt execution or just be logged.
				}
			} // End if(initialGoal) for plan generation
			// --- End Optional Plan Generation ---
		} catch (error) {
			// Catch errors from the outer try (persona selection/fetch)
			console.error("[ApiRequest] Error during initial persona selection/fetch:", error)
			// Proceed without dynamic persona on error
			task.webviewCommunicator.say(
				"error",
				`Failed to select/fetch initial dynamic persona: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
			task.stateManager.currentActivePersonaName = null // Ensure state is cleared on error
			task.stateManager.currentActivePersonaContent = null
		}
	}
	// --- End Step 4.5.5 ---

	// Prepare arguments for SYSTEM_PROMPT assembly
	// Note: Step 4.5.7 will modify how dynamicPersonaContent is passed/used here.
	// For now, we retrieve it from state if it was set, otherwise it's undefined.
	const dynamicPersonaContent = task.stateManager.currentActivePersonaContent ?? undefined

	// Call the assembler function from the new system prompt index file
	let systemPrompt = await SYSTEM_PROMPT(
		cwd,
		supportsComputerUse,
		mcpHub,
		task.browserSettings,
		needsXmlToolInstructions, // Pass flag indicating if XML instructions are needed
		settingsCustomInstructions,
		apexRulesFileInstructions, // Use renamed variable
		// apexIgnoreInstructions, // Removed - SYSTEM_PROMPT should handle fetching this internally if needed
		preferredLanguageInstructions,
		dynamicPersonaContent, // Pass remaining arguments
	)

	// --- Task 4.3: RAG Integration - Knowledge Search ---
	let knowledgeContext = ""
	try {
		// Extract the primary query/goal from the latest user message in history
		const lastUserMessage = [...task.stateManager.apiConversationHistory].reverse().find((m) => m.role === "user")
		let searchQuery = task.taskGoal || "Current task context" // Fallback query
		if (lastUserMessage && typeof lastUserMessage.content === "string") {
			searchQuery = lastUserMessage.content.substring(0, 200) // Use first 200 chars as query
		} else if (lastUserMessage && Array.isArray(lastUserMessage.content)) {
			const firstTextPart = lastUserMessage.content.find((p) => p.type === "text")
			if (firstTextPart && "text" in firstTextPart) {
				searchQuery = firstTextPart.text.substring(0, 200)
			}
		}

		console.log(`[ApiHandlerModule] Performing knowledge search for query: "${searchQuery}"`)
		const searchParams: KnowledgeSearchParams = { query: searchQuery, num_docs: 3 } // Request 3 docs
		const searchResult = await task.backendCommunicator.knowledgeSearch(searchParams)

		if (searchResult.results && searchResult.results.length > 0) {
			knowledgeContext =
				"\n\n# Relevant Knowledge Context:\n\n" +
				searchResult.results.map((res, index) => `## Context Snippet ${index + 1}:\n${res}`).join("\n\n---\n\n")
			console.log(`[ApiHandlerModule] Added ${searchResult.results.length} knowledge snippets to context.`)
		} else {
			console.log("[ApiHandlerModule] No relevant knowledge found.")
		}
	} catch (error) {
		console.error("[ApiHandlerModule] Error during knowledge search:", error)
		// Proceed without knowledge context on error
		task.webviewCommunicator.say(
			"error",
			`Failed to retrieve knowledge context: ${error instanceof Error ? error.message : "Unknown error"}`,
		)
	}
	// Prepend knowledge context to the system prompt
	systemPrompt = knowledgeContext + systemPrompt
	// --- End Task 4.3 ---

	const contextManagementMetadata = task.contextManager.getNewContextMessagesAndMetadata(
		task.stateManager.apiConversationHistory,
		task.stateManager.apexMessages, // Use renamed property
		task.api,
		task.stateManager.conversationHistoryDeletedRange,
		previousApiReqIndex,
	)

	if (contextManagementMetadata.updatedConversationHistoryDeletedRange) {
		await task.stateManager.setConversationHistoryDeletedRange(contextManagementMetadata.conversationHistoryDeletedRange)
	}

	// Pass the prepared toolsParam and toolChoiceParam
	let stream = task.api.createMessage(
		systemPrompt,
		contextManagementMetadata.truncatedConversationHistory,
		toolsParam, // Pass native tool definitions if supported
		toolChoiceParam, // Pass tool choice strategy if needed
	)

	const iterator = stream[Symbol.asyncIterator]()

	try {
		// Accessing isWaitingForFirstChunk needs adjustment - maybe pass as arg or handle differently
		// task.apiHandlerModule.isWaitingForFirstChunk = true; // Cannot access directly
		const firstChunk = await iterator.next()
		if (firstChunk.done) {
			throw new Error("API stream ended unexpectedly after first chunk.")
		}
		yield firstChunk.value // Yield the first chunk value
		// task.apiHandlerModule.isWaitingForFirstChunk = false; // Cannot access directly
	} catch (error: any) {
		const isOpenRouter = task.api instanceof OpenRouterHandler
		const isAnthropic = task.api instanceof AnthropicHandler
		const isOpenRouterContextWindowError = checkIsOpenRouterContextWindowError(error) && isOpenRouter
		const isAnthropicContextWindowError = checkIsAnthropicContextWindowError(error) && isAnthropic

		// Use passed-in state and callback
		if (isAnthropic && isAnthropicContextWindowError && !didAutomaticallyRetryFailedApiRequest) {
			const newRange = task.contextManager.getNextTruncationRange(
				task.stateManager.apiConversationHistory,
				task.stateManager.conversationHistoryDeletedRange,
				0.25, // Keep 1/4 -> Remove 3/4
			)
			await task.stateManager.setConversationHistoryDeletedRange(newRange)
			setDidAutomaticallyRetryFailedApiRequest(true) // Use callback
		} else if (isOpenRouter && !didAutomaticallyRetryFailedApiRequest) {
			if (isOpenRouterContextWindowError) {
				const newRange = task.contextManager.getNextTruncationRange(
					task.stateManager.apiConversationHistory,
					task.stateManager.conversationHistoryDeletedRange,
					0.25, // Keep 1/4 -> Remove 3/4
				)
				await task.stateManager.setConversationHistoryDeletedRange(newRange)
			}
			console.log("first chunk failed, waiting 1 second before retrying")
			await setTimeoutPromise(1000)
			setDidAutomaticallyRetryFailedApiRequest(true) // Use callback
		} else {
			if (isOpenRouterContextWindowError || isAnthropicContextWindowError) {
				const truncatedConversationHistory = task.contextManager.getTruncatedMessages(
					task.stateManager.apiConversationHistory,
					task.stateManager.conversationHistoryDeletedRange,
				)
				if (truncatedConversationHistory.length > 3) {
					error = new Error("Context window exceeded. Click retry to truncate the conversation and try again.")
					setDidAutomaticallyRetryFailedApiRequest(false) // Reset on non-retryable error
				}
			}

			const errorMessage = formatErrorWithStatusCode(error) // Use helper
			const { response } = await task.webviewCommunicator.ask("api_req_failed", errorMessage)

			// Treat 'noButtonClicked' or 'messageResponse' (without explicit continuation) as not retrying
			if (response !== "yesButtonClicked") {
				throw new Error("API request failed and user did not retry")
			}
			await task.webviewCommunicator.say("api_req_retried")
		}
		// Retry the request by yielding from a recursive call
		// Pass the current state values needed for the retry (5 arguments)
		yield* attemptApiRequest(
			task,
			previousApiReqIndex,
			didAutomaticallyRetryFailedApiRequest, // Pass current value
			setDidAutomaticallyRetryFailedApiRequest, // Pass callback
			initialUserContentForPersona, // Pass initial content again for retry if needed
		)
		return // Exit the current generator instance after yielding the retry
	}

	// Yield remaining chunks
	yield* iterator
}
