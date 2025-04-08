import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useEvent } from "react-use"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../../src/shared/AutoApprovalSettings"
import { ExtensionMessage, ExtensionState, DEFAULT_PLATFORM } from "../../../src/shared/ExtensionMessage"
import { ApiConfiguration, ModelInfo, openRouterDefaultModelId, openRouterDefaultModelInfo } from "../../../src/shared/api"
import { findLastIndex } from "../../../src/shared/array"
import { McpMarketplaceCatalog, McpServer } from "../../../src/shared/mcp"
import { convertTextMateToHljs } from "../utils/textMateToHljs"
import { vscode } from "../utils/vscode"
import { DEFAULT_BROWSER_SETTINGS } from "../../../src/shared/BrowserSettings"
import { DEFAULT_CHAT_SETTINGS } from "../../../src/shared/ChatSettings"
import { TelemetrySetting } from "../../../src/shared/TelemetrySetting"
// Import types needed for context
import { UserProfile, CustomInstructionItem } from "../../../src/shared/ExtensionMessage"


interface ExtensionStateContextType extends ExtensionState {
	didHydrateState: boolean
	showWelcome: boolean
	theme: any
	openRouterModels: Record<string, ModelInfo>
	openAiModels: string[]
	mcpServers: McpServer[]
	mcpMarketplaceCatalog: McpMarketplaceCatalog
	filePaths: string[]
	totalTasksSize: number | null
	// Add new state properties
	userProfiles: UserProfile[]
	activeProfileId: string | null
	customInstructionLibrary: CustomInstructionItem[]
	// Setter/Action functions
	setApiConfiguration: (config: ApiConfiguration) => void
	// setCustomInstructions: (value?: string) => void // Removed - Handled by library/profile functions
	setTelemetrySetting: (value: TelemetrySetting) => void
	setShowAnnouncement: (value: boolean) => void
	setPlanActSeparateModelsSetting: (value: boolean) => void
	// --- NEW Profile/Library Management Functions ---
	createProfile: (name: string) => void
	deleteProfile: (profileId: string) => void
	setActiveProfile: (profileId: string) => void
	updateProfile: (profile: UserProfile) => void
	createCustomInstruction: (name: string, content: string) => void
	updateCustomInstruction: (item: CustomInstructionItem) => void
	deleteCustomInstruction: (instructionId: string) => void
	setActiveCustomInstruction: (instructionId: string | null) => void
}

const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined)

export const ExtensionStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [state, setState] = useState<ExtensionState>({
		version: "",
		apexMessages: [],
		taskHistory: [],
		shouldShowAnnouncement: false,
		autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
		browserSettings: DEFAULT_BROWSER_SETTINGS,
		chatSettings: DEFAULT_CHAT_SETTINGS,
		platform: DEFAULT_PLATFORM,
		telemetrySetting: "unset",
		vscMachineId: "",
		planActSeparateModelsSetting: true,
		// Initialize new state properties
		userProfiles: [],
		activeProfileId: null,
		customInstructionLibrary: [],
	})
	const [didHydrateState, setDidHydrateState] = useState(false)
	const [showWelcome, setShowWelcome] = useState(false)
	const [theme, setTheme] = useState<any>(undefined)
	const [filePaths, setFilePaths] = useState<string[]>([])
	const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({
		[openRouterDefaultModelId]: openRouterDefaultModelInfo,
	})
	const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null)

	const [openAiModels, setOpenAiModels] = useState<string[]>([])
	const [mcpServers, setMcpServers] = useState<McpServer[]>([])
	const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({ items: [] })
	const handleMessage = useCallback((event: MessageEvent) => {
		const message: ExtensionMessage = event.data
		switch (message.type) {
			case "state": {
				setState(message.state!)
				const config = message.state?.apiConfiguration
				const hasKey = config
					? [
							config.apiKey,
							config.openRouterApiKey,
							config.awsRegion,
							config.vertexProjectId,
							config.openAiApiKey,
							config.ollamaModelId,
							config.lmStudioModelId,
							config.liteLlmApiKey,
							config.geminiApiKey,
							config.openAiNativeApiKey,
							config.deepSeekApiKey,
							config.requestyApiKey,
							config.togetherApiKey,
							config.qwenApiKey,
							config.mistralApiKey,
							config.vsCodeLmModelSelector,
							config.apexApiKey,
							config.asksageApiKey,
							config.xaiApiKey,
							config.sambanovaApiKey,
						].some((key) => key !== undefined)
					: false
				setShowWelcome(!hasKey)
				setDidHydrateState(true)
				break
			}
			case "theme": {
				if (message.text) {
					setTheme(convertTextMateToHljs(JSON.parse(message.text)))
				}
				break
			}
			case "workspaceUpdated": {
				setFilePaths(message.filePaths ?? [])
				break
			}
			case "partialMessage": {
				const partialMessage = message.partialMessage!
				setState((prevState) => {
					// worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
					const lastIndex = findLastIndex(prevState.apexMessages, (msg) => msg.ts === partialMessage.ts)
					if (lastIndex !== -1) {
						const newApexMessages = [...prevState.apexMessages]
						newApexMessages[lastIndex] = partialMessage
						return { ...prevState, apexMessages: newApexMessages }
					}
					return prevState
				})
				break
			}
			case "openRouterModels": {
				const updatedModels = message.openRouterModels ?? {}
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
					...updatedModels,
				})
				break
			}
			case "openAiModels": {
				const updatedModels = message.openAiModels ?? []
				setOpenAiModels(updatedModels)
				break
			}
			case "mcpServers": {
				setMcpServers(message.mcpServers ?? [])
				break
			}
			case "mcpMarketplaceCatalog": {
				if (message.mcpMarketplaceCatalog) {
					setMcpMarketplaceCatalog(message.mcpMarketplaceCatalog)
				}
				break
			}
			case "totalTasksSize": {
				setTotalTasksSize(message.totalTasksSize ?? null)
				break
			}
		}
	}, [])

	useEvent("message", handleMessage)

	useEffect(() => {
		vscode.postMessage({ type: "webviewDidLaunch" })
	}, [])

	const contextValue: ExtensionStateContextType = {
		...state,
		didHydrateState,
		showWelcome,
		theme,
		openRouterModels,
		openAiModels,
		mcpServers,
		mcpMarketplaceCatalog,
		filePaths,
		totalTasksSize,
		// Include new state properties in context value, providing defaults if undefined
		userProfiles: state.userProfiles ?? [],
		activeProfileId: state.activeProfileId ?? null,
		customInstructionLibrary: state.customInstructionLibrary ?? [],
		// --- Setter/Action Functions ---
		setApiConfiguration: useCallback((value) => {
			// Update local state immediately for responsiveness (optional)
			// setState((prevState) => ({ ...prevState, apiConfiguration: value }));
			// Send message to backend
			vscode.postMessage({ type: "apiConfiguration", apiConfiguration: value })
		}, []),
		// setCustomInstructions removed
		setTelemetrySetting: useCallback((value) => {
			// Update local state immediately (optional)
			// setState((prevState) => ({ ...prevState, telemetrySetting: value }));
			// Send message to backend
			vscode.postMessage({ type: "telemetrySetting", telemetrySetting: value })
		}, []),
		setPlanActSeparateModelsSetting: useCallback((value) => {
			// Update local state immediately (optional)
			// setState((prevState) => ({ ...prevState, planActSeparateModelsSetting: value }));
			// Send message to backend - Use 'updateSettings' or a specific message if available
			// Assuming 'updateSettings' handles this for now
			vscode.postMessage({ type: "updateSettings", planActSeparateModelsSetting: value })
		}, []),
		setShowAnnouncement: useCallback((value) => {
			// This likely only affects local state or sends a specific 'didShow' message
			setState((prevState) => ({ ...prevState, shouldShowAnnouncement: !value })) // Assuming value=true means hide it
			if (!value) {
				vscode.postMessage({ type: "didShowAnnouncement" })
			}
		}, []),
		// --- NEW Profile/Library Management Functions ---
		createProfile: useCallback((name: string) => {
			vscode.postMessage({ type: "createProfile", text: name })
		}, []),
		deleteProfile: useCallback((profileId: string) => {
			vscode.postMessage({ type: "deleteProfile", text: profileId })
		}, []),
		setActiveProfile: useCallback((profileId: string) => {
			vscode.postMessage({ type: "setActiveProfile", text: profileId })
		}, []),
		updateProfile: useCallback((profile: UserProfile) => {
			vscode.postMessage({ type: "updateProfile", profile: profile })
		}, []),
		createCustomInstruction: useCallback((name: string, content: string) => {
			vscode.postMessage({ type: "createCustomInstruction", name: name, text: content })
		}, []),
		updateCustomInstruction: useCallback((item: CustomInstructionItem) => {
			vscode.postMessage({ type: "updateCustomInstruction", customInstruction: item })
		}, []),
		deleteCustomInstruction: useCallback((instructionId: string) => {
			vscode.postMessage({ type: "deleteCustomInstruction", text: instructionId })
		}, []),
		setActiveCustomInstruction: useCallback((instructionId: string | null) => {
			vscode.postMessage({ type: "setActiveCustomInstruction", text: instructionId ?? undefined }) // Send undefined if null
		}, []),
	}

	return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
}

export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext)
	if (context === undefined) {
		throw new Error("useExtensionState must be used within an ExtensionStateContextProvider")
	}
	return context
}
