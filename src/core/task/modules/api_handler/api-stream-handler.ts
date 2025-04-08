import * as vscode from "vscode";
import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../../index"; // Path seems correct relative to api_handler
import { ApiStream, ApiStreamChunk } from "../../../../api/transform/stream"; // Re-corrected path
import { OpenRouterHandler } from "../../../../api/providers/openrouter"; // Re-corrected path
import { AnthropicHandler } from "../../../../api/providers/anthropic"; // Re-corrected path
import { checkIsOpenRouterContextWindowError, checkIsAnthropicContextWindowError } from "../../../context-management/context-error-handling"; // Re-corrected path again
import { ApexApiReqCancelReason, ApexMessage } from "../../../../shared/ExtensionMessage"; // Path seems correct relative to api_handler
import { calculateApiCostAnthropic } from "../../../../utils/cost"; // Path seems correct relative to api_handler
import { telemetryService } from "../../../../services/telemetry/TelemetryService"; // Path seems correct relative to api_handler
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import { FunctionCall } from "@google/generative-ai"; // Assuming Gemini types
import { findLastIndex } from "../../../../shared/array"; // Corrected path
// Import the request builder type
import { ApiRequestBuilder } from "./api-request-builder"; // Assuming this path is correct
import { postStateToWebview } from "../../../controller/modules/state-updater"; // Import the function

// Define types used within this module
type ApiRequestParameters = {
    systemPrompt: string;
    truncatedHistory: Anthropic.Messages.MessageParam[];
    toolsParam: any; // Define more specific type if possible
    toolChoiceParam: any;
    supportsNativeTools: boolean;
};

// Define the structure expected for the result of processing the stream
export type StreamProcessingResult = {
    success: boolean;
    assistantMessageText: string; // Accumulated text for XML fallback
    accumulatedNativeCalls: FunctionCall[];
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
    totalCost?: number;
    streamError: Error | null;
    didReceiveUsageChunk: boolean;
};

export class ApiStreamHandler {
    private task: Task;
    public isWaitingForFirstChunk = false;
    public didAutomaticallyRetryFailedApiRequest = false; // Track retry state

    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

    private formatErrorWithStatusCode(error: any): string {
        const statusCode = error.status || error.statusCode || (error.response && error.response.status);
        const message = error.message ?? JSON.stringify(error, null, 2);
        return statusCode && !message.includes(statusCode.toString()) ? `${statusCode} - ${message}` : message;
    }

    // Renamed from attemptApiRequest to reflect its stream-handling focus
    private async *executeApiStream(params: ApiRequestParameters): ApiStream {
        // Reset retry flag for each new stream attempt
        this.didAutomaticallyRetryFailedApiRequest = false;

        let stream = this.task.api.createMessage(
            params.systemPrompt,
            params.truncatedHistory,
            params.toolsParam,
            params.toolChoiceParam
        );

        const iterator = stream[Symbol.asyncIterator]();

        try {
            this.isWaitingForFirstChunk = true;
            const firstChunk = await iterator.next();
             this.isWaitingForFirstChunk = false; // Moved after await
            if (firstChunk.done) {
                throw new Error("API stream ended unexpectedly after first chunk.");
            }
            yield firstChunk.value;
        } catch (error: any) {
            // Handle first chunk error and potential retry
            // The retry logic is primarily handled in api-request.ts's attemptApiRequest.
            // If an error reaches here during the first chunk read, it likely wasn't handled by the initial retry.
            // Re-throwing the error allows higher-level handlers or the main loop to manage it.
            console.error("[ApiStreamHandler] Error during first chunk read:", error);
            // We could call handleFirstChunkError to potentially ask the user, but let's re-throw for now.
            // const shouldRetry = await this.handleFirstChunkError(error);
            // if (shouldRetry) {
                 // Cannot prepare new params here as ApiRequestBuilder doesn't exist on Task.
                 // Re-throwing allows the main loop in api-request.ts to potentially retry.
            //     console.warn("[ApiStreamHandler] First chunk error occurred, but retry cannot be initiated from here. Re-throwing.");
            // }
            throw error; // Re-throw the error to be caught by the caller (processStream)
        }

        // Yield remaining chunks
        yield* iterator;
    }

     // Extracted error handling logic for the first chunk
     private async handleFirstChunkError(error: any): Promise<boolean> {
        const isOpenRouter = this.task.api instanceof OpenRouterHandler;
        const isAnthropic = this.task.api instanceof AnthropicHandler;
        const isOpenRouterContextWindowError = checkIsOpenRouterContextWindowError(error) && isOpenRouter;
        const isAnthropicContextWindowError = checkIsAnthropicContextWindowError(error) && isAnthropic;

        if ((isAnthropic && isAnthropicContextWindowError) || (isOpenRouter && isOpenRouterContextWindowError)) {
            if (!this.didAutomaticallyRetryFailedApiRequest) {
                const newRange = this.task.contextManager.getNextTruncationRange(
                    this.task.stateManager.apiConversationHistory,
                    this.task.stateManager.conversationHistoryDeletedRange,
                    0.25, // Keep 1/4 -> Remove 3/4
                );
                await this.task.stateManager.setConversationHistoryDeletedRange(newRange);
                this.didAutomaticallyRetryFailedApiRequest = true;
                return true; // Indicate retry
            } else {
                 // Already retried for context window, show error to user
                 const truncatedConversationHistory = this.task.contextManager.getTruncatedMessages(
                    this.task.stateManager.apiConversationHistory,
                    this.task.stateManager.conversationHistoryDeletedRange,
                 );
                 if (truncatedConversationHistory.length > 3) { // Avoid error loop on very short history
                     error = new Error("Context window exceeded. Click retry to truncate the conversation and try again.");
                     this.didAutomaticallyRetryFailedApiRequest = false; // Allow manual retry after truncation
                 }
            }
        } else if (isOpenRouter && !this.didAutomaticallyRetryFailedApiRequest) {
            // Generic retry for OpenRouter on first chunk failure
            console.log("First chunk failed (OpenRouter), waiting 1 second before retrying");
            await setTimeoutPromise(1000);
            this.didAutomaticallyRetryFailedApiRequest = true;
            return true; // Indicate retry
        }

        // If not automatically retrying, ask the user
        const errorMessage = this.formatErrorWithStatusCode(error);
        const { response } = await this.task.webviewCommunicator.ask("api_req_failed", errorMessage);

        if (response === "yesButtonClicked") {
            await this.task.webviewCommunicator.say("api_req_retried");
            // Reset auto-retry flag if user manually retries
            this.didAutomaticallyRetryFailedApiRequest = false;
            return true; // Indicate retry
        } else {
            throw new Error("API request failed and user did not retry"); // Throw if user cancels
        }
    }


    // Processes the stream chunks after the first one
    async processStream(params: ApiRequestParameters): Promise<StreamProcessingResult> {
        let assistantMessageText = "";
        let accumulatedNativeCalls: FunctionCall[] = [];
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheWriteTokens = 0;
        let cacheReadTokens = 0;
        let totalCost: number | undefined;
        let streamError: Error | null = null;
        let didReceiveUsageChunk = false;
        const supportsNativeTools = params.supportsNativeTools; // Get from params

        const lastApiReqIndex = findLastIndex(this.task.stateManager.apexMessages, (m: any) => m.say === "api_req_started");

        const updateApiReqMsg = async (cancelReason?: ApexApiReqCancelReason, streamingFailedMessage?: string) => {
             await this.task.stateManager.updateApiReqCompletionTime(lastApiReqIndex, {
                 inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens,
                 cost: totalCost ?? calculateApiCostAnthropic(this.task.api.getModel().info, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens),
                 cancelReason, streamingFailedMessage,
             });
         };

        const abortStream = async (cancelReason: ApexApiReqCancelReason, streamingFailedMessage?: string) => {
            // Logic moved to ApiHandlerModule main loop
            console.log(`[ApiStreamHandler] Abort requested: ${cancelReason}`);
        };


        try {
            await this.task.streamProcessor.resetStreamingState(); // Reset UI processor state
            const stream = this.executeApiStream(params); // Get the stream generator

            for await (const chunk of stream) {
                if (!chunk) {continue;}

                // --- Task 3.3: Hybrid Stream Processing ---
                if (chunk.type === 'function_calls' && supportsNativeTools) {
                    const calls = chunk.calls as FunctionCall[] | undefined;
                    if (calls && Array.isArray(calls)) {
                        accumulatedNativeCalls.push(...calls);
                    }
                    continue; // Skip StreamProcessor for UI for this chunk type
                }

                // Process other chunk types for UI updates
                await this.task.streamProcessor.processChunk(chunk as ApiStreamChunk);

                // Accumulate text for XML parsing fallback
                if (chunk.type === 'text') {
                    assistantMessageText += chunk.text ?? "";
                }

                if (chunk.type === 'usage') {
                    didReceiveUsageChunk = true;
                    inputTokens += chunk.inputTokens ?? 0;
                    outputTokens += chunk.outputTokens ?? 0;
                    cacheWriteTokens += chunk.cacheWriteTokens ?? 0;
                    cacheReadTokens += chunk.cacheReadTokens ?? 0;
                    totalCost = chunk.totalCost;
                }
                // --- End Task 3.3 ---

                if (this.task.abort) {
                    streamError = new Error("User cancelled");
                    break;
                }
                if (this.task.streamProcessor.didRejectTool) {
                    assistantMessageText += "\n\n[Tool execution rejected by user]";
                    streamError = new Error("User rejected tool");
                    break;
                }
            }
        } catch (error: any) {
            streamError = error; // Catch errors from executeApiStream or the loop
        } finally {
            // Finalize UI processor state
            await this.task.streamProcessor.finalizePartialBlocks();
            // Update API request message stats
            await updateApiReqMsg(streamError ? (streamError.message === "User cancelled" || streamError.message === "User rejected tool" ? "user_cancelled" : "streaming_failed") : undefined, streamError?.message);
            const controller = this.task.controllerRef.deref(); // Get controller instance
            if (controller) {await postStateToWebview(controller);} // Use imported function
        }

        return {
            success: !streamError,
            assistantMessageText,
            accumulatedNativeCalls,
            inputTokens,
            outputTokens,
            cacheWriteTokens,
            cacheReadTokens,
            totalCost,
            streamError,
            didReceiveUsageChunk
        };
    }
}
