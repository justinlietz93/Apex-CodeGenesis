import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
// Import necessary types for OpenAI/DeepSeek tool calling
import { ChatCompletionTool } from "openai/resources/chat/completions";
// Import FunctionCall type for standardized stream chunk
import { FunctionCall } from "@google/generative-ai";
import { withRetry } from "../retry"
import { ApiHandler } from "../"
import { ApiHandlerOptions, DeepSeekModelId, ModelInfo, deepSeekDefaultModelId, deepSeekModels } from "../../shared/api"
import { calculateApiCostOpenAI } from "../../utils/cost"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { convertToR1Format } from "../transform/r1-format"

// Define Tool Schemas (OpenAI format, compatible with DeepSeek)
const deepSeekTools: ChatCompletionTool[] = [
	{ type: "function", function: { name: "read_file", description: "Reads the content of a file at the specified path relative to the workspace root.", parameters: { type: "object", properties: { path: { type: "string", description: "The relative path to the file within the workspace." } }, required: ["path"] } } },
	{ type: "function", function: { name: "list_files", description: "Lists files and directories within the specified path relative to the workspace root.", parameters: { type: "object", properties: { path: { type: "string", description: "The relative path to the directory. Defaults to '.'." }, recursive: { type: "boolean", description: "List recursively? Defaults to false if omitted." } }, required: ["path"] } } },
	{ type: "function", function: { name: "execute_command", description: "Executes a shell command.", parameters: { type: "object", properties: { command: { type: "string", description: "The command line command to execute." }, requires_approval: { type: "boolean", description: "Set to true if the command requires explicit user approval (e.g., installs, file deletions). Defaults to false." } }, required: ["command"] } } },
	{ type: "function", function: { name: "write_to_file", description: "Writes content to a file at the specified path relative to the workspace root. Overwrites if exists, creates if not.", parameters: { type: "object", properties: { path: { type: "string", description: "The relative path to the file." }, content: { type: "string", description: "The complete content to write." } }, required: ["path", "content"] } } },
	{ type: "function", function: { name: "replace_in_file", description: "Replaces sections of content in an existing file using SEARCH/REPLACE blocks.", parameters: { type: "object", properties: { path: { type: "string", description: "The relative path to the file." }, diff: { type: "string", description: "One or more SEARCH/REPLACE blocks defining exact changes." } }, required: ["path", "diff"] } } },
	{ type: "function", function: { name: "search_files", description: "Performs a regex search across files in a specified directory relative to the workspace root.", parameters: { type: "object", properties: { path: { type: "string", description: "The relative path to the directory to search." }, regex: { type: "string", description: "The Rust regex pattern to search for." }, file_pattern: { type: "string", description: "Optional glob pattern to filter files (e.g., '*.ts')." } }, required: ["path", "regex"] } } },
	{ type: "function", function: { name: "list_code_definition_names", description: "Lists definition names (classes, functions, etc.) in source code files at the top level of the specified directory relative to the workspace root.", parameters: { type: "object", properties: { path: { type: "string", description: "The relative path to the directory." } }, required: ["path"] } } },
	{ type: "function", function: { name: "ask_followup_question", description: "Asks the user a question to gather additional information needed to complete the task.", parameters: { type: "object", properties: { question: { type: "string", description: "The question to ask the user." }, options: { type: "array", items: { type: "string" }, description: "Optional array of 2-5 options for the user to choose from." } }, required: ["question"] } } },
	{ type: "function", function: { name: "plan_mode_respond", description: "Responds to the user's inquiry in PLAN MODE to discuss and refine the task plan.", parameters: { type: "object", properties: { response: { type: "string", description: "The response to provide to the user." }, options: { type: "array", items: { type: "string" }, description: "Optional array of 2-5 options for the user to choose from." } }, required: ["response"] } } },
	{ type: "function", function: { name: "attempt_completion", description: "Presents the final result of the task to the user after confirming previous steps were successful.", parameters: { type: "object", properties: { result: { type: "string", description: "The final result description." }, command: { type: "string", description: "Optional CLI command to demonstrate the result." } }, required: ["result"] } } },
	{ type: "function", function: { name: "use_mcp_tool", description: "Uses a tool provided by a connected MCP server.", parameters: { type: "object", properties: { server_name: { type: "string", description: "The name of the MCP server." }, tool_name: { type: "string", description: "The name of the tool to execute." }, arguments: { type: "object", description: "JSON object containing the tool's input parameters." } }, required: ["server_name", "tool_name", "arguments"] } } },
	{ type: "function", function: { name: "access_mcp_resource", description: "Accesses a resource provided by a connected MCP server.", parameters: { type: "object", properties: { server_name: { type: "string", description: "The name of the MCP server." }, uri: { type: "string", description: "The URI identifying the specific resource." } }, required: ["server_name", "uri"] } } }
];


export class DeepSeekHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private client: OpenAI

	constructor(options: ApiHandlerOptions) {
		this.options = options
		this.client = new OpenAI({
			baseURL: "https://api.deepseek.com/v1",
			apiKey: this.options.deepSeekApiKey,
		})
	}

	// Implement the capability flag
	supportsNativeFunctionCalling(): boolean {
		// DeepSeek API docs confirm OpenAI-compatible function calling support.
		return true;
	}

	private async *yieldUsage(info: ModelInfo, usage: OpenAI.Completions.CompletionUsage | undefined): ApiStream {
		// Deepseek reports total input AND cache reads/writes,
		// see context caching: https://api-docs.deepseek.com/guides/kv_cache)
		// where the input tokens is the sum of the cache hits/misses, just like OpenAI.
		// This affects:
		// 1) context management truncation algorithm, and
		// 2) cost calculation

		// Deepseek usage includes extra fields.
		// Safely cast the prompt token details section to the appropriate structure.
		interface DeepSeekUsage extends OpenAI.CompletionUsage {
			prompt_cache_hit_tokens?: number
			prompt_cache_miss_tokens?: number
		}
		const deepUsage = usage as DeepSeekUsage

		const inputTokens = deepUsage?.prompt_tokens || 0
		const outputTokens = deepUsage?.completion_tokens || 0
		const cacheReadTokens = deepUsage?.prompt_cache_hit_tokens || 0
		const cacheWriteTokens = deepUsage?.prompt_cache_miss_tokens || 0
		const totalCost = calculateApiCostOpenAI(info, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens)
		yield {
			type: "usage",
			inputTokens: inputTokens,
			outputTokens: outputTokens,
			cacheWriteTokens: cacheWriteTokens,
			cacheReadTokens: cacheReadTokens,
			totalCost: totalCost,
		}
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const model = this.getModel()

		const isDeepseekReasoner = model.id.includes("deepseek-reasoner")

		let openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		if (isDeepseekReasoner) {
			openAiMessages = convertToR1Format([{ role: "user", content: systemPrompt }, ...messages])
		}

		const stream = await this.client.chat.completions.create({
			model: model.id,
			max_completion_tokens: model.info.maxTokens,
			messages: openAiMessages,
			stream: true,
			stream_options: { include_usage: true },
			// Only set temperature for non-reasoner models
			...(model.id === "deepseek-reasoner" ? {} : { temperature: 0 }),
			// Add tools parameter for function calling
			tools: deepSeekTools,
			tool_choice: "auto",
		})

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta;

			// Check for tool calls first
			if (delta?.tool_calls && delta.tool_calls.length > 0) {
				// Transform DeepSeek/OpenAI tool calls to the standardized FunctionCall format
				const transformedCalls: FunctionCall[] = delta.tool_calls.flatMap(tc => {
					if (tc.function?.name && tc.function?.arguments) {
						const name = tc.function.name;
						const argsString = tc.function.arguments;
						let args = {};
						try {
							args = JSON.parse(argsString);
						} catch (e) {
							console.error(`[DeepSeekHandler] Failed to parse tool arguments JSON: ${argsString}`, e);
							return []; // Skip invalid calls
						}
						return [{ name, args }];
					}
					return []; // Skip incomplete calls
				});

				if (transformedCalls.length > 0) {
					console.log(`[DeepSeekHandler] Yielding function_calls chunk:`, transformedCalls);
					yield { type: 'function_calls', calls: transformedCalls };
					continue; // Prioritize tool calls over text in the same chunk if both exist
				}
			}

			// Process text content if no tool calls were processed in this chunk
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
				yield* this.yieldUsage(model.info, chunk.usage)
			}
		}
	}

	getModel(): { id: DeepSeekModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId
		if (modelId && modelId in deepSeekModels) {
			const id = modelId as DeepSeekModelId
			return { id, info: deepSeekModels[id] }
		}
		return {
			id: deepSeekDefaultModelId,
			info: deepSeekModels[deepSeekDefaultModelId],
		}
	}
}
