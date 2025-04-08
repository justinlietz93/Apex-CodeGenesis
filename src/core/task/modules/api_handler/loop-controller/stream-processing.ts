import { Anthropic } from "@anthropic-ai/sdk";
import { FunctionCall } from "@google/generative-ai";
import { Task } from "../../../index"; // Adjust path
import { ApexApiReqCancelReason } from "../../../../../shared/ExtensionMessage"; // Adjust path
import { calculateApiCostAnthropic } from "../../../../../utils/cost"; // Adjust path
import { formatAssistantContentForHistory, formatErrorWithStatusCode } from "../helpers"; // Adjust path
import { attemptApiRequest } from "../api-request"; // Adjust path
import { telemetryService } from "../../../../../services/telemetry/TelemetryService"; // Adjust path
import { postStateToWebview } from "../../../../controller/modules/state-updater"; // Adjust path
import { getTaskWithId } from "../../../../controller/modules/history-manager"; // Adjust path
import { initApexWithHistoryItem } from "../../../../controller/modules/task-lifecycle"; // Adjust path

// Define UserContent type locally
type UserContent = Array<Anthropic.ContentBlockParam>;

// Define return type for the stream processing function
export interface StreamProcessingResult {
    streamError: Error | null;
    accumulatedNativeCalls: FunctionCall[];
    didReceiveUsageChunk: boolean;
    inputTokens: number;
    outputTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
    totalCost?: number;
}

/**
 * Processes the API stream, handles stream events, errors, and updates metrics.
 */
export async function processApiStream(
    task: Task,
    previousApiReqIndex: number,
    didAutomaticallyRetryFailedApiRequest: boolean,
    setDidAutomaticallyRetryFailedApiRequest: (value: boolean) => void,
    initialUserContentForPersona: UserContent | null,
    lastApiReqIndex: number // Index of the 'api_req_started' message
): Promise<StreamProcessingResult> {

    let accumulatedNativeCalls: FunctionCall[] = [];
    let streamError: Error | null = null;
    let didReceiveUsageChunk = false;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheWriteTokens = 0;
    let cacheReadTokens = 0;
    let totalCost: number | undefined;
    const supportsNativeTools = task.api.supportsNativeFunctionCalling();

    // Helper to update the API request message in the log
    const updateApiReqMsg = async (cancelReason?: ApexApiReqCancelReason, streamingFailedMessage?: string) => {
        await task.stateManager.updateApiReqCompletionTime(lastApiReqIndex, {
            inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens,
            cost: totalCost ?? calculateApiCostAnthropic(task.api.getModel().info, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens),
            cancelReason, streamingFailedMessage,
        });
    };

    // Helper to handle stream abortion (user cancel, error, etc.)
    const abortStream = async (cancelReason: ApexApiReqCancelReason, streamingFailedMessage?: string) => {
        if (task.diffViewProvider.isEditing) {
            await task.diffViewProvider.revertChanges();
        }
        await task.stateManager.finalizePartialMessageOnAbort();
        const finalAssistantBlocks = task.streamProcessor.assistantMessageContent;
        const abortMessageContent = formatAssistantContentForHistory(finalAssistantBlocks);
        const abortReasonText: Anthropic.TextBlock = { type: 'text', text: `\n\n[${cancelReason === "streaming_failed" ? "Response interrupted by API Error" : "Response interrupted by user"}]`, citations: null };

        if (abortMessageContent.length > 0 && abortMessageContent[abortMessageContent.length - 1].type === 'text') {
             (abortMessageContent[abortMessageContent.length - 1] as Anthropic.TextBlock).text += abortReasonText.text;
        } else {
            abortMessageContent.push(abortReasonText);
        }

        if (abortMessageContent.length > 0 && abortMessageContent.some(b => (b.type === 'text' && b.text.trim() !== abortReasonText.text.trim()) || b.type !== 'text')) {
             const assistantHistoryMessage: Anthropic.MessageParam = { role: "assistant", content: abortMessageContent };
             await task.stateManager.addToApiConversationHistory(assistantHistoryMessage);
             telemetryService.captureConversationTurnEvent(task.taskId, task.apiProvider, task.api.getModel().id, "assistant");
        }
        await updateApiReqMsg(cancelReason, streamingFailedMessage);
    };

    // --- Main Stream Processing Loop ---
    try {
        await task.streamProcessor.resetStreamingState();
        const stream = attemptApiRequest(
            task,
            previousApiReqIndex,
            didAutomaticallyRetryFailedApiRequest,
            setDidAutomaticallyRetryFailedApiRequest,
            initialUserContentForPersona
        );
        didReceiveUsageChunk = false;
        accumulatedNativeCalls = [];

        try { // Inner try for the stream consumption loop
            for await (const chunk of stream) {
                if (!chunk) {continue;}
                if (chunk.type === 'function_calls' && supportsNativeTools) {
                   const functionCallsChunk = chunk as any;
                   const calls = Array.isArray(functionCallsChunk.calls) ? functionCallsChunk.calls as FunctionCall[] : undefined;
                   if (calls) {accumulatedNativeCalls.push(...calls);}
                   continue;
                 }
                await task.streamProcessor.processChunk(chunk);
                if (chunk.type === 'usage') {
                    didReceiveUsageChunk = true;
                    inputTokens += chunk.inputTokens ?? 0;
                    outputTokens += chunk.outputTokens ?? 0;
                    cacheWriteTokens += chunk.cacheWriteTokens ?? 0;
                    cacheReadTokens += chunk.cacheReadTokens ?? 0;
                    totalCost = chunk.totalCost;
                }
                // Check for abort signals
                if (task.abort) { if (!task.abandoned) {await abortStream("user_cancelled");} streamError = new Error("User cancelled"); break; }
                if (task.streamProcessor.didRejectTool) { streamError = new Error("User rejected tool"); break; }
            }
        } catch (error: any) {
            streamError = error; // Capture stream errors
        } finally {
            await task.streamProcessor.finalizePartialBlocks();
            // Determine final cancel reason based on streamError or tool rejection
            const finalCancelReason = streamError
                ? (streamError.message === "User cancelled" || streamError.message === "User rejected tool" ? "user_cancelled" : "streaming_failed")
                : (task.streamProcessor.didRejectTool ? "user_cancelled" : undefined);
            // Update the API request message with final metrics and status
            await updateApiReqMsg(finalCancelReason, streamError?.message);
            // Update the webview state
            const controllerForStateUpdate = task.controllerRef.deref();
            if (controllerForStateUpdate) {await postStateToWebview(controllerForStateUpdate);}
        }

        // Handle non-cancellation stream errors after the loop
        if (streamError && streamError.message !== "User cancelled" && streamError.message !== "User rejected tool") {
            if (!task.abandoned) {
                task.abortTask(); // Abort the task on unrecoverable stream errors
                const errorMessage = formatErrorWithStatusCode(streamError);
                await abortStream("streaming_failed", errorMessage); // Ensure history/UI reflect the error
                // Attempt to reload history view if possible
                const controllerForHistory = task.controllerRef.deref();
                if (controllerForHistory) {
                    const history = await getTaskWithId(controllerForHistory, task.taskId);
                    if (history) {await initApexWithHistoryItem(controllerForHistory, history);}
                }
            }
            // Propagate the error out if needed, or just log it
            console.error("[StreamProcessing] Unrecoverable stream error:", streamError);
        }

    } catch (outerError: any) {
        // Catch errors from attemptApiRequest itself (e.g., initial connection issues)
        console.error("[StreamProcessing] Error during API request setup/attempt:", outerError);
        streamError = outerError; // Store the error
        // Ensure UI/state reflects failure
        await updateApiReqMsg("streaming_failed", outerError.message);
        if (!task.abandoned) {
            task.webviewCommunicator.say("error", `API Request Failed: ${outerError.message}`);
            task.abortTask();
        }
    }

    // Return the results of the stream processing
    return {
        streamError,
        accumulatedNativeCalls,
        didReceiveUsageChunk,
        inputTokens,
        outputTokens,
        cacheWriteTokens,
        cacheReadTokens,
        totalCost
    };
}
