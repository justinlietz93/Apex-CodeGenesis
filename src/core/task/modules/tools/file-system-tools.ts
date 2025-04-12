import * as path from "path"
import { Anthropic } from "@anthropic-ai/sdk"
import { extractTextFromFile } from "../../../../integrations/misc/extract-text"
import { formatResponse } from "../../../prompts/responses"
import { constructNewFileContent } from "../../../assistant-message/diff"
import { fileExistsAtPath } from "../../../../utils/fs"
import { Task } from "../../index"

// Define types used within the module
type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

/**
 * Implementation of the read_file tool
 */
export async function executeReadFileTool(task: Task, cwd: string, params: { path?: string }): Promise<ToolResponse> {
	if (!params.path) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("path"))
	}

	const absolutePath = path.resolve(cwd, params.path)
	try {
		const fileContent = await extractTextFromFile(absolutePath)
		return `File content for ${params.path}:\n\n${fileContent}`
	} catch (error: any) {
		return formatResponse.toolError(`Error reading file: ${error.message}`)
	}
}

/**
 * Implementation of the write_to_file tool
 */
export async function executeWriteToFileTool(
	task: Task,
	cwd: string,
	params: { path?: string; content?: string },
): Promise<ToolResponse> {
	if (!params.path) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("path"))
	}

	if (params.content === undefined || params.content === null) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("content"))
	}

	const absolutePath = path.resolve(cwd, params.path)
	const fileExists = await fileExistsAtPath(absolutePath)

	try {
		// Use the correct sequence of DiffViewProvider methods
		task.diffViewProvider.editType = fileExists ? "modify" : "create"
		await task.diffViewProvider.open(params.path)
		await task.diffViewProvider.update(params.content, true)

		// This will prompt the user for approval/edits
		const { newProblemsMessage, userEdits, autoFormattingEdits, finalContent } = await task.diffViewProvider.saveChanges()

		// Format the response according to whether user edited the file
		if (userEdits) {
			return formatResponse.fileEditWithUserChanges(
				params.path,
				userEdits,
				autoFormattingEdits,
				finalContent,
				newProblemsMessage,
			)
		} else {
			return formatResponse.fileEditWithoutUserChanges(params.path, autoFormattingEdits, finalContent, newProblemsMessage)
		}
	} catch (error: any) {
		return formatResponse.toolError(`Error writing to file: ${error.message}`)
	}
}

/**
 * Implementation of the replace_in_file tool
 */
export async function executeReplaceInFileTool(
	task: Task,
	cwd: string,
	params: { path?: string; diff?: string },
): Promise<ToolResponse> {
	if (!params.path) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("path"))
	}

	if (!params.diff) {
		task.apiHandlerModule.consecutiveMistakeCount++
		return formatResponse.toolError(formatResponse.missingToolParameterError("diff"))
	}

	const absolutePath = path.resolve(cwd, params.path)
	const fileExists = await fileExistsAtPath(absolutePath)

	if (!fileExists) {
		return formatResponse.toolError(`File not found at path: ${params.path}`)
	}

	try {
		const originalContent = await extractTextFromFile(absolutePath)
		// constructNewFileContent requires diffContent, originalContent, and isFinal
		// Since we process the full diff here, isFinal is true.
		const newContent = await constructNewFileContent(params.diff, originalContent, true)

		// Use the correct sequence of DiffViewProvider methods
		task.diffViewProvider.editType = "modify" // It's always modify for replace_in_file
		await task.diffViewProvider.open(params.path)
		await task.diffViewProvider.update(newContent, true)

		// This will prompt the user for approval/edits
		const { newProblemsMessage, userEdits, autoFormattingEdits, finalContent } = await task.diffViewProvider.saveChanges()

		// Format the response according to whether user edited the file
		if (userEdits) {
			return formatResponse.fileEditWithUserChanges(
				params.path,
				userEdits,
				autoFormattingEdits,
				finalContent,
				newProblemsMessage,
			)
		} else {
			return formatResponse.fileEditWithoutUserChanges(params.path, autoFormattingEdits, finalContent, newProblemsMessage)
		}
	} catch (error: any) {
		return formatResponse.toolError(`Error applying diff to file: ${error.message}`)
	}
}
