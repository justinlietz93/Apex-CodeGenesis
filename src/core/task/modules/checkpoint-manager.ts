import * as vscode from "vscode";
import pTimeout from "p-timeout"; // Import pTimeout if needed for initialization
import { Task } from "../index"; // Import Task type
import CheckpointTracker from "../../../integrations/checkpoints/CheckpointTracker";
import { ApexCheckpointRestore } from "../../../shared/WebviewMessage";
import { ApexMessage, ApexApiReqInfo } from "../../../shared/ExtensionMessage"; // Corrected import for ApexMessage, added ApexApiReqInfo
import { findLast, findLastIndex } from "../../../shared/array";
import { DIFF_VIEW_URI_SCHEME } from "../../../integrations/editor/DiffViewProvider";
import { getApiMetrics } from "../../../shared/getApiMetrics"; // For restoreCheckpoint metrics
import { combineApiRequests } from "../../../shared/combineApiRequests"; // For restoreCheckpoint metrics
import { combineCommandSequences } from "../../../shared/combineCommandSequences"; // For restoreCheckpoint metrics
// Import necessary functions from controller modules
import { postStateToWebview } from "../../controller/modules/state-updater"; // Corrected path
import { postMessageToWebview } from "../../controller/modules/webview-handler"; // Corrected path
import { cancelTask } from "../../controller/modules/task-lifecycle"; // Corrected path
// ApexApiReqInfo already imported above

export class CheckpointManager {
    private task: Task;
    public checkpointTracker?: CheckpointTracker; // Moved from Task
    public checkpointTrackerErrorMessage?: string; // Moved from Task

    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

    // Method to initialize the tracker (can be called from constructor or elsewhere)
    async initializeTracker(): Promise<void> {
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                // Access context via task.controllerRef
                const context = this.task.controllerRef.deref()?.context;
                if (!context) {
                    throw new Error("Extension context not available for CheckpointTracker");
                }
                this.checkpointTracker = await pTimeout(
                    CheckpointTracker.create(this.task.taskId, context.globalStorageUri.fsPath),
                    {
                        milliseconds: 15_000,
                        message:
                            "Checkpoints taking too long to initialize. Consider re-opening Apex in a project that uses git, or disabling checkpoints.",
                    },
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                this.checkpointTrackerErrorMessage = errorMessage;
                // Optionally notify the user via webviewCommunicator if needed immediately
                // await this.task.webviewCommunicator.say("error", `Checkpoint Error: ${errorMessage}`);
            }
        }
    }

     // Method to update the hash of the first checkpoint message
     async updateFirstCheckpointHash(): Promise<void> {
        if (!this.checkpointTracker) {await this.initializeTracker();} // Ensure tracker is initialized
        if (!this.checkpointTracker) {return;} // Exit if initialization failed

        const commitHash = await this.checkpointTracker.commit();
        // Access state via stateManager
        const lastCheckpointMessage = findLast(this.task.stateManager.apexMessages, (m: ApexMessage) => m.say === "checkpoint_created");
        if (lastCheckpointMessage && commitHash) {
            lastCheckpointMessage.lastCheckpointHash = commitHash;
            // Use stateManager to save
            await this.task.stateManager.saveApexMessagesAndUpdateHistory();
        }
    }


    async saveCheckpoint(isAttemptCompletionMessage: boolean = false) {
        if (!this.checkpointTracker) {await this.initializeTracker();} // Ensure tracker is initialized
        if (!this.checkpointTracker) {
             console.warn("Checkpoint tracker not initialized, cannot save checkpoint.");
             return; // Cannot save if tracker failed to init
        }

        // Access state via stateManager - Add explicit type for message
        this.task.stateManager.apexMessages.forEach((message: ApexMessage) => {
            if (message.say === "checkpoint_created") {
                message.isCheckpointCheckedOut = false;
            }
        });

        if (!isAttemptCompletionMessage) {
            // Use webviewCommunicator to say
            await this.task.webviewCommunicator.say("checkpoint_created");
            this.checkpointTracker?.commit().then(async (commitHash) => {
                 // Access state via stateManager
                const lastCheckpointMessage = findLast(this.task.stateManager.apexMessages, (m: ApexMessage) => m.say === "checkpoint_created");
                if (lastCheckpointMessage && commitHash) {
                    lastCheckpointMessage.lastCheckpointHash = commitHash;
                     // Use stateManager to save
                    await this.task.stateManager.saveApexMessagesAndUpdateHistory();
                }
            }); // No need to await the commit itself for non-completion messages
        } else {
            const commitHash = await this.checkpointTracker?.commit();
             // Access state via stateManager
            const lastCompletionResultMessage = findLast(
                this.task.stateManager.apexMessages,
                (m: ApexMessage) => m.say === "completion_result" || m.ask === "completion_result",
            );
            if (lastCompletionResultMessage && commitHash) {
                lastCompletionResultMessage.lastCheckpointHash = commitHash;
                 // Use stateManager to save
                await this.task.stateManager.saveApexMessagesAndUpdateHistory();
            }
        }
    }

    async restoreCheckpoint(messageTs: number, restoreType: ApexCheckpointRestore) {
        // Access state via stateManager - Add explicit type for m
        const messageIndex = this.task.stateManager.apexMessages.findIndex((m: ApexMessage) => m.ts === messageTs);
        const message = this.task.stateManager.apexMessages[messageIndex];
        if (!message) {
            console.error("Message not found", this.task.stateManager.apexMessages);
            return;
        }

        let didWorkspaceRestoreFail = false;

        switch (restoreType) {
            case "task":
                break;
            case "taskAndWorkspace":
            case "workspace":
                if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
                    await this.initializeTracker(); // Ensure tracker is initialized
                }
                 if (this.checkpointTrackerErrorMessage) {
                    // If initialization previously failed, show error and mark as failed
                    const controllerForState = this.task.controllerRef.deref();
                    if (controllerForState) {await postStateToWebview(controllerForState);} // Use imported function
                    vscode.window.showErrorMessage(this.checkpointTrackerErrorMessage);
                    didWorkspaceRestoreFail = true;
                 } else if (message.lastCheckpointHash && this.checkpointTracker) {
                    try {
                        await this.checkpointTracker.resetHead(message.lastCheckpointHash);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Unknown error";
                        vscode.window.showErrorMessage("Failed to restore checkpoint: " + errorMessage);
                        didWorkspaceRestoreFail = true;
                    }
                } else if (!message.lastCheckpointHash) {
                     vscode.window.showErrorMessage("Failed to restore checkpoint: No hash found on message.");
                     didWorkspaceRestoreFail = true;
                }
                break;
        }

        if (!didWorkspaceRestoreFail) {
            switch (restoreType) {
                case "task":
                case "taskAndWorkspace":
                    // Use stateManager to update history
                    await this.task.stateManager.restoreHistoryToMessage(messageIndex, message);

                    // Aggregate deleted metrics (access state via stateManager)
                    const deletedMessages = this.task.stateManager.apexMessages.slice(messageIndex + 1);
                    const deletedApiReqsMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(deletedMessages)));

                    // Use webviewCommunicator to inform about deleted metrics
                    await this.task.webviewCommunicator.say(
                        "deleted_api_reqs",
                        JSON.stringify({
                            tokensIn: deletedApiReqsMetrics.totalTokensIn,
                            tokensOut: deletedApiReqsMetrics.totalTokensOut,
                            cacheWrites: deletedApiReqsMetrics.totalCacheWrites,
                            cacheReads: deletedApiReqsMetrics.totalCacheReads,
                            cost: deletedApiReqsMetrics.totalCost,
                        } satisfies ApexApiReqInfo),
                    );
                    break;
                case "workspace":
                    break;
            }

            switch (restoreType) {
                case "task":
                    vscode.window.showInformationMessage("Task messages have been restored to the checkpoint");
                    break;
                case "workspace":
                    vscode.window.showInformationMessage("Workspace files have been restored to the checkpoint");
                    break;
                case "taskAndWorkspace":
                    vscode.window.showInformationMessage("Task and workspace have been restored to the checkpoint");
                    break;
            }

            if (restoreType !== "task") {
                 // Access state via stateManager - Add explicit type for m
                const checkpointMessages = this.task.stateManager.apexMessages.filter((m: ApexMessage) => m.say === "checkpoint_created");
                // Add explicit type for m
                const currentMessageIndex = checkpointMessages.findIndex((m: ApexMessage) => m.ts === messageTs);
                 // Add explicit types for m, i
                checkpointMessages.forEach((m: ApexMessage, i: number) => {
                    m.isCheckpointCheckedOut = i === currentMessageIndex;
                });
            }

            // Use stateManager to save final state
            await this.task.stateManager.saveApexMessagesAndUpdateHistory();

            const controllerForRestore = this.task.controllerRef.deref();
            if (controllerForRestore) {
                await postMessageToWebview(controllerForRestore.webviewProviderRef, { type: "relinquishControl" }); // Use imported function
                await cancelTask(controllerForRestore); // Use imported function
            }
        } else {
            const controllerForFailedRestore = this.task.controllerRef.deref();
            if (controllerForFailedRestore) {
                await postMessageToWebview(controllerForFailedRestore.webviewProviderRef, { type: "relinquishControl" }); // Use imported function
            }
        }
    }

    async presentMultifileDiff(messageTs: number, seeNewChangesSinceLastTaskCompletion: boolean) {
        const relinquishButton = async () => { // Make async
            const controllerForRelinquish = this.task.controllerRef.deref();
            if (controllerForRelinquish) {
                await postMessageToWebview(controllerForRelinquish.webviewProviderRef, { type: "relinquishControl" }); // Use imported function
            }
        };

        console.log("presentMultifileDiff", messageTs);
         // Access state via stateManager - Add explicit type for m
        const messageIndex = this.task.stateManager.apexMessages.findIndex((m: ApexMessage) => m.ts === messageTs);
        const message = this.task.stateManager.apexMessages[messageIndex];
        if (!message) {
            console.error("Message not found");
            relinquishButton();
            return;
        }
        const hash = message.lastCheckpointHash;
        if (!hash) {
            console.error("No checkpoint hash found");
            relinquishButton();
            return;
        }

        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            await this.initializeTracker(); // Ensure tracker is initialized
        }
        if (this.checkpointTrackerErrorMessage) {
             const controllerForErrorState = this.task.controllerRef.deref();
             if (controllerForErrorState) {await postStateToWebview(controllerForErrorState);} // Use imported function
             vscode.window.showErrorMessage(this.checkpointTrackerErrorMessage);
             await relinquishButton(); // Await async function
             return;
        }
        if (!this.checkpointTracker) {
             vscode.window.showErrorMessage("Checkpoint tracker could not be initialized.");
             await relinquishButton(); // Await async function
             return;
        }


        let changedFiles: {
            relativePath: string;
            absolutePath: string;
            before: string;
            after: string;
        }[] | undefined;

        try {
            if (seeNewChangesSinceLastTaskCompletion) {
                 // Access state via stateManager
                const lastTaskCompletedMessageCheckpointHash = findLast(
                    this.task.stateManager.apexMessages.slice(0, messageIndex),
                    (m: ApexMessage) => m.say === "completion_result",
                )?.lastCheckpointHash;

                 // Access state via stateManager
                const firstCheckpointMessageCheckpointHash = this.task.stateManager.apexMessages.find(
                    (m: ApexMessage) => m.say === "checkpoint_created",
                )?.lastCheckpointHash;

                const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash || firstCheckpointMessageCheckpointHash;

                if (!previousCheckpointHash) {
                    vscode.window.showErrorMessage("Unexpected error: No previous checkpoint hash found for diff");
                    await relinquishButton(); // Await async function
                    return;
                }

                changedFiles = await this.checkpointTracker.getDiffSet(previousCheckpointHash, hash);
                if (!changedFiles?.length) {
                    vscode.window.showInformationMessage("No changes found since last completion");
                    await relinquishButton(); // Await async function
                    return;
                }
            } else {
                changedFiles = await this.checkpointTracker.getDiffSet(hash);
                if (!changedFiles?.length) {
                    vscode.window.showInformationMessage("No changes found in this snapshot");
                    await relinquishButton(); // Await async function
                    return;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage("Failed to retrieve diff set: " + errorMessage);
            await relinquishButton(); // Await async function
            return;
        }

        await vscode.commands.executeCommand(
            "vscode.changes",
            seeNewChangesSinceLastTaskCompletion ? "New changes" : "Changes since snapshot",
            changedFiles.map((file) => [
                vscode.Uri.file(file.absolutePath),
                vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
                    query: Buffer.from(file.before ?? "").toString("base64"),
                }),
                vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
                    query: Buffer.from(file.after ?? "").toString("base64"),
                }),
            ]),
        );
        await relinquishButton(); // Await async function
    }

    async doesLatestTaskCompletionHaveNewChanges(): Promise<boolean> {
         // Access state via stateManager - Add explicit type for m
        const messageIndex = findLastIndex(this.task.stateManager.apexMessages, (m: ApexMessage) => m.say === "completion_result");
        const message = this.task.stateManager.apexMessages[messageIndex];
        if (!message) {
            console.error("Completion message not found");
            return false;
        }
        const hash = message.lastCheckpointHash;
        if (!hash) {
            console.error("No checkpoint hash found on completion message");
            return false;
        }

        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
             await this.initializeTracker(); // Ensure tracker is initialized
        }
         if (!this.checkpointTracker) {
             console.error("Checkpoint tracker not initialized, cannot check for changes.");
             return false; // Cannot check if tracker failed to init
         }


        // Access state via stateManager - Add explicit type for m
        const lastTaskCompletedMessage = findLast(this.task.stateManager.apexMessages.slice(0, messageIndex), (m: ApexMessage) => m.say === "completion_result");

        try {
            const lastTaskCompletedMessageCheckpointHash = lastTaskCompletedMessage?.lastCheckpointHash;
             // Access state via stateManager - Add explicit type for m
            const firstCheckpointMessageCheckpointHash = this.task.stateManager.apexMessages.find(
                (m: ApexMessage) => m.say === "checkpoint_created",
            )?.lastCheckpointHash;

            const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash || firstCheckpointMessageCheckpointHash;

            if (!previousCheckpointHash) {
                 console.error("No previous checkpoint hash found to compare against.");
                return false; // Cannot compare if no previous hash
            }

            const changedFilesCount = (await this.checkpointTracker.getDiffCount(previousCheckpointHash, hash)) || 0;
            return changedFilesCount > 0;

        } catch (error) {
            console.error("Failed to get diff count:", error);
            return false;
        }
    }
}
