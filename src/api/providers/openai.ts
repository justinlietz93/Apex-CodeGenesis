import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI, { AzureOpenAI } from "openai"
// Import necessary types for OpenAI tool calling
import { ChatCompletionTool, ChatCompletionMessageToolCall } from "openai/resources/chat/completions"
// Import FunctionCall type for standardized stream chunk
import { FunctionCall } from "@google/generative-ai"
import { withRetry } from "../retry"
import { ApiHandlerOptions, azureOpenAiDefaultApiVersion, ModelInfo, openAiModelInfoSaneDefaults } from "../../shared/api"
import { ApiHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { convertToR1Format } from "../transform/r1-format"

// Define type for ChatCompletionReasoningEffort as it's causing import issues
type ChatCompletionReasoningEffort = "low" | "medium" | "high" | "auto"

// Define OpenAI Tool Schemas
const openAiTools: ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "read_file",
			description: "Reads the content of a file at the specified path relative to the workspace root.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "The relative path to the file within the workspace." },
				},
				required: ["path"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "list_files",
			description: "Lists files and directories within the specified path relative to the workspace root.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "The relative path to the directory. Defaults to '.'." },
					recursive: { type: "boolean", description: "List recursively? Defaults to false if omitted." },
				},
				required: ["path"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "execute_command",
			description: "Executes a shell command.",
			parameters: {
				type: "object",
				properties: {
					command: { type: "string", description: "The command line command to execute." },
					requires_approval: {
						type: "boolean",
						description:
							"Set to true if the command requires explicit user approval (e.g., installs, file deletions). Defaults to false.",
					},
				},
				required: ["command"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "write_to_file",
			description:
				"Writes content to a file at the specified path relative to the workspace root. Overwrites if exists, creates if not.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "The relative path to the file." },
					content: { type: "string", description: "The complete content to write." },
				},
				required: ["path", "content"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "replace_in_file",
			description: "Replaces sections of content in an existing file using SEARCH/REPLACE blocks.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "The relative path to the file." },
					diff: { type: "string", description: "One or more SEARCH/REPLACE blocks defining exact changes." },
				},
				required: ["path", "diff"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "search_files",
			description: "Performs a regex search across files in a specified directory relative to the workspace root.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "The relative path to the directory to search." },
					regex: { type: "string", description: "The Rust regex pattern to search for." },
					file_pattern: { type: "string", description: "Optional glob pattern to filter files (e.g., '*.ts')." },
				},
				required: ["path", "regex"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "list_code_definition_names",
			description:
				"Lists definition names (classes, functions, etc.) in source code files at the top level of the specified directory relative to the workspace root.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "The relative path to the directory." },
				},
				required: ["path"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "ask_followup_question",
			description: "Asks the user a question to gather additional information needed to complete the task.",
			parameters: {
				type: "object",
				properties: {
					question: { type: "string", description: "The question to ask the user." },
					options: {
						type: "array",
						items: { type: "string" },
						description: "Optional array of 2-5 options for the user to choose from.",
					},
				},
				required: ["question"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "plan_mode_respond",
			description: "Responds to the user's inquiry in PLAN MODE to discuss and refine the task plan.",
			parameters: {
				type: "object",
				properties: {
					response: { type: "string", description: "The response to provide to the user." },
					options: {
						type: "array",
						items: { type: "string" },
						description: "Optional array of 2-5 options for the user to choose from.",
					},
				},
				required: ["response"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "attempt_completion",
			description: "Presents the final result of the task to the user after confirming previous steps were successful.",
			parameters: {
				type: "object",
				properties: {
					result: { type: "string", description: "The final result description." },
					command: { type: "string", description: "Optional CLI command to demonstrate the result." },
				},
				required: ["result"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "use_mcp_tool",
			description: "Uses a tool provided by a connected MCP server.",
			parameters: {
				type: "object",
				properties: {
					server_name: { type: "string", description: "The name of the MCP server." },
					tool_name: { type: "string", description: "The name of the tool to execute." },
					arguments: { type: "object", description: "JSON object containing the tool's input parameters." },
				},
				required: ["server_name", "tool_name", "arguments"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "access_mcp_resource",
			description: "Accesses a resource provided by a connected MCP server.",
			parameters: {
				type: "object",
				properties: {
					server_name: { type: "string", description: "The name of the MCP server." },
					uri: { type: "string", description: "The URI identifying the specific resource." },
				},
				required: ["server_name", "uri"],
			},
		},
	},
]

export class OpenAiHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private client: OpenAI

	constructor(options: ApiHandlerOptions) {
		this.options = options
		// Azure API shape slightly differs from the core API shape: https://github.com/openai/openai-node?tab=readme-ov-file#microsoft-azure-openai
		// Use azureApiVersion to determine if this is an Azure endpoint, since the URL may not always contain 'azure.com'
		if (this.options.azureApiVersion || this.options.openAiBaseUrl?.toLowerCase().includes("azure.com")) {
			this.client = new AzureOpenAI({
				baseURL: this.options.openAiBaseUrl,
				apiKey: this.options.openAiApiKey,
				apiVersion: this.options.azureApiVersion || azureOpenAiDefaultApiVersion,
			})
		} else {
			this.client = new OpenAI({
				baseURL: this.options.openAiBaseUrl,
				apiKey: this.options.openAiApiKey,
			})
		}
	}

	// Implement the capability flag
	supportsNativeFunctionCalling(): boolean {
		return true // OpenAI supports native tool calling
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const modelId = this.options.openAiModelId ?? ""
		const isDeepseekReasoner = modelId.includes("deepseek-reasoner")
		const isR1FormatRequired = this.options.openAiModelInfo?.isR1FormatRequired ?? false
		const isO3Mini = modelId.includes("o3-mini")

		let openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]
		let temperature: number | undefined = this.options.openAiModelInfo?.temperature ?? openAiModelInfoSaneDefaults.temperature
		let maxTokens: number | undefined

		if (this.options.openAiModelInfo?.maxTokens && this.options.openAiModelInfo.maxTokens > 0) {
			maxTokens = Number(this.options.openAiModelInfo.maxTokens)
		} else {
			maxTokens = undefined
		}

		if (isDeepseekReasoner || isR1FormatRequired) {
			openAiMessages = convertToR1Format([{ role: "user", content: systemPrompt }, ...messages])
		}

		// Create params object to safely add optional properties
		const params: any = {
			model: modelId,
			messages: openAiMessages,
			temperature,
			max_tokens: maxTokens,
			tools: openAiTools, // Pass defined tool schemas
			tool_choice: "auto", // Let the model decide when to call tools
			stream: true,
			stream_options: { include_usage: true },
		}

		if (isO3Mini) {
			params.messages = [{ role: "developer", content: systemPrompt }, ...convertToOpenAiMessages(messages)]
			params.temperature = undefined // does not support temperature

			// Add reasoning_effort if available
			if (this.options.o3MiniReasoningEffort) {
				params.reasoning_effort = this.options.o3MiniReasoningEffort
			} else {
				params.reasoning_effort = "medium"
			}
		}

		const stream = await this.client.chat.completions.create(params)

		for await (const chunk of params.stream) {
			const delta = chunk.choices[0]?.delta

			// Check for tool calls in the delta
			if (delta?.tool_calls && delta.tool_calls.length > 0) {
				// Accumulate tool calls if they are chunked
				// For simplicity here, assume full tool calls arrive in one delta chunk.
				// A more robust implementation would handle partial tool call chunks if the API sends them.

				// Transform OpenAI tool calls to the standardized FunctionCall format
				const transformedCalls: FunctionCall[] = delta.tool_calls.flatMap((tc: ChatCompletionMessageToolCall) => {
					// Ensure function name and arguments exist
					if (tc.function?.name && tc.function?.arguments) {
						const name = tc.function.name
						const argsString = tc.function.arguments
						let args = {}
						try {
							// Attempt to parse the arguments string
							args = JSON.parse(argsString)
						} catch (e) {
							console.error(`[OpenAiHandler] Failed to parse tool arguments JSON: ${argsString}`, e)
							return [] // Skip this tool call if arguments are not valid JSON
						}
						// Return the transformed call in the expected format
						return [{ name, args }]
					}
					// Skip this tool call if essential parts are missing
					return []
				})

				// Only yield if there are valid transformed calls
				if (transformedCalls.length > 0) {
					console.log(`[OpenAiHandler] Yielding function_calls chunk:`, transformedCalls)
					yield { type: "function_calls", calls: transformedCalls } // Use standardized type and format
					continue // Skip processing text/reasoning if tool calls are present
				}
			}

			// Process text content if no tool calls
			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}

			if (delta && "reasoning_content" in delta && delta.reasoning_content) {
				yield {
					type: "reasoning",
					reasoning: (delta.reasoning_content as string | undefined) || "",
				}
			}

			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
				}
			}
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.openAiModelId ?? "",
			info: this.options.openAiModelInfo ?? openAiModelInfoSaneDefaults,
		}
	}
}
