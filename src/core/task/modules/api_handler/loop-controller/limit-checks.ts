import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../../../index"; // Adjust path as needed
import { formatResponse } from "../../../../prompts/responses"; // Adjust path
import { showSystemNotification } from "../../../../../integrations/notifications"; // Adjust path

// Define UserContent type locally if not imported from elsewhere
type UserContent = Array<Anthropic.ContentBlockParam>;

/**
 * Handles mistake limit and auto-approval limit checks.
 * Returns an object indicating if the loop should end and potentially updated userContent.
 */
export async function handleLimitChecks(
    task: Task,
    consecutiveMistakeCount: number,
    setConsecutiveMistakeCount: (count: number) => void,
    consecutiveAutoApprovedRequestsCount: number,
    setConsecutiveAutoApprovedRequestsCount: (count: number) => void,
    currentUserContent: UserContent | null // Pass current user content to potentially modify
): Promise<{ shouldEndLoop: boolean; updatedUserContent: UserContent | null }> {

    let userContent = currentUserContent; // Work with a local copy
    let shouldEndLoop = false;

    // --- Mistake Limit Check ---
    if (consecutiveMistakeCount >= 3) {
        if (task.autoApprovalSettings.enabled && task.autoApprovalSettings.enableNotifications) {
            showSystemNotification({ subtitle: "Error", message: "Apex is having trouble. Would you like to continue the task?" });
        }
        const { response, text, images } = await task.webviewCommunicator.ask(
            "mistake_limit_reached",
            task.api.getModel().id.includes("claude")
                ? `This may indicate a failure in his thought process or inability to use a tool properly...`
                : "Apex uses complex prompts... recommended to use Claude 3.7 Sonnet...",
        );
        if (response !== "yesButtonClicked" && response !== "messageResponse") {
             task.abortTask();
             shouldEndLoop = true;
        } else if (response === "messageResponse") {
             userContent = userContent || [];
             const textBlock: Anthropic.TextBlockParam = { type: "text", text: formatResponse.tooManyMistakes(text) };
             userContent.push(textBlock, ...formatResponse.imageBlocks(images));
        }
        setConsecutiveMistakeCount(0); // Reset count if user continues
    }

    if (shouldEndLoop) {
        return { shouldEndLoop: true, updatedUserContent: userContent };
    }

    // --- Auto-Approval Limit Check ---
    if (
        task.autoApprovalSettings.enabled &&
        consecutiveAutoApprovedRequestsCount >= task.autoApprovalSettings.maxRequests
    ) {
        if (task.autoApprovalSettings.enableNotifications) {
            showSystemNotification({ subtitle: "Max Requests Reached", message: `Apex has auto-approved ${task.autoApprovalSettings.maxRequests.toString()} API requests.` });
        }
        const { response } = await task.webviewCommunicator.ask(
            "auto_approval_max_req_reached",
            `Apex has auto-approved ${task.autoApprovalSettings.maxRequests.toString()} API requests. Would you like to reset the count and proceed with the task?`,
        );
         if (response !== "yesButtonClicked") {
             task.abortTask();
             shouldEndLoop = true;
         }
        setConsecutiveAutoApprovedRequestsCount(0); // Reset count if user continues
    }

    return { shouldEndLoop, updatedUserContent: userContent };
}
