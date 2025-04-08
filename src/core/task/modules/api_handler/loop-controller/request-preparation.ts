import * as vscode from "vscode";
import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../../../index"; // Adjust path
import { ApexMessage } from "../../../../../shared/ExtensionMessage"; // Adjust path
import { findLastIndex } from "../../../../../shared/array"; // Adjust path
import { formatContentBlockToMarkdown } from "../../../../../integrations/misc/export-markdown"; // Adjust path
import { telemetryService } from "../../../../../services/telemetry/TelemetryService"; // Adjust path
import { postStateToWebview } from "../../../../controller/modules/state-updater"; // Adjust path
import {
    SelectPersonaParams,
    GetPersonaContentByNameRequest
} from "../../../../../shared/BackendProtocol"; // Adjust path

// Define UserContent type locally
type UserContent = Array<Anthropic.ContentBlockParam>;

/**
 * Prepares the user content for the API request, handles persona switching,
 * and updates necessary state before the API call.
 * Returns the prepared UserContent array or null if preparation failed.
 */
export async function prepareApiRequest(
    task: Task,
    currentUserContent: UserContent | null, // Null indicates continuation from tool use
    isContinuationFromNativeTool: boolean,
    isFirstRequest: boolean,
    includeFileDetails: boolean = false
): Promise<UserContent | null> {

    let userContent = currentUserContent; // Work with local copy

    // Add user message to history and UI if it's not a continuation
    if (!isContinuationFromNativeTool && userContent) {
        await task.webviewCommunicator.say(
            "api_req_started",
            JSON.stringify({ request: userContent.map((block) => formatContentBlockToMarkdown(block)).join("\n\n") + "\n\nLoading..." }),
        );
        // Initialize checkpoint tracker only on the very first user message of a task
        if (isFirstRequest) {
            await task.checkpointManager.initializeTracker();
            await task.checkpointManager.updateFirstCheckpointHash();
        }
        // Load context and add environment details
        const [parsedUserContent, environmentDetails] = await task.contextLoader.loadContext(userContent, includeFileDetails);
        userContent = parsedUserContent; // Update userContent with context-loaded version
        userContent.push({ type: "text", text: environmentDetails });

        // Add the final prepared user message to API history
        const userHistoryMessage: Anthropic.MessageParam = { role: "user", content: userContent };
        await task.stateManager.addToApiConversationHistory(userHistoryMessage);
        telemetryService.captureConversationTurnEvent(task.taskId, task.apiProvider, task.api.getModel().id, "user");

        // Update the start time message in the UI state
        const lastApiReqIndex = findLastIndex(task.stateManager.apexMessages, (m: ApexMessage) => m.say === "api_req_started");
        await task.stateManager.updateApiReqStartTime(lastApiReqIndex, userContent);

        // Update webview state
        const controllerForState = task.controllerRef.deref();
        if (controllerForState) {await postStateToWebview(controllerForState);}

    } else if (isContinuationFromNativeTool) {
         // Still need to signal the start of the request in the UI
         await task.webviewCommunicator.say("api_req_started", JSON.stringify({ request: "[Continuing after tool execution]\n\nLoading..." }));
    }

    // --- Dynamic Persona Switching Check (Threshold Mode) ---
    const dynamicPersonaModeForCheck = vscode.workspace.getConfiguration("apex.agent").get<string>("dynamicPersonaMode") || "initial";
    if (dynamicPersonaModeForCheck === 'threshold' && !isFirstRequest) {
        const checkFrequency = vscode.workspace.getConfiguration("apex.agent").get<number>("dynamicPersonaCheckFrequency") || 5;
        const currentTurnNumber = Math.floor(task.stateManager.apiConversationHistory.length / 2);

        if (currentTurnNumber > 0 && currentTurnNumber % checkFrequency === 0) {
            console.log(`[RequestPrep] Threshold check triggered at turn ${currentTurnNumber}.`);
            try {
                // Placeholder: Use selectPersona with goal as context proxy
                const currentGoal = task.taskGoal || "Current task context";
                const personaParams: SelectPersonaParams = { goal: currentGoal };
                const personaNameResult = await task.backendCommunicator.selectPersona(personaParams) as unknown as { persona_name: string | null };
                const suggestedPersonaName = personaNameResult?.persona_name;

                if (suggestedPersonaName && suggestedPersonaName !== task.stateManager.currentActivePersonaName) {
                    console.log(`[RequestPrep] Persona switch triggered: ${task.stateManager.currentActivePersonaName || 'None'} -> ${suggestedPersonaName}`);
                    const contentParams: GetPersonaContentByNameRequest = { name: suggestedPersonaName };
                    const contentResult = await task.backendCommunicator.getPersonaContentByName(contentParams);
                    if (contentResult.content !== null) {
                        task.stateManager.currentActivePersonaName = suggestedPersonaName;
                        task.stateManager.currentActivePersonaContent = contentResult.content;
                        console.log(`[RequestPrep] Successfully switched active persona to ${suggestedPersonaName}.`);
                        task.webviewCommunicator.say("info", `Switched persona to: ${suggestedPersonaName}`);
                    } else {
                        console.warn(`[RequestPrep] Failed to fetch content for suggested persona ${suggestedPersonaName}. Switch aborted.`);
                    }
                } else if (suggestedPersonaName) {
                     console.log(`[RequestPrep] Suggested persona (${suggestedPersonaName}) matches current. No switch.`);
                } else {
                    console.warn("[RequestPrep] Backend did not suggest a persona during threshold check.");
                }
            } catch (error) {
                console.error("[RequestPrep] Error during threshold persona check/switch:", error);
                task.webviewCommunicator.say("error", `Failed during persona switch check: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    // --- End Persona Switching Check ---

    // Return the prepared user content (which might be null if it was a continuation)
    // The actual API call needs the *history*, not just this single message.
    // This function's primary role is updating history and state *before* the call.
    // The main loop will use the stateManager's history for the actual API call.
    // We return the potentially modified userContent only because the limit checker used it.
    // TODO: Re-evaluate if this function needs to return userContent after refactoring limit checks.
    return userContent;
}
