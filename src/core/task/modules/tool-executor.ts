import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { Anthropic } from "@anthropic-ai/sdk";
import { serializeError } from "serialize-error";
import { Task } from "../index"; // Import Task type
import { ToolUseName } from "../../assistant-message";
import { formatResponse } from "../../prompts/responses";
import { ToolDefinition } from "../../../shared/types"; // Import placeholder type
// Import the modular tool execution functions
import {
    executeReadFileTool,
    executeWriteToFileTool,
    executeReplaceInFileTool
} from "./tools/file-system-tools";
import {
    executeListFilesTool,
    executeSearchFilesTool,
    executeListCodeDefinitionNamesTool
} from "./tools/code-analysis-tools";
import { executeCommandTool } from "./tools/command-tools";
import { executeBrowserActionTool } from "./tools/browser-tools";
import { executeUseMcpTool, executeAccessMcpResourceTool } from "./tools/mcp-tools";
import {
    executeAskFollowupQuestionTool,
    executePlanModeRespondTool,
    executeAttemptCompletionTool
} from "./tools/interaction-tools";

// Define types used within the class if they are not imported globally
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

// Define cwd at the module level
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop");

export class ToolExecutor {
    private task: Task;

    constructor(taskInstance: Task) {
        this.task = taskInstance;
    }

    // Method to check auto-approval settings (remains the same)
    shouldAutoApproveTool(toolName: ToolUseName): boolean {
        // Access settings via this.task
        if (this.task.autoApprovalSettings.enabled) {
            switch (toolName) {
                case "read_file":
                case "list_files":
                case "list_code_definition_names":
                case "search_files":
                    return this.task.autoApprovalSettings.actions.readFiles;
                case "write_to_file":
                case "replace_in_file":
                    return this.task.autoApprovalSettings.actions.editFiles;
                case "execute_command":
                    return this.task.autoApprovalSettings.actions.executeCommands;
                case "browser_action":
                    return this.task.autoApprovalSettings.actions.useBrowser;
                case "access_mcp_resource":
                case "use_mcp_tool":
                    return this.task.autoApprovalSettings.actions.useMcp;
                // Add cases for other tools if necessary
            }
        }
        return false;
    }

    // Method to get available tools (placeholder implementation)
    getAvailableTools(): ToolDefinition[] {
        // TODO: Implement logic to dynamically get available tools,
        // potentially from MCP Hub or a static list based on capabilities.
        // Returning an empty array for now to satisfy the type checker.
        console.warn("[ToolExecutor] getAvailableTools() is not fully implemented.");
        return [];
    }

    // Method to format errors (remains the same)
    private formatErrorWithStatusCode(error: any): string {
        const statusCode = error.status || error.statusCode || (error.response && error.response.status);
        const message = error.message ?? JSON.stringify(serializeError(error), null, 2);

        // Only prepend the statusCode if it's not already part of the message
        return statusCode && !message.includes(statusCode.toString()) ? `${statusCode} - ${message}` : message;
    }

    // Main tool execution logic - now delegates to modular functions
    async executeToolByName(toolName: ToolUseName, params: any): Promise<ToolResponse> {
        try {
            switch (toolName) {
                // Command Tools
                case "execute_command":
                    return await executeCommandTool(this.task, params);

                // File System Tools
                case "read_file":
                    return await executeReadFileTool(this.task, cwd, params);
                case "write_to_file":
                    return await executeWriteToFileTool(this.task, cwd, params);
                case "replace_in_file":
                    return await executeReplaceInFileTool(this.task, cwd, params);

                // Code Analysis Tools
                case "search_files":
                    // Note: executeSearchFilesTool now takes cwd as the first arg
                    return await executeSearchFilesTool(this.task, cwd, params);
                case "list_files":
                    return await executeListFilesTool(this.task, cwd, params);
                case "list_code_definition_names":
                    return await executeListCodeDefinitionNamesTool(this.task, cwd, params);

                // Browser Tools
                case "browser_action":
                    return await executeBrowserActionTool(this.task, params);

                // MCP Tools
                 case "use_mcp_tool":
                    return await executeUseMcpTool(this.task, params);
                 case "access_mcp_resource":
                    return await executeAccessMcpResourceTool(this.task, params);

                // Interaction Tools
                case "ask_followup_question":
                    return await executeAskFollowupQuestionTool(this.task, params);
                case "plan_mode_respond":
                    // This tool should not be executed in ACT mode.
                    return await executePlanModeRespondTool(this.task, params);
                case "attempt_completion":
                     // This tool signals the end of the task loop.
                    return await executeAttemptCompletionTool(this.task, params);

                default:
                    // Handle unknown tool names gracefully
                    const exhaustiveCheck: never = toolName;
                    return formatResponse.toolError(`Unknown tool name: ${exhaustiveCheck}`);
            }
        } catch (error: any) {
            console.error(`Error executing tool ${toolName}:`, error);
            // Return a formatted error string for the next API request
            return formatResponse.toolError(`Error executing tool ${toolName}: ${this.formatErrorWithStatusCode(error)}`);
        }
    }
}
