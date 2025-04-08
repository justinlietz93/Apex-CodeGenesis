import { Anthropic } from "@anthropic-ai/sdk";
import { Task } from "../../index";
import { formatResponse } from "../../../prompts/responses";
import { ApexAsk } from "../../../../shared/ExtensionMessage";

// Define types used within the module
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

/**
 * Implementation of the ask_followup_question tool.
 */
export async function executeAskFollowupQuestionTool(
    task: Task,
    params: { question?: string; options?: string | string[] } // Allow string or array for options initially
): Promise<ToolResponse> {
    if (!params.question) {
        task.apiHandlerModule.consecutiveMistakeCount++;
        return formatResponse.toolError(formatResponse.missingToolParameterError("question"));
    }

    let optionsArray: string[] | undefined;
    if (params.options) {
        try {
            // Ensure options are parsed correctly if provided as a JSON string
            optionsArray = typeof params.options === 'string' ? JSON.parse(params.options) : params.options; 
            if (!Array.isArray(optionsArray) || optionsArray.some(opt => typeof opt !== 'string')) {
                throw new Error("Options must be an array of strings.");
            }
        } catch (e) {
             // Provide more specific error feedback
            return formatResponse.toolError(`Invalid format for options parameter. Expected a JSON array of strings, but received: ${params.options}`);
        }
    }

    try {
        // Correct arguments for webviewCommunicator.ask using the correct ApexAsk type
        const { response, text, images } = await task.webviewCommunicator.ask(
            "followup", // Use the correct ApexAsk type value
            params.question, 
            undefined // Pass undefined for the 'partial' argument
            // Note: optionsArray needs to be handled by the 'ask' method implementation or passed differently
        ); 
        // TODO: Modify WebviewCommunicator.ask to accept optionsArray if needed.
        // For now, options are parsed but not passed to the underlying ask method.
        
        return formatResponse.toolResult(`User responded with: ${response}${text ? `\n<answer>\n${text}\n</answer>` : ""}`, images);
    } catch (error: any) {
         return formatResponse.toolError(`Error asking followup question: ${error.message}`);
    }
}

/**
 * Implementation of the plan_mode_respond tool.
 * This tool should ideally not be executed directly in ACT mode.
 */
export async function executePlanModeRespondTool(
    task: Task,
    params: { response?: string; options?: string | string[] }
): Promise<ToolResponse> {
     // This tool is primarily for PLAN mode and its execution flow is different.
     // Returning an error if called in ACT mode.
    return formatResponse.toolError("plan_mode_respond tool cannot be executed in ACT mode.");
}

/**
 * Implementation of the attempt_completion tool.
 * This tool signals the end of the task loop. The actual result display
 * and command execution are handled elsewhere (ApiHandlerModule/WebviewCommunicator).
 * This function just validates parameters and returns the result text.
 */
export async function executeAttemptCompletionTool(
    task: Task,
    params: { result?: string; command?: string }
): Promise<ToolResponse> {
    if (!params.result) {
        task.apiHandlerModule.consecutiveMistakeCount++;
        return formatResponse.toolError(formatResponse.missingToolParameterError("result"));
    }
    
    // The command parameter is handled by the WebviewCommunicator when displaying the final message.
    // We just need to return the result text here.
    return params.result; 
}
