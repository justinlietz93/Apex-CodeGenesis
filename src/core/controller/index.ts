import * as vscode from "vscode"
import { buildApiHandler } from "../../api" // Keep necessary imports
import { cleanupLegacyCheckpoints } from "../../integrations/checkpoints/CheckpointMigration"
import WorkspaceTracker from "../../integrations/workspace/WorkspaceTracker"
import { ApexAccountService } from "../../services/account/ApexAccountService"
import crypto from "crypto" // Added missing import
import { McpHub } from "../../services/mcp/McpHub"
import { telemetryService } from "../../services/telemetry/TelemetryService"
import { ExtensionMessage, ExtensionState, Invoke, UserProfile, CustomInstructionItem } from "../../shared/ExtensionMessage" // Added UserProfile, CustomInstructionItem
import { WebviewMessage } from "../../shared/WebviewMessage"
import { Task } from "../task"
import { openMention } from "../mentions"
import {
	getAllExtensionState,
	getGlobalState,
	getSecret,
	resetExtensionState,
	storeSecret,
	updateApiConfiguration, // Keep for now, might be replaced by profile update
	updateGlobalState,
	// Import new state functions for profiles/library
	createProfile,
	deleteProfile,
	setActiveProfileId,
	updateProfile,
	createCustomInstruction,
	updateCustomInstruction,
	deleteCustomInstruction,
	updateActiveProfileSettings, // Import the new function for updating profile settings
} from "../storage/state"
import { WebviewProvider } from "../webview"
import { ChatSettings } from "../../shared/ChatSettings" // Added import
import { ChatContent } from "../../shared/ChatContent" // Added import
import { ApexCheckpointRestore } from "../../shared/WebviewMessage" // Added import

// Import functions from modules
import {
	getVsCodeLmModels,
	getOllamaModels,
	getLmStudioModels,
	refreshOpenRouterModels,
	getOpenAiModels,
	readOpenRouterModels,
} from "./modules/api-helpers" // Keep this import
import {
	handleSignOut,
	setUserInfo,
	validateAuthState,
	handleAuthCallback,
	handleOpenRouterCallback,
} from "./modules/auth-handler" // Keep this import
import { addSelectedCodeToChat, addSelectedTerminalOutputToChat, fixWithApex } from "./modules/context-actions" // Keep this import
import {
	getTaskWithId,
	showTaskWithId,
	exportTaskWithId,
	deleteTaskWithId,
	deleteAllTaskHistory,
	updateTaskHistory,
	refreshTotalTasksSize,
} from "./modules/history-manager" // Keep this import
import { downloadMcp, fetchMcpMarketplace, silentlyRefreshMcpMarketplace } from "./modules/mcp-handler" // Keep this import
import { fetchOpenGraphData, checkIsImageUrl } from "./modules/misc-helpers" // Keep this import
import { getStateToPostToWebview, postStateToWebview, updateTelemetrySetting } from "./modules/state-updater" // Removed updateCustomInstructions from here
import { initApexWithTask, initApexWithHistoryItem, clearTask, cancelTask } from "./modules/task-lifecycle"
import { postMessageToWebview as postMessageToWebviewUtil } from "./modules/webview-handler" // Keep renamed import for clarity
import { openFile, openImage } from "../../integrations/misc/open-file"
import { selectImages } from "../../integrations/misc/process-images"
import { getTheme } from "../../integrations/theme/getTheme"
import { searchCommits } from "../../utils/git"
import pWaitFor from "p-wait-for" // Added import

export class Controller {
	private disposables: vscode.Disposable[] = []
	// Make previously private members public for access by module functions
	public task?: Task
	public latestAnnouncementId = "march-22-2025"
	public webviewProviderRef: WeakRef<WebviewProvider>
	public context: vscode.ExtensionContext // Make context public
	public outputChannel: vscode.OutputChannel // Make outputChannel public

	// Keep these public as they are accessed by modules or other parts
	public workspaceTracker?: WorkspaceTracker
	public mcpHub?: McpHub
	public accountService?: ApexAccountService

	constructor(
		context: vscode.ExtensionContext, // Renamed parameter to avoid shadowing class member
		outputChannel: vscode.OutputChannel, // Renamed parameter
		webviewProvider: WebviewProvider,
	) {
		this.context = context // Assign to public member
		this.outputChannel = outputChannel // Assign to public member
		this.outputChannel.appendLine("ApexProvider instantiated")
		this.webviewProviderRef = new WeakRef(webviewProvider)

		this.workspaceTracker = new WorkspaceTracker(this)
		this.mcpHub = new McpHub(this)
		this.accountService = new ApexAccountService(this)

		// Clean up legacy checkpoints (can remain here)
		cleanupLegacyCheckpoints(this.context.globalStorageUri.fsPath, this.outputChannel).catch((error) => {
			console.error("Failed to cleanup legacy checkpoints:", error)
		})
	}

	async dispose() {
		this.outputChannel.appendLine("Disposing ApexProvider...")
		await clearTask(this) // Use imported function
		this.outputChannel.appendLine("Cleared task")
		while (this.disposables.length) {
			const x = this.disposables.pop()
			if (x) {
				x.dispose()
			}
		}
		this.workspaceTracker?.dispose()
		this.workspaceTracker = undefined
		this.mcpHub?.dispose()
		this.mcpHub = undefined
		this.accountService = undefined // Assuming ApexAccountService doesn't need dispose
		this.outputChannel.appendLine("Disposed all disposables")
		console.error("Controller disposed")
	}

	// Centralized webview message handler delegating to modules
	async handleWebviewMessage(message: WebviewMessage) {
		console.log(`[Controller] Handling webview message: ${message.type}`) // Add logging

		// Use imported utility for posting messages back
		const postMessage = (msg: ExtensionMessage) => postMessageToWebviewUtil(this.webviewProviderRef, msg)

		try {
			switch (message.type) {
				// Webview Lifecycle / Basic State
				case "webviewDidLaunch":
					await postStateToWebview(this) // Use imported function
					this.workspaceTracker?.populateFilePaths() // Don't await
					getTheme().then((theme) => postMessage({ type: "theme", text: JSON.stringify(theme) }))
					readOpenRouterModels(this).then(
						(models) => models && postMessage({ type: "openRouterModels", openRouterModels: models }),
					) // Use imported api-helper
					getGlobalState(this.context, "justinlietz93.apex.mcpMarketplaceCatalog").then(
						(catalog) =>
							catalog && postMessage({ type: "mcpMarketplaceCatalog", mcpMarketplaceCatalog: catalog as any }),
					)
					silentlyRefreshMcpMarketplace(this) // Use imported mcp-handler
					refreshOpenRouterModels(this) // Use imported api-helper
					// Use imported function directly
					getStateToPostToWebview(this).then((state) =>
						telemetryService.updateTelemetryState(state.telemetrySetting === "enabled"),
					) // Use imported state-updater
					break
				case "getLatestState":
					await postStateToWebview(this) // Use imported function
					break
				case "didShowAnnouncement":
					await updateGlobalState(this.context, "justinlietz93.apex.lastShownAnnouncementId", this.latestAnnouncementId)
					await postStateToWebview(this) // Use imported function
					break

				// Task Lifecycle handled by task-lifecycle module
				case "newTask":
					await initApexWithTask(this, message.text, message.images) // Use imported
					break
				case "clearTask":
					await clearTask(this) // Use imported
					await postStateToWebview(this) // Use imported function
					break
				case "cancelTask": // cancelTask handles its own state update via initApexWithHistoryItem
					await cancelTask(this) // Use imported
					break
				case "showTaskWithId":
					await showTaskWithId(this, message.text!) // Use imported
					break
				case "deleteTaskWithId":
					await deleteTaskWithId(this, message.text!) // Use imported
					break
				case "exportCurrentTask":
					if (this.task?.taskId) {
						await exportTaskWithId(this, this.task.taskId) // Use imported
					}
					break
				case "exportTaskWithId":
					await exportTaskWithId(this, message.text!) // Use imported
					break
				case "clearAllTaskHistory":
					await deleteAllTaskHistory(this) // Use imported
					// State update happens within deleteAllTaskHistory now
					await refreshTotalTasksSize(this) // Use imported
					await postMessage({ type: "relinquishControl" })
					break
				case "requestTotalTasksSize":
					await refreshTotalTasksSize(this) // Use imported
					break

				// User Interaction / Input Handling
				case "askResponse":
					// Access the method via the task's webviewCommunicator
					this.task?.webviewCommunicator?.handleWebviewAskResponse(message.askResponse!, message.text, message.images)
					break
				case "optionsResponse":
					await postMessage({ type: "invoke", invoke: "sendMessage", text: message.text })
					break
				case "selectImages": {
					const images = await selectImages()
					await postMessage({ type: "selectedImages", images })
					break
				}
				case "taskFeedback":
					if (message.feedbackType && this.task?.taskId) {
						telemetryService.captureTaskFeedback(this.task.taskId, message.feedbackType)
					}
					break

				// Settings & Configuration - Refactored for Profiles
				case "apiConfiguration": // This likely comes from the SettingsView saving changes for the *active* profile
					if (message.apiConfiguration) {
						// updateApiConfiguration now handles updating the active profile
						await updateApiConfiguration(this.context, message.apiConfiguration)
						if (this.task) {
							// Re-fetch the potentially updated config for the active profile
							const { apiConfiguration: updatedConfig } = await getAllExtensionState(this.context)
							if (updatedConfig) {
								// Check if config exists (it should if a profile is active)
								this.task.api = buildApiHandler(updatedConfig)
							}
						}
					}
					await postStateToWebview(this) // Use imported function
					break
				case "autoApprovalSettings":
					if (message.autoApprovalSettings) {
						// Update setting within the active profile
						await updateActiveProfileSettings(this.context, { autoApprovalSettings: message.autoApprovalSettings })
						if (this.task) {
							this.task.autoApprovalSettings = message.autoApprovalSettings // Update task instance too
						}
						await postStateToWebview(this) // Use imported function
					}
					break
				case "browserSettings":
					if (message.browserSettings) {
						await updateActiveProfileSettings(this.context, { browserSettings: message.browserSettings })
						if (this.task?.browserSession) {
							this.task.browserSession.browserSettings = message.browserSettings
						}
						await postStateToWebview(this) // Use imported function
					}
					break
				case "togglePlanActMode": // Keep togglePlanActModeWithChatSettings method in Controller for now
					if (message.chatSettings) {
						// This function needs access to controller state/methods, keep it here
						await this.togglePlanActModeWithChatSettings(message.chatSettings, message.chatContent)
					}
					break
				case "telemetrySetting": // This is a global setting, not profile-specific
					if (message.telemetrySetting) {
						await updateTelemetrySetting(this, message.telemetrySetting) // Use imported function from state-updater
					}
					await postStateToWebview(this) // Use imported function
					break
				case "updateSettings": {
					// This message type might need adjustment for profiles
					// API config is handled by "apiConfiguration" message
					// Custom instructions are handled by "setActiveCustomInstruction" or library management messages
					// Telemetry is global ("telemetrySetting" message)
					// Other settings are now profile-specific
					const settingsToUpdate: Partial<Omit<UserProfile, "profileId" | "profileName" | "apiConfiguration">> = {}
					if (message.planActSeparateModelsSetting !== undefined) {
						settingsToUpdate.planActSeparateModelsSetting = message.planActSeparateModelsSetting
						if (this.task) {
							this.task.planActSeparateModelsSetting = message.planActSeparateModelsSetting
						}
					}
					if (message.chatSettings) {
						settingsToUpdate.chatSettings = message.chatSettings
						if (this.task) {
							this.task.chatSettings = message.chatSettings
						}
					}
					if (message.autoApprovalSettings) {
						settingsToUpdate.autoApprovalSettings = message.autoApprovalSettings
						if (this.task) {
							this.task.autoApprovalSettings = message.autoApprovalSettings
						}
					}
					if (message.browserSettings) {
						settingsToUpdate.browserSettings = message.browserSettings
						if (this.task?.browserSession) {
							this.task.browserSession.browserSettings = message.browserSettings
						}
					}
					// Update all collected settings in one go
					if (Object.keys(settingsToUpdate).length > 0) {
						await updateActiveProfileSettings(this.context, settingsToUpdate)
					}

					await postStateToWebview(this) // Use imported function
					await postMessage({ type: "didUpdateSettings" })
					break
				}
				case "openExtensionSettings": {
					const settingsFilter = message.text || ""
					await vscode.commands.executeCommand(
						"workbench.action.openSettings",
						`@ext:justinlietz93.apex-ide-codegenesis ${settingsFilter}`.trim(),
					)
					break
				}
				case "openSettings": // Likely intended to open the webview settings view
					await postMessage({ type: "action", action: "settingsButtonClicked" })
					break

				// --- NEW Profile Management Handlers ---
				case "createProfile":
					if (message.text) {
						// Assuming profile name is sent in 'text'
						const newProfile = await createProfile(this.context, message.text)
						// Optionally set the new profile as active
						await setActiveProfileId(this.context, newProfile.profileId)
						await postStateToWebview(this) // Update UI with new profile list and active ID
					}
					break
				case "deleteProfile":
					if (message.text) {
						// Assuming profile ID is sent in 'text'
						await deleteProfile(this.context, message.text)
						await postStateToWebview(this) // Update UI
					}
					break
				case "setActiveProfile":
					if (message.text) {
						// Assuming profile ID is sent in 'text'
						await setActiveProfileId(this.context, message.text)
						// Reload task with new profile settings? Or just update state?
						// For simplicity, just update state for now. Task will use new settings on next run.
						// If a task is active, we might want to clear it or update its settings based on the new profile
						if (this.task) {
							const newState = await getAllExtensionState(this.context)
							this.task.api = buildApiHandler(newState.apiConfiguration!) // Update API handler
							this.task.customInstructions = newState.customInstructions // Update instructions
							this.task.chatSettings = newState.chatSettings // Update chat settings
							this.task.planActSeparateModelsSetting = newState.planActSeparateModelsSetting // Update planAct setting
							// Update other relevant task properties...
						}
						await postStateToWebview(this)
					}
					break
				case "updateProfile": // For renaming, etc. (not settings within profile)
					if (message.profile) {
						// Assuming the updated UserProfile object is sent
						await updateProfile(this.context, message.profile)
						await postStateToWebview(this)
					}
					break

				// --- NEW Custom Instruction Library Handlers ---
				case "createCustomInstruction":
					if (message.name && message.text) {
						// Assuming name and content are sent
						const newItem = await createCustomInstruction(this.context, message.name, message.text)
						// Optionally set this as active for the current profile?
						// await updateActiveProfileSettings(this.context, { activeCustomInstructionId: newItem.id });
						await postStateToWebview(this) // Update UI with new library item
					}
					break
				case "updateCustomInstruction":
					if (message.customInstruction) {
						// Assuming updated CustomInstructionItem is sent
						await updateCustomInstruction(this.context, message.customInstruction)
						// If this was the active instruction, update task state if needed
						const state = await getAllExtensionState(this.context) // Re-fetch state to get latest library
						if (this.task && state.activeProfileId && state.userProfiles) {
							const activeProfile = state.userProfiles.find(
								(p: UserProfile) => p.profileId === state.activeProfileId,
							) // Added UserProfile type
							if (activeProfile?.activeCustomInstructionId === message.customInstruction.id) {
								// Update the task's custom instructions if the updated one was active
								this.task.customInstructions = message.customInstruction.content
							}
						}
						await postStateToWebview(this) // Update UI
					}
					break
				case "deleteCustomInstruction":
					if (message.text) {
						// Assuming instruction ID is sent in 'text'
						await deleteCustomInstruction(this.context, message.text)
						// If this was the active instruction, update task state if needed
						const state = await getAllExtensionState(this.context)
						if (this.task && state.activeProfileId && state.userProfiles) {
							const activeProfile = state.userProfiles.find(
								(p: UserProfile) => p.profileId === state.activeProfileId,
							) // Added UserProfile type
							if (activeProfile?.activeCustomInstructionId === message.text) {
								this.task.customInstructions = undefined // Clear active instruction in task
							}
						}
						await postStateToWebview(this) // Update UI
					}
					break
				case "setActiveCustomInstruction": {
					// Sets the active instruction for the *current* profile
					const instructionId = message.text || null // Use null if text is empty/undefined
					await updateActiveProfileSettings(this.context, { activeCustomInstructionId: instructionId })
					// Update active task if necessary
					if (this.task) {
						const state = await getAllExtensionState(this.context)
						const activeInstruction = instructionId
							? state.customInstructionLibrary?.find((item) => item.id === instructionId)?.content
							: undefined
						this.task.customInstructions = activeInstruction
					}
					await postStateToWebview(this)
					break
				}

				// Authentication
				case "authStateChanged":
					await setUserInfo(this, message.user || undefined) // Use imported function from auth-handler
					await postStateToWebview(this) // Use imported function
					break
				case "accountLoginClicked": {
					const nonce = crypto.randomBytes(32).toString("hex") // Now crypto is defined
					await storeSecret(this.context, "justinlietz93.apex.authNonce", nonce)
					const uriScheme = vscode.env.uriScheme
					const authUrl = vscode.Uri.parse(
						`https://app.apex.bot/auth?state=${encodeURIComponent(nonce)}&callback_url=${encodeURIComponent(`${uriScheme || "vscode"}://justinlietz93.apex-ide-codegenesis/auth`)}`,
					)
					vscode.env.openExternal(authUrl)
					break
				}
				case "accountLogoutClicked":
					await handleSignOut(this) // Use imported auth-handler
					break
				case "showAccountViewClicked":
					await postMessage({ type: "action", action: "accountButtonClicked" })
					break
				case "fetchUserCreditsData":
					// Assuming accountService is initialized in constructor
					await Promise.all([
						this.accountService?.fetchBalance(),
						this.accountService?.fetchUsageTransactions(),
						this.accountService?.fetchPaymentTransactions(),
					]).catch((error) => console.error("Failed to fetch user credits data:", error))
					break

				// API Model Fetching (Delegated to api-helpers)
				case "requestOllamaModels": {
					const ollamaModels = await getOllamaModels(message.text) // Use imported api-helper
					await postMessage({ type: "ollamaModels", ollamaModels })
					break
				}
				case "requestLmStudioModels": {
					const lmStudioModels = await getLmStudioModels(message.text) // Use imported api-helper
					await postMessage({ type: "lmStudioModels", lmStudioModels })
					break
				}
				case "requestVsCodeLmModels": {
					const vsCodeLmModels = await getVsCodeLmModels() // Use imported api-helper
					await postMessage({ type: "vsCodeLmModels", vsCodeLmModels })
					break
				}
				case "refreshOpenRouterModels":
					await refreshOpenRouterModels(this) // Use imported api-helper
					break
				case "refreshOpenAiModels": {
					const { apiConfiguration: currentApiConfig } = await getAllExtensionState(this.context)
					// Ensure currentApiConfig is not undefined before accessing properties
					if (currentApiConfig) {
						const openAiModels = await getOpenAiModels(currentApiConfig.openAiBaseUrl, currentApiConfig.openAiApiKey) // Use imported api-helper
						await postMessage({ type: "openAiModels", openAiModels })
					} else {
						console.warn("[Controller] Cannot refresh OpenAI models: No active API configuration found.")
					}
					break
				}

				// File/Resource Opening & Interaction (Delegated to misc-helpers and integrations/misc/open-file)
				case "openImage":
					openImage(message.text!)
					break
				case "openInBrowser":
					if (message.url) {
						vscode.env.openExternal(vscode.Uri.parse(message.url))
					}
					break
				case "openFile":
					openFile(message.text!)
					break
				case "openMention":
					openMention(message.text) // Keep local mention handling? Or move? Keep for now.
					break

				// Checkpoints (Handled by Task -> CheckpointManager)
				case "checkpointDiff":
					if (message.number) {
						await this.task?.presentMultifileDiff(message.number, false)
					}
					break
				case "checkpointRestore":
					await cancelTask(this) // Use imported cancelTask which handles re-init
					if (message.number && this.task) {
						// Check task exists after cancel/re-init
						await pWaitFor(() => this.task?.isInitialized === true, { timeout: 3_000 }).catch(() =>
							console.error("Timeout waiting for task re-initialization after cancel"),
						)
						if (this.task) {
							await this.task.restoreCheckpoint(message.number, message.text! as ApexCheckpointRestore)
						}
					}
					break
				case "taskCompletionViewChanges":
					if (message.number) {
						await this.task?.presentMultifileDiff(message.number, true)
					}
					break

				// MCP (Model Context Protocol) (Delegated to mcp-handler and McpHub)
				case "addRemoteServer":
					try {
						await this.mcpHub?.addRemoteServer(message.serverName!, message.serverUrl!)
						await postMessage({
							type: "addRemoteServerResult",
							addRemoteServerResult: { success: true, serverName: message.serverName! },
						})
					} catch (error) {
						await postMessage({
							type: "addRemoteServerResult",
							addRemoteServerResult: { success: false, serverName: message.serverName!, error: error.message },
						})
					}
					break
				case "showMcpView": {
					await postMessage({ type: "action", action: "mcpButtonClicked" })
					break
				}
				case "openMcpSettings": {
					const mcpSettingsFilePath = await this.mcpHub?.getMcpSettingsFilePath()
					if (mcpSettingsFilePath) {
						openFile(mcpSettingsFilePath)
					}
					break
				}
				case "fetchMcpMarketplace":
					await fetchMcpMarketplace(this, message.bool) // Use imported mcp-handler
					break
				case "downloadMcp":
					if (message.mcpId) {
						await downloadMcp(this, message.mcpId)
					} // Use imported mcp-handler
					break
				case "silentlyRefreshMcpMarketplace":
					await silentlyRefreshMcpMarketplace(this) // Use imported mcp-handler
					break
				case "toggleMcpServer":
					await this.mcpHub
						?.toggleServerDisabled(message.serverName!, message.disabled!)
						.catch((e) => console.error(`Failed toggle MCP server ${message.serverName}:`, e))
					break
				case "toggleToolAutoApprove":
					await this.mcpHub
						?.toggleToolAutoApprove(message.serverName!, message.toolNames!, message.autoApprove!)
						.catch((e) => console.error(`Failed toggle tool auto-approve for ${message.serverName}:`, e))
					break
				case "restartMcpServer":
					await this.mcpHub
						?.restartConnection(message.text!)
						.catch((e) => console.error(`Failed restart MCP server ${message.text}:`, e))
					break
				case "deleteMcpServer":
					if (message.serverName) {
						this.mcpHub?.deleteServer(message.serverName)
					}
					break
				case "fetchLatestMcpServersFromHub":
					this.mcpHub?.sendLatestMcpServers()
					break
				case "updateMcpTimeout":
					if (message.serverName && message.timeout) {
						await this.mcpHub
							?.updateServerTimeout(message.serverName, message.timeout)
							.catch((e) => console.error(`Failed update timeout for ${message.serverName}:`, e))
					}
					break

				// Miscellaneous (Delegated to misc-helpers and utils/git)
				case "fetchOpenGraphData":
					await fetchOpenGraphData(this, message.text!) // Use imported misc-helper
					break
				case "checkIsImageUrl":
					await checkIsImageUrl(this, message.text!) // Use imported misc-helper
					break
				case "searchCommits": {
					const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0)
					if (cwd) {
						try {
							const commits = await searchCommits(message.text || "", cwd)
							await postMessage({ type: "commitSearchResults", commits })
						} catch (error) {
							console.error(`Error searching commits: ${JSON.stringify(error)}`)
						}
					}
					break
				}
				case "invoke": {
					// Generic invoke for UI actions
					if (message.text) {
						await postMessage({ type: "invoke", invoke: message.text as Invoke })
					}
					break
				}
				case "resetState": // Developer action
					await this.resetState() // Keep resetState method on Controller for now
					break

				default:
					// Let specific handlers potentially deal with unknown types if needed, or log here
					// const exhaustiveCheck: never = message.type; // Comment out exhaustive check for now
					console.warn(`[Controller] Received unknown or unhandled webview message type: ${message.type}`)
					break
			}
		} catch (error) {
			console.error(`[Controller] Error handling webview message type ${message.type}:`, error)
			// Optionally notify the user or webview about the error
			vscode.window.showErrorMessage(`Error processing action: ${error.message}`)
			// Correcting the type for the error message post - Add 'error' to ExtensionMessage type definition if missing, or cast here if necessary
			await postMessage({ type: "error" as any, error: `Failed to handle action ${message.type}: ${error.message}` }) // Using 'as any' temporarily, assuming 'error' type needs adding to ExtensionMessage
		}
	}

	// Keep togglePlanActModeWithChatSettings here for now as it modifies controller state directly
	// It could potentially be moved if state management is further centralized.
	async togglePlanActModeWithChatSettings(chatSettings: ChatSettings, chatContent?: ChatContent) {
		const didSwitchToActMode = chatSettings.mode === "act"
		telemetryService.captureModeSwitch(this.task?.taskId ?? "0", chatSettings.mode)
		const {
			apiConfiguration,
			previousModeApiProvider: newApiProvider,
			previousModeModelId: newModelId,
			previousModeModelInfo: newModelInfo,
			previousModeVsCodeLmModelSelector: newVsCodeLmModelSelector,
			previousModeThinkingBudgetTokens: newThinkingBudgetTokens,
			planActSeparateModelsSetting,
		} = await getAllExtensionState(this.context)

		const shouldSwitchModel = planActSeparateModelsSetting === true

		if (shouldSwitchModel) {
			// Save current model details before switching (ensure apiConfiguration is not undefined)
			if (apiConfiguration) {
				await updateGlobalState(this.context, "justinlietz93.apex.previousModeApiProvider", apiConfiguration.apiProvider)
				await updateGlobalState(
					this.context,
					"justinlietz93.apex.previousModeThinkingBudgetTokens",
					apiConfiguration.thinkingBudgetTokens,
				)
				// ... (rest of the saving logic based on apiProvider) ...
				switch (apiConfiguration.apiProvider) {
					case "anthropic":
					case "bedrock":
					case "vertex":
					case "gemini":
					case "asksage":
					case "openai-native":
					case "qwen":
					case "deepseek":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.apiModelId,
						)
						break
					case "openrouter":
					case "apex":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.openRouterModelId,
						)
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelInfo",
							apiConfiguration.openRouterModelInfo,
						)
						break
					case "vscode-lm":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeVsCodeLmModelSelector",
							apiConfiguration.vsCodeLmModelSelector,
						)
						break
					case "openai":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.openAiModelId,
						)
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelInfo",
							apiConfiguration.openAiModelInfo,
						)
						break
					case "ollama":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.ollamaModelId,
						)
						break
					case "lmstudio":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.lmStudioModelId,
						)
						break
					case "litellm":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.liteLlmModelId,
						)
						break
					case "requesty":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.previousModeModelId",
							apiConfiguration.requestyModelId,
						)
						break
				}
			}

			// Restore previous mode's model details
			if (newApiProvider || newModelId || newThinkingBudgetTokens !== undefined || newVsCodeLmModelSelector) {
				await updateGlobalState(this.context, "justinlietz93.apex.apiProvider", newApiProvider)
				await updateGlobalState(this.context, "justinlietz93.apex.thinkingBudgetTokens", newThinkingBudgetTokens)
				// ... (rest of the restoring logic based on newApiProvider) ...
				switch (newApiProvider) {
					case "anthropic":
					case "bedrock":
					case "vertex":
					case "gemini":
					case "asksage":
					case "openai-native":
					case "qwen":
					case "deepseek":
						await updateGlobalState(this.context, "justinlietz93.apex.apiModelId", newModelId)
						break
					case "openrouter":
					case "apex":
						await updateGlobalState(this.context, "justinlietz93.apex.openRouterModelId", newModelId)
						await updateGlobalState(this.context, "justinlietz93.apex.openRouterModelInfo", newModelInfo)
						break
					case "vscode-lm":
						await updateGlobalState(
							this.context,
							"justinlietz93.apex.vsCodeLmModelSelector",
							newVsCodeLmModelSelector,
						)
						break
					case "openai":
						await updateGlobalState(this.context, "justinlietz93.apex.openAiModelId", newModelId)
						await updateGlobalState(this.context, "justinlietz93.apex.openAiModelInfo", newModelInfo)
						break
					case "ollama":
						await updateGlobalState(this.context, "justinlietz93.apex.ollamaModelId", newModelId)
						break
					case "lmstudio":
						await updateGlobalState(this.context, "justinlietz93.apex.lmStudioModelId", newModelId)
						break
					case "litellm":
						await updateGlobalState(this.context, "justinlietz93.apex.liteLlmModelId", newModelId)
						break
					case "requesty":
						await updateGlobalState(this.context, "justinlietz93.apex.requestyModelId", newModelId)
						break
				}

				if (this.task) {
					const { apiConfiguration: updatedApiConfiguration } = await getAllExtensionState(this.context)
					// Ensure updatedApiConfiguration is not undefined before passing to buildApiHandler
					if (updatedApiConfiguration) {
						this.task.api = buildApiHandler(updatedApiConfiguration)
					} else {
						console.error(
							"[Controller] Failed to build API handler after mode switch: No active API configuration found.",
						)
						// Handle error appropriately, maybe clear the task or show an error message
					}
				}
			}
		}

		// Update chat settings within the active profile
		await updateActiveProfileSettings(this.context, { chatSettings })
		// Post state update happens below, after potential task updates

		if (this.task) {
			// Update task's chat settings immediately
			this.task.chatSettings = chatSettings
			// Corrected property access: Check webviewCommunicator for plan response state
			if (this.task.webviewCommunicator?.isAwaitingPlanResponse && didSwitchToActMode) {
				if (this.task.webviewCommunicator) {
					// Check again for type safety
					this.task.webviewCommunicator.didRespondToPlanAskBySwitchingMode = true
				}
				await postMessageToWebviewUtil(this.webviewProviderRef, {
					// Use imported utility
					type: "invoke",
					invoke: "sendMessage",
					text: chatContent?.message || "PLAN_MODE_TOGGLE_RESPONSE", // Default response text
					images: chatContent?.images,
				})
			} else {
				await cancelTask(this) // Use imported
			}
		}
	}

	// Keep resetState here as it's a dev/debug function acting on the controller
	async resetState() {
		vscode.window.showInformationMessage("Resetting state...")
		await resetExtensionState(this.context)
		if (this.task) {
			await cancelTask(this) // Use cancelTask to ensure proper cleanup and re-init logic isn't duplicated
			this.task = undefined // Ensure task is cleared after cancel
		}
		vscode.window.showInformationMessage("State reset complete.")
		await postStateToWebview(this) // Use imported function
		await postMessageToWebviewUtil(this.webviewProviderRef, {
			// Use imported utility
			type: "action",
			action: "chatButtonClicked", // Go back to chat view
		})
	}

	// Remove getStateToPostToWebview method - now imported
	// public async getStateToPostToWebview(): Promise<ExtensionState> {
	//     return getStateToPostToWebviewUtil(this); // Delegate to imported function
	// }

	// Remove postStateToWebview method - now imported
	// public async postStateToWebview() {
	//     await postStateToWebviewUtil(this); // Delegate to imported function
	// }
}
