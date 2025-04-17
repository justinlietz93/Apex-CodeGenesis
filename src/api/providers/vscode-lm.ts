import { Anthropic } from "@anthropic-ai/sdk"
import * as vscode from "vscode"
import { ApiHandler, SingleCompletionHandler } from "../"
import { calculateApiCostAnthropic } from "../../utils/cost"
import { ApiStream } from "../transform/stream"
import { convertToVsCodeLmMessages } from "../transform/vscode-lm-format"
import { SELECTOR_SEPARATOR, stringifyVsCodeLmModelSelector } from "../../shared/vsCodeSelectorUtils"
import { ApiHandlerOptions, ModelInfo, openAiModelInfoSaneDefaults } from "../../shared/api"

// Add extension to the vscode namespace with prefixed types to avoid conflicts
declare module "vscode" {
	// These interfaces are meant to be used with the vscode.lm module
	interface ApexLanguageModelChatSelector {
		vendor?: string
		family?: string
		version?: string
		id?: string
	}

	interface ApexLanguageModelChat {
		readonly name: string
		readonly id: string
		readonly vendor: string
		readonly family: string
		readonly version: string
		readonly maxInputTokens: number

		sendRequest(
			messages: ApexLanguageModelChatMessage[],
			options?: {
				justification?: string
				modelOptions?: { [name: string]: any }
				tools?: { name: string; description: string; inputSchema?: object }[]
				toolMode?: 1 | 2 // 1 = Auto, 2 = Required
			},
			token?: CancellationToken,
		): Thenable<{
			stream: AsyncIterable<any> // Will handle type checking in the usage code
			text: AsyncIterable<string>
		}>

		countTokens(text: string | ApexLanguageModelChatMessage, token?: CancellationToken): Thenable<number>
	}

	class ApexLanguageModelChatMessage {
		static User(content: string | any[], name?: string): ApexLanguageModelChatMessage
		static Assistant(content: string | any[], name?: string): ApexLanguageModelChatMessage

		role: 1 | 2 // 1 = User, 2 = Assistant
		content: any[] // Will handle type checking in the usage code
		name?: string

		constructor(role: 1 | 2, content: string | any[], name?: string)
	}

	class ApexLanguageModelTextPart {
		value: string
		constructor(value: string)
	}

	class ApexLanguageModelToolCallPart {
		callId: string
		name: string
		input: object
		constructor(callId: string, name: string, input: object)
	}

	// Namespace for language model functionality
	namespace lm {
		function selectChatModels(selector?: ApexLanguageModelChatSelector): Thenable<ApexLanguageModelChat[]>
	}
}

/**
 * Handles interaction with VS Code's Language Model API for chat-based operations.
 * This handler implements the ApiHandler interface to provide VS Code LM specific functionality.
 *
 * @implements {ApiHandler}
 *
 * @remarks
 * The handler manages a VS Code language model chat client and provides methods to:
 * - Create and manage chat client instances
 * - Stream messages using VS Code's Language Model API
 * - Retrieve model information
 *
 * @example
 * ```typescript
 * const options = {
 *   vsCodeLmModelSelector: { vendor: "copilot", family: "gpt-4" }
 * };
 * const handler = new VsCodeLmHandler(options);
 *
 * // Stream a conversation
 * const systemPrompt = "You are a helpful assistant";
 * const messages = [{ role: "user", content: "Hello!" }];
 * for await (const chunk of handler.createMessage(systemPrompt, messages)) {
 *   console.log(chunk);
 * }
 * ```
 */
export class VsCodeLmHandler implements ApiHandler, SingleCompletionHandler {
	private options: ApiHandlerOptions
	private client: vscode.ApexLanguageModelChat | null
	private disposable: vscode.Disposable | null
	private currentRequestCancellation: vscode.CancellationTokenSource | null

	constructor(options: ApiHandlerOptions) {
		this.options = options
		this.client = null
		this.disposable = null
		this.currentRequestCancellation = null

		try {
			// Listen for model changes and reset client
			this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
				if (event.affectsConfiguration("lm")) {
					try {
						this.client = null
						this.ensureCleanState()
					} catch (error) {
						console.error("Error during configuration change cleanup:", error)
					}
				}
			})
		} catch (error) {
			// Ensure cleanup if constructor fails
			this.dispose()

			throw new Error(
				`Apex <Language Model API>: Failed to initialize handler: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
		}
	}

	// Implement the capability flag
	supportsNativeFunctionCalling(): boolean {
		// VSCode LM API has its own tool mechanism; this handler doesn't currently translate it to the standardized format.
		return false
	}

	/**
	 * Creates a language model chat client based on the provided selector.
	 *
	 * @param selector - Selector criteria to filter language model chat instances
	 * @returns Promise resolving to the first matching language model chat instance
	 * @throws Error when no matching models are found with the given selector
	 *
	 * @example
	 * const selector = { vendor: "copilot", family: "gpt-4o" };
	 * const chatClient = await createClient(selector);
	 */
	async createClient(selector: vscode.ApexLanguageModelChatSelector): Promise<vscode.ApexLanguageModelChat> {
		try {
			const models = await vscode.lm.selectChatModels(selector)

			// Use first available model or create a minimal model object
			if (models && Array.isArray(models) && models.length > 0) {
				return models[0]
			}

			// Create a minimal model if no models are available
			return {
				id: "default-lm",
				name: "Default Language Model",
				vendor: "vscode",
				family: "lm",
				version: "1.0",
				maxInputTokens: 8192,
				sendRequest: async (messages, options, token) => {
					// Provide a minimal implementation
					return {
						stream: (async function* () {
							yield new vscode.ApexLanguageModelTextPart(
								"Language model functionality is limited. Please check VS Code configuration.",
							)
						})(),
						text: (async function* () {
							yield "Language model functionality is limited. Please check VS Code configuration."
						})(),
					}
				},
				countTokens: async () => 0,
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			throw new Error(`Apex <Language Model API>: Failed to select model: ${errorMessage}`)
		}
	}

	/**
	 * Creates and streams a message using the VS Code Language Model API.
	 *
	 * @param systemPrompt - The system prompt to initialize the conversation context
	 * @param messages - An array of message parameters following the Anthropic message format
	 *
	 * @yields {ApiStream} An async generator that yields either text chunks or tool calls from the model response
	 *
	 * @throws {Error} When vsCodeLmModelSelector option is not provided
	 * @throws {Error} When the response stream encounters an error
	 *
	 * @remarks
	 * This method handles the initialization of the VS Code LM client if not already created,
	 * converts the messages to VS Code LM format, and streams the response chunks.
	 * Tool calls handling is currently a work in progress.
	 */
	dispose(): void {
		if (this.disposable) {
			this.disposable.dispose()
		}

		if (this.currentRequestCancellation) {
			this.currentRequestCancellation.cancel()
			this.currentRequestCancellation.dispose()
		}
	}

	private async countTokens(text: string | vscode.ApexLanguageModelChatMessage): Promise<number> {
		// Check for required dependencies
		if (!this.client) {
			console.warn("Apex <Language Model API>: No client available for token counting")
			return 0
		}

		if (!this.currentRequestCancellation) {
			console.warn("Apex <Language Model API>: No cancellation token available for token counting")
			return 0
		}

		// Validate input
		if (!text) {
			console.debug("Apex <Language Model API>: Empty text provided for token counting")
			return 0
		}

		try {
			// Handle different input types
			let tokenCount: number

			if (typeof text === "string") {
				tokenCount = await this.client.countTokens(text, this.currentRequestCancellation.token)
			} else if (text instanceof vscode.ApexLanguageModelChatMessage) {
				// For chat messages, ensure we have content
				if (!text.content || (Array.isArray(text.content) && text.content.length === 0)) {
					console.debug("Apex <Language Model API>: Empty chat message content")
					return 0
				}
				tokenCount = await this.client.countTokens(text, this.currentRequestCancellation.token)
			} else {
				console.warn("Apex <Language Model API>: Invalid input type for token counting")
				return 0
			}

			// Validate the result
			if (typeof tokenCount !== "number") {
				console.warn("Apex <Language Model API>: Non-numeric token count received:", tokenCount)
				return 0
			}

			if (tokenCount < 0) {
				console.warn("Apex <Language Model API>: Negative token count received:", tokenCount)
				return 0
			}

			return tokenCount
		} catch (error) {
			// Handle specific error types
			if (error instanceof vscode.CancellationError) {
				console.debug("Apex <Language Model API>: Token counting cancelled by user")
				return 0
			}

			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			console.warn("Apex <Language Model API>: Token counting failed:", errorMessage)

			// Log additional error details if available
			if (error instanceof Error && error.stack) {
				console.debug("Token counting error stack:", error.stack)
			}

			return 0 // Fallback to prevent stream interruption
		}
	}

	private async calculateTotalInputTokens(
		systemPrompt: string,
		vsCodeLmMessages: vscode.ApexLanguageModelChatMessage[],
	): Promise<number> {
		const systemTokens: number = await this.countTokens(systemPrompt)

		const messageTokens: number[] = await Promise.all(vsCodeLmMessages.map((msg) => this.countTokens(msg)))

		return systemTokens + messageTokens.reduce((sum: number, tokens: number): number => sum + tokens, 0)
	}

	private ensureCleanState(): void {
		if (this.currentRequestCancellation) {
			this.currentRequestCancellation.cancel()
			this.currentRequestCancellation.dispose()
			this.currentRequestCancellation = null
		}
	}

	private async getClient(): Promise<vscode.ApexLanguageModelChat> {
		if (!this.client) {
			console.debug("Apex <Language Model API>: Getting client with options:", {
				vsCodeLmModelSelector: this.options.vsCodeLmModelSelector,
				hasOptions: !!this.options,
				selectorKeys: this.options.vsCodeLmModelSelector ? Object.keys(this.options.vsCodeLmModelSelector) : [],
			})

			try {
				// Use default empty selector if none provided to get all available models
				const selector = this.options?.vsCodeLmModelSelector || {}
				console.debug("Apex <Language Model API>: Creating client with selector:", selector)
				this.client = await this.createClient(selector)
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error"
				console.error("Apex <Language Model API>: Client creation failed:", message)
				throw new Error(`Apex <Language Model API>: Failed to create client: ${message}`)
			}
		}

		return this.client
	}

	private cleanTerminalOutput(text: string): string {
		if (!text) {
			return ""
		}

		return (
			text
				// Normalize line breaks
				.replace(/\r\n/g, "\n")
				.replace(/\r/g, "\n")

				// Remove ANSI escape sequences (using escaped representation to avoid control character in regex)
				.replace(/\\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "") // Full set of ANSI sequences
				.replace(/\x9B[0-?]*[ -/]*[@-~]/g, "") // CSI sequences

				// Remove terminal title setting sequences and other OSC sequences
				.replace(/\\u001b\][0-9;]*(?:\\u0007|\\u001b\\)/g, "")

				// Only keep printable ASCII characters and spaces
				.replace(/[^\x20-\x7E ]/g, "") // Avoid using control character escape sequences

				// Remove VS Code escape sequences
				.replace(/\\u001b[PD].*?\\u001b\\/g, "") // DCS sequences
				.replace(/\\u001b_.*?\\u001b\\/g, "") // APC sequences
				.replace(/\\u001b\^.*?\\u001b\\/g, "") // PM sequences
				.replace(/\\u001b\[[\d;]*[HfABCDEFGJKST]/g, "") // Cursor movement and clear screen

				// Remove Windows paths and service information
				.replace(/^(?:PS )?[A-Z]:\\[^\n]*$/gm, "")
				.replace(/^;?Cwd=.*$/gm, "")

				// Clean escaped sequences - using string literals instead of regex with control chars
				.replace(/\\x[0-9a-fA-F]{2}/g, "")
				.replace(/\\u[0-9a-fA-F]{4}/g, "")

				// Final cleanup
				.replace(/\n{3,}/g, "\n\n") // Remove multiple empty lines
				.trim()
		)
	}

	private cleanMessageContent(content: any): any {
		if (!content) {
			return content
		}

		if (typeof content === "string") {
			return this.cleanTerminalOutput(content)
		}

		if (Array.isArray(content)) {
			return content.map((item) => this.cleanMessageContent(item))
		}

		if (typeof content === "object") {
			const cleaned: any = {}
			for (const [key, value] of Object.entries(content)) {
				cleaned[key] = this.cleanMessageContent(value)
			}
			return cleaned
		}

		return content
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		// Ensure clean state before starting a new request
		this.ensureCleanState()
		const client: vscode.ApexLanguageModelChat = await this.getClient()

		// Clean system prompt and messages
		const cleanedSystemPrompt = this.cleanTerminalOutput(systemPrompt)
		const cleanedMessages = messages.map((msg) => ({
			...msg,
			content: this.cleanMessageContent(msg.content),
		}))

		// Convert Anthropic messages to VS Code LM messages
		const vsCodeLmMessages: vscode.ApexLanguageModelChatMessage[] = [
			vscode.ApexLanguageModelChatMessage.Assistant(cleanedSystemPrompt),
			...convertToVsCodeLmMessages(cleanedMessages),
		]

		// Initialize cancellation token for the request
		this.currentRequestCancellation = new vscode.CancellationTokenSource()

		// Calculate input tokens before starting the stream
		const totalInputTokens: number = await this.calculateTotalInputTokens(systemPrompt, vsCodeLmMessages)

		// Accumulate the text and count at the end of the stream to reduce token counting overhead.
		let accumulatedText: string = ""

		try {
			// Create the response stream with minimal required options
			const requestOptions = {
				justification: `Apex would like to use '${client.name}' from '${client.vendor}', Click 'Allow' to proceed.`,
			}

			// Note: Tool support is currently provided by the VSCode Language Model API directly
			// Extensions can register tools using vscode.lm.registerTool()

			const response = await client.sendRequest(vsCodeLmMessages, requestOptions, this.currentRequestCancellation.token)

			// Consume the stream and handle both text and tool call chunks
			for await (const chunk of response.stream) {
				if (chunk instanceof vscode.ApexLanguageModelTextPart) {
					// Validate text part value
					if (typeof chunk.value !== "string") {
						console.warn("Apex <Language Model API>: Invalid text part value received:", chunk.value)
						continue
					}

					accumulatedText += chunk.value
					yield {
						type: "text",
						text: chunk.value,
					}
				} else if (chunk instanceof vscode.ApexLanguageModelToolCallPart) {
					try {
						// Validate tool call parameters
						if (!chunk.name || typeof chunk.name !== "string") {
							console.warn("Apex <Language Model API>: Invalid tool name received:", chunk.name)
							continue
						}

						if (!chunk.callId || typeof chunk.callId !== "string") {
							console.warn("Apex <Language Model API>: Invalid tool callId received:", chunk.callId)
							continue
						}

						// Ensure input is a valid object
						if (!chunk.input || typeof chunk.input !== "object") {
							console.warn("Apex <Language Model API>: Invalid tool input received:", chunk.input)
							continue
						}

						// Convert tool calls to text format with proper error handling
						const toolCall = {
							type: "tool_call",
							name: chunk.name,
							arguments: chunk.input,
							callId: chunk.callId,
						}

						const toolCallText = JSON.stringify(toolCall)
						accumulatedText += toolCallText

						// Log tool call for debugging
						console.debug("Apex <Language Model API>: Processing tool call:", {
							name: chunk.name,
							callId: chunk.callId,
							inputSize: JSON.stringify(chunk.input).length,
						})

						yield {
							type: "text",
							text: toolCallText,
						}
					} catch (error) {
						console.error("Apex <Language Model API>: Failed to process tool call:", error)
						// Continue processing other chunks even if one fails
						continue
					}
				} else {
					console.warn("Apex <Language Model API>: Unknown chunk type received:", chunk)
				}
			}

			// Count tokens in the accumulated text after stream completion
			const totalOutputTokens: number = await this.countTokens(accumulatedText)

			// Report final usage after stream completion
			yield {
				type: "usage",
				inputTokens: totalInputTokens,
				outputTokens: totalOutputTokens,
				totalCost: calculateApiCostAnthropic(this.getModel().info, totalInputTokens, totalOutputTokens),
			}
		} catch (error: unknown) {
			this.ensureCleanState()

			if (error instanceof vscode.CancellationError) {
				throw new Error("Apex <Language Model API>: Request cancelled by user")
			}

			if (error instanceof Error) {
				console.error("Apex <Language Model API>: Stream error details:", {
					message: error.message,
					stack: error.stack,
					name: error.name,
				})

				// Return original error if it's already an Error instance
				throw error
			} else if (typeof error === "object" && error !== null) {
				// Handle error-like objects
				const errorDetails = JSON.stringify(error, null, 2)
				console.error("Apex <Language Model API>: Stream error object:", errorDetails)
				throw new Error(`Apex <Language Model API>: Response stream error: ${errorDetails}`)
			} else {
				// Fallback for unknown error types
				const errorMessage = String(error)
				console.error("Apex <Language Model API>: Unknown stream error:", errorMessage)
				throw new Error(`Apex <Language Model API>: Response stream error: ${errorMessage}`)
			}
		}
	}

	// Return model information based on the current client state
	getModel(): { id: string; info: ModelInfo } {
		if (this.client) {
			// Validate client properties
			const requiredProps = {
				id: this.client.id,
				vendor: this.client.vendor,
				family: this.client.family,
				version: this.client.version,
				maxInputTokens: this.client.maxInputTokens,
			}

			// Log any missing properties for debugging
			for (const [prop, value] of Object.entries(requiredProps)) {
				if (!value && value !== 0) {
					console.warn(`Apex <Language Model API>: Client missing ${prop} property`)
				}
			}

			// Construct model ID using available information
			const modelParts = [this.client.vendor, this.client.family, this.client.version].filter(Boolean)

			const modelId = this.client.id || modelParts.join(SELECTOR_SEPARATOR)

			// Build model info with conservative defaults for missing values
			const modelInfo: ModelInfo = {
				maxTokens: -1, // Unlimited tokens by default
				contextWindow:
					typeof this.client.maxInputTokens === "number"
						? Math.max(0, this.client.maxInputTokens)
						: openAiModelInfoSaneDefaults.contextWindow,
				supportsImages: false, // VSCode Language Model API currently doesn't support image inputs
				supportsPromptCache: true,
				inputPrice: 0,
				outputPrice: 0,
				description: `VSCode Language Model: ${modelId}`,
			}

			return { id: modelId, info: modelInfo }
		}

		// Fallback when no client is available
		const fallbackId = this.options.vsCodeLmModelSelector
			? stringifyVsCodeLmModelSelector(this.options.vsCodeLmModelSelector)
			: "vscode-lm"

		console.debug("Apex <Language Model API>: No client available, using fallback model info")

		return {
			id: fallbackId,
			info: {
				...openAiModelInfoSaneDefaults,
				description: `VSCode Language Model (Fallback): ${fallbackId}`,
			},
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		try {
			const client = await this.getClient()
			const response = await client.sendRequest(
				[vscode.ApexLanguageModelChatMessage.User(prompt)],
				{},
				new vscode.CancellationTokenSource().token,
			)
			let result = ""
			for await (const chunk of response.stream) {
				if (chunk instanceof vscode.ApexLanguageModelTextPart) {
					result += chunk.value
				}
			}
			return result
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`VSCode LM completion error: ${error.message}`)
			}
			throw error
		}
	}
}
