import * as assert from "assert"
import * as vscode from "vscode"
import * as sinon from "sinon"
import * as path from "path"
import * as fs from "fs/promises" // For mocking fs operations if needed
import { Task } from "../core/task" // Adjust path
import {
	executeReadFileTool,
	executeWriteToFileTool,
	executeReplaceInFileTool,
} from "../core/task/modules/tools/file-system-tools" // Adjust path
import { formatResponse } from "../core/prompts/responses" // Adjust path
import * as fsUtils from "../utils/fs" // Adjust path
import * as extractText from "../integrations/misc/extract-text" // Adjust path
import * as diffUtils from "../core/assistant-message/diff" // Adjust path
import { DiffViewProvider } from "../integrations/editor/DiffViewProvider" // Adjust path
import { ApiHandlerModule } from "../core/task/modules/api-handler" // Adjust path

// --- Mocks ---

// Mock Task and its dependencies minimally
class MockApiHandlerModule {
	consecutiveMistakeCount = 0
}
class MockDiffViewProvider {
	editType: "create" | "modify" | null = null
	open = sinon.stub().resolves()
	update = sinon.stub().resolves()
	saveChanges = sinon.stub().resolves({
		newProblemsMessage: undefined, // Use undefined instead of null if that's the expected type
		userEdits: undefined, // Use undefined or a sample string diff
		autoFormattingEdits: undefined, // Use undefined or a sample string diff
		finalContent: "Mock Final Content",
	})
}
class MockTask {
	apiHandlerModule = new MockApiHandlerModule()
	diffViewProvider = new MockDiffViewProvider()
	// Add other properties if needed by the tools
}

suite("File System Tools Test Suite", () => {
	vscode.window.showInformationMessage("Start file system tools tests.")

	let task: MockTask
	let sandbox: sinon.SinonSandbox
	const testCwd = "/mock/cwd"
	const testFilePath = "test.txt"
	const absoluteTestPath = path.resolve(testCwd, testFilePath)

	setup(() => {
		task = new MockTask()
		sandbox = sinon.createSandbox()

		// Stub utility functions used by the tools
		sandbox.stub(fsUtils, "fileExistsAtPath")
		sandbox.stub(extractText, "extractTextFromFile")
		sandbox.stub(diffUtils, "constructNewFileContent")
	})

	teardown(() => {
		sandbox.restore()
	})

	// --- executeReadFileTool ---
	suite("executeReadFileTool", () => {
		test("Should return file content on success", async () => {
			const fileContent = "Hello, world!"
			;(extractText.extractTextFromFile as sinon.SinonStub).withArgs(absoluteTestPath).resolves(fileContent)

			const result = await executeReadFileTool(task as any, testCwd, { path: testFilePath })
			assert.strictEqual(result, `File content for ${testFilePath}:\n\n${fileContent}`)
		})

		test("Should return error if path is missing", async () => {
			const result = await executeReadFileTool(task as any, testCwd, {})
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(formatResponse.missingToolParameterError("path")))
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if extractTextFromFile fails", async () => {
			const error = new Error("Read failed")
			;(extractText.extractTextFromFile as sinon.SinonStub).withArgs(absoluteTestPath).rejects(error)

			const result = await executeReadFileTool(task as any, testCwd, { path: testFilePath })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(`Error reading file: ${error.message}`))
		})
	})

	// --- executeWriteToFileTool ---
	suite("executeWriteToFileTool", () => {
		const writeContent = "New content"

		test("Should call DiffViewProvider correctly for new file", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).withArgs(absoluteTestPath).resolves(false)
			task.diffViewProvider.saveChanges.resolves({
				finalContent: writeContent,
				userEdits: false,
				autoFormattingEdits: false,
				newProblemsMessage: null,
			})

			await executeWriteToFileTool(task as any, testCwd, { path: testFilePath, content: writeContent })

			assert.strictEqual(task.diffViewProvider.editType, "create")
			assert.ok(task.diffViewProvider.open.calledOnceWith(testFilePath))
			assert.ok(task.diffViewProvider.update.calledOnceWith(writeContent, true))
			assert.ok(task.diffViewProvider.saveChanges.calledOnce)
		})

		test("Should call DiffViewProvider correctly for existing file", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).withArgs(absoluteTestPath).resolves(true)
			task.diffViewProvider.saveChanges.resolves({
				finalContent: writeContent,
				userEdits: false,
				autoFormattingEdits: false,
				newProblemsMessage: null,
			})

			await executeWriteToFileTool(task as any, testCwd, { path: testFilePath, content: writeContent })

			assert.strictEqual(task.diffViewProvider.editType, "modify")
			assert.ok(task.diffViewProvider.open.calledOnceWith(testFilePath))
			assert.ok(task.diffViewProvider.update.calledOnceWith(writeContent, true))
			assert.ok(task.diffViewProvider.saveChanges.calledOnce)
		})

		test("Should return formatted response without user edits", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			// Mock with string | undefined for autoFormattingEdits
			const mockAutoFormatDiff = "diff --git a/file b/file\n--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new"
			task.diffViewProvider.saveChanges.resolves({
				finalContent: writeContent,
				userEdits: undefined,
				autoFormattingEdits: mockAutoFormatDiff,
				newProblemsMessage: "Formatted.",
			})
			// Pass string | undefined instead of boolean
			const expectedResponse = formatResponse.fileEditWithoutUserChanges(
				testFilePath,
				mockAutoFormatDiff,
				writeContent,
				"Formatted.",
			)

			const result = await executeWriteToFileTool(task as any, testCwd, { path: testFilePath, content: writeContent })
			assert.strictEqual(result, expectedResponse)
		})

		test("Should return formatted response with user edits", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			// Mock with string | undefined for userEdits and autoFormattingEdits
			const mockUserDiff = "diff --git a/file b/file\n--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+user_edit"
			task.diffViewProvider.saveChanges.resolves({
				finalContent: "User edited content",
				userEdits: mockUserDiff,
				autoFormattingEdits: undefined,
				newProblemsMessage: undefined,
			})
			// Pass string | undefined instead of boolean
			const expectedResponse = formatResponse.fileEditWithUserChanges(
				testFilePath,
				mockUserDiff,
				undefined,
				"User edited content",
				undefined,
			)

			const result = await executeWriteToFileTool(task as any, testCwd, { path: testFilePath, content: writeContent })
			assert.strictEqual(result, expectedResponse)
		})

		test("Should return error if path is missing", async () => {
			const result = await executeWriteToFileTool(task as any, testCwd, { content: writeContent })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(formatResponse.missingToolParameterError("path")))
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if content is missing", async () => {
			const result = await executeWriteToFileTool(task as any, testCwd, { path: testFilePath })
			// Check for undefined or null specifically
			const result2 = await executeWriteToFileTool(task as any, testCwd, { path: testFilePath, content: null as any })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(formatResponse.missingToolParameterError("content")))
			assert.ok((result2 as string).includes(formatResponse.missingToolParameterError("content")))
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 2)
		})

		test("Should return error if saveChanges fails", async () => {
			const error = new Error("Save failed")
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			task.diffViewProvider.saveChanges.rejects(error)

			const result = await executeWriteToFileTool(task as any, testCwd, { path: testFilePath, content: writeContent })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(`Error writing to file: ${error.message}`))
		})
	})

	// --- executeReplaceInFileTool ---
	suite("executeReplaceInFileTool", () => {
		const diffContent = "<<<<<<< SEARCH\nold\n=======\nnew\n>>>>>>> REPLACE"
		const originalContent = "line1\nold\nline3"
		const newContent = "line1\nnew\nline3"

		test("Should call dependencies and DiffViewProvider correctly", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).withArgs(absoluteTestPath).resolves(true)
			;(extractText.extractTextFromFile as sinon.SinonStub).withArgs(absoluteTestPath).resolves(originalContent)
			;(diffUtils.constructNewFileContent as sinon.SinonStub)
				.withArgs(diffContent, originalContent, true)
				.resolves(newContent)
			task.diffViewProvider.saveChanges.resolves({
				finalContent: newContent,
				userEdits: false,
				autoFormattingEdits: false,
				newProblemsMessage: null,
			})

			await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath, diff: diffContent })

			assert.ok((fsUtils.fileExistsAtPath as sinon.SinonStub).calledOnceWith(absoluteTestPath))
			assert.ok((extractText.extractTextFromFile as sinon.SinonStub).calledOnceWith(absoluteTestPath))
			assert.ok((diffUtils.constructNewFileContent as sinon.SinonStub).calledOnceWith(diffContent, originalContent, true))
			assert.strictEqual(task.diffViewProvider.editType, "modify")
			assert.ok(task.diffViewProvider.open.calledOnceWith(testFilePath))
			assert.ok(task.diffViewProvider.update.calledOnceWith(newContent, true))
			assert.ok(task.diffViewProvider.saveChanges.calledOnce)
		})

		test("Should return formatted response without user edits", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			;(extractText.extractTextFromFile as sinon.SinonStub).resolves(originalContent)
			;(diffUtils.constructNewFileContent as sinon.SinonStub).resolves(newContent)
			// Mock with string | undefined for autoFormattingEdits
			const mockAutoFormatDiff = "diff --git a/file b/file\n--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+new_formatted"
			task.diffViewProvider.saveChanges.resolves({
				finalContent: newContent,
				userEdits: undefined,
				autoFormattingEdits: mockAutoFormatDiff,
				newProblemsMessage: "Formatted.",
			})
			// Pass string | undefined instead of boolean
			const expectedResponse = formatResponse.fileEditWithoutUserChanges(
				testFilePath,
				mockAutoFormatDiff,
				newContent,
				"Formatted.",
			)

			const result = await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath, diff: diffContent })
			assert.strictEqual(result, expectedResponse)
		})

		test("Should return formatted response with user edits", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			;(extractText.extractTextFromFile as sinon.SinonStub).resolves(originalContent)
			;(diffUtils.constructNewFileContent as sinon.SinonStub).resolves(newContent)
			// Mock with string | undefined for userEdits and autoFormattingEdits
			const mockUserDiff = "diff --git a/file b/file\n--- a/file\n+++ b/file\n@@ -1 +1 @@\n-old\n+user_edit_replace"
			task.diffViewProvider.saveChanges.resolves({
				finalContent: "User edited content",
				userEdits: mockUserDiff,
				autoFormattingEdits: undefined,
				newProblemsMessage: undefined,
			})
			// Pass string | undefined instead of boolean
			const expectedResponse = formatResponse.fileEditWithUserChanges(
				testFilePath,
				mockUserDiff,
				undefined,
				"User edited content",
				undefined,
			)

			const result = await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath, diff: diffContent })
			assert.strictEqual(result, expectedResponse)
		})

		test("Should return error if path is missing", async () => {
			const result = await executeReplaceInFileTool(task as any, testCwd, { diff: diffContent })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(formatResponse.missingToolParameterError("path")))
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if diff is missing", async () => {
			const result = await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(formatResponse.missingToolParameterError("diff")))
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if file does not exist", async () => {
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).withArgs(absoluteTestPath).resolves(false)
			const result = await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath, diff: diffContent })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(`File not found at path: ${testFilePath}`))
		})

		test("Should return error if constructNewFileContent fails", async () => {
			const error = new Error("Diff apply failed")
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			;(extractText.extractTextFromFile as sinon.SinonStub).resolves(originalContent)
			;(diffUtils.constructNewFileContent as sinon.SinonStub).rejects(error)

			const result = await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath, diff: diffContent })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(`Error applying diff to file: ${error.message}`))
		})

		test("Should return error if saveChanges fails", async () => {
			const error = new Error("Save failed")
			;(fsUtils.fileExistsAtPath as sinon.SinonStub).resolves(true)
			;(extractText.extractTextFromFile as sinon.SinonStub).resolves(originalContent)
			;(diffUtils.constructNewFileContent as sinon.SinonStub).resolves(newContent)
			task.diffViewProvider.saveChanges.rejects(error)

			const result = await executeReplaceInFileTool(task as any, testCwd, { path: testFilePath, diff: diffContent })
			// Assert result as string for .includes check in error case
			assert.ok((result as string).includes(`Error applying diff to file: ${error.message}`)) // Error message comes from the catch block
		})
	})
})
