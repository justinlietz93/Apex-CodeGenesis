import * as assert from "assert"
import * as vscode from "vscode"
import * as sinon from "sinon"
import { Task } from "../core/task" // Adjust path
import { executeBrowserActionTool } from "../core/task/modules/tools/browser-tools" // Adjust path
import { formatResponse } from "../core/prompts/responses" // Adjust path
import { BrowserSession } from "../services/browser/BrowserSession" // Adjust path
import { BrowserAction, BrowserActionResult } from "../shared/ExtensionMessage" // Adjust path
import { ApiHandlerModule } from "../core/task/modules/api-handler" // Adjust path

// --- Mocks ---

class MockApiHandlerModule {
	consecutiveMistakeCount = 0
}

class MockBrowserSession {
	launchBrowser = sinon.stub().resolves()
	click = sinon.stub().resolves({ currentUrl: "clicked-url", screenshot: "click-screenshot" } as BrowserActionResult)
	type = sinon.stub().resolves({ currentUrl: "typed-url", screenshot: "type-screenshot" } as BrowserActionResult)
	scrollDown = sinon
		.stub()
		.resolves({ currentUrl: "scrolled-down-url", screenshot: "scroll-down-screenshot" } as BrowserActionResult)
	scrollUp = sinon.stub().resolves({ currentUrl: "scrolled-up-url", screenshot: "scroll-up-screenshot" } as BrowserActionResult)
	closeBrowser = sinon.stub().resolves({ currentUrl: "browser-closed", screenshot: "" } as BrowserActionResult)
}

class MockTask {
	apiHandlerModule = new MockApiHandlerModule()
	browserSession = new MockBrowserSession()
	// Add other properties if needed
}

suite("Browser Tools Test Suite", () => {
	vscode.window.showInformationMessage("Start browser tools tests.")

	let task: MockTask
	let sandbox: sinon.SinonSandbox

	setup(() => {
		task = new MockTask()
		sandbox = sinon.createSandbox()

		// Stub formatResponse methods
		sandbox.stub(formatResponse, "missingToolParameterError").callsFake((param) => `Missing parameter: ${param}`)
		sandbox.stub(formatResponse, "toolError").callsFake((msg) => `TOOL_ERROR: ${msg}`)
		sandbox.stub(formatResponse, "formatBrowserActionResult").callsFake(
			(result: BrowserActionResult) => `Formatted Result: ${result.currentUrl}`, // Simple mock format
		)
	})

	teardown(() => {
		sandbox.restore()
	})

	// --- executeBrowserActionTool ---
	suite("executeBrowserActionTool", () => {
		test('Should call launchBrowser for "launch" action', async () => {
			const result = await executeBrowserActionTool(task as any, { action: "launch" })
			assert.ok(task.browserSession.launchBrowser.calledOnce)
			assert.strictEqual(result, "Formatted Result: Browser launched.")
		})

		test('Should call click for "click" action with coordinate', async () => {
			const coordinate = "100,200"
			const result = await executeBrowserActionTool(task as any, { action: "click", coordinate: coordinate })
			assert.ok(task.browserSession.click.calledOnceWith(coordinate))
			assert.strictEqual(result, "Formatted Result: clicked-url")
		})

		test('Should return error if coordinate missing for "click"', async () => {
			const result = await executeBrowserActionTool(task as any, { action: "click" })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: coordinate")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test('Should call type for "type" action with text', async () => {
			const text = "hello world"
			const result = await executeBrowserActionTool(task as any, { action: "type", text: text })
			assert.ok(task.browserSession.type.calledOnceWith(text))
			assert.strictEqual(result, "Formatted Result: typed-url")
		})

		test('Should return error if text missing for "type"', async () => {
			const result = await executeBrowserActionTool(task as any, { action: "type" })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: text")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test('Should call scrollDown for "scroll_down" action', async () => {
			const result = await executeBrowserActionTool(task as any, { action: "scroll_down" })
			assert.ok(task.browserSession.scrollDown.calledOnce)
			assert.strictEqual(result, "Formatted Result: scrolled-down-url")
		})

		test('Should call scrollUp for "scroll_up" action', async () => {
			const result = await executeBrowserActionTool(task as any, { action: "scroll_up" })
			assert.ok(task.browserSession.scrollUp.calledOnce)
			assert.strictEqual(result, "Formatted Result: scrolled-up-url")
		})

		test('Should call closeBrowser for "close" action', async () => {
			const result = await executeBrowserActionTool(task as any, { action: "close" })
			assert.ok(task.browserSession.closeBrowser.calledOnce)
			assert.strictEqual(result, "Formatted Result: browser-closed")
		})

		test("Should return error if action is missing", async () => {
			const result = await executeBrowserActionTool(task as any, {})
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: action")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error for invalid action", async () => {
			const invalidAction = "invalid_action" as BrowserAction
			const result = await executeBrowserActionTool(task as any, { action: invalidAction })
			assert.strictEqual(result, `TOOL_ERROR: Invalid browser action: ${invalidAction}`)
		})

		test("Should return error if BrowserSession method fails", async () => {
			const error = new Error("Click failed")
			task.browserSession.click.rejects(error)
			const result = await executeBrowserActionTool(task as any, { action: "click", coordinate: "1,1" })
			assert.strictEqual(result, `TOOL_ERROR: Error executing browser action click: ${error.message}`)
		})
	})
})
