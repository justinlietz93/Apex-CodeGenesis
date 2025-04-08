import { Anthropic } from "@anthropic-ai/sdk";
import getFolderSize from "get-folder-size"; // Added get-folder-size import
import { Task } from "../index"; // Import Task type
import { ApexMessage, ApexApiReqInfo, ApexApiReqCancelReason } from "../../../shared/ExtensionMessage"; // Import Apex types
import {
    ensureTaskDirectoryExists,
    getSavedApiConversationHistory,
    getSavedApexMessages,
    saveApiConversationHistory,
    saveApexMessages,
} from "../../storage/disk";
import { getApiMetrics } from "../../../shared/getApiMetrics";
import { combineApiRequests } from "../../../shared/combineApiRequests";
import { combineCommandSequences } from "../../../shared/combineCommandSequences";
import { findLastIndex } from "../../../shared/array";
import { HistoryItem } from "../../../shared/HistoryItem"; // Import HistoryItem if needed for updateTaskHistory
import { formatContentBlockToMarkdown } from "../../../integrations/misc/export-markdown"; // Added import
// Import necessary function from controller module
import { updateTaskHistory } from "../../controller/modules/history-manager"; // Corrected path

// Define UserContent type
type UserContent = Array<Anthropic.ContentBlockParam>;

export class StateManager {
    private task: Task;

    // State properties managed by this module
    public apiConversationHistory: Anthropic.MessageParam[] = [];
    public apexMessages: ApexMessage[] = [];
    public conversationHistoryDeletedRange?: [number, number];
    public didEditFile: boolean = false; // Added didEditFile property
    public currentActivePersonaName: string | null = null; // Added for dynamic persona
    public currentActivePersonaContent: string | null = null; // Added for dynamic persona
    public totalTaskTokens: number = 0; // Added for Step 5.7.5

    constructor(taskInstance: Task) {
        this.task = taskInstance;
        // Initialize state properties based on the Task instance passed
        // Note: History loading happens in resumeTaskFromHistory -> loadStateFromHistory
        this.apiConversationHistory = []; // Start empty, load if resuming
        this.apexMessages = []; // Start empty, load if resuming
        // Copy initial range from Task constructor if provided via historyItem
        this.conversationHistoryDeletedRange = taskInstance.conversationHistoryDeletedRange;
    }

    // Method to reset state for a new task
    async resetStateForNewTask(): Promise<void> {
        this.apiConversationHistory = [];
        this.apexMessages = [];
        this.conversationHistoryDeletedRange = undefined;
        this.didEditFile = false; // Reset on new task
        this.currentActivePersonaName = null; // Reset on new task
        this.currentActivePersonaContent = null; // Reset on new task
        this.totalTaskTokens = 0; // Reset on new task
        // Persist the reset state? Or assume it's handled by overwriting on first save?
        // For safety, maybe clear saved files too, but requires context access.
        // await saveApiConversationHistory(this.task.getContext(), this.task.taskId, []);
        // await saveApexMessages(this.task.getContext(), this.task.taskId, []);
    }

     // Method to load state when resuming from history
     async loadStateFromHistory(): Promise<void> {
        const context = this.task.getContext(); // Get context via task
        const taskId = this.task.taskId; // Get taskId via task

        const loadedMessages = await getSavedApexMessages(context, taskId);
        // Remove resume messages
        const lastRelevantMessageIndex = findLastIndex(
            loadedMessages,
            (m: ApexMessage) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"),
        );
        if (lastRelevantMessageIndex !== -1) {
            loadedMessages.splice(lastRelevantMessageIndex + 1);
        }
         // Remove incomplete API requests
         const lastApiReqStartedIndex = findLastIndex(
            loadedMessages,
            (m: ApexMessage) => m.type === "say" && m.say === "api_req_started",
        );
        if (lastApiReqStartedIndex !== -1) {
            const lastApiReqStarted = loadedMessages[lastApiReqStartedIndex];
            // Ensure text exists and is valid JSON before parsing
             let apiInfo: Partial<ApexApiReqInfo> = {};
             try {
                 apiInfo = JSON.parse(lastApiReqStarted.text || "{}");
             } catch (e) {
                 console.error("Failed to parse API info JSON:", lastApiReqStarted.text, e);
             }
            const { cost, cancelReason } = apiInfo;
            if (cost === undefined && cancelReason === undefined) {
                loadedMessages.splice(lastApiReqStartedIndex, 1);
            }
        }

        this.apexMessages = loadedMessages;
        this.apiConversationHistory = await getSavedApiConversationHistory(context, taskId);
        // conversationHistoryDeletedRange should be loaded in Task constructor from historyItem
        this.conversationHistoryDeletedRange = this.task.conversationHistoryDeletedRange; // Ensure it's loaded from Task instance
    }

    // Method to restore history state to a specific message index
    async restoreHistoryToMessage(messageIndex: number, message: ApexMessage): Promise<void> {
        this.conversationHistoryDeletedRange = message.conversationHistoryDeletedRange;
        const newConversationHistory = this.apiConversationHistory.slice(
            0,
            (message.conversationHistoryIndex || 0) + 2, // +1 user, +1 assistant, +1 slice exclusive -> +2? Verify logic
        );
        // Overwrite local state first
        this.apiConversationHistory = newConversationHistory;
        const newApexMessages = this.apexMessages.slice(0, messageIndex + 1);
        this.apexMessages = newApexMessages;

        // Persist changes
        await this.saveApexMessagesAndUpdateHistory();
    }

     // Method to set the deleted range (used by ApiHandlerModule)
     async setConversationHistoryDeletedRange(range: [number, number] | undefined): Promise<void> {
        this.conversationHistoryDeletedRange = range;
        await this.saveApexMessagesAndUpdateHistory(); // Persist the change
    }

     // Method to finalize partial message on abort (used by ApiHandlerModule)
     async finalizePartialMessageOnAbort(): Promise<void> {
        const lastMessage = this.apexMessages.at(-1);
        if (lastMessage && lastMessage.partial) {
            lastMessage.partial = false;
            // Save is needed here to persist the non-partial state
            await this.saveApexMessagesAndUpdateHistory();
        }
    }

     // Method to remove the last message (used by WebviewCommunicator)
     async removeLastMessage(): Promise<void> {
        if (this.apexMessages.length > 0) {
            this.apexMessages.pop();
            await this.saveApexMessagesAndUpdateHistory(); // Persist the change
        }
    }

    // Method to update API request start time message (used by ApiHandlerModule)
    async updateApiReqStartTime(index: number, userContent: UserContent): Promise<void> {
         if (index >= 0 && index < this.apexMessages.length && this.apexMessages[index].say === "api_req_started") {
            this.apexMessages[index].text = JSON.stringify({
                // Add explicit type for block
                request: userContent.map((block: Anthropic.ContentBlockParam) => formatContentBlockToMarkdown(block)).join("\n\n"),
            } satisfies Partial<ApexApiReqInfo>); // Use Partial as other fields aren't known yet
            await this.saveApexMessagesAndUpdateHistory(); // Persist change
         }
    }

     // Method to update API request completion time message (used by ApiHandlerModule)
     // Accept the full metrics object matching ApexApiReqInfo structure (excluding request potentially)
     async updateApiReqCompletionTime(index: number, metrics: Partial<Omit<ApexApiReqInfo, 'request' | 'cancelReason'>> & { cancelReason?: ApexApiReqCancelReason } & { inputTokens?: number; outputTokens?: number; cacheWriteTokens?: number; cacheReadTokens?: number; cost?: number }): Promise<void> { // Adjusted type to include ApexApiReqCancelReason correctly
        // Accumulate tokens for task limit check (Step 5.7.5)
        this.totalTaskTokens += (metrics.inputTokens || 0) + (metrics.outputTokens || 0);

        if (index >= 0 && index < this.apexMessages.length && this.apexMessages[index].say === "api_req_started") {
             let existingData: Partial<ApexApiReqInfo> = {};
             try {
                 existingData = JSON.parse(this.apexMessages[index].text || "{}");
             } catch (e) {
                 console.error("Failed to parse existing API info JSON:", this.apexMessages[index].text, e);
             }
            this.apexMessages[index].text = JSON.stringify({
                ...existingData, // Keep the original request text if present
                ...metrics, // Add completion metrics
            } satisfies ApexApiReqInfo); // Ensure the final object matches the full type
            await this.saveApexMessagesAndUpdateHistory(); // Persist change
        }
    }


    public async addToApiConversationHistory(message: Anthropic.MessageParam) {
        this.apiConversationHistory.push(message);
        // Access context and taskId via this.task
        await saveApiConversationHistory(this.task.getContext(), this.task.taskId, this.apiConversationHistory);
    }

    public async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]) {
        this.apiConversationHistory = newHistory;
         // Access context and taskId via this.task
        await saveApiConversationHistory(this.task.getContext(), this.task.taskId, this.apiConversationHistory);
    }

    public async addToApexMessages(message: ApexMessage) { // Renamed method
        message.conversationHistoryIndex = this.apiConversationHistory.length - 1;
        message.conversationHistoryDeletedRange = this.conversationHistoryDeletedRange;
        this.apexMessages.push(message);
        await this.saveApexMessagesAndUpdateHistory();
    }

    public async overwriteApexMessages(newMessages: ApexMessage[]) { // Renamed method
        this.apexMessages = newMessages;
        await this.saveApexMessagesAndUpdateHistory();
    }

    public async saveApexMessagesAndUpdateHistory() { // Renamed method
        try {
             // Access context and taskId via this.task
            await saveApexMessages(this.task.getContext(), this.task.taskId, this.apexMessages); // Use renamed storage function

            const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.apexMessages.slice(1))));
            const taskMessage = this.apexMessages[0]; // Ensure apexMessages is not empty
             if (!taskMessage) {
                 console.warn("Cannot update history: apexMessages is empty.");
                 return;
             }
            const lastRelevantMessage =
                this.apexMessages[
                    findLastIndex(this.apexMessages, (m: ApexMessage) => !(m.ask === "resume_task" || m.ask === "resume_completed_task")) // Add explicit type
                ];
             if (!lastRelevantMessage) {
                 console.warn("Cannot update history: No relevant message found.");
                 return;
             }
             // Access context and taskId via this.task
            const taskDir = await ensureTaskDirectoryExists(this.task.getContext(), this.task.taskId);
            let taskDirSize = 0;
            try {
                taskDirSize = await getFolderSize.loose(taskDir);
            } catch (error) {
                console.error("Failed to get task directory size:", taskDir, error);
            }
             // Access controllerRef and checkpointManager via this.task
            const controllerForHistoryUpdate = this.task.controllerRef.deref();
            if (controllerForHistoryUpdate) {
                await updateTaskHistory(controllerForHistoryUpdate, { // Use imported function
                    id: this.task.taskId,
                    ts: lastRelevantMessage.ts,
                    task: taskMessage.text ?? "",
                    tokensIn: apiMetrics.totalTokensIn,
                    tokensOut: apiMetrics.totalTokensOut,
                    cacheWrites: apiMetrics.totalCacheWrites,
                    cacheReads: apiMetrics.totalCacheReads,
                    totalCost: apiMetrics.totalCost,
                    size: taskDirSize,
                    // Access checkpointManager via task
                    shadowGitConfigWorkTree: await this.task.checkpointManager?.checkpointTracker?.getShadowGitConfigWorkTree(),
                    conversationHistoryDeletedRange: this.conversationHistoryDeletedRange,
                } as HistoryItem); // Cast to HistoryItem type
            }
        } catch (error) {
            console.error("Failed to save apex messages:", error);
            // Removed duplicated block from here
        }
    }
}
