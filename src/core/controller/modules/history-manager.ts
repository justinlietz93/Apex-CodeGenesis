import * as vscode from 'vscode';
import * as fs from 'fs/promises'; // Use promises API for async file operations
import * as path from 'path';
import getFolderSize from 'get-folder-size';
import { Controller } from '../index'; // Import Controller type
import { getGlobalState, updateGlobalState } from '../../storage/state'; // Adjust path
import { postStateToWebview } from './state-updater'; // Import for state updates
import { initApexWithHistoryItem, clearTask } from './task-lifecycle'; // Import for showing task AND clearTask
import { telemetryService } from '../../../services/telemetry/TelemetryService'; // Adjust path
import { HistoryItem } from '../../../shared/HistoryItem'; // Adjust path
import { ensureTaskDirectoryExists, getSavedApexMessages } from '../../storage/disk'; // Adjust path, remove getTaskDirectoryPath
import { formatContentBlockToMarkdown } from '../../../integrations/misc/export-markdown'; // Import the correct function
import { postMessageToWebview as postMessageToWebviewUtil } from './webview-handler'; // For sending messages
import { ApexMessage } from '../../../shared/ExtensionMessage'; // Import ApexMessage type

/**
 * Retrieves a specific task history item from global state.
 * @param controller The main controller instance.
 * @param taskId The ID of the task to retrieve.
 * @returns The HistoryItem or undefined if not found.
 */
export async function getTaskWithId(controller: Controller, taskId: string): Promise<HistoryItem | undefined> {
    const taskHistoryRaw = await getGlobalState(controller.context, "justinlietz93.apex.taskHistory");
    // Validate that the retrieved state is an array before using array methods
    const taskHistory = Array.isArray(taskHistoryRaw) ? taskHistoryRaw as HistoryItem[] : [];
    return taskHistory.find(item => item.id === taskId);
}

/**
 * Loads and displays a task from history in the webview.
 * @param controller The main controller instance.
 * @param taskId The ID of the task to show.
 */
export async function showTaskWithId(controller: Controller, taskId: string): Promise<void> {
    console.log(`[HistoryManager] Showing task with ID: ${taskId}`);
    const historyItem = await getTaskWithId(controller, taskId);
    if (historyItem) {
        try {
            await initApexWithHistoryItem(controller, historyItem);
            telemetryService.captureHistoricalTaskLoaded(taskId);
        } catch (error) {
            console.error(`[HistoryManager] Error initializing task from history ${taskId}:`, error);
            vscode.window.showErrorMessage(`Failed to load task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } else {
        console.warn(`[HistoryManager] Task with ID ${taskId} not found in history.`);
        vscode.window.showWarningMessage(`Task ${taskId} not found in history.`);
    }
}

/**
 * Exports a specific task history to a markdown file.
 * @param controller The main controller instance.
 * @param taskId The ID of the task to export.
 */
export async function exportTaskWithId(controller: Controller, taskId: string): Promise<void> {
    console.log(`[HistoryManager] Exporting task with ID: ${taskId}`);
    const historyItem = await getTaskWithId(controller, taskId);
    if (!historyItem) {
        vscode.window.showWarningMessage(`Task ${taskId} not found for export.`);
        return;
    }

    try {
        const apexMessages = await getSavedApexMessages(controller.context, taskId);
        if (!apexMessages || apexMessages.length === 0) {
            vscode.window.showWarningMessage(`No messages found for task ${taskId} to export.`);
            return;
        }

        // Implement formatting logic here using formatContentBlockToMarkdown
        const markdownContent = apexMessages.map((message: ApexMessage) => { // Add type annotation
            const role = message.type === "ask" ? "**User:**" : "**Assistant:**"; // Determine role based on type
            // Format text content directly
            let content = message.text || '';
            // Append reasoning if present
            if (message.reasoning) {
                content += `\n\n*Reasoning:*\n${message.reasoning}`;
            }
            // Note: This simplified formatting doesn't handle complex block types like tool use/results from ApexMessage
            // A more robust implementation would iterate through potential content blocks if ApexMessage structure supported it like Anthropic.MessageParam
            return `${role}\n\n${content}\n\n`;
        }).join("---\n\n");


        const defaultFileName = `apex-export-${taskId}.md`;
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultFileName),
            filters: { 'Markdown': ['md'] }
        });

        if (saveUri) {
            // Ensure content is Uint8Array
            const contentBuffer = Buffer.from(markdownContent, 'utf8');
            await vscode.workspace.fs.writeFile(saveUri, new Uint8Array(contentBuffer)); // Create Uint8Array from Buffer
            vscode.window.showInformationMessage(`Task ${taskId} exported successfully to ${saveUri.fsPath}`);
            // Optionally open the exported file
            // vscode.window.showTextDocument(saveUri);
        }
    } catch (error) {
        console.error(`[HistoryManager] Error exporting task ${taskId}:`, error);
        vscode.window.showErrorMessage(`Failed to export task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Deletes a specific task from history and its associated data from disk.
 * @param controller The main controller instance.
 * @param taskId The ID of the task to delete.
 */
export async function deleteTaskWithId(controller: Controller, taskId: string): Promise<void> {
    console.log(`[HistoryManager] Deleting task with ID: ${taskId}`);
    const taskHistoryRaw = await getGlobalState(controller.context, "justinlietz93.apex.taskHistory");
    let taskHistory = Array.isArray(taskHistoryRaw) ? taskHistoryRaw as HistoryItem[] : [];
    const initialLength = taskHistory.length;
    const newTaskHistory = taskHistory.filter(item => item.id !== taskId);

    if (newTaskHistory.length < initialLength) {
        await updateGlobalState(controller.context, "justinlietz93.apex.taskHistory", newTaskHistory);
        telemetryService.captureTaskPopped(taskId); // Use correct telemetry method

        // Delete associated task data from disk
        try {
            // Use ensureTaskDirectoryExists to get the path, even though we're deleting it
            const taskDirPath = await ensureTaskDirectoryExists(controller.context, taskId);
            await fs.rm(taskDirPath, { recursive: true, force: true });
            console.log(`[HistoryManager] Deleted task data directory: ${taskDirPath}`);
        } catch (error) {
            // Log error but continue, history entry is already removed
            console.error(`[HistoryManager] Error deleting task data directory for ${taskId}:`, error);
        }

        // If the deleted task was the currently active one, clear it
        if (controller.task?.taskId === taskId) {
            await clearTask(controller); // Use imported clearTask function from task-lifecycle
        }

        await postStateToWebview(controller); // Update UI
        vscode.window.showInformationMessage(`Task ${taskId} deleted.`);
        await refreshTotalTasksSize(controller); // Refresh size after deletion
    } else {
        console.warn(`[HistoryManager] Task with ID ${taskId} not found for deletion.`);
        vscode.window.showWarningMessage(`Task ${taskId} not found for deletion.`);
    }
}

/**
 * Deletes all task history and associated data from disk.
 * @param controller The main controller instance.
 */
export async function deleteAllTaskHistory(controller: Controller): Promise<void> {
    console.log("[HistoryManager] Deleting all task history...");
    const confirmation = await vscode.window.showWarningMessage(
        "Are you sure you want to delete all task history? This action cannot be undone.",
        { modal: true }, // Make it modal to ensure user sees it
        "Delete All"
    );

    if (confirmation !== "Delete All") {
        console.log("[HistoryManager] Deletion cancelled by user.");
        return;
    }

    await updateGlobalState(controller.context, "justinlietz93.apex.taskHistory", []);

    // Delete all task data directories
    try {
        // Use ensureTaskDirectoryExists to get a valid path within the tasks directory, then get its parent
        const dummyTaskPath = await ensureTaskDirectoryExists(controller.context, 'dummy_for_path');
        const tasksRootPath = path.dirname(dummyTaskPath);
        // Clean up the dummy directory created
        await fs.rm(dummyTaskPath, { recursive: true, force: true }).catch(e => console.warn("Could not remove dummy task dir", e));

        const entries = await fs.readdir(tasksRootPath, { withFileTypes: true });
        for (const entry of entries) {
            // Ensure it's a directory and the name looks like a timestamp (task ID)
            if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                const taskDirPath = path.join(tasksRootPath, entry.name);
                await fs.rm(taskDirPath, { recursive: true, force: true });
                console.log(`[HistoryManager] Deleted task data directory: ${taskDirPath}`);
            }
        }
    } catch (error) {
        // Log error but continue, history state is already cleared
        console.error("[HistoryManager] Error deleting task data directories:", error);
    }

    // If there was an active task, clear it
    if (controller.task) {
        await clearTask(controller); // Use imported clearTask function from task-lifecycle
    }

    await postStateToWebview(controller); // Update UI
    vscode.window.showInformationMessage("All task history deleted.");
    await refreshTotalTasksSize(controller); // Refresh size after deletion
}

/**
 * Updates a specific task's metadata in the history.
 * (This function is primarily called by StateManager.saveApexMessagesAndUpdateHistory)
 * @param controller The main controller instance.
 * @param updatedItem The updated history item.
 */
export async function updateTaskHistory(controller: Controller, updatedItem: HistoryItem): Promise<void> {
    const taskHistoryRaw = await getGlobalState(controller.context, "justinlietz93.apex.taskHistory");
    let taskHistory = Array.isArray(taskHistoryRaw) ? taskHistoryRaw as HistoryItem[] : [];
    const index = taskHistory.findIndex(item => item.id === updatedItem.id);

    if (index !== -1) {
        taskHistory[index] = updatedItem;
    } else {
        taskHistory.push(updatedItem);
    }

    // Sort history by timestamp descending
    taskHistory.sort((a, b) => b.ts - a.ts);

    await updateGlobalState(controller.context, "justinlietz93.apex.taskHistory", taskHistory);
    // No immediate UI update needed here, usually called alongside postStateToWebview
}

/**
 * Calculates the total size of all task data directories and sends it to the webview.
 * @param controller The main controller instance.
 */
export async function refreshTotalTasksSize(controller: Controller): Promise<void> {
    let totalSize = 0;
    try {
        // Use ensureTaskDirectoryExists to get a valid path within the tasks directory, then get its parent
        const dummyTaskPath = await ensureTaskDirectoryExists(controller.context, 'dummy_for_path');
        const tasksRootPath = path.dirname(dummyTaskPath);
         // Clean up the dummy directory created
        await fs.rm(dummyTaskPath, { recursive: true, force: true }).catch(e => console.warn("Could not remove dummy task dir", e));

        const entries = await fs.readdir(tasksRootPath, { withFileTypes: true });
        for (const entry of entries) {
             // Ensure it's a directory and the name looks like a timestamp (task ID)
            if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                const taskDirPath = path.join(tasksRootPath, entry.name);
                try {
                    totalSize += await getFolderSize.loose(taskDirPath);
                } catch (sizeError) {
                    console.error(`[HistoryManager] Error getting size for task dir ${taskDirPath}:`, sizeError);
                }
            }
        }
        console.log(`[HistoryManager] Total task history size: ${totalSize} bytes`);
        await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "totalTasksSize", totalTasksSize: totalSize });
    } catch (error) {
        console.error("[HistoryManager] Error calculating total task size:", error);
        await postMessageToWebviewUtil(controller.webviewProviderRef, { type: "totalTasksSize", totalTasksSize: null }); // Indicate error
    }
}
