import * as vscode from 'vscode';
import { ExtensionMessage } from '../../../shared/ExtensionMessage';
import { WebviewProvider } from '../../webview'; // Adjust path as necessary

/**
 * Posts a message to the webview.
 * @param webviewProviderRef Weak reference to the WebviewProvider.
 * @param message The message to post.
 */
export function postMessageToWebview(
    webviewProviderRef: WeakRef<WebviewProvider> | undefined,
    message: ExtensionMessage
): void {
    const provider = webviewProviderRef?.deref();
    if (provider?.view) {
        provider.view.webview.postMessage(message).then(
            (success) => {
                if (!success) {
                    console.warn(`[WebviewHandler] Failed to post message type ${message.type} to webview.`);
                    // Optionally handle specific message types that failed
                }
            },
            (error) => {
                console.error(`[WebviewHandler] Error posting message type ${message.type} to webview:`, error);
                // Consider more robust error handling or logging
            }
        );
    } else {
        console.warn(`[WebviewHandler] Webview provider or view not available when trying to post message type ${message.type}.`);
        // This might happen during shutdown or if the webview hasn't fully initialized.
    }
}

// NOTE: handleWebviewMessage remains in the main controller (index.ts) as it orchestrates
// actions across multiple modules based on incoming messages. This module focuses solely
// on the mechanism of *sending* messages *to* the webview.
