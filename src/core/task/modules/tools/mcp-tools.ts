import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index"
import { formatResponse } from "../../../prompts/responses"

// Define types used within the module
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

/**
 * Implementation of the use_mcp_tool tool.
 */
export async function executeUseMcpTool(
	task: Task,
	params: { server_name?: string; tool_name?: string; arguments?: any },
): Promise<ToolResponse> {
	if (!params.server_name) {
		return formatResponse.toolError(formatResponse.missingToolParameterError("server_name"))
	}
	if (!params.tool_name) {
		return formatResponse.toolError(formatResponse.missingToolParameterError("tool_name"))
	}
	if (!params.arguments) {
		return formatResponse.toolError(formatResponse.missingToolParameterError("arguments"))
	}

	const mcpHub = task.controllerRef.deref()?.mcpHub
	if (!mcpHub) {
		return formatResponse.toolError("MCP Hub is not available.")
	}

	try {
		const result = await mcpHub.callTool(params.server_name, params.tool_name, params.arguments)
		// Use the placeholder formatter from responses.ts
		return formatResponse.formatMcpToolResult(result)
	} catch (error: any) {
		return formatResponse.toolError(
			`Error using MCP tool ${params.tool_name} on server ${params.server_name}: ${error.message}`,
		)
	}
}

/**
 * Implementation of the access_mcp_resource tool.
 */
export async function executeAccessMcpResourceTool(
	task: Task,
	params: { server_name?: string; uri?: string },
): Promise<ToolResponse> {
	if (!params.server_name) {
		return formatResponse.toolError(formatResponse.missingToolParameterError("server_name"))
	}
	if (!params.uri) {
		return formatResponse.toolError(formatResponse.missingToolParameterError("uri"))
	}

	const mcpHub = task.controllerRef.deref()?.mcpHub
	if (!mcpHub) {
		return formatResponse.toolError("MCP Hub is not available.")
	}

	try {
		const result = await mcpHub.readResource(params.server_name, params.uri)
		// Use the placeholder formatter from responses.ts
		return formatResponse.formatMcpResourceResult(result)
	} catch (error: any) {
		return formatResponse.toolError(
			`Error accessing MCP resource ${params.uri} on server ${params.server_name}: ${error.message}`,
		)
	}
}
