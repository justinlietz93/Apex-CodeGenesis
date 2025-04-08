import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../index"; 
import { AssistantMessageContent, ToolUseName } from "../../assistant-message"; 
import { formatResponse } from "../../prompts/responses";
import { ApexAsk, ApexMessage } from "../../../shared/ExtensionMessage";
import { showSystemNotification } from "../../../integrations/notifications";
import { fileExistsAtPath } from "../../../utils/fs";
import { telemetryService } from "../../../services/telemetry/TelemetryService";
import { ApexAskResponse } from "../../../shared/WebviewMessage"; // Ensure this is imported
import pWaitFor from "p-wait-for"; // Ensure this is imported

// Define types used within the class if they are not imported globally
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

// Define cwd at the module level
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop");

export class StreamProcessor {
    private task: Task;

    // State for stream processing
    public currentStreamingContentIndex = 0;
    public assistantMessageContent: AssistantMessageContent[] = [];
    public presentAssistantMessageLocked = false;
    public presentAssistantMessageHasPendingUpdates = false;
    public userMessageContentReady = false; // Flag for ApiHandlerModule
    public didRejectTool = false; // Flag if user rejected a tool approval
    // State for tracking tool approval during streaming
    private toolApprovals = new Map<number, { approved: boolean; feedback?: string; images?: string[] }>();

    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

     // Method to reset state for a new stream
     async resetStreamingState(): Promise<void> {
        this.currentStreamingContentIndex = 0;
        this.assistantMessageContent = [];
        this.userMessageContentReady = false;
        this.didRejectTool = false;
        this.toolApprovals.clear();
        this.presentAssistantMessageLocked = false;
        this.presentAssistantMessageHasPendingUpdates = false;
        // Reset diff view provider state if necessary
        await this.task.diffViewProvider.reset(); 
    }

     // Method for ApiHandlerModule to check if ready for next user message
     isUserMessageContentReady(): boolean {
        // This flag will be set by ApiHandlerModule after stream ends and tools (if any) are executed
        return this.userMessageContentReady; 
     }

     // Method for ApiHandlerModule to check if any tool was approved during the stream
     didAnyToolGetApproved(): boolean {
        for (const approval of this.toolApprovals.values()) {
            if (approval.approved) {
                return true;
            }
        }
        return false;
     }

     // Method for ApiHandlerModule to get the approval status for a specific tool block index
     getToolApprovalStatus(blockIndex: number): { approved: boolean; feedback?: string; images?: string[] } | undefined {
         return this.toolApprovals.get(blockIndex);
     }

      // Method for ApiHandlerModule to prepare the "no tools used" response
      prepareNoToolsUsedResponse(): (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] {
        return [{ type: "text", text: formatResponse.noToolsUsed() }];
    }

     // Method for ApiHandlerModule to finalize partial blocks after stream ends
     async finalizePartialBlocks(): Promise<void> {
        const partialBlocks = this.assistantMessageContent.filter((block) => block.partial);
        partialBlocks.forEach((block) => {
            block.partial = false;
        });
        if (partialBlocks.length > 0) {
            // Re-present the now complete blocks to update UI correctly
            // Need to reset index to process them again
            const firstPartialIndex = this.assistantMessageContent.findIndex(b => partialBlocks.includes(b));
            if (firstPartialIndex !== -1) {
                this.currentStreamingContentIndex = firstPartialIndex;
                await this.presentAssistantMessage(); 
            }
        }
     }

     // Method for ApiHandlerModule to process an incoming chunk
     async processChunk(chunk: any): Promise<void> { // Return void as it modifies internal state
         // Basic incremental parsing logic 
         if (chunk.type === 'text' || chunk.type === 'tool_use' || chunk.type === 'reasoning') {
             if (this.assistantMessageContent.length === 0 || !this.assistantMessageContent[this.assistantMessageContent.length - 1].partial) {
                 // Start of a new block
                 this.assistantMessageContent.push({ ...chunk, partial: true });
             } else {
                 // Update existing partial block
                 const lastBlock = this.assistantMessageContent[this.assistantMessageContent.length - 1];
                 if (lastBlock.type === chunk.type) {
                     if (chunk.type === 'text' && lastBlock.type === 'text') {
                         // Ensure content exists before appending
                         lastBlock.content = (lastBlock.content ?? "") + (chunk.text ?? ""); 
                     } else if (chunk.type === 'reasoning' && lastBlock.type === 'reasoning') {
                         // Ensure reasoning exists before appending
                         lastBlock.reasoning = (lastBlock.reasoning ?? "") + (chunk.reasoning ?? ""); 
                     } else if (chunk.type === 'tool_use' && lastBlock.type === 'tool_use') {
                         // Merging partial tool_use chunks might be complex. 
                         // For now, assume tool_use chunks arrive whole or handle updates if needed.
                         // If they arrive partially, update params or name if necessary.
                         // Example: Object.assign(lastBlock.params, chunk.params); 
                         console.warn("Partial tool_use chunk merging might need refinement.");
                     }
                 } else {
                     // Type changed, finalize last block and start new one
                     lastBlock.partial = false;
                     this.assistantMessageContent.push({ ...chunk, partial: true });
                 }
             }
             // Trigger presentation logic for the potentially updated/new block
             const blockIndexToPresent = this.assistantMessageContent.length - 1;
             // Only present if the index is new or updated
             if (blockIndexToPresent >= this.currentStreamingContentIndex) { 
                 await this.presentAssistantMessage();
             }
         }
         // No need to return chunk if ApiHandlerModule doesn't use it directly after this
     }


    // Refactored presentAssistantMessage: Focuses on UI updates and approval flow.
    async presentAssistantMessage() {
        if (this.task.abort) {
            throw new Error("Apex instance aborted");
        }
        if (this.presentAssistantMessageLocked) {
            this.presentAssistantMessageHasPendingUpdates = true;
            return;
        }
        this.presentAssistantMessageLocked = true;
        this.presentAssistantMessageHasPendingUpdates = false;

        try { // Wrap the core logic in try/finally to ensure unlock
            // Loop through all blocks that haven't been fully processed yet
            while (this.currentStreamingContentIndex < this.assistantMessageContent.length) {
                 if (this.task.abort) {throw new Error("Apex instance aborted");} // Check abort inside loop

                const block = this.assistantMessageContent[this.currentStreamingContentIndex];
                const blockIndex = this.currentStreamingContentIndex; // Store index for approval map

                // If a tool was rejected earlier in the stream, skip processing subsequent tool_use blocks
                if (block.type === 'tool_use' && this.didRejectTool) {
                    if (!block.partial) {
                        this.toolApprovals.set(blockIndex, { approved: false, feedback: "Skipped due to prior tool rejection." });
                        this.currentStreamingContentIndex++; // Move to the next block
                        continue; // Skip the rest of the loop for this block
                    } else {
                        // If it's a partial rejected tool block, just wait for the full block
                         break; // Exit the while loop to wait for more chunks
                    }
                }

                switch (block.type) {
                    case "text": {
                        let content = block.content ?? ""; // Use nullish coalescing
                        // Content cleaning logic
                        content = content.replace(/<thinking>\s?/g, "");
                        content = content.replace(/\s?<\/thinking>/g, "");
                        const lastOpenBracketIndex = content.lastIndexOf("<");
                         if (lastOpenBracketIndex !== -1) {
                            const possibleTag = content.slice(lastOpenBracketIndex)
                            const hasCloseBracket = possibleTag.includes(">")
                            if (!hasCloseBracket) {
                                let tagContent: string
                                if (possibleTag.startsWith("</")) {
                                    tagContent = possibleTag.slice(2).trim()
                                } else {
                                    tagContent = possibleTag.slice(1).trim()
                                }
                                const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent)
                                const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</"
                                if (isOpeningOrClosing || isLikelyTagName) {
                                    content = content.slice(0, lastOpenBracketIndex).trim()
                                }
                            }
                        }
                         if (!block.partial) {
                            const match = content?.trimEnd().match(/```[a-zA-Z0-9_-]+$/)
                            if (match) {
                                const matchLength = match[0].length
                                content = content.trimEnd().slice(0, -matchLength)
                            }
                        }
                        await this.task.webviewCommunicator.say("text", content, undefined, block.partial);
                        break;
                    }
                    case "tool_use": {
                        // Helper to ask for approval and store the result
                        const askApprovalAndStoreResult = async (type: ApexAsk, message?: string) => {
                            // Ensure ask method signature matches WebviewCommunicator
                            const { response, text, images } = await this.task.webviewCommunicator.ask(type, message, undefined); 
                            const approved = response === "yesButtonClicked";
                            this.toolApprovals.set(blockIndex, { approved, feedback: text, images }); // Use blockIndex
                            if (!approved) {
                                this.didRejectTool = true; // Set rejection flag
                                if (text || images?.length) {
                                    await this.task.webviewCommunicator.say("user_feedback", text, images);
                                }
                            } else {
                                 if (text || images?.length) {
                                    await this.task.webviewCommunicator.say("user_feedback", text, images);
                                }
                            }
                        };

                         const showNotificationForApprovalIfAutoApprovalEnabled = (message: string) => {
                            if (this.task.autoApprovalSettings.enabled && this.task.autoApprovalSettings.enableNotifications) {
                                showSystemNotification({ subtitle: "Approval Required", message });
                            }
                        };

                        // --- Tool Approval Logic (Execution Removed) ---
                        let requiresApproval = true;
                        let autoApproved = false;
                        let messageToShow = "";

                        // Ensure block.name is a valid ToolUseName before using it
                        const toolName = block.name as ToolUseName; 
                        const shouldAutoApprove = this.task.toolExecutor.shouldAutoApproveTool(toolName);

                        // Prepare message content for display/approval
                         if (toolName === "write_to_file" || toolName === "replace_in_file") {
                             const relPath = block.params.path;
                             if (!relPath) {
                                 this.task.apiHandlerModule.consecutiveMistakeCount++;
                                 this.toolApprovals.set(blockIndex, { approved: false, feedback: `Missing required parameter 'path' for tool ${toolName}` });
                                 await this.task.webviewCommunicator.say("error", `Missing required parameter 'path' for tool ${toolName}.`);
                                 await this.task.diffViewProvider.reset(); // Reset diff view on error
                                 break; // Break from switch case
                             }
                             const fileExists = await fileExistsAtPath(path.resolve(cwd, relPath));
                             messageToShow = `Apex wants to ${fileExists ? "edit" : "create"} ${path.basename(relPath)}`;
                             requiresApproval = !shouldAutoApprove;
                         } else if (toolName === "execute_command") {
                             const requiresApprovalParam = block.params.requires_approval?.toLowerCase() === 'true';
                             messageToShow = `Apex wants to execute command: ${block.params.command}`;
                             requiresApproval = requiresApprovalParam || !shouldAutoApprove;
                         } else if (toolName === "read_file" || toolName === "list_files" || toolName === "list_code_definition_names" || toolName === "search_files") {
                              const relPath = block.params.path;
                              if (!relPath) {
                                  this.task.apiHandlerModule.consecutiveMistakeCount++;
                                  this.toolApprovals.set(blockIndex, { approved: false, feedback: `Missing required parameter 'path' for tool ${toolName}` });
                                  await this.task.webviewCommunicator.say("error", `Missing required parameter 'path' for tool ${toolName}.`);
                                  break; // Break from switch case
                              }
                              messageToShow = `Apex wants to use ${toolName} on ${path.basename(relPath)}`;
                              requiresApproval = !shouldAutoApprove;
                          }
                         else {
                             messageToShow = `Apex wants to use the tool: ${toolName}`;
                             requiresApproval = !shouldAutoApprove;
                         }

                        // Handle partial display
                        if (block.partial) {
                             const partialDisplayData = { tool: toolName, ...block.params };
                             const partialMsgStr = JSON.stringify(partialDisplayData);
                             if (requiresApproval) {
                                 // Use 'tool' as ApexAsk type
                                 await this.task.webviewCommunicator.ask("tool", partialMsgStr, true).catch(() => {}); 
                             } else {
                                 // Use 'tool' as ApexSay type
                                 await this.task.webviewCommunicator.say("tool", partialMsgStr, undefined, true); 
                             }
                             // Don't advance index, wait for the full block
                             this.presentAssistantMessageLocked = false; // Unlock to allow next chunk processing
                             return; // Exit function to wait for more chunks
                        }

                        // Full block received, proceed with approval flow
                        const completeDisplayData = { tool: toolName, ...block.params };
                        const completeMsgStr = JSON.stringify(completeDisplayData);

                        if (requiresApproval) {
                            showNotificationForApprovalIfAutoApprovalEnabled(messageToShow);
                             // Use 'tool' as ApexAsk type
                            await askApprovalAndStoreResult("tool", completeMsgStr); // Stores result in toolApprovals
                        } else {
                            this.toolApprovals.set(blockIndex, { approved: true }); // Store auto-approval
                             // Use 'tool' as ApexSay type
                            await this.task.webviewCommunicator.say("tool", completeMsgStr, undefined, false); 
                            this.task.apiHandlerModule.consecutiveAutoApprovedRequestsCount++;
                            autoApproved = true;
                            telemetryService.captureToolUsage(this.task.taskId, toolName, true, true);
                        }

                        // Check stored approval status for telemetry and diff revert
                        const approvalResult = this.toolApprovals.get(blockIndex); // Get approval status
                        if (approvalResult) { // Check if approval status exists
                            if (approvalResult.approved) {
                                if (!autoApproved) {
                                    telemetryService.captureToolUsage(this.task.taskId, toolName, false, true);
                                }
                                // EXECUTION LOGIC IS HANDLED POST-STREAM BY ApiHandlerModule using ToolExecutor
                            } else {
                                // Tool was not approved (either denied or skipped)
                                telemetryService.captureToolUsage(this.task.taskId, toolName, requiresApproval ? false : true, false);
                                // Revert diff view if a file edit tool was denied
                                if (toolName === "write_to_file" || toolName === "replace_in_file") {
                                    await this.task.diffViewProvider.revertChanges();
                                    await this.task.diffViewProvider.reset();
                                }
                            }
                        }
                        break; // End of tool_use case
                    }
                    // Handle reasoning blocks for UI update
                    case "reasoning": {
                        await this.task.webviewCommunicator.say("reasoning", block.reasoning, undefined, block.partial);
                        break;
                    }
                } // End of switch

                // Advance index only if the block is complete or a tool was rejected
                if (!block.partial || this.didRejectTool) {
                    this.currentStreamingContentIndex++;
                } else {
                    // If the block is still partial and no tool rejection occurred,
                    // break the loop to wait for more chunks for this block.
                    break; 
                }
            } // End of while loop

        } finally {
             this.presentAssistantMessageLocked = false; // Ensure unlock
             // Process pending updates if any occurred while locked
             if (this.presentAssistantMessageHasPendingUpdates) {
                 // Use setTimeout to avoid potential infinite recursion if updates trigger immediately
                 setTimeout(() => this.presentAssistantMessage(), 0);
             // Removed incorrect check for this.task.apiHandlerModule.didCompleteReadingStream
             // The loop controller should set userMessageContentReady when appropriate.
             // } else if (this.currentStreamingContentIndex >= this.assistantMessageContent.length) {
             //     // If all currently received blocks are processed, we might be ready,
             //     // but the loop controller makes the final decision.
             //     // this.userMessageContentReady = true; // Moved to loop-controller logic
             }
        }
    }
}
