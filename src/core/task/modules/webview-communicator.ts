import * as vscode from "vscode";
import pWaitFor from "p-wait-for";
import {
    ApexAsk,
    ApexMessage,
    ApexSay,
    ApexAskQuestion,
    ApexAskUseMcpServer,
    ApexPlanModeResponse,
    ApexSayBrowserAction,
    ApexSayTool,
    // Removed ApexApiReqInfo
} from "../../../shared/ExtensionMessage";
// Import ApexAskResponse from the correct location
import { ApexAskResponse } from "../../../shared/WebviewMessage";
// Removed ToolUseName, ToolParamName
import { formatResponse } from "../../prompts/responses"; // Adjust path as needed
// Removed findLast, findLastIndex, parsePartialArrayString
import type { Task } from "../index"; // Use type import to avoid circular dependency issues at runtime
import { postMessageToWebview } from "../../controller/modules/webview-handler"; // Import the refactored function

export class WebviewCommunicator {
    private task: Task; // Reference to the main Task instance

    // State managed by this module
    private askResponse?: ApexAskResponse;
    private askResponseText?: string;
    private askResponseImages?: string[];
    private lastMessageTs?: number;
    public isAwaitingPlanResponse: boolean = false; // Moved from Task
    public didRespondToPlanAskBySwitchingMode: boolean = false; // Moved from Task

    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

    // Methods like ask, say, handleWebviewAskResponse, etc. will be moved here
    // They will use this.task to access properties like controllerRef, stateManager etc.
    // and call methods like saveApexMessagesAndUpdateHistory (via stateManager), postStateToWebview, etc.

    // partial has three valid states true (partial message), false (completion of partial message), undefined (individual complete message)
	async ask(
		type: ApexAsk,
		text?: string,
		partial?: boolean,
	): Promise<{
		response: ApexAskResponse
		text?: string
		images?: string[]
	}> {
		// Access abort via task
		if (this.task.abort) {
			throw new Error("Apex instance aborted") // Renamed
		}
		let askTs: number;
		// Access apexMessages via task.stateManager
		const lastMessage = this.task.stateManager.apexMessages.at(-1);

		// Reset plan mode flags before a new ask, unless it's a partial update
		if (!partial) {
			this.isAwaitingPlanResponse = false; // Use this.
			this.didRespondToPlanAskBySwitchingMode = false; // Use this.
		}

		if (partial !== undefined) {
			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "ask" && lastMessage.ask === type;
			if (partial) {
				if (isUpdatingPreviousPartial) {
					// existing partial message, so update it
					lastMessage.text = text;
					lastMessage.partial = partial;
					// Post partial update directly
                    // Use imported function, pass controller's webviewProviderRef via task
					await postMessageToWebview(this.task.controllerRef.deref()?.webviewProviderRef!, {
						type: "partialMessage",
						partialMessage: lastMessage,
					});
					throw new Error("Current ask promise was ignored 1");
				} else {
					// this is a new partial message, so add it with partial state
					askTs = Date.now();
					this.lastMessageTs = askTs; // Use this.lastMessageTs
					// Add message via stateManager
					await this.task.stateManager.addToApexMessages({
						ts: askTs,
						type: "ask",
						ask: type,
						text,
						partial,
					});
                    // State update is handled by stateManager, no direct postStateToWebview needed here
					// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
					throw new Error("Current ask promise was ignored 2");
				}
			} else {
				// partial=false means its a complete version of a previously partial message
				if (isUpdatingPreviousPartial) {
					// this is the complete version of a previously partial message, so replace the partial with the complete version
					this.askResponse = undefined; // Use this.askResponse
					this.askResponseText = undefined; // Use this.askResponseText
					this.askResponseImages = undefined; // Use this.askResponseImages

					askTs = lastMessage.ts;
					this.lastMessageTs = askTs; // Use this.lastMessageTs
					lastMessage.text = text;
					lastMessage.partial = false;
					// Save via stateManager
					await this.task.stateManager.saveApexMessagesAndUpdateHistory();
					// Set flag if waiting for plan response (completion of partial)
					if (type === "plan_mode_respond") {
						this.isAwaitingPlanResponse = true; // Use this.
					}
                    // Use imported function, pass controller's webviewProviderRef via task
					await postMessageToWebview(this.task.controllerRef.deref()?.webviewProviderRef!, {
						type: "partialMessage",
						partialMessage: lastMessage,
					});
				} else {
					// this is a new partial=false message, so add it like normal
					this.askResponse = undefined; // Use this.
					this.askResponseText = undefined; // Use this.
					this.askResponseImages = undefined; // Use this.
					askTs = Date.now();
					this.lastMessageTs = askTs; // Use this.
					// Add via stateManager
					await this.task.stateManager.addToApexMessages({
						ts: askTs,
						type: "ask",
						ask: type,
						text,
					});
                    // State update is handled by stateManager
					// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
				}
			}
		} else {
			// this is a new non-partial message, so add it like normal
			this.askResponse = undefined; // Use this.
			this.askResponseText = undefined; // Use this.
			this.askResponseImages = undefined; // Use this.
			askTs = Date.now();
			this.lastMessageTs = askTs; // Use this.
			// Add via stateManager
			await this.task.stateManager.addToApexMessages({
				ts: askTs,
				type: "ask",
				ask: type,
				text,
			});
            // State update is handled by stateManager
			// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
            // Set flag if waiting for plan response (non-partial message)
            if (type === "plan_mode_respond") {
                this.isAwaitingPlanResponse = true; // Use this.
            }
		}

		// Use this.askResponse and this.lastMessageTs
		await pWaitFor(() => this.askResponse !== undefined || this.lastMessageTs !== askTs, { interval: 100 });

		// Reset flag after response received or ignored
		if (type === "plan_mode_respond") {
			this.isAwaitingPlanResponse = false; // Use this.
		}

		if (this.lastMessageTs !== askTs) { // Use this.lastMessageTs
			throw new Error("Current ask promise was ignored");
		}

		// Check for plan mode toggle response *after* receiving the response
		if (type === "plan_mode_respond" && this.askResponseText === "PLAN_MODE_TOGGLE_RESPONSE") {
			this.didRespondToPlanAskBySwitchingMode = true; // Use this.
			this.askResponseText = ""; // Clear the marker text
		}


		// Use this. properties
		const result = {
			response: this.askResponse!,
			text: this.askResponseText,
			images: this.askResponseImages,
		};
		// Reset this. properties
		this.askResponse = undefined;
		this.askResponseText = undefined;
		this.askResponseImages = undefined;
		return result;
	}

	// This method updates the local state of this communicator
	async handleWebviewAskResponse(askResponse: ApexAskResponse, text?: string, images?: string[]) {
		this.askResponse = askResponse; // Use this.
		this.askResponseText = text; // Use this.
		this.askResponseImages = images; // Use this.
	}

	async say(type: ApexSay, text?: string, images?: string[], partial?: boolean): Promise<undefined> {
		// Access abort via task
		if (this.task.abort) {
			throw new Error("Apex instance aborted") // Renamed
		}

		// Access apexMessages via stateManager
		const lastMessage = this.task.stateManager.apexMessages.at(-1);

		if (partial !== undefined) {
			const isUpdatingPreviousPartial =
				lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type;
			if (partial) {
				if (isUpdatingPreviousPartial) {
					// existing partial message, so update it
					lastMessage.text = text;
					lastMessage.images = images;
					lastMessage.partial = partial;
                    // Use imported function, pass controller's webviewProviderRef via task
					await postMessageToWebview(this.task.controllerRef.deref()?.webviewProviderRef!, {
						type: "partialMessage",
						partialMessage: lastMessage,
					});
				} else {
					// this is a new partial message, so add it with partial state
					const sayTs = Date.now();
					this.lastMessageTs = sayTs; // Use this.
					// Add via stateManager
					await this.task.stateManager.addToApexMessages({
						ts: sayTs,
						type: "say",
						say: type,
						text,
						images,
						partial,
					});
                    // State update is handled by stateManager
					// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
				}
			} else {
				// partial=false means its a complete version of a previously partial message
				if (isUpdatingPreviousPartial) {
					// this is the complete version of a previously partial message, so replace the partial with the complete version
					this.lastMessageTs = lastMessage.ts; // Use this.
					lastMessage.text = text;
					lastMessage.images = images;
					lastMessage.partial = false;

					// Save via stateManager
					await this.task.stateManager.saveApexMessagesAndUpdateHistory();
                    // Use imported function, pass controller's webviewProviderRef via task
					await postMessageToWebview(this.task.controllerRef.deref()?.webviewProviderRef!, { // Corrected reference
						type: "partialMessage",
						partialMessage: lastMessage,
					});
				} else {
					// this is a new partial=false message, so add it like normal
					const sayTs = Date.now();
					this.lastMessageTs = sayTs; // Use this.
					// Add via stateManager
					await this.task.stateManager.addToApexMessages({
						ts: sayTs,
						type: "say",
						say: type,
						text,
						images,
					});
                    // State update is handled by stateManager
					// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
				}
			}
		} else {
			// this is a new non-partial message, so add it like normal
			const sayTs = Date.now();
			this.lastMessageTs = sayTs; // Use this.
			// Add via stateManager
			await this.task.stateManager.addToApexMessages({
				ts: sayTs,
				type: "say",
				say: type,
				text,
				images,
			});
            // State update is handled by stateManager
			// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
		}
	}

	// Note: ToolUseName and ToolParamName were removed from imports as they are not directly used here.
	// The sayAndCreateMissingParamError method still accepts them as arguments for type safety if called externally.
	async sayAndCreateMissingParamError(toolName: string, paramName: string, relPath?: string) {
		await this.say( // Use this.say (which uses stateManager)
			"error",
			`Apex tried to use ${toolName}${ // Renamed
				relPath ? ` for '${relPath}'` : ""
			} without value for required parameter '${paramName}'. Retrying...`,
		)
		return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
	}


	async removeLastPartialMessageIfExistsWithType(type: "ask" | "say", askOrSay: ApexAsk | ApexSay) {
		// Access apexMessages via stateManager
		const lastMessage = this.task.stateManager.apexMessages.at(-1);
		if (lastMessage?.partial && lastMessage.type === type && (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)) {
			// Use stateManager to modify and save
			await this.task.stateManager.removeLastMessage(); // Assuming StateManager has this method
            // State update is handled by stateManager
			// await this.task.controllerRef.deref()?.postStateToWebview(); // Removed redundant call
		}
	}
}
