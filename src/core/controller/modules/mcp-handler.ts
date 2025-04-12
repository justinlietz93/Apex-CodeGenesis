import * as vscode from "vscode"
import axios from "axios"
import { Controller } from "../index" // Import Controller type
import { getGlobalState, updateGlobalState } from "../../storage/state" // Adjust path
import { postMessageToWebview as postMessageToWebviewUtil } from "./webview-handler" // For sending messages
import { telemetryService } from "../../../services/telemetry/TelemetryService" // Adjust path
import { McpMarketplaceCatalog, McpDownloadResponse } from "../../../shared/mcp" // Adjust path

// Step 1.1.1: Introduce feature flag
const MCP_FEATURE_ENABLED = false // (Rule #12: CONF-FLAGS)

const MARKETPLACE_URL = "https://raw.githubusercontent.com/AgentDeskAI/apex-mcp-marketplace/main/catalog.json" // Example URL

/**
 * Fetches the MCP marketplace catalog.
 * @param controller The main controller instance.
 * @param forceRefresh If true, forces a refresh even if cached data exists.
 */
export async function fetchMcpMarketplace(controller: Controller, forceRefresh: boolean = false): Promise<void> {
	// Step 1.1.2: Add conditional check
	if (!MCP_FEATURE_ENABLED) {
		console.log("[McpHandler] MCP Marketplace feature is disabled. (Rule #19: IMPL-LOGIC, IMPL-COND)")
		await postMessageToWebviewUtil(controller.webviewProviderRef, {
			type: "mcpMarketplaceCatalog",
			error: "MCP Marketplace feature is currently disabled.",
		}) // (Rule #19: IMPL-UI)
		return
	}

	console.log(`[McpHandler] Fetching MCP marketplace (forceRefresh: ${forceRefresh})...`)
	telemetryService.captureMarketplaceOpened(controller.task?.taskId)

	const cachedCatalogRaw = await getGlobalState(controller.context, "justinlietz93.apex.mcpMarketplaceCatalog")
	// Validate the cached catalog structure
	const cachedCatalog =
		cachedCatalogRaw &&
		typeof cachedCatalogRaw === "object" &&
		Array.isArray((cachedCatalogRaw as McpMarketplaceCatalog).items)
			? (cachedCatalogRaw as McpMarketplaceCatalog)
			: undefined

	// Remove timestamp check as it's not part of the type
	if (!forceRefresh && cachedCatalog) {
		console.log("[McpHandler] Using cached marketplace catalog.")
		await postMessageToWebviewUtil(controller.webviewProviderRef, {
			type: "mcpMarketplaceCatalog",
			mcpMarketplaceCatalog: cachedCatalog,
		})
		return
	}

	try {
		const response = await axios.get<McpMarketplaceCatalog>(MARKETPLACE_URL)
		const catalog = response.data
		// Validate fetched catalog structure before saving/using
		if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.items)) {
			throw new Error("Fetched marketplace catalog has invalid structure.")
		}
		// catalog.timestamp = Date.now(); // Remove timestamp addition
		await updateGlobalState(controller.context, "justinlietz93.apex.mcpMarketplaceCatalog", catalog)
		await postMessageToWebviewUtil(controller.webviewProviderRef, {
			type: "mcpMarketplaceCatalog",
			mcpMarketplaceCatalog: catalog,
		})
		console.log("[McpHandler] Fetched and updated marketplace catalog.")
	} catch (error) {
		console.error("[McpHandler] Error fetching MCP marketplace:", error)
		vscode.window.showErrorMessage(
			`Failed to fetch MCP marketplace: ${error instanceof Error ? error.message : "Unknown error"}`,
		)
		// Optionally send cached version if fetch fails but cache exists
		if (cachedCatalog) {
			await postMessageToWebviewUtil(controller.webviewProviderRef, {
				type: "mcpMarketplaceCatalog",
				mcpMarketplaceCatalog: cachedCatalog,
			})
		} else {
			await postMessageToWebviewUtil(controller.webviewProviderRef, {
				type: "mcpMarketplaceCatalog",
				error: `Failed to fetch: ${error instanceof Error ? error.message : "Unknown error"}`,
			})
		}
	}
}

/**
 * Silently refreshes the MCP marketplace catalog in the background.
 * (Removed time-based check as timestamp is not stored)
 * @param controller The main controller instance.
 */
export async function silentlyRefreshMcpMarketplace(controller: Controller): Promise<void> {
	// Always attempt a silent refresh on startup/webview launch for simplicity,
	// fetchMcpMarketplace itself handles basic caching if needed internally (though time check removed).
	// Alternatively, implement a more robust time-based check if required elsewhere.
	console.log("[McpHandler] Attempting silent marketplace catalog refresh...")
	// Consider adding a flag to prevent multiple simultaneous silent refreshes if needed
	await fetchMcpMarketplace(controller, true) // Force refresh to ensure latest data
	// Removed else block as we always attempt refresh now
	// } else {
	//      console.log("[McpHandler] Marketplace catalog cache is fresh, no silent refresh needed.");
	// } // Removed closing brace was here, causing syntax error
} // Added missing closing brace

/**
 * Downloads and installs an MCP server from the marketplace.
 * @param controller The main controller instance.
 * @param mcpId The ID of the MCP server to download.
 */
export async function downloadMcp(controller: Controller, mcpId: string): Promise<void> {
	// Step 1.1.4: Add conditional check
	if (!MCP_FEATURE_ENABLED) {
		console.warn("[McpHandler] MCP download attempted but feature is disabled. (Rule #19: IMPL-LOGIC, IMPL-COND)")
		vscode.window.showWarningMessage("MCP Marketplace feature is currently disabled. Cannot download MCP servers.") // (Rule #19: IMPL-UI)
		return
	}

	console.log(`[McpHandler] Downloading MCP with ID: ${mcpId}`)
	// Send message indicating download start, without status as it's not in the type
	await postMessageToWebviewUtil(controller.webviewProviderRef, {
		type: "mcpDownloadDetails",
		mcpDownloadDetails: { mcpId } as McpDownloadResponse,
	}) // Send minimal info

	try {
		// Find the MCP item in the catalog
		const catalogRaw = await getGlobalState(controller.context, "justinlietz93.apex.mcpMarketplaceCatalog")
		const catalog =
			catalogRaw && typeof catalogRaw === "object" && Array.isArray((catalogRaw as McpMarketplaceCatalog).items)
				? (catalogRaw as McpMarketplaceCatalog)
				: undefined

		// Add explicit check for catalog existence
		if (!catalog) {
			throw new Error("MCP Marketplace catalog not loaded.")
		}
		// Find item using mcpId (assuming McpMarketplaceItem has mcpId)
		const mcpItem = catalog.items.find((item) => item.mcpId === mcpId) // Use mcpId field

		// Check for downloadUrl existence (assuming it exists on McpMarketplaceItem, though not defined in shared/mcp.ts)
		if (!mcpItem || !(mcpItem as any).downloadUrl) {
			// Cast to any to check for assumed downloadUrl
			throw new Error(`MCP item ${mcpId} not found or has no download URL.`)
		}

		// Use McpHub to handle the actual download and installation
		if (!controller.mcpHub) {
			throw new Error("McpHub is not initialized.")
		}
		// const installResult = await controller.mcpHub.downloadAndInstallMcpServer(mcpItem as any); // Method does not exist
		// TODO: Implement MCP server download and installation logic, likely involving external commands or library usage.
		// For now, simulate an error as the functionality is missing.
		const installResult = {
			success: false,
			message: "Download/Install functionality not implemented.",
			serverName: mcpItem.name,
		}

		// Construct response matching McpDownloadResponse interface (lacks status/message)
		// We lose some info here, might need to update McpDownloadResponse type
		const response: Partial<McpDownloadResponse> = {
			// Use Partial as we only have some fields
			mcpId: mcpItem.mcpId,
			githubUrl: mcpItem.githubUrl,
			name: mcpItem.name,
			author: mcpItem.author,
			description: mcpItem.description,
			// readmeContent, llmsInstallationContent, requiresApiKey are missing from installResult
		}

		// Send partial details, status is inferred by success/error messages below
		// Send the basic info available in McpDownloadResponse
		await postMessageToWebviewUtil(controller.webviewProviderRef, {
			type: "mcpDownloadDetails",
			mcpDownloadDetails: response as McpDownloadResponse,
		}) // Cast back

		// Report based on the (currently simulated) installResult
		if (installResult.success) {
			vscode.window.showInformationMessage(
				`MCP Server "${installResult.serverName || mcpItem.name}" installed successfully.`,
			)
			// Refresh the MCP server list in the UI
			controller.mcpHub.sendLatestMcpServers()
		} else {
			vscode.window.showErrorMessage(`Failed to install MCP Server "${mcpId}": ${installResult.message}`)
		}
	} catch (error) {
		console.error(`[McpHandler] Error downloading MCP ${mcpId}:`, error)
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		// Send minimal error info as McpDownloadResponse doesn't support status/message
		// Send error message alongside the basic mcpId info
		await postMessageToWebviewUtil(controller.webviewProviderRef, {
			type: "mcpDownloadDetails",
			mcpDownloadDetails: { mcpId } as McpDownloadResponse, // Send minimal valid response
			error: errorMessage, // Add error field to the message
		})
		vscode.window.showErrorMessage(`Failed to download MCP Server "${mcpId}": ${errorMessage}`)
	}
}
