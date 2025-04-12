import React, { memo } from "react"
import { ApexAskQuestion, ApexMessage, ApexPlanModeResponse } from "../../../../../src/shared/ExtensionMessage"
import MarkdownBlock from "../../common/MarkdownBlock"
import { OptionsButtons } from "../OptionsButtons"
import MessageHeader from "./MessageHeader" // Import MessageHeader for error types

// Re-use Markdown component definition if needed, or import if moved to common
const Markdown = memo(({ markdown }: { markdown?: string }) => {
	return (
		<div
			style={{
				wordBreak: "break-word",
				overflowWrap: "anywhere",
				marginBottom: -15,
				marginTop: -15,
			}}>
			<MarkdownBlock markdown={markdown} />
		</div>
	)
})

interface DefaultMessageRendererProps {
	message: ApexMessage
	// icon and title are handled by MessageHeader or not needed for these types
	isLast: boolean // Needed for OptionsButtons active state
	lastModifiedMessage?: ApexMessage // Needed for OptionsButtons active state
	// isExpanded and onToggleExpand are needed for reasoning
	isExpanded: boolean
	onToggleExpand: () => void
}

const DefaultMessageRenderer: React.FC<DefaultMessageRendererProps> = ({
	message,
	isLast,
	lastModifiedMessage,
	isExpanded,
	onToggleExpand,
}) => {
	const pStyle: React.CSSProperties = {
		margin: 0,
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
		overflowWrap: "anywhere",
	}

	switch (message.type) {
		case "say":
			switch (message.say) {
				case "text":
					return (
						<div>
							<Markdown markdown={message.text} />
						</div>
					)
				case "reasoning":
					return (
						<>
							{message.text && (
								<div
									onClick={onToggleExpand}
									style={{
										cursor: "pointer",
										color: "var(--vscode-descriptionForeground)",
										fontStyle: "italic",
										overflow: "hidden",
									}}>
									{isExpanded ? (
										<div style={{ marginTop: -3 }}>
											<span style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
												Thinking
												<span
													className="codicon codicon-chevron-down"
													style={{
														display: "inline-block",
														transform: "translateY(3px)",
														marginLeft: "1.5px",
													}}
												/>
											</span>
											{message.text}
										</div>
									) : (
										<div style={{ display: "flex", alignItems: "center" }}>
											<span style={{ fontWeight: "bold", marginRight: "4px" }}>Thinking:</span>
											<span
												style={{
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
													direction: "rtl",
													textAlign: "left",
													flex: 1,
												}}>
												{message.text + "\u200E"}
											</span>
											<span
												className="codicon codicon-chevron-right"
												style={{
													marginLeft: "4px",
													flexShrink: 0,
												}}
											/>
										</div>
									)}
								</div>
							)}
						</>
					)
				case "error": // Includes mistake_limit_reached, auto_approval_max_req_reached
					return (
						<>
							<MessageHeader message={message} />
							<p
								style={{
									...pStyle,
									color: "var(--vscode-errorForeground)",
								}}>
								{message.text}
							</p>
						</>
					)
				// Other 'say' types handled by specific renderers (api_req, command, tool, mcp, feedback, completion)
				// Add cases for 'info', 'shell_integration_warning', 'diff_error', 'apexignore_error', 'checkpoint_created' if they should be handled here
				case "info": // Example: Handle 'info' type
					return (
						<div style={{ paddingTop: 10, fontStyle: "italic", color: "var(--vscode-descriptionForeground)" }}>
							<Markdown markdown={message.text} />
						</div>
					)
				case "shell_integration_warning":
					// Simplified rendering, assuming no complex structure needed here
					return (
						<div
							style={{
								color: "var(--vscode-warningForeground)",
								fontSize: "12px",
								padding: "8px",
								backgroundColor: "rgba(255, 191, 0, 0.1)",
								borderRadius: "3px",
							}}>
							<i className="codicon codicon-warning" style={{ marginRight: "8px" }}></i>
							Shell Integration Unavailable: {message.text} {/* Adjust as needed */}
						</div>
					)
				case "diff_error":
					return (
						<div
							style={{
								color: "var(--vscode-warningForeground)",
								fontSize: "12px",
								padding: "8px",
								backgroundColor: "var(--vscode-textBlockQuote-background)",
								borderRadius: "3px",
							}}>
							<i className="codicon codicon-warning" style={{ marginRight: "8px" }}></i>
							Diff Edit Mismatch: The model used search patterns that don't match anything in the file. Retrying...
						</div>
					)
				case "apexignore_error":
					return (
						<div
							style={{
								color: "#FFA500",
								fontSize: "12px",
								padding: "8px",
								backgroundColor: "rgba(255, 191, 0, 0.1)",
								borderRadius: "3px",
							}}>
							<i className="codicon codicon-error" style={{ marginRight: "8px" }}></i>
							Access Denied: Apex tried to access <code>{message.text}</code> which is blocked by the{" "}
							<code>.apexignore</code> file.
						</div>
					)
				// checkpoint_created is handled by CheckmarkControl outside this component structure usually
				default:
					// Fallback for any unhandled 'say' types, maybe render raw text or nothing
					console.warn("Unhandled 'say' type in DefaultMessageRenderer:", message.say)
					return message.text ? <Markdown markdown={message.text} /> : null
			}
		case "ask":
			switch (message.ask) {
				case "followup":
					let question: string | undefined
					let options: string[] | undefined
					let selected: string | undefined
					try {
						const parsedMessage = JSON.parse(message.text || "{}") as ApexAskQuestion
						question = parsedMessage.question
						options = parsedMessage.options
						selected = parsedMessage.selected
					} catch (e) {
						question = message.text // legacy
					}
					return (
						<>
							<MessageHeader message={message} />
							<div style={{ paddingTop: 10 }}>
								<Markdown markdown={question} />
								<OptionsButtons
									options={options}
									selected={selected}
									isActive={isLast && lastModifiedMessage?.ask === "followup"}
								/>
							</div>
						</>
					)
				case "plan_mode_respond": {
					let response: string | undefined
					let options: string[] | undefined
					let selected: string | undefined
					try {
						const parsedMessage = JSON.parse(message.text || "{}") as ApexPlanModeResponse
						response = parsedMessage.response
						options = parsedMessage.options
						selected = parsedMessage.selected
					} catch (e) {
						response = message.text // legacy
					}
					return (
						<div style={{}}>
							{/* No specific header for plan_mode_respond */}
							<Markdown markdown={response} />
							<OptionsButtons
								options={options}
								selected={selected}
								isActive={isLast && lastModifiedMessage?.ask === "plan_mode_respond"}
							/>
						</div>
					)
				}
				case "mistake_limit_reached": // Fallthrough intended
				case "auto_approval_max_req_reached":
					// These are essentially error messages presented as 'ask'
					return (
						<>
							<MessageHeader message={message} />
							<p
								style={{
									...pStyle,
									color: "var(--vscode-errorForeground)",
								}}>
								{message.text}
							</p>
						</>
					)
				// Other 'ask' types handled by specific renderers (command, tool, mcp, completion)
				default:
					// Fallback for any unhandled 'ask' types
					console.warn("Unhandled 'ask' type in DefaultMessageRenderer:", message.ask)
					return message.text ? <Markdown markdown={message.text} /> : null
			}
	}
	// Should not be reachable if all types are handled
	return null
}

export default DefaultMessageRenderer
