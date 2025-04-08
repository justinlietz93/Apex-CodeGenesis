import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../../index"; // Corrected path
import { FunctionCall, FunctionResponsePart } from "@google/generative-ai"; // Assuming Gemini types
// Import specific content types needed
// Remove FunctionCallsContent as it's not defined in assistant-message
import { AssistantMessageContent, ToolUse, TextContent, ToolUseName, toolUseNames } from "../../../assistant-message"; // Corrected path
import { StreamProcessingResult } from "./api-stream-handler"; // Path seems correct relative to api_handler
import { telemetryService } from "../../../../services/telemetry/TelemetryService"; // Corrected path

// Define types used within this module
type UserContent = Array<Anthropic.ContentBlockParam>;
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

// Define a type for native tool results expected by the API (adjust per provider if needed)
// Note: This NativeToolResult type might need refinement based on how different providers structure their function/tool results history messages.
type NativeToolResult = {
    role: 'function' | 'tool'; // Role might differ (e.g., 'tool' for OpenAI)
    parts: FunctionResponsePart[]; // Using Gemini's type for now
    // Or for Anthropic: content: Array<Anthropic.ToolResultBlockParam>;
};

// Define the output structure for this processor
export type ToolProcessingOutput = {
    executedTool: boolean;
    // Represents the message to be added to history OR sent as the next user message
    nextMessageContent: Anthropic.MessageParam | null;
    // Flag indicating if the next step is a direct continuation (native) or requires a user message (XML)
    continueDirectly: boolean;
};

export class ApiToolProcessor {
    private task: Task;

    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

    // Processes the results from the stream handler and handles tool execution logic
    async processAndExecuteTools(
        streamResult: StreamProcessingResult,
        usedNativeToolsThisTurn: boolean
    ): Promise<ToolProcessingOutput> {

        let executedTool = false;
        let nextMessageContent: Anthropic.MessageParam | null = null;
        let continueDirectly = false;

        // Get the final assistant message blocks parsed by the UI stream processor (for XML path)
        const finalAssistantBlocksFromStreamProcessor = this.task.streamProcessor.assistantMessageContent;

        // --- Path 1: Process Accumulated Native Function Calls ---
        if (streamResult.accumulatedNativeCalls.length > 0 && usedNativeToolsThisTurn) {
            console.log(`[ApiToolProcessor] Processing ${streamResult.accumulatedNativeCalls.length} native tool calls.`);
            const nativeToolResultParts: FunctionResponsePart[] = []; // Using Gemini type

            // Add the assistant's request message (containing the calls) to history
            // Represent native calls as tool_use blocks in history for consistency? Or handle separately?
            // Let's represent them as tool_use for now in history, similar to formatAssistantContentForHistory logic.
            const nativeCallBlocksForHistory: ToolUse[] = streamResult.accumulatedNativeCalls.map((call, index) => ({
                type: 'tool_use',
                id: `func_${Date.now()}_${index}`, // Generate ID
                name: call.name as ToolUseName, // Assume name is valid for now, might need validation
                params: call.args || {},
                partial: false,
            }));
            const assistantNativeCallMessage: Anthropic.MessageParam = {
                role: "assistant",
                // Use Anthropic's expected format directly
                content: nativeCallBlocksForHistory.map(b => ({ type: 'tool_use', id: b.id!, name: b.name, input: b.params }))
            };
            await this.task.stateManager.addToApiConversationHistory(assistantNativeCallMessage);
            telemetryService.captureConversationTurnEvent(this.task.taskId, this.task.apiProvider, this.task.api.getModel().id, "assistant");


            for (const call of streamResult.accumulatedNativeCalls) {
                // Validate call.name before using it
                const toolName = call.name as ToolUseName;
                if (!toolUseNames.includes(toolName)) {
                    console.error(`[ApiToolProcessor] Invalid native tool name received: ${call.name}. Skipping.`);
                    nativeToolResultParts.push({
                        functionResponse: { name: call.name, response: { content: `[Tool Error]: Invalid tool name '${call.name}'` } },
                    });
                    continue;
                }
                try {
                    const result: ToolResponse = await this.task.toolExecutor.executeToolByName(toolName, call.args);
                    const responseContent = typeof result === 'string' ? result : JSON.stringify(result);
                    nativeToolResultParts.push({
                        functionResponse: { name: toolName, response: { content: responseContent } },
                    });
                    executedTool = true;
                } catch (error: any) {
                    console.error(`[ApiToolProcessor] Error executing native tool ${call.name}:`, error);
                    nativeToolResultParts.push({
                        functionResponse: { name: call.name, response: { content: `[Tool Error]: ${error.message}` } },
                    });
                }
            }

            // Map results to Anthropic ToolResultBlockParam for history
            const toolResultBlocks: Anthropic.ToolResultBlockParam[] = nativeToolResultParts.map((part, index) => {
                 const correspondingCall = streamResult.accumulatedNativeCalls[index];
                 const toolUseId = `func_${Date.now()}_${index}`; // Generate temporary ID as Gemini doesn't provide one
                 // Access content safely, checking for existence and type
                 // Explicitly check if response exists and has a content property
                 const responseObj = part.functionResponse?.response;
                 const responseContent = (responseObj && typeof responseObj === 'object' && 'content' in responseObj) ? responseObj.content : undefined;
                 const isError = typeof responseContent === 'string' && responseContent.startsWith('[Tool Error]');
                 // Ensure content is Array<TextBlockParam>
                 const contentBlock: Anthropic.TextBlockParam[] = typeof responseContent === 'string'
                     ? [{ type: 'text', text: responseContent }]
                     : [{ type: 'text', text: "[Tool Error]: Invalid or missing response content" }]; // Provide default error text
                 return {
                     type: 'tool_result',
                     tool_use_id: toolUseId,
                     content: contentBlock,
                     is_error: isError || typeof responseContent !== 'string' // Mark error if not string or starts with error marker
                 };
            });
            // Format for Anthropic history (expects tool results as a user message)
            nextMessageContent = { role: 'user', content: toolResultBlocks };
            continueDirectly = true;

        // --- Path 2: Process Parsed XML Tool Calls ---
        // Add explicit type for 'b'
        } else if (!usedNativeToolsThisTurn && finalAssistantBlocksFromStreamProcessor.some((b: AssistantMessageContent) => b.type === 'tool_use')) {
            console.log("[ApiToolProcessor] Processing XML tool calls.");
            const xmlToolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
            let toolBlockIndex = 0;

            const assistantXmlMessage: Anthropic.MessageParam = {
                role: "assistant",
                content: this.formatAssistantContentForHistory(finalAssistantBlocksFromStreamProcessor),
            };
            await this.task.stateManager.addToApiConversationHistory(assistantXmlMessage);
            telemetryService.captureConversationTurnEvent(this.task.taskId, this.task.apiProvider, this.task.api.getModel().id, "assistant");

            for (const block of finalAssistantBlocksFromStreamProcessor) {
                if (block.type === 'tool_use') {
                    const toolUse = block as ToolUse;
                    const approvalStatus = this.task.streamProcessor.getToolApprovalStatus(toolBlockIndex);
                    const toolUseId = toolUse.id || `toolu_${Date.now()}_${toolBlockIndex}`;

                    if (approvalStatus?.approved) {
                        try {
                            // Use toolUse.params instead of toolUse.input
                            const result: ToolResponse = await this.task.toolExecutor.executeToolByName(toolUse.name, toolUse.params);
                            const resultBlock: Anthropic.ToolResultBlockParam = {
                                type: 'tool_result',
                                tool_use_id: toolUseId,
                                content: typeof result === 'string'
                                    ? [{ type: 'text', text: result || "(No output)" }]
                                    : this.mapToolResponseToContentBlocks(result)
                            };
                            xmlToolResultBlocks.push(resultBlock);
                            executedTool = true;
                        } catch (error: any) {
                            console.error(`[ApiToolProcessor] Error executing XML tool ${toolUse.name}:`, error);
                            const errorBlock: Anthropic.ToolResultBlockParam = {
                                type: 'tool_result', tool_use_id: toolUseId,
                                content: [{ type: 'text', text: `[Tool Error]: ${error.message}` }],
                                is_error: true
                            };
                            xmlToolResultBlocks.push(errorBlock);
                        }
                    } else {
                         const skippedBlock: Anthropic.ToolResultBlockParam = {
                            type: 'tool_result', tool_use_id: toolUseId,
                            content: [{ type: 'text', text: `[Tool Skipped: ${toolUse.name} - ${approvalStatus?.feedback || 'Not approved'}]` }],
                         };
                         xmlToolResultBlocks.push(skippedBlock);
                    }
                    toolBlockIndex++;
                }
            }
            nextMessageContent = { role: 'user', content: xmlToolResultBlocks };
            continueDirectly = false;

        } else {
            // --- Path 3: No Tools Executed ---
            // Add explicit type for 'b'
            const assistantTextContent = finalAssistantBlocksFromStreamProcessor.filter((b: AssistantMessageContent): b is TextContent => b.type === 'text');
            if (assistantTextContent.length > 0) {
                const assistantTextMessage: Anthropic.MessageParam = {
                    role: "assistant",
                    content: this.formatAssistantContentForHistory(assistantTextContent),
                };
                await this.task.stateManager.addToApiConversationHistory(assistantTextMessage);
                telemetryService.captureConversationTurnEvent(this.task.taskId, this.task.apiProvider, this.task.api.getModel().id, "assistant");
            } else if (!streamResult.didReceiveUsageChunk && !streamResult.accumulatedNativeCalls.length) {
                console.warn("[ApiToolProcessor] Received empty response from API without tool calls.");
            }
            executedTool = false;
            nextMessageContent = null;
            continueDirectly = false;
        }

        return {
            executedTool,
            nextMessageContent,
            continueDirectly,
        };
    }

    // Helper to format AssistantMessageContent[] for history
    private formatAssistantContentForHistory(blocks: AssistantMessageContent[]): Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> {
        const historyBlocks: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];
        for (const block of blocks) {
            if (block.type === 'text') {
                historyBlocks.push({ type: 'text', text: block.content ?? "" });
            } else if (block.type === 'tool_use') {
                 const toolUseBlock = block as ToolUse;
                 historyBlocks.push({
                     type: 'tool_use',
                     id: toolUseBlock.id || `toolu_${Date.now()}`,
                      name: toolUseBlock.name,
                      input: toolUseBlock.params || {}, // Use params here as well
                  });
             // Remove the incorrect 'function_calls' branch
             // } else if (block.type === 'function_calls') {
             //      const functionCallsBlock = block as FunctionCallsContent;
             //      (functionCallsBlock.calls as FunctionCall[]).forEach((call, index) => {
             //          historyBlocks.push({
             //              type: 'tool_use',
             //              id: `func_${Date.now()}_${index}`,
             //              name: call.name,
             //              input: call.args || {},
             //          });
             //      });
             }
         }
         if (historyBlocks.length === 0) {
             historyBlocks.push({ type: 'text', text: "(No actionable content generated)" });
        }
        return historyBlocks;
    }

     // Helper to map ToolResponse to Anthropic ContentBlock array
     private mapToolResponseToContentBlocks(result: ToolResponse): Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> {
         if (typeof result === 'string') {
             return [{ type: 'text', text: result || "(No output)" }];
         } else {
             // Add type annotation for the parameter 'b' in the filter callback
             return result.map(resBlock => {
                 if (resBlock.type === 'text') {
                     return { type: 'text', text: resBlock.text };
                 } else if (resBlock.type === 'image' && resBlock.source) {
                     // Use Anthropic.Messages.ImageBlockParam.Source type explicitly
                     const source: Anthropic.Messages.ImageBlockParam.Source = {
                         type: resBlock.source.type,
                         media_type: resBlock.source.media_type,
                         data: resBlock.source.data
                     };
                     return { type: 'image', source: source };
                 }
                 return null; // Should filter out nulls
             }).filter((b): b is Anthropic.TextBlockParam | Anthropic.ImageBlockParam => b !== null);
         }
     }
}
