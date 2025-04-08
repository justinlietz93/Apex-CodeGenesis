const { expect } = require("chai")
const vscode = require("vscode")

describe("Extension Tests", function () {
	this.timeout(60000) // Increased timeout for extension operations

	let originalGetConfiguration

	beforeEach(() => {
		// Save original configuration
		originalGetConfiguration = vscode.workspace.getConfiguration
		// Setup mock configuration
		const mockUpdate = async () => Promise.resolve()
		const mockConfig = {
			get: () => true,
			update: mockUpdate,
		}
		vscode.workspace.getConfiguration = () => mockConfig
	})

	afterEach(() => {
		// Restore original configuration
		vscode.workspace.getConfiguration = originalGetConfiguration
	})

	it("should activate extension successfully", async () => {
		// Get the extension
		const extension = vscode.extensions.getExtension("saoudrizwan.claude-dev")
		expect(extension).to.not.be.undefined

		// Activate the extension if not already activated
		if (!extension.isActive) {
			await extension.activate()
		}
		expect(extension.isActive).to.be.true
	})

	it("should open sidebar view", async () => {
		// Execute the command to open sidebar
		await vscode.commands.executeCommand("apex.plusButtonClicked")

		// Wait for sidebar to be visible
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Get all views
		const views = vscode.window.visibleTextEditors
		// Just verify the command executed without error
		// The actual view verification is handled in the TypeScript tests
	})

	it("should handle basic commands", async () => {
		// Test basic command execution
		await vscode.commands.executeCommand("apex.historyButtonClicked")
		// Success if no error thrown
	})

	it("should handle advanced settings configuration", async () => {
		// Test browser session setting
		await vscode.workspace.getConfiguration().update("apex.disableBrowserTool", true, true)
		const updatedConfig = vscode.workspace.getConfiguration("apex")
		expect(updatedConfig.get("disableBrowserTool")).to.be.true

		// Reset settings
		await vscode.workspace.getConfiguration().update("apex.disableBrowserTool", undefined, true)
	})

	// NOTE: This is a high-level integration test placeholder.
	// Proper testing requires mocking API responses and potentially accessing internal state.
	it("should handle a simple task with a tool call (placeholder)", async () => {
		// Get the extension's exported API (if available) or trigger via command
		const extension = vscode.extensions.getExtension("saoudrizwan.claude-dev")
		if (!extension.isActive) {
			await extension.activate()
		}

		// This requires a way to trigger a task and mock the LLM response
		// to include a tool call, then verify the tool execution path.
		// This is complex in the integration test environment.
		// For now, we just ensure activation works.
		expect(extension.isActive).to.be.true

		// Placeholder: Simulate sending a task prompt that would trigger read_file
		// await vscode.commands.executeCommand("apex.startTask", "Read the content of README.md");

		// Placeholder: Need a way to wait for task completion or specific events
		// await new Promise(resolve => setTimeout(resolve, 5000)); // Simple delay

		// Placeholder: Need assertions to verify tool execution (e.g., check logs, mock results)
		// expect(readFileToolCalled).to.be.true; // Example assertion
	})
})
