// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import * as vscode from "vscode"
import { Logger } from "./services/logging/Logger"
import { createApexAPI } from "./exports"
import "./utils/path" // necessary to have access to String.prototype.toPosix
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/DiffViewProvider"
import assert from "node:assert"
import { telemetryService } from "./services/telemetry/TelemetryService"
import { WebviewProvider } from "./core/webview"
// Import necessary functions from controller modules
import { clearTask, initApexWithHistoryItem } from "./core/controller/modules/task-lifecycle" // Added initApexWithHistoryItem just in case, though not seen yet
import { postStateToWebview } from "./core/controller/modules/state-updater"
import { postMessageToWebview } from "./core/controller/modules/webview-handler"
import { handleOpenRouterCallback, validateAuthState, handleAuthCallback } from "./core/controller/modules/auth-handler"
import { addSelectedCodeToChat, addSelectedTerminalOutputToChat, fixWithApex } from "./core/controller/modules/context-actions"

/*
Built using https://github.com/microsoft/vscode-webview-ui-toolkit

Inspired by
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra

*/

let outputChannel: vscode.OutputChannel

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel("Apex")
	context.subscriptions.push(outputChannel)

	Logger.initialize(outputChannel)
	Logger.log("Apex extension activated")

	const sidebarWebview = new WebviewProvider(context, outputChannel)

	vscode.commands.executeCommand("setContext", "apex.isDevMode", IS_DEV && IS_DEV === "true")

	context.subscriptions.push(
		// Register the provider for the Apex sidebar view
		vscode.window.registerWebviewViewProvider("apex-ide-codegenesis.SidebarProvider", sidebarWebview, {
			// Corrected View ID
			webviewOptions: { retainContextWhenHidden: true },
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.plusButtonClicked", async (webview: any) => {
			const openChat = async (instance?: WebviewProvider) => {
				if (!instance) {
					return
				}
				await clearTask(instance.controller) // Use imported function
				await postStateToWebview(instance.controller) // Use imported function
				await postMessageToWebview(instance.controller.webviewProviderRef, {
					// Use imported function
					type: "action",
					action: "chatButtonClicked",
				})
			}
			const isSidebar = !webview
			if (isSidebar) {
				openChat(WebviewProvider.getSidebarInstance())
			} else {
				WebviewProvider.getTabInstances().forEach(openChat)
			}
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.mcpButtonClicked", (webview: any) => {
			const openMcp = async (instance?: WebviewProvider) => {
				// Make async
				if (!instance) {
					return
				}
				await postMessageToWebview(instance.controller.webviewProviderRef, {
					// Use imported function
					type: "action",
					action: "mcpButtonClicked",
				})
			}
			const isSidebar = !webview
			if (isSidebar) {
				openMcp(WebviewProvider.getSidebarInstance())
			} else {
				WebviewProvider.getTabInstances().forEach(openMcp)
			}
		}),
	)

	const openApexInNewTab = async () => {
		Logger.log("Opening Apex in new tab")
		// (this example uses webviewProvider activation event which is necessary to deserialize cached webview, but since we use retainContextWhenHidden, we don't need to use that event)
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
		const tabWebview = new WebviewProvider(context, outputChannel)
		//const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
		const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor: vscode.TextEditor) => editor.viewColumn || 0))

		// Check if there are any visible text editors, otherwise open a new group to the right
		const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0
		if (!hasVisibleEditors) {
			await vscode.commands.executeCommand("workbench.action.newGroupRight")
		}
		const targetCol = hasVisibleEditors ? Math.max(lastCol + 1, 1) : vscode.ViewColumn.Two

		const panel = vscode.window.createWebviewPanel(WebviewProvider.tabPanelId, "Apex", targetCol, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [context.extensionUri],
		})
		// TODO: use better svg icon with light and dark variants (see https://stackoverflow.com/questions/58365687/vscode-extension-iconpath)

		panel.iconPath = {
			light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_light.png"),
			dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_dark.png"),
		}
		tabWebview.resolveWebviewView(panel)

		// Lock the editor group so clicking on files doesn't open them over the panel
		await setTimeoutPromise(100)
		await vscode.commands.executeCommand("workbench.action.lockEditorGroup")
	}

	context.subscriptions.push(vscode.commands.registerCommand("apex.popoutButtonClicked", openApexInNewTab))
	context.subscriptions.push(vscode.commands.registerCommand("apex.openInNewTab", openApexInNewTab))

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.settingsButtonClicked", (webview: any) => {
			WebviewProvider.getAllInstances().forEach((instance) => {
				const openSettings = async (instance?: WebviewProvider) => {
					if (!instance) {
						return
					}
					await postMessageToWebview(instance.controller.webviewProviderRef, {
						// Use imported function
						type: "action",
						action: "settingsButtonClicked",
					})
				}
				const isSidebar = !webview
				if (isSidebar) {
					openSettings(WebviewProvider.getSidebarInstance())
				} else {
					WebviewProvider.getTabInstances().forEach(openSettings)
				}
			})
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.historyButtonClicked", (webview: any) => {
			WebviewProvider.getAllInstances().forEach((instance) => {
				const openHistory = async (instance?: WebviewProvider) => {
					if (!instance) {
						return
					}
					await postMessageToWebview(instance.controller.webviewProviderRef, {
						// Use imported function
						type: "action",
						action: "historyButtonClicked",
					})
				}
				const isSidebar = !webview
				if (isSidebar) {
					openHistory(WebviewProvider.getSidebarInstance())
				} else {
					WebviewProvider.getTabInstances().forEach(openHistory)
				}
			})
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.accountButtonClicked", (webview: any) => {
			WebviewProvider.getAllInstances().forEach((instance) => {
				const openAccount = async (instance?: WebviewProvider) => {
					if (!instance) {
						return
					}
					await postMessageToWebview(instance.controller.webviewProviderRef, {
						// Use imported function
						type: "action",
						action: "accountButtonClicked",
					})
				}
				const isSidebar = !webview
				if (isSidebar) {
					openAccount(WebviewProvider.getSidebarInstance())
				} else {
					WebviewProvider.getTabInstances().forEach(openAccount)
				}
			})
		}),
	)

	/*
	We use the text document content provider API to show the left side for diff view by creating a virtual document for the original content. This makes it readonly so users know to edit the right side if they want to keep their changes.

	- This API allows you to create readonly documents in VSCode from arbitrary sources, and works by claiming an uri-scheme for which your provider then returns text contents. The scheme must be provided when registering a provider and cannot change afterwards.
	- Note how the provider doesn't create uris for virtual documents - its role is to provide contents given such an uri. In return, content providers are wired into the open document logic so that providers are always considered.
	https://code.visualstudio.com/api/extension-guides/virtual-documents
	*/
	const diffContentProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			return Buffer.from(uri.query, "base64").toString("utf-8")
		}
	})()
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider))

	// URI Handler
	const handleUri = async (uri: vscode.Uri) => {
		console.log("URI Handler called with:", {
			path: uri.path,
			query: uri.query,
			scheme: uri.scheme,
		})

		const path = uri.path
		const query = new URLSearchParams(uri.query.replace(/\+/g, "%2B"))
		const visibleWebview = WebviewProvider.getVisibleInstance()
		if (!visibleWebview) {
			return
		}
		switch (path) {
			case "/openrouter": {
				// handleOpenRouterCallback expects the full URI
				if (visibleWebview) {
					await handleOpenRouterCallback(visibleWebview.controller, uri) // Pass full URI
				}
				break
			}
			case "/auth": {
				// handleAuthCallback expects the full URI
				// validateAuthState only expects the controller
				const state = query.get("state") // Keep state for validation check

				console.log("Auth callback received:", {
					path: uri.path,
					query: uri.query,
				})

				// Validate state parameter - validateAuthState now returns void, remove the check
				if (!visibleWebview) {
					vscode.window.showErrorMessage("Cannot validate auth state: No visible webview.")
					return
				}
				await validateAuthState(visibleWebview.controller) // Call validation

				// Pass the full URI to handleAuthCallback
				await handleAuthCallback(visibleWebview.controller, uri) // Pass full URI
				break
			}
			default:
				break
		}
	}
	context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }))

	// Register size testing commands in development mode
	if (IS_DEV && IS_DEV === "true") {
		// Use dynamic import to avoid loading the module in production
		import("./dev/commands/tasks")
			.then((module) => {
				const devTaskCommands = module.registerTaskCommands(context, sidebarWebview.controller)
				context.subscriptions.push(...devTaskCommands)
				Logger.log("Apex dev task commands registered")
			})
			.catch((error) => {
				Logger.log("Failed to register dev task commands: " + error)
			})
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.addToChat", async (range?: vscode.Range, diagnostics?: vscode.Diagnostic[]) => {
			const editor = vscode.window.activeTextEditor
			if (!editor) {
				return
			}

			// Use provided range if available, otherwise use current selection
			// (vscode command passes an argument in the first param by default, so we need to ensure it's a Range object)
			const textRange = range instanceof vscode.Range ? range : editor.selection
			const selectedText = editor.document.getText(textRange)

			if (!selectedText) {
				return
			}

			// Get the file path and language ID
			const filePath = editor.document.uri.fsPath
			// addSelectedCodeToChat only needs the controller
			const visibleWebview = WebviewProvider.getVisibleInstance()
			if (visibleWebview) {
				await addSelectedCodeToChat(visibleWebview.controller) // Pass only controller
			}
		}),
	)

	context.subscriptions.push(
		vscode.commands.registerCommand("apex.addTerminalOutputToChat", async () => {
			const terminal = vscode.window.activeTerminal
			if (!terminal) {
				return
			}

			// Save current clipboard content
			const tempCopyBuffer = await vscode.env.clipboard.readText()

			try {
				// Copy the *existing* terminal selection (without selecting all)
				await vscode.commands.executeCommand("workbench.action.terminal.copySelection")

				// Get copied content
				let terminalContents = (await vscode.env.clipboard.readText()).trim()

				// Restore original clipboard content
				await vscode.env.clipboard.writeText(tempCopyBuffer)

				if (!terminalContents) {
					// No terminal content was copied (either nothing selected or some error)
					return
				}

				// [Optional] Any additional logic to process multi-line content can remain here
				// For example:
				/*
				const lines = terminalContents.split("\n")
				const lastLine = lines.pop()?.trim()
				if (lastLine) {
					let i = lines.length - 1
					while (i >= 0 && !lines[i].trim().startsWith(lastLine)) {
						i--
					}
					terminalContents = lines.slice(Math.max(i, 0)).join("\n")
				}
				*/

				// Send to sidebar provider
				// addSelectedTerminalOutputToChat only needs the controller
				const visibleWebview = WebviewProvider.getVisibleInstance()
				if (visibleWebview) {
					await addSelectedTerminalOutputToChat(visibleWebview.controller) // Pass only controller
				}
			} catch (error) {
				// Ensure clipboard is restored even if an error occurs
				await vscode.env.clipboard.writeText(tempCopyBuffer)
				console.error("Error getting terminal contents:", error)
				vscode.window.showErrorMessage("Failed to get terminal contents")
			}
		}),
	)

	// Register code action provider
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider(
			"*",
			new (class implements vscode.CodeActionProvider {
				public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix]

				provideCodeActions(
					document: vscode.TextDocument,
					range: vscode.Range,
					context: vscode.CodeActionContext,
				): vscode.CodeAction[] {
					// Expand range to include surrounding 3 lines
					const expandedRange = new vscode.Range(
						Math.max(0, range.start.line - 3),
						0,
						Math.min(document.lineCount - 1, range.end.line + 3),
						document.lineAt(Math.min(document.lineCount - 1, range.end.line + 3)).text.length,
					)

					const addAction = new vscode.CodeAction("Add to Apex", vscode.CodeActionKind.QuickFix)
					addAction.command = {
						command: "apex.addToChat",
						title: "Add to Apex",
						arguments: [expandedRange, context.diagnostics],
					}

					const fixAction = new vscode.CodeAction("Fix with Apex", vscode.CodeActionKind.QuickFix)
					fixAction.command = {
						command: "apex.fixWithApex",
						title: "Fix with Apex",
						arguments: [expandedRange, context.diagnostics],
					}

					// Only show actions when there are errors
					if (context.diagnostics.length > 0) {
						return [addAction, fixAction]
					} else {
						return []
					}
				}
			})(),
			{
				providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
			},
		),
	)

	// Register the command handler
	context.subscriptions.push(
		vscode.commands.registerCommand("apex.fixWithApex", async (range: vscode.Range, diagnostics: any[]) => {
			const editor = vscode.window.activeTextEditor
			if (!editor) {
				return
			}

			const selectedText = editor.document.getText(range)
			const filePath = editor.document.uri.fsPath
			// fixWithApex only needs the controller
			const visibleWebview = WebviewProvider.getVisibleInstance()
			if (visibleWebview) {
				await fixWithApex(visibleWebview.controller) // Pass only controller
			}
		}),
	)

	return createApexAPI(outputChannel, sidebarWebview.controller)
}

// This method is called when your extension is deactivated
export function deactivate() {
	telemetryService.shutdown()
	Logger.log("Apex extension deactivated")
}

// TODO: Find a solution for automatically removing DEV related content from production builds.
//  This type of code is fine in production to keep. We just will want to remove it from production builds
//  to bring down built asset sizes.
//
// This is a workaround to reload the extension when the source code changes
// since vscode doesn't support hot reload for extensions
const { IS_DEV, DEV_WORKSPACE_FOLDER } = process.env

if (IS_DEV && IS_DEV !== "false") {
	assert(DEV_WORKSPACE_FOLDER, "DEV_WORKSPACE_FOLDER must be set in development")
	const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(DEV_WORKSPACE_FOLDER, "src/**/*"))

	watcher.onDidChange((uri: vscode.Uri) => {
		// Add type annotation for the event argument
		console.info(`${uri.scheme} ${uri.path} changed. Reloading VSCode...`) // Use uri properties

		vscode.commands.executeCommand("workbench.action.reloadWindow")
	})
}
