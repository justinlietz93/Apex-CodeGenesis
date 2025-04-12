import * as assert from "assert"
import * as vscode from "vscode"
import * as sinon from "sinon"
import { Task } from "../core/task" // Adjust path
import { executeUseMcpTool, executeAccessMcpResourceTool } from "../core/task/modules/tools/mcp-tools" // Adjust path
import { formatResponse } from "../core/prompts/responses" // Adjust path
import { McpHub } from "../services/mcp/McpHub" // Adjust path
import { ApiHandlerModule } from "../core/task/modules/api-handler" // Adjust path
import { Controller } from "../core/controller" // Adjust path

// --- Mocks ---

class MockApiHandlerModule {
	consecutiveMistakeCount = 0
}

class MockMcpHub {
	callTool = sinon.stub()
	readResource = sinon.stub()
}

class MockController {
	mcpHub = new MockMcpHub()
}

class MockTask {
	apiHandlerModule = new MockApiHandlerModule()
	controllerRef = { deref: () => new MockController() } // Mock deref to return controller
	// Add other properties if needed
}

suite("MCP Tools Test Suite", () => {
	vscode.window.showInformationMessage("Start MCP tools tests.")

	let task: MockTask
	let sandbox: sinon.SinonSandbox
	let mockMcpHub: MockMcpHub

	setup(() => {
		task = new MockTask()
		// Get the mocked McpHub instance
		mockMcpHub = task.controllerRef.deref()!.mcpHub
		sandbox = sinon.createSandbox()

		// Stub formatResponse methods
		sandbox.stub(formatResponse, "missingToolParameterError").callsFake((param) => `Missing parameter: ${param}`)
		sandbox.stub(formatResponse, "toolError").callsFake((msg) => `TOOL_ERROR: ${msg}`)
		sandbox.stub(formatResponse, "formatMcpToolResult").callsFake((res) => `Formatted Tool Result: ${JSON.stringify(res)}`)
		sandbox
			.stub(formatResponse, "formatMcpResourceResult")
			.callsFake((res) => `Formatted Resource Result: ${JSON.stringify(res)}`)
	})

	teardown(() => {
		sandbox.restore()
		// Reset history on stubs
		mockMcpHub.callTool.resetHistory()
		mockMcpHub.readResource.resetHistory()
	})

	// --- executeUseMcpTool ---
	suite("executeUseMcpTool", () => {
		const serverName = "test-server"
		const toolName = "test-tool"
		const args = { param1: "value1" }
		const mockResult = { content: [{ type: "text", text: "Success" }] }

		test("Should call McpHub.callTool and format response on success", async () => {
			mockMcpHub.callTool.withArgs(serverName, toolName, args).resolves(mockResult)

			const result = await executeUseMcpTool(task as any, { server_name: serverName, tool_name: toolName, arguments: args })

			assert.ok(mockMcpHub.callTool.calledOnceWith(serverName, toolName, args))
			assert.ok((formatResponse.formatMcpToolResult as sinon.SinonStub).calledOnceWith(mockResult))
			assert.strictEqual(result, `Formatted Tool Result: ${JSON.stringify(mockResult)}`)
		})

		test("Should return error if server_name is missing", async () => {
			const result = await executeUseMcpTool(task as any, { tool_name: toolName, arguments: args })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: server_name")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if tool_name is missing", async () => {
			const result = await executeUseMcpTool(task as any, { server_name: serverName, arguments: args })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: tool_name")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if arguments are missing", async () => {
			const result = await executeUseMcpTool(task as any, { server_name: serverName, tool_name: toolName })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: arguments")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if McpHub is not available", async () => {
			task.controllerRef.deref = () => ({ mcpHub: null }) as any // Simulate unavailable hub
			const result = await executeUseMcpTool(task as any, { server_name: serverName, tool_name: toolName, arguments: args })
			assert.strictEqual(result, "TOOL_ERROR: MCP Hub is not available.")
		})

		test("Should return error if McpHub.callTool fails", async () => {
			const error = new Error("MCP call failed")
			mockMcpHub.callTool.rejects(error)

			const result = await executeUseMcpTool(task as any, { server_name: serverName, tool_name: toolName, arguments: args })
			assert.strictEqual(result, `TOOL_ERROR: Error using MCP tool ${toolName} on server ${serverName}: ${error.message}`)
		})
	})

	// --- executeAccessMcpResourceTool ---
	suite("executeAccessMcpResourceTool", () => {
		const serverName = "test-server"
		const uri = "resource://test/item"
		const mockResult = { contents: [{ uri: uri, mimeType: "text/plain", text: "Resource Content" }] }

		test("Should call McpHub.readResource and format response on success", async () => {
			mockMcpHub.readResource.withArgs(serverName, uri).resolves(mockResult)

			const result = await executeAccessMcpResourceTool(task as any, { server_name: serverName, uri: uri })

			assert.ok(mockMcpHub.readResource.calledOnceWith(serverName, uri))
			assert.ok((formatResponse.formatMcpResourceResult as sinon.SinonStub).calledOnceWith(mockResult))
			assert.strictEqual(result, `Formatted Resource Result: ${JSON.stringify(mockResult)}`)
		})

		test("Should return error if server_name is missing", async () => {
			const result = await executeAccessMcpResourceTool(task as any, { uri: uri })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: server_name")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if uri is missing", async () => {
			const result = await executeAccessMcpResourceTool(task as any, { server_name: serverName })
			assert.strictEqual(result, "TOOL_ERROR: Missing parameter: uri")
			assert.strictEqual(task.apiHandlerModule.consecutiveMistakeCount, 1)
		})

		test("Should return error if McpHub is not available", async () => {
			task.controllerRef.deref = () => ({ mcpHub: null }) as any // Simulate unavailable hub
			const result = await executeAccessMcpResourceTool(task as any, { server_name: serverName, uri: uri })
			assert.strictEqual(result, "TOOL_ERROR: MCP Hub is not available.")
		})

		test("Should return error if McpHub.readResource fails", async () => {
			const error = new Error("MCP read failed")
			mockMcpHub.readResource.rejects(error)

			const result = await executeAccessMcpResourceTool(task as any, { server_name: serverName, uri: uri })
			assert.strictEqual(
				result,
				`TOOL_ERROR: Error accessing MCP resource ${uri} on server ${serverName}: ${error.message}`,
			)
		})
	})
})
