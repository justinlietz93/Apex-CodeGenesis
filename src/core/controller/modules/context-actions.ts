import * as vscode from 'vscode';
import { Controller } from '../index'; // Import Controller type
import { postMessageToWebview as postMessageToWebviewUtil } from './webview-handler'; // For sending messages
import { initApexWithTask } from './task-lifecycle'; // For starting fix tasks

/**
 * Gets the currently selected code from the active editor and adds it to the chat input.
 * @param controller The main controller instance.
 */
export async function addSelectedCodeToChat(controller: Controller): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showInformationMessage("No code selected.");
        return;
    }

    const selection = editor.document.getText(editor.selection);
    const language = editor.document.languageId;
    const filePath = editor.document.uri.fsPath; // Get file path

    // Format the selected code as a markdown block
    const codeBlock = `\`\`\`${language}\n${selection}\n\`\`\``;
    const fileMention = `[${filePath}](${editor.document.uri.toString()})`; // Create file mention

    const textToAdd = `Selected code from ${fileMention}:\n${codeBlock}`;

    // Send message to webview to add text to input
    await postMessageToWebviewUtil(controller.webviewProviderRef, {
        type: "addToInput", // Assuming this type exists in ExtensionMessage
        text: textToAdd,
    });

    // Ensure the webview is visible by executing the command to focus its view container
    // Assuming the webview is in the primary sidebar and its ID is 'apex-ide-codegenesis.SidebarProvider'
    try {
        await vscode.commands.executeCommand('apex-ide-codegenesis.SidebarProvider.focus');
    } catch (error) {
        console.error("[ContextActions] Failed to focus webview:", error);
        // Fallback or alternative method to show the view might be needed if the command fails
    }
}

/**
 * Gets the currently selected text from the active terminal and adds it to the chat input.
 * @param controller The main controller instance.
 */
export async function addSelectedTerminalOutputToChat(controller: Controller): Promise<void> {
    // VS Code API doesn't directly expose selected terminal text easily.
    // A common workaround is to copy selection and read from clipboard, but that's intrusive.
    // Another way is using `workbench.action.terminal.copySelection` and then `vscode.env.clipboard.readText()`.
    // Let's try the command-based copy approach.

    await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
    // Small delay to allow clipboard to update
    await new Promise(resolve => setTimeout(resolve, 100));
    const selection = await vscode.env.clipboard.readText();

    if (!selection) {
        vscode.window.showInformationMessage("No text selected in the terminal or clipboard is empty.");
        return;
    }

    const codeBlock = `\`\`\`\n${selection}\n\`\`\``;
    const textToAdd = `Selected terminal output:\n${codeBlock}`;

    // Send message to webview to add text to input
    await postMessageToWebviewUtil(controller.webviewProviderRef, {
        type: "addToInput", // Assuming this type exists in ExtensionMessage
        text: textToAdd,
    });

     // Ensure the webview is visible
    try {
        await vscode.commands.executeCommand('apex-ide-codegenesis.SidebarProvider.focus');
    } catch (error) {
        console.error("[ContextActions] Failed to focus webview:", error);
    }
}

/**
 * Takes the selected code and initiates a new task to fix it.
 * @param controller The main controller instance.
 */
export async function fixWithApex(controller: Controller): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
        vscode.window.showInformationMessage("No code selected to fix.");
        return;
    }

    const selection = editor.document.getText(editor.selection);
    const language = editor.document.languageId;
    const filePath = editor.document.uri.fsPath;
    const fileMention = `[${filePath}](${editor.document.uri.toString()})`;

    // Create the initial prompt for the fix task
    const prompt = `Fix the following ${language} code from ${fileMention}:\n\n\`\`\`${language}\n${selection}\n\`\`\``;

    // Ensure the webview is visible before starting the task
    try {
        await vscode.commands.executeCommand('apex-ide-codegenesis.SidebarProvider.focus');
         // Start a new task with the fix prompt
        await initApexWithTask(controller, prompt);
    } catch (error) {
         console.error("[ContextActions] Failed to focus webview or start fix task:", error);
         vscode.window.showErrorMessage("Could not start fix task: Failed to show webview.");
    }
}
