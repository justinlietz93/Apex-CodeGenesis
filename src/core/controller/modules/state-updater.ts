import * as vscode from 'vscode';
import * as os from 'os'; // Import os module for platform detection
import { Controller } from '../index'; // Import Controller type
import { getAllExtensionState, getGlobalState, updateGlobalState } from '../../storage/state'; // Adjust path
import { postMessageToWebview as postMessageToWebviewUtil } from './webview-handler'; // Adjust path
import { telemetryService } from '../../../services/telemetry/TelemetryService'; // Adjust path
import { ExtensionState, Platform, DEFAULT_PLATFORM } from '../../../shared/ExtensionMessage'; // Adjust path
import { TelemetrySetting } from '../../../shared/TelemetrySetting'; // Adjust path
import { version as extensionVersion } from '../../../../package.json'; // Import version from package.json

/**
 * Gathers the current extension state to be sent to the webview.
 * @param controller The main controller instance.
 * @returns The current extension state.
 */
export async function getStateToPostToWebview(controller: Controller): Promise<ExtensionState> {
    const {
        apiConfiguration,
        autoApprovalSettings,
        browserSettings,
        chatSettings,
        customInstructions,
        lastShownAnnouncementId,
        mcpMarketplaceEnabled,
        planActSeparateModelsSetting,
        taskHistory,
        telemetrySetting,
        userInfo,
    } = await getAllExtensionState(controller.context);

    const platform: Platform = os.platform() as Platform || DEFAULT_PLATFORM;
    const shouldShowAnnouncement = lastShownAnnouncementId !== controller.latestAnnouncementId;
    const vscMachineId = vscode.env.machineId; // Correct property name
    const uriScheme = vscode.env.uriScheme;

    // Access task-specific state if a task exists
    const apexMessages = controller.task?.stateManager.apexMessages ?? [];
    // Find the current task item from the full history list
    const currentTaskItem = taskHistory?.find(item => item.id === controller.task?.taskId);
    const checkpointTrackerErrorMessage = controller.task?.checkpointManager.checkpointTrackerErrorMessage; // Assuming checkpointManager holds this

    return {
        apiConfiguration,
        autoApprovalSettings,
        browserSettings,
        chatSettings,
        checkpointTrackerErrorMessage,
        apexMessages, // Use task's messages if available
        currentTaskItem, // Use task's history item if available
        customInstructions,
        mcpMarketplaceEnabled,
        planActSeparateModelsSetting,
        platform,
        shouldShowAnnouncement,
        taskHistory: taskHistory || [], // Default to empty array if undefined
        telemetrySetting,
        uriScheme,
        userInfo,
        version: extensionVersion,
        vscMachineId,
    };
}

/**
 * Posts the current extension state to the webview.
 * @param controller The main controller instance.
 */
export async function postStateToWebview(controller: Controller): Promise<void> {
    try {
        const state = await getStateToPostToWebview(controller);
        await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "state", state });
    } catch (error) {
        console.error("[StateUpdater] Error getting or posting state:", error);
        // Optionally inform the user or log more details
    }
}

/**
 * Updates the telemetry setting in global state and informs the telemetry service.
 * @param controller The main controller instance.
 * @param setting The new telemetry setting.
 */
export async function updateTelemetrySetting(controller: Controller, setting: TelemetrySetting): Promise<void> {
    await updateGlobalState(controller.context, "justinlietz93.apex.telemetrySetting", setting);
    telemetryService.updateTelemetryState(setting === "enabled");
    console.log(`[StateUpdater] Telemetry setting updated to: ${setting}`);
}

/**
 * Updates the custom instructions setting in global state and potentially the active task.
 * @param controller The main controller instance.
 * @param instructions The new custom instructions.
 */
export async function updateCustomInstructions(controller: Controller, instructions?: string): Promise<void> {
    await updateGlobalState(controller.context, "justinlietz93.apex.customInstructions", instructions);
    if (controller.task) {
        controller.task.customInstructions = instructions; // Update active task instance
    }
    console.log("[StateUpdater] Custom instructions updated.");
}
