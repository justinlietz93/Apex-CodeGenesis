// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'
import * as vscode from "vscode" // Add vscode import
import { GitCommit } from "../utils/git"
import { ApiConfiguration, ModelInfo, ApiProvider } from "./api" // Add ApiProvider import
import { AutoApprovalSettings } from "./AutoApprovalSettings"
import { BrowserSettings } from "./BrowserSettings"
import { ChatSettings } from "./ChatSettings"
import { HistoryItem } from "./HistoryItem"
// Explicitly re-export needed types from ./mcp
export type { McpServer, McpMarketplaceCatalog, McpMarketplaceItem, McpDownloadResponse } from "./mcp"
import { McpServer, McpMarketplaceCatalog, McpMarketplaceItem, McpDownloadResponse } from "./mcp" // Keep the import for internal use
import { TelemetrySetting } from "./TelemetrySetting"
import { UserInfo } from "./UserInfo" // Added UserInfo import
// TODO: Rename ApexAccount related types/files later if necessary
import type { BalanceResponse, UsageTransaction, PaymentTransaction } from "../shared/ApexAccount"

// --- Local Profile & Custom Instruction Types ---

export interface CustomInstructionItem {
	id: string // Unique ID (e.g., timestamp or UUID)
	name: string // User-defined name
	content: string // The actual instructions
	lastModified: number // Timestamp of last edit
}

export interface UserProfile {
	profileId: string // Unique ID
	profileName: string // User-defined name
	apiConfiguration: ApiConfiguration
	// Store the ID of the active custom instruction, not the content itself
	activeCustomInstructionId: string | null
	chatSettings: ChatSettings
	autoApprovalSettings: AutoApprovalSettings
	browserSettings: BrowserSettings
	planActSeparateModelsSetting: boolean
	// Add other profile-specific settings here if needed in the future
}

// --- End Local Profile & Custom Instruction Types ---

// webview will hold state
export interface ExtensionMessage {
	type:
		| "action"
		| "state"
		| "selectedImages"
		| "ollamaModels"
		| "lmStudioModels"
		| "theme"
		| "workspaceUpdated"
		| "invoke"
		| "partialMessage"
		| "openRouterModels"
		| "openAiModels"
		| "mcpServers"
		| "relinquishControl"
		| "vsCodeLmModels"
		| "requestVsCodeLmModels"
		| "authCallback"
		| "mcpMarketplaceCatalog"
		| "mcpDownloadDetails"
		| "commitSearchResults"
		| "openGraphData"
		| "isImageUrlResult"
		| "didUpdateSettings"
		| "addRemoteServerResult"
		| "userCreditsBalance"
		| "userCreditsUsage"
		| "userCreditsPayments"
		| "totalTasksSize"
		| "addToInput"
		| "webviewCommand" // Added for messages originating from webview intended for backend
	text?: string
	command?: string // Added for webviewCommand type
	data?: any // Added for webviewCommand type
	action?:
		| "chatButtonClicked"
		| "mcpButtonClicked"
		| "settingsButtonClicked"
		| "historyButtonClicked"
		| "didBecomeVisible"
		| "accountLoginClicked"
		| "accountLogoutClicked"
		| "accountButtonClicked"
	invoke?: Invoke
	state?: ExtensionState
	images?: string[]
	ollamaModels?: string[]
	lmStudioModels?: string[]
	vsCodeLmModels?: { vendor?: string; family?: string; version?: string; id?: string }[]
	filePaths?: string[]
	partialMessage?: ApexMessage // Renamed
	openRouterModels?: Record<string, ModelInfo>
	openAiModels?: string[]
	mcpServers?: McpServer[]
	customToken?: string
	mcpMarketplaceCatalog?: McpMarketplaceCatalog
	error?: string
	mcpDownloadDetails?: McpDownloadResponse
	commits?: GitCommit[]
	openGraphData?: {
		title?: string
		description?: string
		image?: string
		url?: string
		siteName?: string
		type?: string
	}
	url?: string
	isImage?: boolean
	userCreditsBalance?: BalanceResponse
	userCreditsUsage?: UsageTransaction[]
	userCreditsPayments?: PaymentTransaction[]
	totalTasksSize?: number | null
	addRemoteServerResult?: {
		success: boolean
		serverName: string
		error?: string
	}
}

export type Invoke = "sendMessage" | "primaryButtonClick" | "secondaryButtonClick"

export type Platform = "aix" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32" | "unknown"

export const DEFAULT_PLATFORM = "unknown"

export interface ExtensionState {
	apiConfiguration?: ApiConfiguration
	autoApprovalSettings: AutoApprovalSettings
	browserSettings: BrowserSettings
	chatSettings: ChatSettings
	checkpointTrackerErrorMessage?: string
	apexMessages: ApexMessage[] // Renamed property name and type
	currentTaskItem?: HistoryItem
	customInstructions?: string
	mcpMarketplaceEnabled?: boolean
	planActSeparateModelsSetting: boolean
	platform: Platform
	shouldShowAnnouncement: boolean
	taskHistory: HistoryItem[]
	telemetrySetting: TelemetrySetting
	uriScheme?: string
	userInfo?: UserInfo // Use imported UserInfo type
	version: string
	vscMachineId: string
	// Add new state properties for profiles
	userProfiles?: UserProfile[]
	activeProfileId?: string | null
	customInstructionLibrary?: CustomInstructionItem[]
	// Add missing non-profile fields
	lastShownAnnouncementId?: string
	previousModeApiProvider?: ApiProvider
	previousModeModelId?: string
	previousModeModelInfo?: ModelInfo
	previousModeVsCodeLmModelSelector?: vscode.LanguageModelChatSelector // Need to import vscode if not already
	previousModeThinkingBudgetTokens?: number
}

// Renamed interface
export interface ApexMessage {
	ts: number
	type: "ask" | "say"
	ask?: ApexAsk // Renamed type
	say?: ApexSay // Renamed type
	text?: string
	reasoning?: string
	images?: string[]
	partial?: boolean
	lastCheckpointHash?: string
	isCheckpointCheckedOut?: boolean
	conversationHistoryIndex?: number
	conversationHistoryDeletedRange?: [number, number] // for when conversation history is truncated for API requests
}

// Renamed type
export type ApexAsk =
	| "followup"
	| "plan_mode_respond"
	| "command"
	| "command_output"
	| "completion_result"
	| "tool"
	| "api_req_failed"
	| "resume_task"
	| "resume_completed_task"
	| "mistake_limit_reached"
	| "auto_approval_max_req_reached"
	| "autonomy_step_limit_reached" // Added for autonomy pause
	| "task_token_limit_reached" // Added for Step 5.7.5
	| "browser_action_launch"
	| "use_mcp_server"

// Renamed type
export type ApexSay =
	| "task"
	| "error"
	| "api_req_started"
	| "api_req_finished"
	| "text"
	| "info" // Added for informational messages like recovery analysis
	| "reasoning"
	| "completion_result"
	| "user_feedback"
	| "user_feedback_diff"
	| "api_req_retried"
	| "command"
	| "command_output"
	| "tool"
	| "shell_integration_warning"
	| "browser_action_launch"
	| "browser_action"
	| "browser_action_result"
	| "mcp_server_request_started"
	| "mcp_server_response"
	| "use_mcp_server"
	| "diff_error"
	| "deleted_api_reqs"
	| "apexignore_error" // Keep for now, rename later if needed
	| "checkpoint_created"

// Renamed interface
export interface ApexSayTool {
	tool:
		| "editedExistingFile"
		| "newFileCreated"
		| "readFile"
		| "listFilesTopLevel"
		| "listFilesRecursive"
		| "listCodeDefinitionNames"
		| "searchFiles"
	path?: string
	diff?: string
	content?: string
	regex?: string
	filePattern?: string
}

// must keep in sync with system prompt
export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const
export type BrowserAction = (typeof browserActions)[number]

// Renamed interface
export interface ApexSayBrowserAction {
	action: BrowserAction
	coordinate?: string
	text?: string
}

export type BrowserActionResult = {
	screenshot?: string
	logs?: string
	currentUrl?: string
	currentMousePosition?: string
}

// Renamed interface
export interface ApexAskUseMcpServer {
	serverName: string
	type: "use_mcp_tool" | "access_mcp_resource"
	toolName?: string
	arguments?: string
	uri?: string
}

// Renamed interface
export interface ApexPlanModeResponse {
	response: string
	options?: string[]
	selected?: string
}

// Renamed interface
export interface ApexAskQuestion {
	question: string
	options?: string[]
	selected?: string
}

// Renamed interface
export interface ApexApiReqInfo {
	request?: string
	tokensIn?: number
	tokensOut?: number
	cacheWrites?: number
	cacheReads?: number
	cost?: number
	cancelReason?: ApexApiReqCancelReason // Renamed type
	streamingFailedMessage?: string
}

// Renamed type
export type ApexApiReqCancelReason = "streaming_failed" | "user_cancelled"

export const COMPLETION_RESULT_CHANGES_FLAG = "HAS_CHANGES"
