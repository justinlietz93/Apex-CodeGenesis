import * as vscode from "vscode"
import { Controller } from "../index" // Import Controller type
import { getSecret, storeSecret, updateGlobalState, getGlobalState } from "../../storage/state" // Adjust path, Add getGlobalState
import { postStateToWebview } from "./state-updater" // Import for state updates
import { telemetryService } from "../../../services/telemetry/TelemetryService" // Adjust path
import { UserInfo } from "../../../shared/UserInfo" // Adjust path

// Constants for local storage keys
const API_KEY_SECRET_KEY = "justinlietz93.apex.apexApiKey"
const USER_INFO_STATE_KEY = "justinlietz93.apex.userInfo"

/**
 * Handles the user sign-out process.
 * @param controller The main controller instance.
 */
export async function handleSignOut(controller: Controller): Promise<void> {
	console.log("[AuthHandler] Handling sign out...")
	try {
		// Clear all authentication-related data
		await storeSecret(controller.context, API_KEY_SECRET_KEY, undefined) // Clear API key
		await updateGlobalState(controller.context, USER_INFO_STATE_KEY, undefined) // Clear user info
		telemetryService.capture({ event: "Logout" }) // Track the logout event
		await postStateToWebview(controller) // Update UI
		vscode.window.showInformationMessage("Successfully signed out.")
	} catch (error) {
		console.error("[AuthHandler] Error during sign out:", error)
		vscode.window.showErrorMessage(`Sign out failed: ${error instanceof Error ? error.message : "Unknown error"}`)
	}
}

/**
 * Updates the stored user information.
 * @param controller The main controller instance.
 * @param userInfo The user information object or undefined to clear.
 */
export async function setUserInfo(controller: Controller, userInfo: UserInfo | undefined): Promise<void> {
	console.log("[AuthHandler] Setting user info:", userInfo ? userInfo.email : "undefined")
	await updateGlobalState(controller.context, "justinlietz93.apex.userInfo", userInfo)
	// No immediate UI update needed here, usually called alongside postStateToWebview
}

/**
 * Validates the current authentication state (e.g., on startup).
 * With local storage auth, we simply check if API key and/or user info exists.
 * @param controller The main controller instance.
 */
export async function validateAuthState(controller: Controller): Promise<void> {
	console.log("[AuthHandler] Validating auth state...")
	try {
		const apiKey = await getSecret(controller.context, API_KEY_SECRET_KEY)
		const userInfo = (await getGlobalState(controller.context, USER_INFO_STATE_KEY)) as UserInfo | undefined

		if (apiKey) {
			console.log("[AuthHandler] Apex API Key found.")

			// If API key exists but user info is missing, create a default user info
			if (!userInfo) {
				console.log("[AuthHandler] API Key found but user info missing, creating default...")
				const defaultUserInfo: UserInfo = {
					displayName: "Local User",
					email: "local@example.com",
					photoURL: null,
				}
				await updateGlobalState(controller.context, USER_INFO_STATE_KEY, defaultUserInfo)
			}
		} else {
			console.log("[AuthHandler] No auth token found.")
			// Ensure user info is cleared if no token
			await updateGlobalState(controller.context, USER_INFO_STATE_KEY, undefined)
		}

		// Always update webview with current state
		await postStateToWebview(controller)
	} catch (error) {
		console.error("[AuthHandler] Error validating auth state:", error)
	}
}

/**
 * Handles local authentication with direct token or user info.
 * This replaces the previous callback-based authentication.
 *
 * @param controller The main controller instance.
 * @param token The authentication token or API key.
 * @param userInfo Optional user information.
 */
export async function handleLocalAuth(controller: Controller, token: string, userInfo?: UserInfo): Promise<void> {
	console.log("[AuthHandler] Handling local authentication")

	try {
		// Store the API key
		await storeSecret(controller.context, API_KEY_SECRET_KEY, token)

		// Store user info if provided, otherwise create default
		if (userInfo) {
			await updateGlobalState(controller.context, USER_INFO_STATE_KEY, userInfo)
		} else {
			const defaultUserInfo: UserInfo = {
				displayName: "Local User",
				email: "local@example.com",
				photoURL: null,
			}
			await updateGlobalState(controller.context, USER_INFO_STATE_KEY, defaultUserInfo)
		}

		// Log success
		telemetryService.capture({ event: "Login Success" })
		vscode.window.showInformationMessage("Local authentication successful!")

		// Update UI
		await postStateToWebview(controller)
	} catch (error) {
		console.error("[AuthHandler] Error during local authentication:", error)

		telemetryService.capture({
			event: "Login Failed",
			properties: { error: error instanceof Error ? error.message : String(error) },
		})

		vscode.window.showErrorMessage(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`)
		await postStateToWebview(controller)
	}
}

/**
 * Legacy method for backward compatibility.
 * Now simplified to just extract a token and user info from the URI and pass it to handleLocalAuth.
 *
 * @param controller The main controller instance.
 * @param uri The callback URI.
 */
export async function handleAuthCallback(controller: Controller, uri: vscode.Uri): Promise<void> {
	console.log("[AuthHandler] Handling auth callback URI:", uri.toString())
	const query = new URLSearchParams(uri.query)
	const token = query.get("token") || "local-token-" + Date.now()

	// Extract user info if available in the query
	const displayName = query.get("displayName") || "Local User"
	const email = query.get("email") || "local@example.com"
	const photoURL = query.get("photoURL") || null

	const userInfo: UserInfo = { displayName, email, photoURL }

	// Hand off to the local auth handler
	await handleLocalAuth(controller, token, userInfo)
}

/**
 * This function is no longer needed with local authentication.
 * Kept as a stub for backward compatibility.
 */
export async function handleOpenRouterCallback(controller: Controller, uri: vscode.Uri): Promise<void> {
	console.warn("[AuthHandler] External authentication callbacks no longer supported with local auth.", uri.toString())
	vscode.window.showInformationMessage("External authentication is disabled. Using local authentication instead.")
}
