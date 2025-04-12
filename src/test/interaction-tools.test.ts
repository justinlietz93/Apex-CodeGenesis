import * as assert from "assert"
import * as vscode from "vscode"
import * as sinon from "sinon"
import { Task } from "../core/task" // Adjust path
import {
	executeAskFollowupQuestionTool,
	executePlanModeRespondTool,
	executeAttemptCompletionTool,
} from "../core/task/modules/tools/interaction-tools" // Adjust path
import { formatResponse } from "../core/prompts/responses" // Adjust path
import { WebviewCommunicator } from "../core/task/modules/webview-communicator" // Adjust path
import { ApiHandlerModule } from "../core/task/modules/api-handler" // Adjust path
import { ApexAsk } from "../shared/ExtensionMessage" // Adjust path

// --- Mocks ---

class MockApiHandlerModule {
	consecutiveMistakeCount = 0
}

class MockWebviewCommunicator {
	ask = sinon.stub()
	say = sinon.stub() // Although not used directly by these tools, good to have
}

class MockTask {
	apiHandlerModule = new MockApiHandlerModule()
	webviewCommunicator = new MockWebviewCommunicator()
	// Add other properties if needed
}

suite("Interaction Tools Test Suite", () => {
	vscode.window.showInformationMessage("Start interaction tools tests.")

	let task: MockTask
	let sandbox: sinon.SinonSandbox

	setup(() => {
		task = new MockTask()
		sandbox = sinon.createSandbox()

		// Stub formatResponse methods
		sandbox.stub(formatResponse, "missingToolParameterError").callsFake((param) => `Missing parameter: ${param}`)
		sandbox.stub(formatResponse, "toolError").callsFake((msg) => `TOOL_ERROR: ${msg}`)
		// Stub toolResult to handle string or array (though these tools primarily return string)
		sandbox.stub(formatResponse, "toolResult").callsFake((content: string | Array<any>, _images?: string[]) => {
			return typeof content === "string" ? content : "Formatted Tool Result"
		})
	})

	teardown(() => {
		sandbox.restore()
		// Reset history
		task.webviewCommunicator.ask.resetHistory()
		task.webviewCommunicator.say.resetHistory()
	})

	// --- executeAskFollowupQuestionTool ---
	suite("executeAskFollowupQuestionTool", () => {
		const question = "What is your preference?"
		const options = ["Option A", "Option B"]
		const optionsJson = JSON.stringify(options)

		test("Should call webviewCommunicator.ask with question and format response", async () => {
			const userResponse = { response: "Option A", text: "I chose A", images: ["img1.png"] }
			task.webviewCommunicator.ask.withArgs("followup", question, undefined).resolves(userResponse)
			const expectedResult = formatResponse.toolResult(
				`User responded with: ${userResponse.response}\n<answer>\n${userResponse.text}\n</answer>`,
				userResponse.images,
			)

			const result = await executeAskFollowupQuestionTool(task as any, { question: question })

			assert.ok(task.webviewCommunicator.ask.calledOnceWith("followup", question, undefined))
			assert.strictEqual(result, expectedResult)
		})

		test("Should parse options array correctly", async () => {
			const userResponse = { response: "Option B" }
			task.webviewCommunicator.ask.resolves(userResponse) // Options not passed yet, but test parsing
			const expectedResult = formatResponse.toolResult(`User responded with: ${userResponse.response}`, undefined)

			const result = await executeAskFollowupQuestionTool(task as any, { question: question, options: options })

			// TODO: Add assertion for optionsArray being passed to ask when implemented
			assert.ok(task.webviewCommunicator.ask.calledOnce)
			assert.strictEqual(result, expectedResult)
		})

		test("Should parse options JSON string correctly", async () => {
			const userResponse = { response: "Option B" }
			task.webviewCommunicator.ask.resolves(userResponse) // Options not passed yet, but test parsing
			const expectedResult = formatResponse.toolResult(`User responded with: ${userResponse.response}`, undefined)

			const result = await executeAskFollowupQuestionTool(task as any, { question: question, options: optionsJson })

			// TODO: Add assertion for optionsArray being passed to ask when implemented
			assert.ok(task.webviewCommunicator.ask.calledOnce)
			assert.strictEqual(result, expectedResult)
		})

		test("Should return error if question is missing", async () => {
			const result = await executeAskFollowupQuestionTool(task as any, {})
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: question")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if options are invalid JSON", async () => {
			const invalidOptionsJson = '["Option A", Option B]' // Missing quotes
			const result = await executeAskFollowupQuestionTool(task as any, { question: question, options: invalidOptionsJson })
			assert.ok(
				typeof result === "string" && result.startsWith("TOOL_ERROR: Invalid format for options parameter."),
				"Result should be a string starting with TOOL_ERROR",
			)
		})

		test("Should return error if options are not an array of strings", async () => {
			const invalidOptions = ["Option A", 123] // Contains a number
			const result = await executeAskFollowupQuestionTool(task as any, {
				question: question,
				options: invalidOptions as any,
			})
			assert.ok(
				typeof result === "string" && result.startsWith("TOOL_ERROR: Invalid format for options parameter."),
				"Result should be a string starting with TOOL_ERROR",
			)
		})

		test("Should return error if webviewCommunicator.ask fails", async () => {
			const error = new Error("Ask failed")
			task.webviewCommunicator.ask.rejects(error)

			const result = await executeAskFollowupQuestionTool(task as any, { question: question })
			assert.strictEqual(result, `TOOL_ERROR: Error asking followup question: ${error.message}`)
		})
	})

	// --- executePlanModeRespondTool ---
	suite("executePlanModeRespondTool", () => {
		test("Should return error when called", async () => {
			// This tool should not be executable in ACT mode
			const result = await executePlanModeRespondTool(task as any, { response: "Test response" })
			assert.strictEqual(result, "TOOL_ERROR: plan_mode_respond tool cannot be executed in ACT mode.")
		})
	})

	// --- executeAttemptCompletionTool ---
	suite("executeAttemptCompletionTool", () => {
		const completionResult = "Task completed successfully."
		const command = "echo Done"

		test("Should return the result parameter", async () => {
			const result = await executeAttemptCompletionTool(task as any, { result: completionResult, command: command })
			assert.strictEqual(result, completionResult)
		})

		test("Should return the result parameter even without command", async () => {
			const result = await executeAttemptCompletionTool(task as any, { result: completionResult })
			assert.strictEqual(result, completionResult)
		})

		test("Should return error if result parameter is missing", async () => {
			const result = await executeAttemptCompletionTool(task as any, { command: command })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: result")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})
	})
})
