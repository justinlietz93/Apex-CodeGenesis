import React from "react"
import { ApexMessage } from "../../../../../src/shared/ExtensionMessage"
import { COMMAND_OUTPUT_STRING, COMMAND_REQ_APP_STRING } from "../../../../../src/shared/combineCommandSequences"
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "../../common/CodeBlock"
import MessageHeader from "./MessageHeader" // Import MessageHeader

interface CommandRendererProps {
	message: ApexMessage
	isExpanded: boolean
	onToggleExpand: () => void
	isCommandExecuting?: boolean // Needed for MessageHeader
	// icon and title are derived within MessageHeader now
}

const CommandRenderer: React.FC<CommandRendererProps> = ({ message, isExpanded, onToggleExpand, isCommandExecuting }) => {
	const splitMessage = (text: string) => {
		const outputIndex = text.indexOf(COMMAND_OUTPUT_STRING)
		if (outputIndex === -1) {
			return { command: text, output: "" }
		}
		return {
			command: text.slice(0, outputIndex).trim(),
			output: text
				.slice(outputIndex + COMMAND_OUTPUT_STRING.length)
				.trim()
				.split("")
				.map((char) => {
					switch (char) {
						case "\t":
							return "→   "
						case "\b":
							return "⌫"
						case "\f":
							return "⏏"
						case "\v":
							return "⇳"
						default:
							return char
					}
				})
				.join(""),
		}
	}

	const { command: rawCommand, output } = splitMessage(message.text || "")

	const requestsApproval = rawCommand.endsWith(COMMAND_REQ_APP_STRING)
	const command = requestsApproval ? rawCommand.slice(0, -COMMAND_REQ_APP_STRING.length) : rawCommand

	return (
		<>
			<MessageHeader message={message} isCommandExecuting={isCommandExecuting} />
			<div
				style={{
					borderRadius: 3,
					border: "1px solid var(--vscode-editorGroup-border)",
					overflow: "hidden",
					backgroundColor: CODE_BLOCK_BG_COLOR,
				}}>
				<CodeBlock source={`${"```"}shell\n${command}\n${"```"}`} forceWrap={true} />
				{output.length > 0 && (
					<div style={{ width: "100%" }}>
						<div
							onClick={onToggleExpand}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "4px",
								width: "100%",
								justifyContent: "flex-start",
								cursor: "pointer",
								padding: `2px 8px ${isExpanded ? 0 : 8}px 8px`,
							}}>
							<span className={`codicon codicon-chevron-${isExpanded ? "down" : "right"}`}></span>
							<span style={{ fontSize: "0.8em" }}>Command Output</span>
						</div>
						{isExpanded && <CodeBlock source={`${"```"}shell\n${output}\n${"```"}`} />}
					</div>
				)}
			</div>
			{requestsApproval && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 10,
						padding: 8,
						fontSize: "12px",
						color: "var(--vscode-editorWarning-foreground)",
					}}>
					<i className="codicon codicon-warning"></i>
					<span>The model has determined this command requires explicit approval.</span>
				</div>
			)}
		</>
	)
}

export default CommandRenderer
