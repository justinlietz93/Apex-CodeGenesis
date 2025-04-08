import { FunctionCall } from "@google/generative-ai"; // Import FunctionCall type

export type ApiStream = AsyncGenerator<ApiStreamChunk>
export type ApiStreamChunk =
	| ApiStreamTextChunk
	| ApiStreamReasoningChunk
	| ApiStreamUsageChunk
	| ApiStreamFunctionCallsChunk // Add function calls
	| ApiStreamErrorChunk // Add error

export interface ApiStreamTextChunk {
	type: "text"
	text: string
}

export interface ApiStreamReasoningChunk {
	type: "reasoning"
	reasoning: string
}

export interface ApiStreamUsageChunk {
	type: "usage"
	inputTokens: number
	outputTokens: number
	cacheWriteTokens?: number
	cacheReadTokens?: number
	totalCost?: number
}

// New chunk type for function calls
export interface ApiStreamFunctionCallsChunk {
	type: "function_calls"
	calls: FunctionCall[] // Use the type from the SDK
}

// New chunk type for errors during streaming
export interface ApiStreamErrorChunk {
	type: "error"
	error: string
}
