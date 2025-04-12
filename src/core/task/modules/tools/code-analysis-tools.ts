import * as path from "path"
import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../../index"
import { formatResponse } from "../../../prompts/responses"
import { listFiles } from "../../../../services/glob/list-files"
import { regexSearchFiles } from "../../../../services/ripgrep"
import { parseSourceCodeForDefinitionsTopLevel } from "../../../../services/tree-sitter"

// Define types used within the module
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

/**
 * Implementation of the list_files tool
 */
export async function executeListFilesTool(
	task: Task,
	cwd: string,
	params: { path?: string; recursive?: string },
): Promise<ToolResponse> {
	if (!params.path) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("path"))
	}

	const recursive = params.recursive?.toLowerCase() === "true"
	const absolutePath = path.resolve(cwd, params.path)

	try {
		const [files, didHitLimit] = await listFiles(absolutePath, recursive, 200)
		return formatResponse.formatFilesList(absolutePath, files, didHitLimit, task.apexIgnoreController)
	} catch (error: any) {
		return formatResponse.toolError(`Error listing files: ${error.message}`)
	}
}

/**
 * Implementation of the search_files tool
 */
export async function executeSearchFilesTool(
	task: Task,
	cwd: string,
	params: { path?: string; regex?: string; file_pattern?: string },
): Promise<ToolResponse> {
	if (!params.path) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("path"))
	}
	if (!params.regex) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("regex"))
	}

	const absolutePath = path.resolve(cwd, params.path)

	try {
		const results = await regexSearchFiles(
			params.regex,
			absolutePath, // Use absolute path for searching
			cwd, // Keep cwd for context if needed by rg or formatting
			params.file_pattern,
			task.apexIgnoreController,
		)
		// Assuming formatResponse has a method for rg results
		if (typeof formatResponse.formatRgResults !== "function") {
			console.error("formatResponse.formatRgResults is not available!")
			// Fallback or simplified formatting
			// The 'results' variable is already the formatted string from regexSearchFiles
			return results
		}
		// The 'results' variable is already the formatted string from regexSearchFiles
		return results
	} catch (error: any) {
		return formatResponse.toolError(`Error searching files: ${error.message}`)
	}
}

/**
 * Implementation of the list_code_definition_names tool
 */
export async function executeListCodeDefinitionNamesTool(
	task: Task,
	cwd: string,
	params: { path?: string },
): Promise<ToolResponse> {
	if (!params.path) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("path"))
	}

	const absolutePath = path.resolve(cwd, params.path)

	try {
		const definitions = await parseSourceCodeForDefinitionsTopLevel(absolutePath, task.apexIgnoreController)
		// Assuming formatResponse has a method for definitions
		if (typeof formatResponse.formatDefinitions !== "function") {
			console.error("formatResponse.formatDefinitions is not available!")
			// Fallback or simplified formatting
			return `Code definitions found in path "${params.path}":\n${JSON.stringify(definitions, null, 2)}`
		}
		return formatResponse.formatDefinitions(definitions)
	} catch (error: any) {
		return formatResponse.toolError(`Error listing code definitions: ${error.message}`)
	}
}
