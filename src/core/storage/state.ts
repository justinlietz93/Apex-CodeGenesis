import * as vscode from "vscode"
import { DEFAULT_CHAT_SETTINGS } from "../../shared/ChatSettings"
import { DEFAULT_BROWSER_SETTINGS } from "../../shared/BrowserSettings"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../shared/AutoApprovalSettings"
import { GlobalStateKey, SecretKey } from "./state-keys"
import { ApiConfiguration, ApiProvider, ModelInfo } from "../../shared/api"
import { HistoryItem } from "../../shared/HistoryItem"
import { AutoApprovalSettings } from "../../shared/AutoApprovalSettings"
import { BrowserSettings } from "../../shared/BrowserSettings"
import { ChatSettings } from "../../shared/ChatSettings"
import { TelemetrySetting } from "../../shared/TelemetrySetting"
import { UserInfo } from "../../shared/UserInfo"
// Import new types for Profiles and Library & other needed types
import { UserProfile, CustomInstructionItem, ExtensionState } from "../../shared/ExtensionMessage"
import * as os from "os" // Import os module for platform detection
import { Platform, DEFAULT_PLATFORM } from "../../shared/ExtensionMessage" // Import Platform types
// Ensure ApiProvider is imported if used in previousModeApiProvider etc. - Removed duplicate below
/*
	Storage
	https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
	https://www.eliostruyf.com/devhack-code-extension-storage-options/
	*/

// --- Basic State Functions ---

export async function updateGlobalState(context: vscode.ExtensionContext, key: GlobalStateKey, value: any) {
	await context.globalState.update(key, value)
}

export async function getGlobalState(context: vscode.ExtensionContext, key: GlobalStateKey) {
	return await context.globalState.get(key)
}

export async function storeSecret(context: vscode.ExtensionContext, key: SecretKey, value?: string) {
	if (value) {
		await context.secrets.store(key, value)
	} else {
		await context.secrets.delete(key)
	}
}

export async function getSecret(context: vscode.ExtensionContext, key: SecretKey) {
	return await context.secrets.get(key)
}

export async function updateWorkspaceState(context: vscode.ExtensionContext, key: string, value: any) {
	await context.workspaceState.update(key, value)
}

export async function getWorkspaceState(context: vscode.ExtensionContext, key: string) {
	return await context.workspaceState.get(key)
}

// --- Profile and Library Management Helpers ---

import { randomUUID } from "crypto"

function generateUniqueId(): string {
	return randomUUID()
}

const createDefaultProfile = (
	apiConfig: ApiConfiguration,
	customInstructionsContent?: string,
	chatSettings?: ChatSettings,
	autoApprovalSettings?: AutoApprovalSettings,
	browserSettings?: BrowserSettings,
	planActSeparateModelsSetting?: boolean,
): { profile: UserProfile; instructionItem: CustomInstructionItem | null } => {
	const instructionId = customInstructionsContent ? generateUniqueId() : null
	const profileId = generateUniqueId()
	const profile: UserProfile = {
		profileId: profileId,
		profileName: "Default",
		apiConfiguration: apiConfig,
		activeCustomInstructionId: instructionId,
		chatSettings: chatSettings || DEFAULT_CHAT_SETTINGS,
		autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS,
		browserSettings: browserSettings || DEFAULT_BROWSER_SETTINGS,
		planActSeparateModelsSetting: planActSeparateModelsSetting ?? false,
	}
	const instructionItem: CustomInstructionItem | null =
		instructionId && customInstructionsContent
			? {
					id: instructionId,
					name: "Default Instructions",
					content: customInstructionsContent,
					lastModified: Date.now(),
				}
			: null
	return { profile, instructionItem }
}

// --- State Loading and Migration ---

export async function getAllExtensionState(context: vscode.ExtensionContext): Promise<ExtensionState> {
	let userProfiles = (await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[] | undefined
	let activeProfileId = (await getGlobalState(context, "justinlietz93.apex.activeProfileId")) as string | undefined
	let customInstructionLibrary = (await getGlobalState(context, "justinlietz93.apex.customInstructionLibrary")) as
		| CustomInstructionItem[]
		| undefined

	// Define variables for non-profile state fetched later
	let lastShownAnnouncementId: string | undefined
	let taskHistory: HistoryItem[] | undefined
	let telemetrySetting: TelemetrySetting | undefined
	let userInfo: UserInfo | undefined
	let previousModeApiProvider: ApiProvider | undefined
	let previousModeModelId: string | undefined
	let previousModeModelInfo: ModelInfo | undefined
	let previousModeVsCodeLmModelSelector: vscode.LanguageModelChatSelector | undefined
	let previousModeThinkingBudgetTokens: number | undefined

	// --- Migration Logic ---
	if (!userProfiles || userProfiles.length === 0) {
		console.log("[State Migration] No profiles found, attempting to migrate from old keys...")
		const [
			oldApiProvider,
			oldApiModelId,
			oldApiKey,
			oldOpenRouterApiKey,
			oldApexApiKey,
			oldAwsAccessKey,
			oldAwsSecretKey,
			oldAwsSessionToken,
			oldAwsRegion,
			oldAwsUseCrossRegionInference,
			oldAwsBedrockUsePromptCache,
			oldAwsBedrockEndpoint,
			oldAwsProfile,
			oldAwsUseProfile,
			oldVertexProjectId,
			oldVertexRegion,
			oldOpenAiBaseUrl,
			oldOpenAiApiKey,
			oldOpenAiModelId,
			oldOpenAiModelInfo,
			oldOllamaModelId,
			oldOllamaBaseUrl,
			oldOllamaApiOptionsCtxNum,
			oldLmStudioModelId,
			oldLmStudioBaseUrl,
			oldAnthropicBaseUrl,
			oldGeminiApiKey,
			oldOpenAiNativeApiKey,
			oldDeepSeekApiKey,
			oldRequestyApiKey,
			oldRequestyModelId,
			oldTogetherApiKey,
			oldTogetherModelId,
			oldQwenApiKey,
			oldMistralApiKey,
			oldAzureApiVersion,
			oldOpenRouterModelId,
			oldOpenRouterModelInfo,
			oldOpenRouterProviderSorting,
			oldVsCodeLmModelSelector,
			oldLiteLlmBaseUrl,
			oldLiteLlmModelId,
			oldLiteLlmApiKey,
			oldQwenApiLine,
			oldAsksageApiKey,
			oldAsksageApiUrl,
			oldXaiApiKey,
			oldThinkingBudgetTokens,
			oldSambanovaApiKey,
			oldCustomInstructions,
			oldAutoApprovalSettings,
			oldBrowserSettings,
			oldChatSettings,
			oldPlanActSeparateModelsSetting,
			fetchedLastShownAnnouncementId,
			fetchedTaskHistory,
			fetchedTelemetrySetting,
			fetchedUserInfo,
			fetchedPreviousModeApiProvider,
			fetchedPreviousModeModelId,
			fetchedPreviousModeModelInfo,
			fetchedPreviousModeVsCodeLmModelSelector,
			fetchedPreviousModeThinkingBudgetTokens,
		] = await Promise.all([
			getGlobalState(context, "justinlietz93.apex.apiProvider") as Promise<ApiProvider | undefined>,
			getGlobalState(context, "justinlietz93.apex.apiModelId") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.apiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.openRouterApiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.apexApiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.awsAccessKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.awsSecretKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.awsSessionToken") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.awsRegion") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.awsUseCrossRegionInference") as Promise<boolean | undefined>,
			getGlobalState(context, "justinlietz93.apex.awsBedrockUsePromptCache") as Promise<boolean | undefined>,
			getGlobalState(context, "justinlietz93.apex.awsBedrockEndpoint") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.awsProfile") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.awsUseProfile") as Promise<boolean | undefined>,
			getGlobalState(context, "justinlietz93.apex.vertexProjectId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.vertexRegion") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.openAiBaseUrl") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.openAiApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.openAiModelId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.openAiModelInfo") as Promise<ModelInfo | undefined>,
			getGlobalState(context, "justinlietz93.apex.ollamaModelId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.ollamaBaseUrl") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.ollamaApiOptionsCtxNum") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.lmStudioModelId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.lmStudioBaseUrl") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.anthropicBaseUrl") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.geminiApiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.openAiNativeApiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.deepSeekApiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.requestyApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.requestyModelId") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.togetherApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.togetherModelId") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.qwenApiKey") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.mistralApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.azureApiVersion") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.openRouterModelId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.openRouterModelInfo") as Promise<ModelInfo | undefined>,
			getGlobalState(context, "justinlietz93.apex.openRouterProviderSorting") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.vsCodeLmModelSelector") as Promise<
				vscode.LanguageModelChatSelector | undefined
			>,
			getGlobalState(context, "justinlietz93.apex.liteLlmBaseUrl") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.liteLlmModelId") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.liteLlmApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.qwenApiLine") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.asksageApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.asksageApiUrl") as Promise<string | undefined>,
			getSecret(context, "justinlietz93.apex.xaiApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.thinkingBudgetTokens") as Promise<number | undefined>,
			getSecret(context, "justinlietz93.apex.sambanovaApiKey") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.customInstructions") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.autoApprovalSettings") as Promise<AutoApprovalSettings | undefined>,
			getGlobalState(context, "justinlietz93.apex.browserSettings") as Promise<BrowserSettings | undefined>,
			getGlobalState(context, "justinlietz93.apex.chatSettings") as Promise<ChatSettings | undefined>,
			getGlobalState(context, "justinlietz93.apex.planActSeparateModelsSetting") as Promise<boolean | undefined>,
			getGlobalState(context, "justinlietz93.apex.lastShownAnnouncementId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.taskHistory") as Promise<HistoryItem[] | undefined>,
			getGlobalState(context, "justinlietz93.apex.telemetrySetting") as Promise<TelemetrySetting | undefined>,
			getGlobalState(context, "justinlietz93.apex.userInfo") as Promise<UserInfo | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeApiProvider") as Promise<ApiProvider | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeModelId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeModelInfo") as Promise<ModelInfo | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeVsCodeLmModelSelector") as Promise<
				vscode.LanguageModelChatSelector | undefined
			>,
			getGlobalState(context, "justinlietz93.apex.previousModeThinkingBudgetTokens") as Promise<number | undefined>,
		])

		lastShownAnnouncementId = fetchedLastShownAnnouncementId
		taskHistory = fetchedTaskHistory
		telemetrySetting = fetchedTelemetrySetting
		userInfo = fetchedUserInfo
		previousModeApiProvider = fetchedPreviousModeApiProvider
		previousModeModelId = fetchedPreviousModeModelId
		previousModeModelInfo = fetchedPreviousModeModelInfo
		previousModeVsCodeLmModelSelector = fetchedPreviousModeVsCodeLmModelSelector
		previousModeThinkingBudgetTokens = fetchedPreviousModeThinkingBudgetTokens

		const oldApiConfiguration: ApiConfiguration = {
			apiProvider: oldApiProvider || "openrouter",
			apiModelId: oldApiModelId,
			apiKey: oldApiKey,
			openRouterApiKey: oldOpenRouterApiKey,
			apexApiKey: oldApexApiKey,
			awsAccessKey: oldAwsAccessKey,
			awsSecretKey: oldAwsSecretKey,
			awsSessionToken: oldAwsSessionToken,
			awsRegion: oldAwsRegion,
			awsUseCrossRegionInference: oldAwsUseCrossRegionInference,
			awsBedrockUsePromptCache: oldAwsBedrockUsePromptCache,
			awsBedrockEndpoint: oldAwsBedrockEndpoint,
			awsProfile: oldAwsProfile,
			awsUseProfile: oldAwsUseProfile,
			vertexProjectId: oldVertexProjectId,
			vertexRegion: oldVertexRegion,
			openAiBaseUrl: oldOpenAiBaseUrl,
			openAiApiKey: oldOpenAiApiKey,
			openAiModelId: oldOpenAiModelId,
			openAiModelInfo: oldOpenAiModelInfo,
			ollamaModelId: oldOllamaModelId,
			ollamaBaseUrl: oldOllamaBaseUrl,
			ollamaApiOptionsCtxNum: oldOllamaApiOptionsCtxNum,
			lmStudioModelId: oldLmStudioModelId,
			lmStudioBaseUrl: oldLmStudioBaseUrl,
			anthropicBaseUrl: oldAnthropicBaseUrl,
			geminiApiKey: oldGeminiApiKey,
			openAiNativeApiKey: oldOpenAiNativeApiKey,
			deepSeekApiKey: oldDeepSeekApiKey,
			requestyApiKey: oldRequestyApiKey,
			requestyModelId: oldRequestyModelId,
			togetherApiKey: oldTogetherApiKey,
			togetherModelId: oldTogetherModelId,
			qwenApiKey: oldQwenApiKey,
			qwenApiLine: oldQwenApiLine,
			mistralApiKey: oldMistralApiKey,
			azureApiVersion: oldAzureApiVersion,
			openRouterModelId: oldOpenRouterModelId,
			openRouterModelInfo: oldOpenRouterModelInfo,
			openRouterProviderSorting: oldOpenRouterProviderSorting,
			vsCodeLmModelSelector: oldVsCodeLmModelSelector,
			o3MiniReasoningEffort: vscode.workspace
				.getConfiguration("apex.modelSettings.o3Mini")
				.get("reasoningEffort", "medium"),
			thinkingBudgetTokens: oldThinkingBudgetTokens,
			liteLlmBaseUrl: oldLiteLlmBaseUrl,
			liteLlmModelId: oldLiteLlmModelId,
			liteLlmApiKey: oldLiteLlmApiKey,
			asksageApiKey: oldAsksageApiKey,
			asksageApiUrl: oldAsksageApiUrl,
			xaiApiKey: oldXaiApiKey,
			sambanovaApiKey: oldSambanovaApiKey,
		}
		const defaultPlanAct = oldApiProvider ? true : false
		const { profile: defaultProfile, instructionItem: defaultInstruction } = createDefaultProfile(
			oldApiConfiguration,
			oldCustomInstructions,
			oldChatSettings,
			oldAutoApprovalSettings,
			oldBrowserSettings,
			oldPlanActSeparateModelsSetting ?? defaultPlanAct,
		)
		userProfiles = [defaultProfile]
		activeProfileId = defaultProfile.profileId
		customInstructionLibrary = defaultInstruction ? [defaultInstruction] : []

		await updateGlobalState(context, "justinlietz93.apex.userProfiles", userProfiles)
		await updateGlobalState(context, "justinlietz93.apex.activeProfileId", activeProfileId)
		await updateGlobalState(context, "justinlietz93.apex.customInstructionLibrary", customInstructionLibrary)
		console.log("[State Migration] Created default profile and instruction library from old keys.")
	} else {
		console.log("[State Migration] Profiles found, skipping migration.")
		const [
			fetchedLastShownAnnouncementId,
			fetchedTaskHistory,
			fetchedTelemetrySetting,
			fetchedUserInfo,
			fetchedPreviousModeApiProvider,
			fetchedPreviousModeModelId,
			fetchedPreviousModeModelInfo,
			fetchedPreviousModeVsCodeLmModelSelector,
			fetchedPreviousModeThinkingBudgetTokens,
		] = await Promise.all([
			getGlobalState(context, "justinlietz93.apex.lastShownAnnouncementId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.taskHistory") as Promise<HistoryItem[] | undefined>,
			getGlobalState(context, "justinlietz93.apex.telemetrySetting") as Promise<TelemetrySetting | undefined>,
			getGlobalState(context, "justinlietz93.apex.userInfo") as Promise<UserInfo | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeApiProvider") as Promise<ApiProvider | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeModelId") as Promise<string | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeModelInfo") as Promise<ModelInfo | undefined>,
			getGlobalState(context, "justinlietz93.apex.previousModeVsCodeLmModelSelector") as Promise<
				vscode.LanguageModelChatSelector | undefined
			>,
			getGlobalState(context, "justinlietz93.apex.previousModeThinkingBudgetTokens") as Promise<number | undefined>,
		])
		lastShownAnnouncementId = fetchedLastShownAnnouncementId
		taskHistory = fetchedTaskHistory
		telemetrySetting = fetchedTelemetrySetting
		userInfo = fetchedUserInfo
		previousModeApiProvider = fetchedPreviousModeApiProvider
		previousModeModelId = fetchedPreviousModeModelId
		previousModeModelInfo = fetchedPreviousModeModelInfo
		previousModeVsCodeLmModelSelector = fetchedPreviousModeVsCodeLmModelSelector
		previousModeThinkingBudgetTokens = fetchedPreviousModeThinkingBudgetTokens
	}
	// --- End Migration Logic ---

	const activeProfile = userProfiles?.find((p) => p.profileId === activeProfileId)
	const activeCustomInstruction = activeProfile?.activeCustomInstructionId
		? customInstructionLibrary?.find((item) => item.id === activeProfile.activeCustomInstructionId)?.content
		: undefined

	const apiConfiguration = activeProfile?.apiConfiguration
	const autoApprovalSettings = activeProfile?.autoApprovalSettings ?? DEFAULT_AUTO_APPROVAL_SETTINGS
	const browserSettings = activeProfile?.browserSettings ?? DEFAULT_BROWSER_SETTINGS
	const chatSettings = activeProfile?.chatSettings ?? DEFAULT_CHAT_SETTINGS
	const planActSeparateModelsSetting = activeProfile?.planActSeparateModelsSetting ?? false

	const mcpMarketplaceEnabled = vscode.workspace.getConfiguration("apex").get<boolean>("mcpMarketplace.enabled", true)
	const o3MiniReasoningEffort = vscode.workspace.getConfiguration("apex.modelSettings.o3Mini").get("reasoningEffort", "medium")

	if (apiConfiguration) {
		apiConfiguration.o3MiniReasoningEffort = o3MiniReasoningEffort
	}

	return {
		apiConfiguration,
		autoApprovalSettings,
		browserSettings,
		chatSettings,
		customInstructions: activeCustomInstruction,
		planActSeparateModelsSetting,
		lastShownAnnouncementId,
		taskHistory: taskHistory || [],
		mcpMarketplaceEnabled,
		telemetrySetting: telemetrySetting || "unset",
		userInfo,
		userProfiles: userProfiles || [],
		activeProfileId: activeProfileId || null,
		customInstructionLibrary: customInstructionLibrary || [],
		previousModeApiProvider,
		previousModeModelId,
		previousModeModelInfo,
		previousModeVsCodeLmModelSelector,
		previousModeThinkingBudgetTokens,
		platform: (os.platform() as Platform) || DEFAULT_PLATFORM,
		shouldShowAnnouncement: lastShownAnnouncementId !== vscode.workspace.getConfiguration("apex").get("latestAnnouncementId"),
		version: vscode.extensions.getExtension("justinlietz93.apex-ide-codegenesis")?.packageJSON.version ?? "",
		vscMachineId: vscode.env.machineId,
		uriScheme: vscode.env.uriScheme,
		apexMessages: [],
		currentTaskItem: undefined,
		checkpointTrackerErrorMessage: undefined,
	}
}

// --- Functions to manage User Profiles ---

export async function createProfile(context: vscode.ExtensionContext, profileName: string): Promise<UserProfile> {
	const profiles = ((await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[]) || []
	const defaultApiConfig: ApiConfiguration = { apiProvider: "openrouter" }
	const { profile: newProfile } = createDefaultProfile(defaultApiConfig)
	newProfile.profileName = profileName || `Profile ${profiles.length + 1}`
	newProfile.profileId = generateUniqueId()

	const updatedProfiles = [...profiles, newProfile]
	await updateGlobalState(context, "justinlietz93.apex.userProfiles", updatedProfiles)
	console.log(`[State] Created profile: ${newProfile.profileName} (${newProfile.profileId})`)
	return newProfile
}

export async function deleteProfile(context: vscode.ExtensionContext, profileIdToDelete: string): Promise<void> {
	const profiles = ((await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[]) || []
	const activeProfileId = (await getGlobalState(context, "justinlietz93.apex.activeProfileId")) as string | undefined
	const updatedProfiles = profiles.filter((p) => p.profileId !== profileIdToDelete)

	if (updatedProfiles.length === profiles.length) {
		console.warn(`[State] deleteProfile: Profile ID ${profileIdToDelete} not found.`)
		return
	}

	await updateGlobalState(context, "justinlietz93.apex.userProfiles", updatedProfiles)
	console.log(`[State] Deleted profile: ${profileIdToDelete}`)

	if (activeProfileId === profileIdToDelete) {
		const newActiveId = updatedProfiles.length > 0 ? updatedProfiles[0].profileId : null
		await setActiveProfileId(context, newActiveId)
	}
}

export async function setActiveProfileId(context: vscode.ExtensionContext, profileId: string | null): Promise<void> {
	await updateGlobalState(context, "justinlietz93.apex.activeProfileId", profileId)
	console.log(`[State] Active profile ID set to: ${profileId}`)
}

export async function updateProfile(context: vscode.ExtensionContext, updatedProfile: UserProfile): Promise<void> {
	const profiles = ((await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[]) || []
	const profileIndex = profiles.findIndex((p) => p.profileId === updatedProfile.profileId)

	if (profileIndex === -1) {
		console.error(`[State Update] Cannot update profile: Profile with ID ${updatedProfile.profileId} not found.`)
		return
	}

	profiles[profileIndex] = updatedProfile
	await updateGlobalState(context, "justinlietz93.apex.userProfiles", profiles)
	console.log(`[State Update] Updated profile: ${updatedProfile.profileName} (${updatedProfile.profileId})`)
}

// --- Functions to manage Custom Instruction Library ---

export async function createCustomInstruction(
	context: vscode.ExtensionContext,
	name: string,
	content: string,
): Promise<CustomInstructionItem> {
	const library =
		((await getGlobalState(context, "justinlietz93.apex.customInstructionLibrary")) as CustomInstructionItem[]) || []
	const newItem: CustomInstructionItem = {
		id: generateUniqueId(),
		name: name || `Instruction ${library.length + 1}`,
		content: content,
		lastModified: Date.now(),
	}
	const updatedLibrary = [...library, newItem]
	await updateGlobalState(context, "justinlietz93.apex.customInstructionLibrary", updatedLibrary)
	console.log(`[State] Created custom instruction: ${newItem.name} (${newItem.id})`)
	return newItem
}

export async function updateCustomInstruction(
	context: vscode.ExtensionContext,
	updatedItem: CustomInstructionItem,
): Promise<void> {
	const library =
		((await getGlobalState(context, "justinlietz93.apex.customInstructionLibrary")) as CustomInstructionItem[]) || []
	const itemIndex = library.findIndex((item) => item.id === updatedItem.id)

	if (itemIndex === -1) {
		console.error(`[State Update] Cannot update custom instruction: Item with ID ${updatedItem.id} not found.`)
		return
	}

	library[itemIndex] = { ...updatedItem, lastModified: Date.now() }
	await updateGlobalState(context, "justinlietz93.apex.customInstructionLibrary", library)
	console.log(`[State Update] Updated custom instruction: ${updatedItem.name} (${updatedItem.id})`)
}

export async function deleteCustomInstruction(context: vscode.ExtensionContext, instructionIdToDelete: string): Promise<void> {
	const library =
		((await getGlobalState(context, "justinlietz93.apex.customInstructionLibrary")) as CustomInstructionItem[]) || []
	const updatedLibrary = library.filter((item) => item.id !== instructionIdToDelete)

	if (updatedLibrary.length === library.length) {
		console.warn(`[State] deleteCustomInstruction: Instruction ID ${instructionIdToDelete} not found.`)
		return
	}

	await updateGlobalState(context, "justinlietz93.apex.customInstructionLibrary", updatedLibrary)
	console.log(`[State] Deleted custom instruction: ${instructionIdToDelete}`)

	const profiles = ((await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[]) || []
	let profilesModified = false
	const updatedProfiles = profiles.map((profile) => {
		if (profile.activeCustomInstructionId === instructionIdToDelete) {
			profilesModified = true
			return { ...profile, activeCustomInstructionId: null }
		}
		return profile
	})

	if (profilesModified) {
		await updateGlobalState(context, "justinlietz93.apex.userProfiles", updatedProfiles)
		console.log(`[State] Cleared active instruction ID ${instructionIdToDelete} from relevant profiles.`)
	}
}

// Function to update settings within the *active* profile
export async function updateActiveProfileSettings(
	context: vscode.ExtensionContext,
	settingsToUpdate: Partial<Omit<UserProfile, "profileId" | "profileName" | "apiConfiguration">>,
) {
	const activeProfileId = (await getGlobalState(context, "justinlietz93.apex.activeProfileId")) as string | undefined
	if (!activeProfileId) {
		console.error("[State Update] Cannot update profile settings: No active profile ID found.")
		return
	}
	const profiles = ((await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[]) || []
	const profileIndex = profiles.findIndex((p) => p.profileId === activeProfileId)

	if (profileIndex === -1) {
		console.error(`[State Update] Cannot update profile settings: Active profile with ID ${activeProfileId} not found.`)
		return
	}

	profiles[profileIndex] = { ...profiles[profileIndex], ...settingsToUpdate }
	await updateGlobalState(context, "justinlietz93.apex.userProfiles", profiles)
	console.log(`[State Update] Updated settings for active profile: ${profiles[profileIndex].profileName} (${activeProfileId})`)
}

// --- End Profile and Library Management ---

export async function updateApiConfiguration(context: vscode.ExtensionContext, apiConfiguration: ApiConfiguration) {
	const activeProfileId = (await getGlobalState(context, "justinlietz93.apex.activeProfileId")) as string | undefined
	if (!activeProfileId) {
		console.error("[State Update] Cannot update API configuration: No active profile ID found.")
		return
	}

	const profiles = ((await getGlobalState(context, "justinlietz93.apex.userProfiles")) as UserProfile[]) || []
	const profileIndex = profiles.findIndex((p) => p.profileId === activeProfileId)

	if (profileIndex === -1) {
		console.error(`[State Update] Cannot update API configuration: Active profile with ID ${activeProfileId} not found.`)
		return
	}

	profiles[profileIndex].apiConfiguration = apiConfiguration
	await updateGlobalState(context, "justinlietz93.apex.userProfiles", profiles)
	console.log(
		`[State Update] Updated API configuration for profile: ${profiles[profileIndex].profileName} (${activeProfileId})`,
	)
}

export async function resetExtensionState(context: vscode.ExtensionContext) {
	for (const key of context.globalState.keys()) {
		if (
			key === "justinlietz93.apex.userProfiles" ||
			key === "justinlietz93.apex.activeProfileId" ||
			key === "justinlietz93.apex.customInstructionLibrary"
		) {
			await context.globalState.update(key, undefined)
		} else {
			await context.globalState.update(key, undefined)
		}
	}
	const secretKeys: SecretKey[] = [
		"justinlietz93.apex.apiKey",
		"justinlietz93.apex.openRouterApiKey",
		"justinlietz93.apex.awsAccessKey",
		"justinlietz93.apex.awsSecretKey",
		"justinlietz93.apex.awsSessionToken",
		"justinlietz93.apex.openAiApiKey",
		"justinlietz93.apex.geminiApiKey",
		"justinlietz93.apex.openAiNativeApiKey",
		"justinlietz93.apex.deepSeekApiKey",
		"justinlietz93.apex.requestyApiKey",
		"justinlietz93.apex.togetherApiKey",
		"justinlietz93.apex.qwenApiKey",
		"justinlietz93.apex.mistralApiKey",
		"justinlietz93.apex.apexApiKey",
		"justinlietz93.apex.liteLlmApiKey",
		"justinlietz93.apex.asksageApiKey",
		"justinlietz93.apex.xaiApiKey",
		"justinlietz93.apex.sambanovaApiKey",
		"justinlietz93.apex.authNonce",
	]
	for (const key of secretKeys) {
		await storeSecret(context, key, undefined)
	}
	console.log("[State] Extension state reset.")
}
