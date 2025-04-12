import axios from "axios"
import * as vscode from "vscode"
import { getNonce } from "./getNonce"
import { getUri } from "./getUri"
import { getTheme } from "../../integrations/theme/getTheme"
import { Controller } from "../controller"
import { findLast } from "../../shared/array"
// Import necessary functions from controller modules
import { postMessageToWebview } from "../controller/modules/webview-handler"
import { postStateToWebview } from "../controller/modules/state-updater"
import { clearTask } from "../controller/modules/task-lifecycle"
/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/providers/WeatherViewProvider.ts
https://github.com/KumarVariable/vscode-extension-sidebar-html/blob/master/src/customSidebarViewProvider.ts
*/

export class WebviewProvider implements vscode.WebviewViewProvider {
	// NOTE: While the comment below suggests these IDs cannot be changed due to caching,
	// for a fork intended to run alongside the original, changing these IS necessary
	// to avoid conflicts. Users installing the fork might need to clear cache if issues arise.
	public static readonly sideBarId = "apex-ide-codegenesis.SidebarProvider"
	public static readonly tabPanelId = "apex-ide-codegenesis.TabPanelProvider"
	private static activeInstances: Set<WebviewProvider> = new Set()
	public view?: vscode.WebviewView | vscode.WebviewPanel
	private disposables: vscode.Disposable[] = []
	controller: Controller

	constructor(
		readonly context: vscode.ExtensionContext,
		private readonly outputChannel: vscode.OutputChannel,
	) {
		WebviewProvider.activeInstances.add(this)
		this.controller = new Controller(context, outputChannel, this)
	}

	async dispose() {
		if (this.view && "dispose" in this.view) {
			this.view.dispose()
		}
		while (this.disposables.length) {
			const x = this.disposables.pop()
			if (x) {
				x.dispose()
			}
		}
		await this.controller.dispose()
		WebviewProvider.activeInstances.delete(this)
	}

	public static getVisibleInstance(): WebviewProvider | undefined {
		return findLast(Array.from(this.activeInstances), (instance) => instance.view?.visible === true)
	}

	public static getAllInstances(): WebviewProvider[] {
		return Array.from(this.activeInstances)
	}

	public static getSidebarInstance() {
		return Array.from(this.activeInstances).find((instance) => instance.view && "onDidChangeVisibility" in instance.view)
	}

	public static getTabInstances(): WebviewProvider[] {
		return Array.from(this.activeInstances).filter((instance) => instance.view && "onDidChangeViewState" in instance.view)
	}

	async resolveWebviewView(webviewView: vscode.WebviewView | vscode.WebviewPanel) {
		this.view = webviewView

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri],
		}

		// Original HTML loading logic restored:
		webviewView.webview.html =
			this.context.extensionMode === vscode.ExtensionMode.Development
				? await this.getHMRHtmlContent(webviewView.webview)
				: this.getHtmlContent(webviewView.webview)

		// Sets up an event listener to listen for messages passed from the webview view context
		// and executes code based on the message that is received
		this.setWebviewMessageListener(webviewView.webview)

		// Logs show up in bottom panel > Debug Console
		//console.log("registering listener")

		// Listen for when the panel becomes visible
		// https://github.com/microsoft/vscode-discussions/discussions/840
		if ("onDidChangeViewState" in webviewView) {
			// WebviewView and WebviewPanel have all the same properties except for this visibility listener
			// panel
			webviewView.onDidChangeViewState(
				async () => {
					// Make async
					if (this.view?.visible) {
						// Use imported function, pass webviewProviderRef from controller
						await postMessageToWebview(this.controller.webviewProviderRef, {
							type: "action",
							action: "didBecomeVisible",
						})
					}
				},
				null,
				this.disposables,
			)
		} else if ("onDidChangeVisibility" in webviewView) {
			// sidebar
			webviewView.onDidChangeVisibility(
				async () => {
					// Make async
					if (this.view?.visible) {
						// Use imported function, pass webviewProviderRef from controller
						await postMessageToWebview(this.controller.webviewProviderRef, {
							type: "action",
							action: "didBecomeVisible",
						})
					}
				},
				null,
				this.disposables,
			)
		}

		// Listen for when the view is disposed
		// This happens when the user closes the view or when the view is closed programmatically
		webviewView.onDidDispose(
			async () => {
				await this.dispose()
			},
			null,
			this.disposables,
		)

		// // if the extension is starting a new session, clear previous task state
		// this.clearTask()
		{
			// Listen for configuration changes
			vscode.workspace.onDidChangeConfiguration(
				async (e) => {
					if (e && e.affectsConfiguration("workbench.colorTheme")) {
						// Sends latest theme name to webview
						// Use imported function, pass webviewProviderRef from controller
						await postMessageToWebview(this.controller.webviewProviderRef, {
							type: "theme",
							text: JSON.stringify(await getTheme()),
						})
					}
					if (e && e.affectsConfiguration("apex.mcpMarketplace.enabled")) {
						// Update state when marketplace tab setting changes
						await postStateToWebview(this.controller) // Use imported function
					}
				},
				null,
				this.disposables,
			)

			// if the extension is starting a new session, clear previous task state
			await clearTask(this.controller) // Use imported function

			this.outputChannel.appendLine("Webview view resolved")
		}
	}

	/**
	 * Defines and returns the HTML that should be rendered within the webview panel.
	 *
	 * @remarks This is also the place where references to the React webview build files
	 * are created and inserted into the webview HTML.
	 *
	 * @param webview A reference to the extension webview
	 * @param extensionUri The URI of the directory containing the extension
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	private getHtmlContent(webview: vscode.Webview): string {
		// Use the build output paths relative to the webview-ui/build directory
		const stylesPath = vscode.Uri.joinPath(this.context.extensionUri, "webview-ui", "build", "assets", "index.css")
		const scriptPath = vscode.Uri.joinPath(this.context.extensionUri, "webview-ui", "build", "assets", "index.js")

		const stylesUri = webview.asWebviewUri(stylesPath)
		const scriptUri = webview.asWebviewUri(scriptPath)

		// The codicon font from the React build output
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
		// we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
		// don't forget to add font-src ${webview.cspSource};
		const codiconsUri = getUri(webview, this.context.extensionUri, [
			"node_modules",
			"@vscode",
			"codicons",
			"dist",
			"codicon.css", // Load the CSS file which references the font
		])
		const codiconsFontUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "node_modules", "@vscode", "codicons", "dist", "codicon.ttf"),
		) // Also get direct font URI for CSP

		// const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.js"))

		// const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "reset.css"))
		// const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "vscode.css"))

		// // Same for stylesheet
		// const stylesheetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "main.css"))

		// Use a nonce to only allow a specific script to be run.
		/*
				content security policy of your webview to only allow scripts that have a specific nonce
				create a content security policy meta tag so that only loading scripts with a nonce is allowed
				As your extension grows you will likely want to add custom styles, fonts, and/or images to your webview. If you do, you will need to update the content security policy meta tag to explicity allow for these resources. E.g.
								<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
		- 'unsafe-inline' is required for styles due to vscode-webview-toolkit's dynamic style injection
		- since we pass base64 images to the webview, we need to specify img-src ${webview.cspSource} data:;

				in meta tag we add nonce attribute: A cryptographic nonce (only used once) to allow scripts. The server must generate a unique nonce value each time it transmits a policy. It is critical to provide a nonce that cannot be guessed as bypassing a resource's policy is otherwise trivial.
				*/
		const nonce = getNonce()

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <link rel="stylesheet" type="text/css" href="${stylesUri}">
            <link href="${codiconsUri}" rel="stylesheet" />
						<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src https://*.posthog.com https://*.firebaseauth.com https://*.firebaseio.com https://*.googleapis.com https://*.firebase.com; font-src ${webview.cspSource} ${codiconsFontUri}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
            <title>Apex</title>
          </head>
          <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
          </body>
        </html>
      `
	}

	/**
	 * Connects to the local Vite dev server to allow HMR, with fallback to the bundled assets
	 *
	 * @param webview A reference to the extension webview
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	private async getHMRHtmlContent(webview: vscode.Webview): Promise<string> {
		const localPort = 25463
		const localServerUrl = `localhost:${localPort}`

		// Check if local dev server is running.
		try {
			await axios.get(`http://${localServerUrl}`)
		} catch (error) {
			vscode.window.showErrorMessage(
				"Apex: Local webview dev server is not running, HMR will not work. Please run 'npm run dev:webview' before launching the extension to enable HMR. Using bundled assets.",
			)

			return this.getHtmlContent(webview)
		}

		const nonce = getNonce()
		// Don't need build assets in HMR mode, Vite serves them
		// const stylesUri = getUri(webview, this.context.extensionUri, ["webview-ui", "build", "assets", "index.css"])
		const codiconsCssUri = getUri(webview, this.context.extensionUri, [
			// Still need codicon CSS
			"node_modules",
			"@vscode",
			"codicons",
			"dist",
			"codicon.css",
		])
		const codiconsFontUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "node_modules", "@vscode", "codicons", "dist", "codicon.ttf"),
		) // Also get direct font URI for CSP

		const scriptEntrypoint = "src/main.tsx"
		const scriptUri = `http://${localServerUrl}/${scriptEntrypoint}`

		// Vite handles CSS injection in dev mode, so we don't link the build CSS
		// We still need the codicon CSS link though.

		const reactRefresh = /*html*/ `
			<script nonce="${nonce}" type="module">
				import RefreshRuntime from "http://${localServerUrl}/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
		`

		// Allow connecting to Vite server (including WebSockets for HMR) and loading resources from it.
		// Also allow loading codicons font directly. Allow inline styles and unsafe-eval for HMR/React.
		// Allow everything from the Vite dev server (http), websockets (ws), vscode resources,
		// and allow inline styles/scripts + unsafe-eval for HMR. Allow all images.
		const csp = [
			`default-src 'none'`,
			`connect-src ${webview.cspSource} ws://${localServerUrl} http://${localServerUrl}`,
			`font-src ${webview.cspSource} http://${localServerUrl} data:`, // Allow fonts from vscode and Vite server
			`img-src ${webview.cspSource} https: http: data:`, // Allow all images
			`style-src ${webview.cspSource} 'unsafe-inline' http://${localServerUrl}`, // Allow inline styles and styles from Vite server
			`script-src 'nonce-${nonce}' 'unsafe-eval' http://${localServerUrl}`, // Allow nonce scripts, unsafe-eval for HMR, and scripts from Vite server
		]

		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
					<meta http-equiv="Content-Security-Policy" content="${csp.join("; ")}">
					<!-- Vite handles style injection via JS in dev mode -->
					<link href="${codiconsCssUri}" rel="stylesheet" />
					<title>Apex</title>
				</head>
				<body>
					<div id="root"></div>
					${reactRefresh}
					<script type="module" src="${scriptUri}"></script>
				</body>
			</html>
		`
	}

	/**
	 * Sets up an event listener to listen for messages passed from the webview context and
	 * executes code based on the message that is received.
	 *
	 * IMPORTANT: When passing methods as callbacks in JavaScript/TypeScript, the method's
	 * 'this' context can be lost. This happens because the method is passed as a
	 * standalone function reference, detached from its original object.
	 *
	 * The Problem:
	 * Doing: webview.onDidReceiveMessage(this.controller.handleWebviewMessage)
	 * Would cause 'this' inside handleWebviewMessage to be undefined or wrong,
	 * leading to "TypeError: this.setUserInfo is not a function"
	 *
	 * The Solution:
	 * We wrap the method call in an arrow function, which:
	 * 1. Preserves the lexical scope's 'this' binding
	 * 2. Ensures handleWebviewMessage is called as a method on the controller instance
	 * 3. Maintains access to all controller methods and properties
	 *
	 * Alternative solutions could use .bind() or making handleWebviewMessage an arrow
	 * function property, but this approach is clean and explicit.
	 *
	 * @param webview The webview instance to attach the message listener to
	 */
	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message: any) => {
				// Add 'any' type temporarily if needed, or import WebviewMessage
				// console.log("<<< HOST received message from WEBVIEW:", message) // Logging removed
				this.controller.handleWebviewMessage(message)
			},
			undefined, // Use undefined instead of null for the thisArgs parameter
			this.disposables,
		)
	}
}
