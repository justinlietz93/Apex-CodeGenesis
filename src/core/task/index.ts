// Core imports needed by Task class itself
import { Anthropic } from "@anthropic-ai/sdk"
import * as vscode from "vscode"
import { ApiHandler, buildApiHandler } from "../../api"
import { DiffViewProvider } from "../../integrations/editor/DiffViewProvider"
import { TerminalManager } from "../../integrations/terminal/TerminalManager"
import { BrowserSession } from "../../services/browser/BrowserSession"
import { UrlContentFetcher } from "../../services/browser/UrlContentFetcher"
import { telemetryService } from "../../services/telemetry/TelemetryService"
import { ApiConfiguration } from "../../shared/api"
import { AutoApprovalSettings } from "../../shared/AutoApprovalSettings"
import { BrowserSettings } from "../../shared/BrowserSettings"
import { ChatSettings } from "../../shared/ChatSettings"
import { ApexMessage, ApexAsk } from "../../shared/ExtensionMessage" // Renamed imports
import { HistoryItem } from "../../shared/HistoryItem"
import { ApexCheckpointRestore } from "../../shared/WebviewMessage" // Keep Apex prefix for now if this type wasn't renamed
import { ToolUseName } from "../assistant-message" // Corrected path
import { ContextManager } from "../context-management/ContextManager" // Corrected path
import { ApexIgnoreController } from "../ignore/ApexIgnoreController" // Corrected path
import { Controller } from "../controller"
// Import Task Modules
import { WebviewCommunicator } from "./modules/webview-communicator";
import { ApiHandlerModule } from "./modules/api-handler"; // Verified name
import { ToolExecutor } from "./modules/tool-executor";
import { CheckpointManager } from "./modules/checkpoint-manager";
import { StateManager } from "./modules/state-manager";
import { ContextLoader } from "./modules/context-loader";
import { BackendCommunicator } from "./modules/backend-communicator";
import { StreamProcessor } from "./modules/stream-processor";
import { formatResponse } from "../prompts/responses"; // Keep formatResponse for start/resumeTask
import { postStateToWebview } from "../controller/modules/state-updater"; // Import the function

// Define UserContent type locally as it's used in method signatures
type UserContent = Array<Anthropic.ContentBlockParam>;

// Define cwd locally as it's used in constructor for ApexIgnoreController and DiffViewProvider
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? process.cwd(); // Use process.cwd() as a fallback

export class Task {
	readonly taskId: string
	readonly apiProvider?: string
	api: ApiHandler

	// Core Task Properties (Kept in Task class)
	public controllerRef: WeakRef<Controller>
	public taskGoal?: string // Added task goal property
	public abort: boolean = false
	// didFinishAbortingStream moved to ApiHandlerModule
	abandoned = false
	isInitialized = false
	// isAwaitingPlanResponse moved to WebviewCommunicator
	// didRespondToPlanAskBySwitchingMode moved to WebviewCommunicator
	customInstructions?: string
	autoApprovalSettings: AutoApprovalSettings
	browserSettings: BrowserSettings
	chatSettings: ChatSettings
	planActSeparateModelsSetting: boolean // Added missing property

	// References to Modules
	public webviewCommunicator: WebviewCommunicator
	public apiHandlerModule: ApiHandlerModule
	public toolExecutor: ToolExecutor
	public checkpointManager: CheckpointManager
	public stateManager: StateManager
	public contextLoader: ContextLoader
	public backendCommunicator: BackendCommunicator
	public streamProcessor: StreamProcessor

	// Shared Services/Controllers (Instantiated here, passed to modules)
	public terminalManager: TerminalManager
	public urlContentFetcher: UrlContentFetcher
	public browserSession: BrowserSession
	public contextManager: ContextManager
	public diffViewProvider: DiffViewProvider
	public apexIgnoreController: ApexIgnoreController // Renamed property
	// checkpointTracker and checkpointTrackerErrorMessage are now fully managed by CheckpointManager

	// State Properties are now fully managed by StateManager.
	// Access them via this.stateManager.apiConversationHistory, this.stateManager.apexMessages, etc.
	// public apiConversationHistory: Anthropic.MessageParam[] = [] // Removed
	// public apexMessages: ApexMessage[] = [] // Renamed type
	public conversationHistoryDeletedRange?: [number, number] // Keep temporarily for constructor init

	// Properties potentially moved to specific modules are now removed from the main Task class.
	// They should be accessed via their respective module instances (e.g., this.webviewCommunicator.askResponse).

	constructor(
		controller: Controller,
		apiConfiguration: ApiConfiguration,
		autoApprovalSettings: AutoApprovalSettings,
		browserSettings: BrowserSettings,
		chatSettings: ChatSettings,
		planActSeparateModelsSetting: boolean, // Added parameter
		customInstructions?: string,
		task?: string,
		images?: string[],
		historyItem?: HistoryItem,
	) {
		// Initialize Core Properties
		this.controllerRef = new WeakRef(controller)
		this.apiProvider = apiConfiguration.apiProvider
		this.customInstructions = customInstructions
		this.autoApprovalSettings = autoApprovalSettings
		this.browserSettings = browserSettings
		this.chatSettings = chatSettings
		this.planActSeparateModelsSetting = planActSeparateModelsSetting // Initialize property
		this.taskGoal = task // Initialize taskGoal from constructor param

		// Initialize Shared Services/Controllers
		this.apexIgnoreController = new ApexIgnoreController(cwd) // Renamed instantiation
		this.terminalManager = new TerminalManager()
		this.urlContentFetcher = new UrlContentFetcher(controller.context)
		this.browserSession = new BrowserSession(controller.context, browserSettings)
		this.contextManager = new ContextManager()
		this.diffViewProvider = new DiffViewProvider(cwd)

		// Initialize Task ID (needed for API Handler and Modules)
		if (historyItem) {
			this.taskId = historyItem.id
			this.conversationHistoryDeletedRange = historyItem.conversationHistoryDeletedRange // Load initial range here
		} else if (task || images) {
			this.taskId = Date.now().toString()
		} else {
			throw new Error("Either historyItem or task/images must be provided")
		}

		// Initialize API Handler (depends on taskId)
		this.api = buildApiHandler({
			...apiConfiguration,
			taskId: this.taskId,
		})

		// Initialize Modules (pass `this` for context)
		this.webviewCommunicator = new WebviewCommunicator(this)
		this.apiHandlerModule = new ApiHandlerModule(this)
		this.toolExecutor = new ToolExecutor(this)
		this.checkpointManager = new CheckpointManager(this)
		this.stateManager = new StateManager(this) // StateManager constructor will access initial state from Task
		this.contextLoader = new ContextLoader(this)
		this.backendCommunicator = new BackendCommunicator(this)
		this.streamProcessor = new StreamProcessor(this)

		// Initialize ApexIgnoreController asynchronously
		this.apexIgnoreController.initialize().catch((error: any) => { // Renamed variable, Added type annotation
			console.error("Failed to initialize ApexIgnoreController:", error) // Renamed log message
		})

		// Setup Python backend connection (now handled by BackendCommunicator)
		this.backendCommunicator.setupBackendConnection()
			.then(() => {
				// Continue with task initialization after backend connection is ready
				if (historyItem) {
					this.resumeTaskFromHistory()
				} else if (task || images) {
					this.startTask(task, images)
				}
			})
			.catch((error: Error | any) => { // Added type annotation
				console.error("Failed to setup backend connection via module:", error)
				this.webviewCommunicator.say("error", `Failed to start Python backend: ${error.message}`);
				// Handle error appropriately, maybe prevent task from starting
			})

		if (historyItem) {
			// Open task from history
			telemetryService.captureTaskRestarted(this.taskId, this.apiProvider)
		} else {
			// New task started
			telemetryService.captureTaskCreated(this.taskId, this.apiProvider)
		}
	}

	// While a task is ref'd by a controller, it will always have access to the extension context
	// This error is thrown if the controller derefs the task after e.g., aborting the task
	// Made public for module access
	public getContext(): vscode.ExtensionContext {
		const context = this.controllerRef.deref()?.context
		if (!context) {
			throw new Error("Unable to access extension context")
		}
		return context
	}

	// --- Methods to be refactored or delegated ---

	// Storing task to disk for history (Delegate to StateManager)
	public async addToApiConversationHistory(message: Anthropic.MessageParam) {
		await this.stateManager.addToApiConversationHistory(message);
	}
	public async overwriteApiConversationHistory(newHistory: Anthropic.MessageParam[]) {
		await this.stateManager.overwriteApiConversationHistory(newHistory);
	}
	public async addToApexMessages(message: ApexMessage) { // Renamed type
		await this.stateManager.addToApexMessages(message); // Delegate with potentially renamed method in StateManager
	}
	public async overwriteApexMessages(newMessages: ApexMessage[]) { // Renamed type
		await this.stateManager.overwriteApexMessages(newMessages); // Delegate with potentially renamed method in StateManager
	}
	public async saveApexMessagesAndUpdateHistory() { // Renamed method back
		await this.stateManager.saveApexMessagesAndUpdateHistory(); // Corrected method name back
	}

	// Checkpoint Management (Delegate to CheckpointManager)
	async restoreCheckpoint(messageTs: number, restoreType: ApexCheckpointRestore) {
		await this.checkpointManager.restoreCheckpoint(messageTs, restoreType);
	}
	async presentMultifileDiff(messageTs: number, seeNewChangesSinceLastTaskCompletion: boolean) {
		await this.checkpointManager.presentMultifileDiff(messageTs, seeNewChangesSinceLastTaskCompletion);
	}
	async doesLatestTaskCompletionHaveNewChanges() {
		return await this.checkpointManager.doesLatestTaskCompletionHaveNewChanges();
	}
	async saveCheckpoint(isAttemptCompletionMessage: boolean = false) {
		await this.checkpointManager.saveCheckpoint(isAttemptCompletionMessage);
	}

	// Tool Execution Helpers (Delegate to ToolExecutor)
	shouldAutoApproveTool(toolName: ToolUseName): boolean {
		return this.toolExecutor.shouldAutoApproveTool(toolName);
	}
	// executeCommandTool needs careful delegation or access to TerminalManager

	// Context Loading (Delegate to ContextLoader)
	async loadContext(userContent: UserContent, includeFileDetails: boolean = false) {
		return await this.contextLoader.loadContext(userContent, includeFileDetails);
	}
	async getEnvironmentDetails(includeFileDetails: boolean = false) {
		return await this.contextLoader.getEnvironmentDetails(includeFileDetails);
	}

	// API Request/Stream Handling methods are now fully contained within their respective modules (ApiHandlerModule, StreamProcessor)
	// and initiated via initiateTaskLoop. No need for placeholder delegations here.

	// Task lifecycle methods delegate to modules

	private async startTask(task?: string, images?: string[]): Promise<void> {
		try {
			await this.stateManager.resetStateForNewTask();
			const controller = this.controllerRef.deref(); // Get controller instance
            if (controller) {await postStateToWebview(controller);} // Use imported function
			await this.webviewCommunicator.say("text", task, images);
			this.isInitialized = true; // Keep initialization flag here

			let imageBlocks: Anthropic.ImageBlockParam[] = formatResponse.imageBlocks(images);
			const initialUserContent: UserContent = [
				{ type: "text", text: `<task>\n${task}\n</task>` },
				...imageBlocks,
			];
			await this.apiHandlerModule.initiateTaskLoop(initialUserContent);
		} catch (error) {
			console.error("Error during startTask:", error);
			this.webviewCommunicator.say("error", `Task failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private async resumeTaskFromHistory() {
		try {
			await this.stateManager.loadStateFromHistory(); // Loads state into stateManager

			// Access state via stateManager
			const lastApexMessage = this.stateManager.apexMessages // Use stateManager.apexMessages (assuming it holds ApexMessage[])
				.slice().reverse()
				.find((m: ApexMessage) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"));

			const askType: ApexAsk = lastApexMessage?.ask === "completion_result" ? "resume_completed_task" : "resume_task"; // Use ApexAsk
			this.isInitialized = true; // Keep initialization flag here

			const { response, text, images } = await this.webviewCommunicator.ask(askType);
			let responseText: string | undefined;
			let responseImages: string[] | undefined;
			if (response === "messageResponse") {
				await this.webviewCommunicator.say("user_feedback", text, images);
				responseText = text;
				responseImages = images;
			}

			// Access history via stateManager
			const existingApiHistory = this.stateManager.apiConversationHistory; // Access via stateManager
			let modifiedOldUserContent: UserContent = [];
			let finalApiHistory: Anthropic.MessageParam[] = [];

			if (existingApiHistory.length > 0) {
				const lastApiMessage = existingApiHistory[existingApiHistory.length - 1];
				if (lastApiMessage.role === "assistant") {
					finalApiHistory = [...existingApiHistory];
				} else if (lastApiMessage.role === "user") {
					const existingUserContent: UserContent = Array.isArray(lastApiMessage.content) ? lastApiMessage.content : [{ type: "text", text: lastApiMessage.content }];
					finalApiHistory = existingApiHistory.slice(0, -1); // Correct: Use existingApiHistory
					modifiedOldUserContent = [...existingUserContent];
				} else {
					throw new Error("Unexpected API history state");
				}
			} else {
				console.warn("Resuming task with empty API history");
			}

			let newUserContent: UserContent = [...modifiedOldUserContent];
			const agoText = (() => { /* ... agoText calculation ... */
				const timestamp = lastApexMessage?.ts ?? Date.now(); // Use lastApexMessage
				const now = Date.now();
				const diff = now - timestamp;
				const minutes = Math.floor(diff / 60000);
				const hours = Math.floor(minutes / 60);
				const days = Math.floor(hours / 24);
				if (days > 0) {return `${days} day${days > 1 ? "s" : ""} ago`;}
				if (hours > 0) {return `${hours} hour${hours > 1 ? "s" : ""} ago`;}
				if (minutes > 0) {return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;}
				return "just now";
			})();
			const wasRecent = lastApexMessage?.ts && Date.now() - lastApexMessage.ts < 30_000; // Use lastApexMessage

			newUserContent.push({
				type: "text",
				text: formatResponse.taskResumption(this.chatSettings?.mode === "plan" ? "plan" : "act", agoText, cwd, wasRecent, responseText),
			});
			if (responseImages?.length) {
				newUserContent.push(...formatResponse.imageBlocks(responseImages));
			}

			await this.stateManager.overwriteApiConversationHistory(finalApiHistory);
			await this.apiHandlerModule.initiateTaskLoop(newUserContent);

		} catch (error) {
			console.error("Error during task resumption:", error);
			this.webviewCommunicator.say("error", `Task failed to resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async abortTask() {
		this.abort = true; // Signal abort
		// Dispose/close resources managed directly or via modules
		this.terminalManager.disposeAll();
		this.urlContentFetcher.closeBrowser();
		this.browserSession.closeBrowser();
		this.apexIgnoreController.dispose(); // Renamed
		await this.diffViewProvider.revertChanges();
		await this.backendCommunicator.shutdownBackend();
		// Modules should check this.task.abort internally if they have long-running processes
	}

	// --- Python Backend Communication (Delegate to BackendCommunicator) ---
	// setupBackendConnection is called in constructor via backendCommunicator
	// sendBackendRequest is called by modules needing backend interaction via this.backendCommunicator
	// shutdownBackend is called in abortTask via backendCommunicator
}
