import React, { useMemo } from "react"
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react"
import { ApexAskUseMcpServer, ApexMessage } from "../../../../../src/shared/ExtensionMessage" // Removed ApexApiReqInfo as cost is passed directly
import { useExtensionState } from "../../../context/ExtensionStateContext"
import { getMcpServerDisplayName } from "../../../utils/mcp"

// Moved from ChatRow.tsx
export const ProgressIndicator = () => (
	<div
		style={{
			width: "16px",
			height: "16px",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
		}}>
		<div style={{ transform: "scale(0.55)", transformOrigin: "center" }}>
			<VSCodeProgressRing />
		</div>
	</div>
)

interface MessageHeaderProps {
	message: ApexMessage
	isCommandExecuting?: boolean
	isMcpServerResponding?: boolean
	cost?: number
	apiReqCancelReason?: string
	apiRequestFailedMessage?: string
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
	message,
	isCommandExecuting,
	isMcpServerResponding,
	cost,
	apiReqCancelReason,
	apiRequestFailedMessage,
}) => {
	const { mcpMarketplaceCatalog } = useExtensionState()

	const type = message.type === "ask" ? message.ask : message.say

	const normalColor = "var(--vscode-foreground)"
	const errorColor = "var(--vscode-errorForeground)"
	const successColor = "var(--vscode-charts-green)"
	const cancelledColor = "var(--vscode-descriptionForeground)"

	const [icon, title] = useMemo(() => {
		switch (type) {
			case "error":
				return [
					<span
						key="icon"
						className="codicon codicon-error"
						style={{
							color: errorColor,
							marginBottom: "-1.5px",
						}}></span>,
					<span key="title" style={{ color: errorColor, fontWeight: "bold" }}>
						Error
					</span>,
				]
			case "mistake_limit_reached":
				return [
					<span
						key="icon"
						className="codicon codicon-error"
						style={{
							color: errorColor,
							marginBottom: "-1.5px",
						}}></span>,
					<span key="title" style={{ color: errorColor, fontWeight: "bold" }}>
						Apex is having trouble...
					</span>,
				]
			case "auto_approval_max_req_reached":
				return [
					<span
						key="icon"
						className="codicon codicon-warning"
						style={{
							color: errorColor,
							marginBottom: "-1.5px",
						}}></span>,
					<span key="title" style={{ color: errorColor, fontWeight: "bold" }}>
						Maximum Requests Reached
					</span>,
				]
			case "command":
				return [
					isCommandExecuting ? (
						<ProgressIndicator key="icon" />
					) : (
						<span
							key="icon"
							className="codicon codicon-terminal"
							style={{
								color: normalColor,
								marginBottom: "-1.5px",
							}}></span>
					),
					<span key="title" style={{ color: normalColor, fontWeight: "bold" }}>
						Apex wants to execute this command:
					</span>,
				]
			case "use_mcp_server":
				// Ensure message.text is valid JSON before parsing
				let mcpServerUse: ApexAskUseMcpServer | null = null
				try {
					mcpServerUse = JSON.parse(message.text || "{}") as ApexAskUseMcpServer
				} catch (e) {
					console.error("Failed to parse MCP server use message:", message.text, e)
					// Handle error case, maybe return a default or error icon/title
					return [
						<span
							key="icon"
							className="codicon codicon-error"
							style={{ color: errorColor, marginBottom: "-1.5px" }}></span>,
						<span key="title" style={{ color: errorColor, fontWeight: "bold" }}>
							Invalid MCP Request
						</span>,
					]
				}

				// Check if mcpServerUse is not null before accessing its properties
				if (!mcpServerUse) {
					return [null, null] // Or some error indication
				}

				return [
					isMcpServerResponding ? (
						<ProgressIndicator key="icon" />
					) : (
						<span
							key="icon"
							className="codicon codicon-server"
							style={{
								color: normalColor,
								marginBottom: "-1.5px",
							}}></span>
					),
					<span key="title" style={{ color: normalColor, fontWeight: "bold", wordBreak: "break-word" }}>
						Apex wants to {mcpServerUse.type === "use_mcp_tool" ? "use a tool" : "access a resource"} on the{" "}
						<code style={{ wordBreak: "break-all" }}>
							{getMcpServerDisplayName(mcpServerUse.serverName, mcpMarketplaceCatalog)}
						</code>{" "}
						MCP server:
					</span>,
				]
			case "completion_result":
				return [
					<span
						key="icon"
						className="codicon codicon-check"
						style={{
							color: successColor,
							marginBottom: "-1.5px",
						}}></span>,
					<span key="title" style={{ color: successColor, fontWeight: "bold" }}>
						Task Completed
					</span>,
				]
			case "api_req_started":
				const getIconSpan = (iconName: string, color: string) => (
					<div
						key={iconName}
						style={{
							width: 16,
							height: 16,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
						<span
							className={`codicon codicon-${iconName}`}
							style={{
								color,
								fontSize: 16,
								marginBottom: "-1.5px",
							}}></span>
					</div>
				)
				return [
					apiReqCancelReason != null ? (
						apiReqCancelReason === "user_cancelled" ? (
							getIconSpan("error", cancelledColor)
						) : (
							getIconSpan("error", errorColor)
						)
					) : cost != null ? (
						getIconSpan("check", successColor)
					) : apiRequestFailedMessage ? (
						getIconSpan("error", errorColor)
					) : (
						<ProgressIndicator key="progress" />
					),
					(() => {
						if (apiReqCancelReason != null) {
							return apiReqCancelReason === "user_cancelled" ? (
								<span key="title" style={{ color: normalColor, fontWeight: "bold" }}>
									API Request Cancelled
								</span>
							) : (
								<span key="title" style={{ color: errorColor, fontWeight: "bold" }}>
									API Streaming Failed
								</span>
							)
						}

						if (cost != null) {
							return (
								<span key="title" style={{ color: normalColor, fontWeight: "bold" }}>
									API Request
								</span>
							)
						}

						if (apiRequestFailedMessage) {
							return (
								<span key="title" style={{ color: errorColor, fontWeight: "bold" }}>
									API Request Failed
								</span>
							)
						}

						return (
							<span key="title" style={{ color: normalColor, fontWeight: "bold" }}>
								API Request...
							</span>
						)
					})(),
				]
			case "followup":
				return [
					<span
						key="icon"
						className="codicon codicon-question"
						style={{
							color: normalColor,
							marginBottom: "-1.5px",
						}}></span>,
					<span key="title" style={{ color: normalColor, fontWeight: "bold" }}>
						Apex has a question:
					</span>,
				]
			default:
				// Return null for types that don't have a specific header (like 'text', 'reasoning', etc.)
				return [null, null]
		}
	}, [
		type,
		cost,
		apiRequestFailedMessage,
		isCommandExecuting,
		apiReqCancelReason,
		isMcpServerResponding,
		message.text,
		mcpMarketplaceCatalog,
	])

	// Only render the header div if icon or title is present
	if (!icon && !title) {
		return null
	}

	const headerStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: "10px",
		marginBottom: "12px",
	}

	return (
		<div style={headerStyle}>
			{icon}
			{title}
		</div>
	)
}

export default MessageHeader
