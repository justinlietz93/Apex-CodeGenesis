// Removed unused imports: VSCodeBadge, VSCodeProgressRing, deepEqual, ApexAskQuestion, ApexAskUseMcpServer, ApexPlanModeResponse, COMMAND_REQ_APP_STRING, findMatchingResourceOrTemplate, getMcpServerDisplayName, CodeAccordian, cleanPathPrefix, CodeBlock, CODE_BLOCK_BG_COLOR, Thumbnails, McpResourceRow, McpToolRow, McpResponseDisplay, CreditLimitError, OptionsButtons, highlightMentions
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useEvent, useSize } from "react-use"
import styled from "styled-components"
import {
	ApexApiReqInfo,
	ApexMessage,
	ApexSayTool,
	COMPLETION_RESULT_CHANGES_FLAG,
	ExtensionMessage,
} from "../../../../src/shared/ExtensionMessage"
import { COMMAND_OUTPUT_STRING } from "../../../../src/shared/combineCommandSequences"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"
import { CheckmarkControl } from "../common/CheckmarkControl"
import { CheckpointControls, CheckpointOverlay } from "../common/CheckpointControls"
import MarkdownBlock from "../common/MarkdownBlock" // Re-add MarkdownBlock import
import SuccessButton from "../common/SuccessButton" // Keep for completion_result
import TaskFeedbackButtons from "./TaskFeedbackButtons" // Keep for completion_result
import MessageHeader from "./ChatRow/MessageHeader" // Keep for completion_result header
import ToolCallRenderer from "./ChatRow/ToolCallRenderer"
import CommandRenderer from "./ChatRow/CommandRenderer"
import ApiRequestRenderer from "./ChatRow/ApiRequestRenderer"
import McpRenderer from "./ChatRow/McpRenderer"
import FeedbackRenderer from "./ChatRow/FeedbackRenderer"
import DefaultMessageRenderer from "./ChatRow/DefaultMessageRenderer"

const ChatRowContainer = styled.div`
	padding: 10px 6px 10px 15px;
	position: relative;

	&:hover ${CheckpointControls} {
		opacity: 1;
	}
`

interface ChatRowProps {
	message: ApexMessage
	isExpanded: boolean
	onToggleExpand: () => void
	lastModifiedMessage?: ApexMessage
	isLast: boolean
	onHeightChange: (isTaller: boolean) => void
}

interface ChatRowContentProps extends Omit<ChatRowProps, "onHeightChange"> {}

// Re-introduce local Markdown component definition as it's used below
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

const ChatRow = memo(
	(props: ChatRowProps) => {
		const { isLast, onHeightChange, message, lastModifiedMessage } = props
		// Store the previous height to compare with the current height
		// This allows us to detect changes without causing re-renders
		const prevHeightRef = useRef(0)

		// NOTE: for tools that are interrupted and not responded to (approved or rejected) there won't be a checkpoint hash
		let shouldShowCheckpoints =
			message.lastCheckpointHash != null &&
			(message.say === "tool" ||
				message.ask === "tool" ||
				message.say === "command" ||
				message.ask === "command" ||
				// message.say === "completion_result" ||
				// message.ask === "completion_result" ||
				message.say === "use_mcp_server" ||
				message.ask === "use_mcp_server")

		if (shouldShowCheckpoints && isLast) {
			shouldShowCheckpoints =
				lastModifiedMessage?.ask === "resume_completed_task" || lastModifiedMessage?.ask === "resume_task"
		}

		const [chatrow, { height }] = useSize(
			<ChatRowContainer>
				<ChatRowContent {...props} />
				{shouldShowCheckpoints && <CheckpointOverlay messageTs={message.ts} />}
			</ChatRowContainer>,
		)

		useEffect(() => {
			// used for partials command output etc.
			// NOTE: it's important we don't distinguish between partial or complete here since our scroll effects in chatview need to handle height change during partial -> complete
			const isInitialRender = prevHeightRef.current === 0 // prevents scrolling when new element is added since we already scroll for that
			// height starts off at Infinity
			if (isLast && height !== 0 && height !== Infinity && height !== prevHeightRef.current) {
				if (!isInitialRender) {
					onHeightChange(height > prevHeightRef.current)
				}
				prevHeightRef.current = height
			}
		}, [height, isLast, onHeightChange, message])

		// we cannot return null as virtuoso does not support it so we use a separate visibleMessages array to filter out messages that should not be rendered
		return chatrow
	}, // Use shallow comparison for memo
)

export default ChatRow

// Simplified ChatRowContent acting as a dispatcher
export const ChatRowContent = ({ message, isExpanded, onToggleExpand, lastModifiedMessage, isLast }: ChatRowContentProps) => {
	const { mcpServers, mcpMarketplaceCatalog } = useExtensionState()
	const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false)

	// Calculate props needed by specific renderers
	const [cost, apiReqCancelReason, apiReqStreamingFailedMessage] = useMemo(() => {
		if (message.text != null && message.say === "api_req_started") {
			try {
				const info: ApexApiReqInfo = JSON.parse(message.text)
				return [info.cost, info.cancelReason, info.streamingFailedMessage]
			} catch (e) {
				console.error("Failed to parse API request info:", message.text, e)
				return [undefined, undefined, undefined]
			}
		}
		return [undefined, undefined, undefined]
	}, [message.text, message.say])

	const apiRequestFailedMessage =
		isLast && lastModifiedMessage?.ask === "api_req_failed" ? lastModifiedMessage?.text : undefined

	const isCommandExecuting =
		isLast &&
		(lastModifiedMessage?.ask === "command" || lastModifiedMessage?.say === "command") &&
		lastModifiedMessage?.text?.includes(COMMAND_OUTPUT_STRING)

	const isMcpServerResponding = isLast && lastModifiedMessage?.say === "mcp_server_request_started"

	// --- Message Type Dispatching ---

	// 1. Tool Messages
	const tool = useMemo(() => {
		if (message.ask === "tool" || message.say === "tool") {
			try {
				return JSON.parse(message.text || "{}") as ApexSayTool
			} catch (e) {
				console.error("Failed to parse tool message:", message.text, e)
				return null
			}
		}
		return null
	}, [message.ask, message.say, message.text])

	if (tool) {
		return <ToolCallRenderer tool={tool} message={message} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />
	}

	// 2. Command Messages
	if (message.ask === "command" || message.say === "command") {
		return (
			<CommandRenderer
				message={message}
				isExpanded={isExpanded}
				onToggleExpand={onToggleExpand}
				isCommandExecuting={isCommandExecuting}
			/>
		)
	}

	// 3. MCP Messages
	if (message.ask === "use_mcp_server" || message.say === "use_mcp_server") {
		return (
			<McpRenderer
				message={message}
				mcpServers={mcpServers}
				mcpMarketplaceCatalog={mcpMarketplaceCatalog}
				isExpanded={isExpanded}
				onToggleExpand={onToggleExpand}
				isMcpServerResponding={isMcpServerResponding}
			/>
		)
	}

	// 4. Specific 'say' types handled by dedicated renderers or directly
	if (message.type === "say") {
		switch (message.say) {
			case "api_req_started":
				return (
					<ApiRequestRenderer
						message={message}
						isExpanded={isExpanded}
						onToggleExpand={onToggleExpand}
						cost={cost}
						apiRequestFailedMessage={apiRequestFailedMessage}
						apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
						apiReqCancelReason={apiReqCancelReason}
					/>
				)
			case "user_feedback":
			case "user_feedback_diff":
				return <FeedbackRenderer message={message} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />
			case "completion_result":
				const hasChanges = message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false
				const text = hasChanges ? message.text?.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : message.text
				return (
					<>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
							<MessageHeader message={message} />
							<TaskFeedbackButtons
								messageTs={message.ts}
								isFromHistory={
									!isLast ||
									lastModifiedMessage?.ask === "resume_completed_task" ||
									lastModifiedMessage?.ask === "resume_task"
								}
								style={{ marginLeft: "auto" }}
							/>
						</div>
						<div style={{ color: "var(--vscode-charts-green)", paddingTop: 10 }}>
							{/* Use local Markdown component for completion result text */}
							<Markdown markdown={text} />
						</div>
						{message.partial !== true && hasChanges && (
							<div style={{ paddingTop: 17 }}>
								<SuccessButton
									disabled={seeNewChangesDisabled}
									onClick={() => {
										setSeeNewChangesDisabled(true)
										vscode.postMessage({ type: "taskCompletionViewChanges", number: message.ts })
									}}
									style={{ cursor: seeNewChangesDisabled ? "wait" : "pointer", width: "100%" }}>
									<i className="codicon codicon-new-file" style={{ marginRight: 6 }} />
									See new changes
								</SuccessButton>
							</div>
						)}
					</>
				)
			case "checkpoint_created":
				return <CheckmarkControl messageTs={message.ts} isCheckpointCheckedOut={message.isCheckpointCheckedOut} />
			// Other 'say' types fall through to DefaultMessageRenderer below
		}
	}

	// 5. Specific 'ask' types handled here or by DefaultMessageRenderer
	if (message.type === "ask") {
		switch (message.ask) {
			case "completion_result":
				if (message.text) {
					const hasChanges = message.text.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false
					const text = hasChanges ? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : message.text
					return (
						<div>
							<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
								<MessageHeader message={message} />
								<TaskFeedbackButtons
									messageTs={message.ts}
									isFromHistory={
										!isLast ||
										lastModifiedMessage?.ask === "resume_completed_task" ||
										lastModifiedMessage?.ask === "resume_task"
									}
									style={{ marginLeft: "auto" }}
								/>
							</div>
							<div style={{ color: "var(--vscode-charts-green)", paddingTop: 10 }}>
								{/* Use local Markdown component for completion result text */}
								<Markdown markdown={text} />
								{message.partial !== true && hasChanges && (
									<div style={{ marginTop: 15 }}>
										<SuccessButton
											appearance="secondary"
											disabled={seeNewChangesDisabled}
											onClick={() => {
												setSeeNewChangesDisabled(true)
												vscode.postMessage({ type: "taskCompletionViewChanges", number: message.ts })
											}}>
											<i
												className="codicon codicon-new-file"
												style={{ marginRight: 6, cursor: seeNewChangesDisabled ? "wait" : "pointer" }}
											/>
											See new changes
										</SuccessButton>
									</div>
								)}
							</div>
						</div>
					)
				} else {
					return null // Don't render ask completion_result without text
				}
			// Other 'ask' types fall through to DefaultMessageRenderer below
		}
	}

	// 6. Fallback to DefaultMessageRenderer for all remaining types
	return (
		<DefaultMessageRenderer
			message={message}
			isLast={isLast}
			lastModifiedMessage={lastModifiedMessage}
			isExpanded={isExpanded}
			onToggleExpand={onToggleExpand}
		/>
	)
}
