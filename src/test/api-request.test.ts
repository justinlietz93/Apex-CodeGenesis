import * as assert from "assert"
import * as vscode from "vscode"
import * as sinon from "sinon"
import { Task } from "../core/task" // Adjust path as needed
import { attemptApiRequest } from "../core/task/modules/api_handler/api-request" // Adjust path
import { ApiHandler } from "../api" // Adjust path
import { BackendCommunicator } from "../core/task/modules/backend-communicator" // Adjust path
import { ContextManager } from "../core/context-management/ContextManager" // Adjust path
import { StateManager } from "../core/task/modules/state-manager" // Adjust path
import { WebviewCommunicator } from "../core/task/modules/webview-communicator" // Adjust path
import { McpHub } from "../services/mcp/McpHub" // Adjust path
import { ApexIgnoreController } from "../core/ignore/ApexIgnoreController" // Adjust path
import { ToolExecutor } from "../core/task/modules/tool-executor" // Adjust path
import { SelectPersonaResult, KnowledgeSearchResult, GeneratePlanResult } from "../shared/BackendProtocol" // Adjust path
import { ApiStream } from "../api/transform/stream" // Adjust path

// Mock dependencies
// ApiHandler is an interface, use implements.
class MockApiHandler implements ApiHandler {
	providerId = "mock" // Add required properties for the interface
	modelId = "mock-model"
	config = {} as any
	createMessage = sinon.stub().returns(
		(async function* () {
			yield { type: "text", text: "Mock API response" }
		})(),
	) // Simple async generator
	supportsNativeFunctionCalling = sinon.stub().returns(false)
	getModel = sinon.stub().returns({ info: { supportsComputerUse: false } })
}

class MockBackendCommunicator {
	selectPersona = sinon.stub().resolves({ persona_content: "Mock Persona Content" } as SelectPersonaResult)
	knowledgeSearch = sinon.stub().resolves({ results: ["Mock Knowledge Snippet"] } as KnowledgeSearchResult)
	generatePlan = sinon.stub().resolves({ goal: "Test Goal", phases: [] } as GeneratePlanResult)
}

class MockContextManager {
	getNewContextMessagesAndMetadata = sinon.stub().returns({
		truncatedConversationHistory: [],
		updatedConversationHistoryDeletedRange: false,
		conversationHistoryDeletedRange: { start: 0, end: 0 },
	})
	getNextTruncationRange = sinon.stub().returns({ start: 0, end: 1 })
	getTruncatedMessages = sinon.stub().returns([])
}

class MockStateManager {
	apiConversationHistory = []
	apexMessages = []
	conversationHistoryDeletedRange = { start: 0, end: 0 }
	setConversationHistoryDeletedRange = sinon.stub().resolves()
}

class MockWebviewCommunicator {
	ask = sinon.stub().resolves({ response: "yesButtonClicked" })
	say = sinon.stub()
}

class MockMcpHub {
	isConnecting = false
}

class MockApexIgnoreController {
	apexIgnoreContent = null
}

class MockToolExecutor {
	getAvailableTools = sinon.stub().returns([])
}

class MockTask {
	controllerRef = { deref: () => ({ mcpHub: new MockMcpHub() }) }
	api = new MockApiHandler()
	backendCommunicator = new MockBackendCommunicator()
	contextManager = new MockContextManager()
	stateManager = new MockStateManager()
	webviewCommunicator = new MockWebviewCommunicator()
	apexIgnoreController = new MockApexIgnoreController()
	toolExecutor = new MockToolExecutor()
	customInstructions = ""
	browserSettings = {}
	taskGoal = "Test Goal"
	abort = false
	getContext = () => ({ extensionPath: "/mock/path" }) as vscode.ExtensionContext // Mock context
	// Add other properties/methods if needed by attemptApiRequest
}

suite("attemptApiRequest Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.")

	let task: MockTask
	let setDidAutomaticallyRetryFailedApiRequest: sinon.SinonStub

	setup(() => {
		// Reset mocks before each test
		task = new MockTask()
		setDidAutomaticallyRetryFailedApiRequest = sinon.stub()
		// Reset stubs
		task.api.createMessage.resetHistory()
		task.backendCommunicator.selectPersona.resetHistory()
		task.backendCommunicator.knowledgeSearch.resetHistory()
		task.backendCommunicator.generatePlan.resetHistory()
		task.contextManager.getNewContextMessagesAndMetadata.resetHistory()
		task.stateManager.setConversationHistoryDeletedRange.resetHistory()
		task.webviewCommunicator.ask.resetHistory()
	})

	teardown(() => {
		sinon.restore() // Restore all stubs
	})

	test("Should call selectPersona, generatePlan, and knowledgeSearch on first request", async () => {
		const generator = attemptApiRequest(task as any, -1, false, setDidAutomaticallyRetryFailedApiRequest, [
			{ type: "text", text: "Initial Task Goal" },
		])
		await generator.next() // Consume the first chunk

		assert.ok(task.backendCommunicator.selectPersona.calledOnce, "selectPersona should be called once")
		assert.ok(task.backendCommunicator.generatePlan.calledOnce, "generatePlan should be called once")
		assert.ok(task.backendCommunicator.knowledgeSearch.calledOnce, "knowledgeSearch should be called once")
		assert.ok(task.api.createMessage.calledOnce, "createMessage should be called")

		// Verify system prompt includes persona and knowledge
		const systemPromptArg = task.api.createMessage.firstCall.args[0]
		assert.ok(systemPromptArg.includes("Mock Persona Content"), "System prompt should include persona content")
		assert.ok(systemPromptArg.includes("Mock Knowledge Snippet"), "System prompt should include knowledge content")
	})

	test("Should NOT call selectPersona or generatePlan on subsequent requests", async () => {
		const generator = attemptApiRequest(task as any, 0, false, setDidAutomaticallyRetryFailedApiRequest, null)
		await generator.next() // Consume the first chunk

		assert.ok(task.backendCommunicator.selectPersona.notCalled, "selectPersona should NOT be called")
		assert.ok(task.backendCommunicator.generatePlan.notCalled, "generatePlan should NOT be called")
		assert.ok(task.backendCommunicator.knowledgeSearch.calledOnce, "knowledgeSearch should be called once") // Knowledge search happens on every request
		assert.ok(task.api.createMessage.calledOnce, "createMessage should be called")
	})

	test("Should handle API error and retry on user confirmation", async () => {
		// Simulate API error on first call
		const apiError = new Error("Simulated API Error")
		task.api.createMessage.onFirstCall().returns(
			(async function* () {
				const throwError = () => {
					throw apiError
				}
				throwError()
				// This yield is technically unreachable but satisfies the require-yield rule
				yield { type: "text", text: "unreachable" }
			})(),
		)
		// Simulate successful call on retry
		task.api.createMessage.onSecondCall().returns(
			(async function* () {
				yield { type: "text", text: "Retry Success" }
			})(),
		)
		task.webviewCommunicator.ask.resolves({ response: "yesButtonClicked" }) // User confirms retry

		const generator = attemptApiRequest(task as any, -1, false, setDidAutomaticallyRetryFailedApiRequest, [
			{ type: "text", text: "Initial Task Goal" },
		])
		const result = await generator.next() // Consume the chunk from the *retry*

		assert.ok(
			task.webviewCommunicator.ask.calledOnceWith("api_req_failed", "Simulated API Error"),
			"Should ask user on API failure",
		)
		assert.ok(setDidAutomaticallyRetryFailedApiRequest.calledOnceWith(true), "Should set retry flag")
		assert.ok(task.api.createMessage.calledTwice, "createMessage should be called twice (initial + retry)")
		assert.deepStrictEqual(result.value, { type: "text", text: "Retry Success" }, "Should yield success chunk after retry")
		assert.strictEqual(result.done, false, "Generator should not be done")
	})

	test("Should handle API error and throw if user cancels retry", async () => {
		const apiError = new Error("Simulated API Error")
		task.api.createMessage.onFirstCall().returns(
			(async function* () {
				const throwError = () => {
					throw apiError
				}
				throwError()
				// This yield is technically unreachable but satisfies the require-yield rule
				yield { type: "text", text: "unreachable" }
			})(),
		)
		task.webviewCommunicator.ask.resolves({ response: "noButtonClicked" }) // User cancels retry

		const generator = attemptApiRequest(task as any, -1, false, setDidAutomaticallyRetryFailedApiRequest, [
			{ type: "text", text: "Initial Task Goal" },
		])

		try {
			await generator.next()
			assert.fail("Generator should have thrown an error")
		} catch (e: any) {
			assert.ok(
				task.webviewCommunicator.ask.calledOnceWith("api_req_failed", "Simulated API Error"),
				"Should ask user on API failure",
			)
			assert.ok(
				e.message.includes("API request failed and user did not retry"),
				"Should throw specific error on user cancel",
			)
		}
		assert.ok(task.api.createMessage.calledOnce, "createMessage should only be called once")
	})

	// Add more tests for:
	// - Context window error handling (Anthropic & OpenRouter specific paths)
	// - Automatic retry logic
	// - Different combinations of custom instructions/rules/ignore files
	// - Cases where backend calls fail (persona, plan, knowledge)
	// - Tool parameter preparation (supportsNativeTools = true/false)
})
