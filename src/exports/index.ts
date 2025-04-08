import * as vscode from "vscode"
import { Controller } from "../core/controller"
import { ApexAPI } from "./apex"
import { getGlobalState } from "../core/storage/state"
// Import necessary functions from controller modules
import { updateCustomInstructions, postStateToWebview } from "../core/controller/modules/state-updater";
import { clearTask } from "../core/controller/modules/task-lifecycle";
import { postMessageToWebview } from "../core/controller/modules/webview-handler";

export function createApexAPI(outputChannel: vscode.OutputChannel, sidebarController: Controller): ApexAPI {
	const api: ApexAPI = {
		setCustomInstructions: async (value: string) => {
			await updateCustomInstructions(sidebarController, value); // Use imported function
			outputChannel.appendLine("Custom instructions set")
		},

		getCustomInstructions: async () => {
			return (await getGlobalState(sidebarController.context, "justinlietz93.apex.customInstructions")) as string | undefined
		},

		startNewTask: async (task?: string, images?: string[]) => {
			outputChannel.appendLine("Starting new task")
			await clearTask(sidebarController); // Use imported function
			await postStateToWebview(sidebarController); // Use imported function
			await postMessageToWebview(sidebarController.webviewProviderRef, { // Use imported function
				type: "action",
				action: "chatButtonClicked",
			});
			await postMessageToWebview(sidebarController.webviewProviderRef, { // Use imported function
				type: "invoke",
				invoke: "sendMessage",
				text: task,
				images: images,
			});
			outputChannel.appendLine(
				`Task started with message: ${task ? `"${task}"` : "undefined"} and ${images?.length || 0} image(s)`,
			)
		},

		sendMessage: async (message?: string, images?: string[]) => {
			outputChannel.appendLine(
				`Sending message: ${message ? `"${message}"` : "undefined"} with ${images?.length || 0} image(s)`,
			)
			await postMessageToWebview(sidebarController.webviewProviderRef, { // Use imported function
				type: "invoke",
				invoke: "sendMessage",
				text: message,
				images: images,
			});
		},

		pressPrimaryButton: async () => {
			outputChannel.appendLine("Pressing primary button")
			await postMessageToWebview(sidebarController.webviewProviderRef, { // Use imported function
				type: "invoke",
				invoke: "primaryButtonClick",
			});
		},

		pressSecondaryButton: async () => {
			outputChannel.appendLine("Pressing secondary button")
			await postMessageToWebview(sidebarController.webviewProviderRef, { // Use imported function
				type: "invoke",
				invoke: "secondaryButtonClick",
			});
		},
	}

	return api
}
