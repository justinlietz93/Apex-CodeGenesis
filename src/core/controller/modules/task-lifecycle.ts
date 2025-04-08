import * as vscode from 'vscode'; // Keep only one import
import { Task } from '../../task'; // Adjust path as necessary
// Removed duplicate vscode import
import { Controller } from '../index'; // Import Controller type
import { buildApiHandler } from '../../../api'; // Adjust path
import { getAllExtensionState, getGlobalState } from '../../storage/state'; // Adjust path, remove updateTaskHistory, add getGlobalState
import { postMessageToWebview as postMessageToWebviewUtil } from './webview-handler'; // Adjust path
import { postStateToWebview } from './state-updater'; // Import postStateToWebview
import { telemetryService } from '../../../services/telemetry/TelemetryService'; // Adjust path
import { HistoryItem } from '../../../shared/HistoryItem'; // Correct path and type name
// Removed unused ImageContent import
import { ApiConfiguration } from '../../../shared/api'; // Import ApiConfiguration type
import { AutoApprovalSettings } from '../../../shared/AutoApprovalSettings'; // Import AutoApprovalSettings type
import { BrowserSettings } from '../../../shared/BrowserSettings'; // Import BrowserSettings type
import { ChatSettings } from '../../../shared/ChatSettings'; // Import ChatSettings type

/**
 * Initializes a new task based on user input text and optional images.
 * @param controller The main controller instance.
 * @param text The initial prompt text.
 * @param images Optional array of image URLs/paths.
 */
export async function initApexWithTask(controller: Controller, text?: string, images?: string[]) { // Changed type to string[]
    console.log("[TaskLifecycle] Initializing new task...");
    await clearTask(controller); // Ensure any existing task is cleared first

    // Fetch state components individually as needed by Task constructor
    // Fetch planActSeparateModelsSetting as well
    const { apiConfiguration, autoApprovalSettings, browserSettings, chatSettings, planActSeparateModelsSetting } = await getAllExtensionState(controller.context);
    // Use the correct GlobalStateKey "customInstructions"
    const customInstructionsSetting = await getGlobalState(controller.context, 'justinlietz93.apex.customInstructions') as string | undefined;

    // No conversion needed, images is already string[]
    // const imageStrings = images?.map(img => img.content).filter((content): content is string => typeof content === 'string'); // Removed conversion

    controller.task = new Task(
        controller,
        apiConfiguration!, // Add non-null assertion if confident it exists
        autoApprovalSettings,
        browserSettings,
        chatSettings,
        planActSeparateModelsSetting, // Pass the fetched setting
        customInstructionsSetting, // Pass fetched custom instructions
        text, // Pass text as task goal
        images // Pass images directly as string[]
        // historyItem is undefined for new task
    );

    // Initialization happens within the constructor now
    // await controller.task.initialize(); // Removed
    console.log("[TaskLifecycle] Task constructor called.");
    // Need to wait for async constructor parts if subsequent actions depend on full initialization
    // For now, assume sending message can happen shortly after constructor call.

    // Send initial message if text is provided
    if (text || (images && images.length > 0)) {
        console.log("[TaskLifecycle] Sending initial message to task.");
        await postMessageToWebviewUtil(controller.webviewProviderRef, {
            type: "invoke",
            invoke: "sendMessage",
            text: text || "", // Ensure text is at least an empty string
            images: images, // Pass original ImageContent array here
        });
    } else {
        console.log("[TaskLifecycle] No initial message text provided, task ready.");
        // If no initial text, just update the state to show the new task UI
        await postStateToWebview(controller); // Use imported function
    }
    // Use correct telemetry method
    telemetryService.captureTaskCreated(controller.task.taskId, chatSettings.mode);
}

/**
 * Initializes a task based on a selected history item.
 * @param controller The main controller instance.
 * @param historyItem The history item to load.
 */
export async function initApexWithHistoryItem(controller: Controller, historyItem: HistoryItem) { // Corrected type
    console.log(`[TaskLifecycle] Initializing task from history: ${historyItem.id}`); // Use historyItem.id
    await clearTask(controller);

    // Fetch state components individually
    // Fetch planActSeparateModelsSetting as well
    const { apiConfiguration, autoApprovalSettings, browserSettings, chatSettings, planActSeparateModelsSetting } = await getAllExtensionState(controller.context);
    // Use the correct GlobalStateKey "customInstructions"
    const customInstructionsSetting = await getGlobalState(controller.context, 'justinlietz93.apex.customInstructions') as string | undefined;

    controller.task = new Task(
        controller,
        apiConfiguration!, // Add non-null assertion if confident it exists
        autoApprovalSettings,
        browserSettings,
        chatSettings,
        planActSeparateModelsSetting, // Pass the fetched setting
        customInstructionsSetting,
        undefined, // No new task text
        undefined, // No new images
        historyItem // Pass history item
    );

    // Initialization happens within the constructor now
    // await controller.task.initialize(); // Removed
    console.log("[TaskLifecycle] Task constructor called from history.");
    // Wait for async parts if needed, then update webview
    await postStateToWebview(controller); // Use imported function
    // Use correct telemetry method
    telemetryService.captureTaskRestarted(controller.task.taskId, chatSettings.mode);
}

/**
 * Clears the current task and its associated resources.
 * @param controller The main controller instance.
 */
export async function clearTask(controller: Controller) {
    if (controller.task) {
        const taskId = controller.task.taskId; // Store taskId before clearing
        console.log(`[TaskLifecycle] Clearing task: ${taskId}`);
        // Remove second argument from telemetry call
        telemetryService.captureTaskCompleted(taskId); // Assumed method name: captureTaskCompleted
        await controller.task.abortTask(); // Use abortTask for cleanup
        controller.task = undefined;
        console.log(`[TaskLifecycle] Task ${taskId} cleared.`);
    } else {
        console.log("[TaskLifecycle] No active task to clear.");
    }
    // No state update here, usually called before creating a new task or closing.
}

/**
 * Cancels the current task execution, preserving its state for potential restart or viewing.
 * @param controller The main controller instance.
 */
export async function cancelTask(controller: Controller) {
    if (controller.task) {
        const taskId = controller.task.taskId;
        console.log(`[TaskLifecycle] Cancelling task: ${taskId}`);
        // Remove second argument from telemetry call
        telemetryService.captureTaskCompleted(taskId); // Assumed method name: captureTaskCompleted

        try {
            // 1. Save the current state (method returns void)
            // TODO: Verify return type of saveApexMessagesAndUpdateHistory in state-manager.ts - Assuming void for now.
            await controller.task.stateManager.saveApexMessagesAndUpdateHistory();

            // Fetch the latest history item from global state *after* saving
            const taskHistory = await getGlobalState(controller.context, 'justinlietz93.apex.taskHistory') as HistoryItem[] | undefined;
            const latestHistoryItem = taskHistory?.find(item => item.id === taskId);

            // 2. Abort the task (performs cleanup)
            await controller.task.abortTask();
            controller.task = undefined; // Dereference the aborted task

            // 3. Re-initialize the task from the fetched history item
            if (latestHistoryItem) {
                console.log(`[TaskLifecycle] Re-initializing task ${taskId} from cancelled state.`);
                await initApexWithHistoryItem(controller, latestHistoryItem);
                // initApexWithHistoryItem already calls postStateToWebview
                console.log(`[TaskLifecycle] Task ${taskId} cancellation and re-initialization complete.`);
            } else {
                // This case means saving worked but fetching the item immediately after failed, or it wasn't saved correctly.
                console.error(`[TaskLifecycle] Failed to retrieve history item ${taskId} after saving state. Clearing fully.`);
                await postStateToWebview(controller); // Use imported function
            }
        } catch (error) {
             console.error(`[TaskLifecycle] Error during task cancellation for ${taskId}:`, error);
             // Attempt to clear task fully as a fallback
             await clearTask(controller);
             await postStateToWebview(controller); // Use imported function
        }
    } else {
        console.log("[TaskLifecycle] No active task to cancel.");
    }
}
