import * as vscode from 'vscode';
import { Controller } from '../index'; // Import Controller type
import { getSecret, storeSecret, updateGlobalState, getGlobalState } from '../../storage/state'; // Adjust path, Add getGlobalState
import { postStateToWebview } from './state-updater'; // Import for state updates
import { telemetryService } from '../../../services/telemetry/TelemetryService'; // Adjust path
import { UserInfo } from '../../../shared/UserInfo'; // Adjust path

/**
 * Handles the user sign-out process.
 * @param controller The main controller instance.
 */
export async function handleSignOut(controller: Controller): Promise<void> {
    console.log("[AuthHandler] Handling sign out...");
    try {
        // await controller.accountService?.signOut(); // Method does not exist on ApexAccountService
        await storeSecret(controller.context, "justinlietz93.apex.apexApiKey", undefined); // Use correct SecretKey "apexApiKey"
        await storeSecret(controller.context, "justinlietz93.apex.authNonce", undefined); // Clear nonce
        await updateGlobalState(controller.context, "justinlietz93.apex.userInfo", undefined); // Clear user info
        telemetryService.capture({ event: "Logout" }); // Correct telemetry call
        await postStateToWebview(controller); // Update UI
        vscode.window.showInformationMessage("Successfully signed out.");
    } catch (error) {
        console.error("[AuthHandler] Error during sign out:", error);
        vscode.window.showErrorMessage(`Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Updates the stored user information.
 * @param controller The main controller instance.
 * @param userInfo The user information object or undefined to clear.
 */
export async function setUserInfo(controller: Controller, userInfo: UserInfo | undefined): Promise<void> {
    console.log("[AuthHandler] Setting user info:", userInfo ? userInfo.email : 'undefined');
    await updateGlobalState(controller.context, "justinlietz93.apex.userInfo", userInfo);
    // No immediate UI update needed here, usually called alongside postStateToWebview
}

/**
 * Validates the current authentication state (e.g., on startup).
 * Placeholder implementation - Actual validation might involve checking token expiry etc.
 * @param controller The main controller instance.
 */
export async function validateAuthState(controller: Controller): Promise<void> {
    console.log("[AuthHandler] Validating auth state...");
    try {
        const token = await getSecret(controller.context, "justinlietz93.apex.apexApiKey"); // Use correct SecretKey "apexApiKey"
        if (token) {
            // Potentially add token validation logic here using accountService
            console.log("[AuthHandler] Apex API Key found.");
            // Fetch user info if token exists but user info is missing?
            if (!await getGlobalState(controller.context, "justinlietz93.apex.userInfo")) { // Use imported getGlobalState
                 console.log("[AuthHandler] API Key found but user info missing, attempting to fetch...");
                 // await controller.accountService?.fetchUserInfo(); // Method does not exist on ApexAccountService
                 // Consider alternative ways to get user info if needed, or remove this block
                 // await postStateToWebview(controller); // Update UI if user info was fetched
            }
        } else {
            console.log("[AuthHandler] No auth token found.");
            // Ensure user info is cleared if no token
            await updateGlobalState(controller.context, "justinlietz93.apex.userInfo", undefined);
            await postStateToWebview(controller);
        }
    } catch (error) {
        console.error("[AuthHandler] Error validating auth state:", error);
    }
}

/**
 * Handles the authentication callback URI.
 * @param controller The main controller instance.
 * @param uri The callback URI.
 */
export async function handleAuthCallback(controller: Controller, uri: vscode.Uri): Promise<void> {
    console.log("[AuthHandler] Handling auth callback URI:", uri.toString());
    const query = new URLSearchParams(uri.query);
    const code = query.get("code");
    const state = query.get("state");
    const storedNonce = await getSecret(controller.context, "justinlietz93.apex.authNonce");

    if (!code || !state) {
        vscode.window.showErrorMessage("Authentication failed: Invalid callback parameters.");
        console.error("[AuthHandler] Invalid callback parameters received.");
        return;
    }

    if (state !== storedNonce) {
        vscode.window.showErrorMessage("Authentication failed: State mismatch (potential CSRF attack).");
        console.error("[AuthHandler] State mismatch during auth callback.");
        await storeSecret(controller.context, "justinlietz93.apex.authNonce", undefined); // Clear nonce
        return;
    }

    // Nonce verified, clear it
    await storeSecret(controller.context, "justinlietz93.apex.authNonce", undefined);

    try {
        vscode.window.showInformationMessage("Authenticating...");
        // const token = await controller.accountService?.exchangeCodeForToken(code); // Method does not exist on ApexAccountService
        // Simulate success for now, assuming token is handled elsewhere or flow is different
        const token = "simulated-token-from-code-" + code; // Placeholder
        if (token) {
            await storeSecret(controller.context, "justinlietz93.apex.apexApiKey", token); // Use correct SecretKey "apexApiKey"
            // await controller.accountService?.fetchUserInfo(); // Method does not exist on ApexAccountService
            telemetryService.capture({ event: "Login Success" }); // Correct telemetry call
            vscode.window.showInformationMessage("Authentication successful! (Simulated)");
            await postStateToWebview(controller); // Update UI with user info
        } else {
            throw new Error("Failed to exchange code for token (Simulated).");
        }
    } catch (error) {
        console.error("[AuthHandler] Error exchanging code for token:", error);
        // Correct telemetry call
        telemetryService.capture({ event: "Login Failed", properties: { error: error instanceof Error ? error.message : String(error) } });
        vscode.window.showErrorMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await postStateToWebview(controller); // Ensure UI reflects failed login
    }
}

/**
 * Handles a specific callback for OpenRouter (if needed).
 * Placeholder - Implement if OpenRouter has a distinct auth flow.
 * @param controller The main controller instance.
 * @param uri The callback URI.
 */
export async function handleOpenRouterCallback(controller: Controller, uri: vscode.Uri): Promise<void> {
    console.warn("[AuthHandler] handleOpenRouterCallback not implemented.", uri.toString());
    // Implementation depends on OpenRouter's specific OAuth or callback mechanism, if any.
    // Typically, API keys are handled via settings, not callbacks.
}
