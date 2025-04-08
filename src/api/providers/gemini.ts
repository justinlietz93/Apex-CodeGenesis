import { Anthropic } from "@anthropic-ai/sdk";
// Import necessary types from Gemini SDK
import { GoogleGenerativeAI, FunctionDeclaration, Part, FunctionCall, SchemaType } from "@google/generative-ai";
import { withRetry } from "../retry";
import { ApiHandler } from "../";
import { ApiHandlerOptions, geminiDefaultModelId, GeminiModelId, geminiModels, ModelInfo } from "../../shared/api";
import { convertAnthropicMessageToGemini } from "../transform/gemini-format";
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"; // Import usage chunk type

// Define Tool Schemas for Gemini Function Calling
const functionDeclarations: FunctionDeclaration[] = [
	{
		name: "read_file",
		description: "Reads the content of a file at the specified path relative to the workspace root.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				path: { type: SchemaType.STRING, description: "The relative path to the file within the workspace." }
			},
			required: ["path"]
		}
	},
	{
		name: "list_files",
		description: "Lists files and directories within the specified path relative to the workspace root.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				path: { type: SchemaType.STRING, description: "The relative path to the directory. Defaults to '.'." },
				recursive: { type: SchemaType.BOOLEAN, description: "List recursively? Defaults to false if omitted." }
			},
			required: ["path"]
		}
	},
	{
		name: "execute_command",
		description: "Executes a shell command.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				command: { type: SchemaType.STRING, description: "The command line command to execute." },
				requires_approval: { type: SchemaType.BOOLEAN, description: "Set to true if the command requires explicit user approval (e.g., installs, file deletions). Defaults to false." }
			},
			required: ["command"]
		}
	},
	{
		name: "write_to_file",
		description: "Writes content to a file at the specified path relative to the workspace root. Overwrites if exists, creates if not.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				path: { type: SchemaType.STRING, description: "The relative path to the file." },
				content: { type: SchemaType.STRING, description: "The complete content to write." }
			},
			required: ["path", "content"]
		}
	},
	{
		name: "replace_in_file",
		description: "Replaces sections of content in an existing file using SEARCH/REPLACE blocks.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				path: { type: SchemaType.STRING, description: "The relative path to the file." },
				diff: { type: SchemaType.STRING, description: "One or more SEARCH/REPLACE blocks defining exact changes." }
			},
			required: ["path", "diff"]
		}
	},
	{
		name: "search_files",
		description: "Performs a regex search across files in a specified directory relative to the workspace root.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				path: { type: SchemaType.STRING, description: "The relative path to the directory to search." },
				regex: { type: SchemaType.STRING, description: "The Rust regex pattern to search for." },
				file_pattern: { type: SchemaType.STRING, description: "Optional glob pattern to filter files (e.g., '*.ts')." }
			},
			required: ["path", "regex"]
		}
	},
	{
		name: "list_code_definition_names",
		description: "Lists definition names (classes, functions, etc.) in source code files at the top level of the specified directory relative to the workspace root.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				path: { type: SchemaType.STRING, description: "The relative path to the directory." }
			},
			required: ["path"]
		}
	},
	{
		name: "ask_followup_question",
		description: "Asks the user a question to gather additional information needed to complete the task.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				question: { type: SchemaType.STRING, description: "The question to ask the user." },
				options: {
					type: SchemaType.ARRAY,
					items: { type: SchemaType.STRING },
					description: "Optional array of 2-5 options for the user to choose from."
				}
			},
			required: ["question"]
		}
	},
	{
		name: "plan_mode_respond",
		description: "Responds to the user's inquiry in PLAN MODE to discuss and refine the task plan.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				response: { type: SchemaType.STRING, description: "The response to provide to the user." },
				options: {
					type: SchemaType.ARRAY,
					items: { type: SchemaType.STRING },
					description: "Optional array of 2-5 options for the user to choose from."
				}
			},
			required: ["response"]
		}
	},
	{
		name: "attempt_completion",
		description: "Presents the final result of the task to the user after confirming previous steps were successful.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				result: { type: SchemaType.STRING, description: "The final result description." },
				command: { type: SchemaType.STRING, description: "Optional CLI command to demonstrate the result." }
			},
			required: ["result"]
		}
	},
	{
		name: "use_mcp_tool",
		description: "Uses a tool provided by a connected MCP server.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				server_name: { type: SchemaType.STRING, description: "The name of the MCP server." },
				tool_name: { type: SchemaType.STRING, description: "The name of the tool to execute." },
				arguments: { type: SchemaType.OBJECT, description: "JSON object containing the tool's input parameters." } // Note: Gemini might require a more specific schema here if possible, but OBJECT is a fallback.
			},
			required: ["server_name", "tool_name", "arguments"]
		}
	},
	{
		name: "access_mcp_resource",
		description: "Accesses a resource provided by a connected MCP server.",
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				server_name: { type: SchemaType.STRING, description: "The name of the MCP server." },
				uri: { type: SchemaType.STRING, description: "The URI identifying the specific resource." }
			},
			required: ["server_name", "uri"]
		}
	}
];

export class GeminiHandler implements ApiHandler {
	private options: ApiHandlerOptions;
	private client: GoogleGenerativeAI;
	private usage: ApiStreamUsageChunk | undefined; // To store usage data

	constructor(options: ApiHandlerOptions) {
		if (!options.geminiApiKey) {
			throw new Error("API key is required for Google Gemini")
		}
		this.options = options
		this.client = new GoogleGenerativeAI(options.geminiApiKey);
	}

	// Implement the capability flag
	supportsNativeFunctionCalling(): boolean {
		return true;
	}

	@withRetry()
	// Modify createMessage to accept tools and handle function calls
	async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		// tools parameter is now implicitly handled by functionDeclarations defined above for Gemini
		// toolChoice parameter is handled via toolConfig below
	): ApiStream {
		this.usage = undefined; // Reset usage for new request
		const modelId = this.getModel().id;
		const model = this.client.getGenerativeModel({
			model: modelId,
			systemInstruction: systemPrompt ? { role: 'user', parts: [{ text: systemPrompt }] } : undefined,
			tools: [{ functionDeclarations }], // Pass defined tool schemas
			generationConfig: {
				// maxOutputTokens: this.getModel().info.maxTokens, // Consider setting based on model info
				temperature: 0, // Low temperature for tool use consistency
			},
			// toolConfig: { // Optional: Force tool use if needed, default is AUTO
			// 	functionCallingConfig: { mode: "AUTO" }
			// }
		});

		const geminiMessages = messages.map(convertAnthropicMessageToGemini);

		// Add handling for function responses if they are in the history
		const contents = geminiMessages.map(msg => {
			if (msg.role === 'user' && msg.parts.some(part => 'functionResponse' in part)) {
				// If the user message contains function responses, format them correctly for Gemini
				return {
					role: 'function', // Gemini expects 'function' role for results
					parts: msg.parts.filter(part => 'functionResponse' in part) as Part[] // Ensure only functionResponse parts are included
				};
			}
			return msg;
		});


		console.log(`[GeminiHandler] Sending request to ${modelId}. Contents length: ${contents.length}`);
		const result = await model.generateContentStream({ contents });
		console.log('[GeminiHandler] Received response stream.');

		// Process Stream, yielding standardized chunks including function calls
		for await (const chunk of result.stream) {
			try {
				// Check for function calls first
				const functionCalls = chunk.functionCalls();
				if (functionCalls && functionCalls.length > 0) {
					console.log(`[GeminiHandler] Yielding function_calls chunk:`, functionCalls);
					yield { type: 'function_calls', calls: functionCalls }; // Remove 'as any'
					// Typically, text content might be empty or irrelevant when function calls are present
					// If Gemini *can* yield both text and function calls in the same chunk, adjust logic here.
					continue; // Skip processing text if function calls are present in this chunk
				}

				// Process text content if no function calls
				const chunkText = chunk.text();
				if (chunkText) {
					yield { type: 'text', text: chunkText };
				}
			} catch (streamError: any) {
				console.error(`[GeminiHandler] Error processing stream chunk: ${streamError.message}`, streamError);
				yield { type: 'error', error: `Error processing stream: ${streamError.message}` }; // Remove 'as any'
				return; // Stop processing on stream error
			}
		}
		console.log('[GeminiHandler] Finished processing stream.');

		// Store usage data after stream completion
		try {
			const response = await result.response;
			this.usage = {
				type: "usage",
				inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
				outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
			};
			yield this.usage; // Yield final usage
		} catch (usageError: any) {
			console.error(`[GeminiHandler] Error getting usage metadata: ${usageError.message}`, usageError);
			// Don't yield usage if it fails, but log the error
		}
	}

	// Implement getApiStreamUsage to return stored usage
	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		return this.usage;
	}

	getModel(): { id: GeminiModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId
		if (modelId && modelId in geminiModels) {
			const id = modelId as GeminiModelId
			return { id, info: geminiModels[id] }
		}
		return {
			id: geminiDefaultModelId,
			info: geminiModels[geminiDefaultModelId],
		}
	}
}
