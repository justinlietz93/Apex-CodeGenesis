import * as vscode from "vscode"
import * as path from "path"
import * as os from "os"
import { setTimeout as setTimeoutPromise } from "node:timers/promises"
import pWaitFor from "p-wait-for"
import { Anthropic } from "@anthropic-ai/sdk"
import { Task } from "../index" // Import Task type
import { parseMentions } from "../../mentions" // Corrected import path
import { arePathsEqual } from "../../../utils/path"
import { listFiles } from "../../../services/glob/list-files"
import { formatResponse } from "../../prompts/responses"

// Define types used within the class if they are not imported globally
type UserContent = Array<Anthropic.ContentBlockParam>

// Define cwd at the module level
const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

export class ContextLoader {
	private task: Task

	constructor(taskInstance: Task) {
		this.task = taskInstance
		// Initialize properties if needed
		// this.didEditFile = taskInstance.didEditFile; // Example if moved
	}

	async loadContext(userContent: UserContent, includeFileDetails: boolean = false): Promise<[UserContent, string]> {
		// Access services/properties via this.task
		const parsedUserContent = await Promise.all(
			userContent.map(async (block) => {
				if (block.type === "text") {
					if (
						block.text.includes("<feedback>") ||
						block.text.includes("<answer>") ||
						block.text.includes("<task>") ||
						block.text.includes("<user_message>")
					) {
						return {
							...block,
							// Access urlContentFetcher via task
							text: await parseMentions(block.text, cwd, this.task.urlContentFetcher),
						}
					}
				}
				return block
			}),
		)

		const environmentDetails = await this.getEnvironmentDetails(includeFileDetails)

		return [parsedUserContent, environmentDetails]
	}

	async getEnvironmentDetails(includeFileDetails: boolean = false): Promise<string> {
		let details = ""

		details += "\n\n# VSCode Visible Files"
		const visibleFilePaths = vscode.window.visibleTextEditors
			?.map((editor) => editor.document?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath))

		// Access apexIgnoreController via task
		const allowedVisibleFiles = this.task.apexIgnoreController
			.filterPaths(visibleFilePaths)
			.map((p) => p.toPosix()) // Assuming toPosix is available or adjust as needed
			.join("\n")

		if (allowedVisibleFiles) {
			details += `\n${allowedVisibleFiles}`
		} else {
			details += "\n(No visible files)"
		}

		details += "\n\n# VSCode Open Tabs"
		const openTabPaths = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
			.filter(Boolean)
			.map((absolutePath) => path.relative(cwd, absolutePath))

		// Access apexIgnoreController via task
		const allowedOpenTabs = this.task.apexIgnoreController
			.filterPaths(openTabPaths)
			.map((p) => p.toPosix()) // Assuming toPosix is available or adjust as needed
			.join("\n")

		if (allowedOpenTabs) {
			details += `\n${allowedOpenTabs}`
		} else {
			details += "\n(No open tabs)"
		}

		// Access terminalManager via task
		const busyTerminals = this.task.terminalManager.getTerminals(true)
		const inactiveTerminals = this.task.terminalManager.getTerminals(false)

		// Access didEditFile via stateManager
		if (busyTerminals.length > 0 && this.task.stateManager.didEditFile) {
			// Access via stateManager
			await setTimeoutPromise(300)
		}

		if (busyTerminals.length > 0) {
			// Access terminalManager via task
			await pWaitFor(() => busyTerminals.every((t) => !this.task.terminalManager.isProcessHot(t.id)), {
				interval: 100,
				timeout: 15_000,
			}).catch(() => {})
		}

		// Reset didEditFile via stateManager
		this.task.stateManager.didEditFile = false // Access via stateManager

		let terminalDetails = ""
		if (busyTerminals.length > 0) {
			terminalDetails += "\n\n# Actively Running Terminals"
			for (const busyTerminal of busyTerminals) {
				terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``
				// Access terminalManager via task
				const newOutput = this.task.terminalManager.getUnretrievedOutput(busyTerminal.id)
				if (newOutput) {
					terminalDetails += `\n### New Output\n${newOutput}`
				}
			}
		}
		if (inactiveTerminals.length > 0) {
			const inactiveTerminalOutputs = new Map<number, string>()
			for (const inactiveTerminal of inactiveTerminals) {
				// Access terminalManager via task
				const newOutput = this.task.terminalManager.getUnretrievedOutput(inactiveTerminal.id)
				if (newOutput) {
					inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput)
				}
			}
			if (inactiveTerminalOutputs.size > 0) {
				terminalDetails += "\n\n# Inactive Terminals"
				for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
					const inactiveTerminal = inactiveTerminals.find((t) => t.id === terminalId)
					if (inactiveTerminal) {
						terminalDetails += `\n## ${inactiveTerminal.lastCommand}`
						terminalDetails += `\n### New Output\n${newOutput}`
					}
				}
			}
		}

		if (terminalDetails) {
			details += terminalDetails
		}

		const now = new Date()
		const formatter = new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			hour12: true,
		})
		const timeZone = formatter.resolvedOptions().timeZone
		const timeZoneOffset = -now.getTimezoneOffset() / 60
		const timeZoneOffsetStr = `${timeZoneOffset >= 0 ? "+" : ""}${timeZoneOffset}:00`
		details += `\n\n# Current Time\n${formatter.format(now)} (${timeZone}, UTC${timeZoneOffsetStr})`

		if (includeFileDetails) {
			details += `\n\n# Current Working Directory (${cwd}) Files\n` // Use cwd directly
			const isDesktop = arePathsEqual(cwd, path.join(os.homedir(), "Desktop"))
			if (isDesktop) {
				details += "(Desktop files not shown automatically. Use list_files to explore if needed.)"
			} else {
				// Access apexIgnoreController via task
				const [files, didHitLimit] = await listFiles(cwd, true, 200)
				const result = formatResponse.formatFilesList(cwd, files, didHitLimit, this.task.apexIgnoreController)
				details += result
			}
		}

		details += "\n\n# Current Mode"
		// Access chatSettings via task
		if (this.task.chatSettings.mode === "plan") {
			details += "\nPLAN MODE\n" + formatResponse.planModeInstructions()
		} else {
			details += "\nACT MODE"
		}

		return `<environment_details>\n${details.trim()}\n</environment_details>`
	}
}
