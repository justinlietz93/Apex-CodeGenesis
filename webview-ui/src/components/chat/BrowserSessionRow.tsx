import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import deepEqual from "fast-deep-equal"
import React, { memo, useEffect, useMemo, useRef, useState } from "react"
import { useSize } from "react-use"
import styled from "styled-components"
import { BROWSER_VIEWPORT_PRESETS } from "../../../../src/shared/BrowserSettings"
import { BrowserAction, BrowserActionResult, ApexMessage, ApexSayBrowserAction } from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"
// Removed unused imports: BrowserSettingsMenu, CheckpointControls, CodeBlock, CODE_BLOCK_BG_COLOR, ChatRowContent, VSCodeButton
import { CheckpointControls } from "../common/CheckpointControls"; // Keep CheckpointControls if needed for overlay
import { ProgressIndicator } from "./ChatRow/MessageHeader";
import BrowserStateDisplay from "./BrowserSessionRow/BrowserStateDisplay";
import BrowserActionList from "./BrowserSessionRow/BrowserActionList";
import BrowserPagination from "./BrowserSessionRow/BrowserPagination"; // Import the new component

interface BrowserSessionRowProps {
	messages: ApexMessage[]
	isExpanded: (messageTs: number) => boolean
	onToggleExpand: (messageTs: number) => void
	lastModifiedMessage?: ApexMessage
	isLast: boolean
	onHeightChange: (isTaller: boolean) => void
}

const BrowserSessionRow = memo((props: BrowserSessionRowProps) => {
	const { messages, isLast, onHeightChange, lastModifiedMessage } = props
	const { browserSettings } = useExtensionState()
	const prevHeightRef = useRef(0)
	const [maxActionHeight, setMaxActionHeight] = useState(0)
	const [consoleLogsExpanded, setConsoleLogsExpanded] = useState(false)

	const isLastApiReqInterrupted = useMemo(() => {
		// Check if last api_req_started is cancelled
		const lastApiReqStarted = [...messages].reverse().find((m) => m.say === "api_req_started")
		if (lastApiReqStarted?.text != null) {
			const info = JSON.parse(lastApiReqStarted.text)
			if (info.cancelReason != null) {
				return true
			}
		}
		const lastApiReqFailed = isLast && lastModifiedMessage?.ask === "api_req_failed"
		if (lastApiReqFailed) {
			return true
		}
		return false
	}, [messages, lastModifiedMessage, isLast])

	const isBrowsing = useMemo(() => {
		return isLast && messages.some((m) => m.say === "browser_action_result") && !isLastApiReqInterrupted // after user approves, browser_action_result with "" is sent to indicate that the session has started
	}, [isLast, messages, isLastApiReqInterrupted])

	// Organize messages into pages with current state and next action
	const pages = useMemo(() => {
		const result: {
			currentState: {
				url?: string
				screenshot?: string
				mousePosition?: string
				consoleLogs?: string
				messages: ApexMessage[] // messages up to and including the result
			}
			nextAction?: {
				messages: ApexMessage[] // messages leading to next result
			}
		}[] = []

		let currentStateMessages: ApexMessage[] = []
		let nextActionMessages: ApexMessage[] = []

		messages.forEach((message) => {
			if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
				// Start first page
				currentStateMessages = [message]
			} else if (message.say === "browser_action_result") {
				if (message.text === "") {
					// first browser_action_result is an empty string that signals that session has started
					return
				}
				// Complete current state
				currentStateMessages.push(message)
				const resultData = JSON.parse(message.text || "{}") as BrowserActionResult

				// Add page with current state and previous next actions
				result.push({
					currentState: {
						url: resultData.currentUrl,
						screenshot: resultData.screenshot,
						mousePosition: resultData.currentMousePosition,
						consoleLogs: resultData.logs,
						messages: [...currentStateMessages],
					},
					nextAction:
						nextActionMessages.length > 0
							? {
									messages: [...nextActionMessages],
								}
							: undefined,
				})

				// Reset for next page
				currentStateMessages = []
				nextActionMessages = []
			} else if (message.say === "api_req_started" || message.say === "text" || message.say === "browser_action") {
				// These messages lead to the next result, so they should always go in nextActionMessages
				nextActionMessages.push(message)
			} else {
				// Any other message types
				currentStateMessages.push(message)
			}
		})

		// Add incomplete page if exists
		if (currentStateMessages.length > 0 || nextActionMessages.length > 0) {
			result.push({
				currentState: {
					messages: [...currentStateMessages],
				},
				nextAction:
					nextActionMessages.length > 0
						? {
								messages: [...nextActionMessages],
							}
						: undefined,
			})
		}

		return result
	}, [messages])

	// Auto-advance to latest page
	const [currentPageIndex, setCurrentPageIndex] = useState(0)
	useEffect(() => {
		setCurrentPageIndex(pages.length - 1)
	}, [pages.length])

	// Get initial URL from launch message
	const initialUrl = useMemo(() => {
		const launchMessage = messages.find((m) => m.ask === "browser_action_launch" || m.say === "browser_action_launch")
		return launchMessage?.text || ""
	}, [messages])

	const isAutoApproved = useMemo(() => {
		const launchMessage = messages.find((m) => m.ask === "browser_action_launch" || m.say === "browser_action_launch")
		return launchMessage?.say === "browser_action_launch"
	}, [messages])

	// const lastCheckpointMessageTs = useMemo(() => {
	// 	const lastCheckpointMessage = findLast(messages, (m) => m.lastCheckpointHash !== undefined)
	// 	return lastCheckpointMessage?.ts
	// }, [messages])

	// Find the latest available URL and screenshot
	const latestState = useMemo(() => {
		for (let i = pages.length - 1; i >= 0; i--) {
			const page = pages[i]
			if (page.currentState.url || page.currentState.screenshot) {
				return {
					url: page.currentState.url,
					mousePosition: page.currentState.mousePosition,
					consoleLogs: page.currentState.consoleLogs,
					screenshot: page.currentState.screenshot,
				}
			}
		}
		return {
			url: undefined,
			mousePosition: undefined,
			consoleLogs: undefined,
			screenshot: undefined,
		}
	}, [pages])

	const currentPage = pages[currentPageIndex]
	const isLastPage = currentPageIndex === pages.length - 1

	const defaultMousePosition = `${browserSettings.viewport.width * 0.7},${browserSettings.viewport.height * 0.5}`

	// Use latest state if we're on the last page and don't have a state yet
	const displayState = isLastPage
		? {
				url: currentPage?.currentState.url || latestState.url || initialUrl,
				mousePosition: currentPage?.currentState.mousePosition || latestState.mousePosition || defaultMousePosition,
				consoleLogs: currentPage?.currentState.consoleLogs,
				screenshot: currentPage?.currentState.screenshot || latestState.screenshot,
			}
		: {
				url: currentPage?.currentState.url || initialUrl,
				mousePosition: currentPage?.currentState.mousePosition || defaultMousePosition,
				consoleLogs: currentPage?.currentState.consoleLogs,
				screenshot: currentPage?.currentState.screenshot,
			};

	// Removed actionContent definition and useSize hook for it

	// Track latest click coordinate
	const latestClickPosition = useMemo(() => {
		if (!isBrowsing) return undefined

		// Look through current page's next actions for the latest browser_action
		const actions = currentPage?.nextAction?.messages || []
		for (let i = actions.length - 1; i >= 0; i--) {
			const message = actions[i]
			if (message.say === "browser_action") {
				const browserAction = JSON.parse(message.text || "{}") as ApexSayBrowserAction
				if (browserAction.action === "click" && browserAction.coordinate) {
					return browserAction.coordinate
				}
			}
		}
		return undefined
	}, [isBrowsing, currentPage?.nextAction?.messages])

	// Use latest click position while browsing, otherwise use display state
	const mousePosition = isBrowsing ? latestClickPosition || displayState.mousePosition : displayState.mousePosition

	// let shouldShowCheckpoints = true
	// if (isLast) {
	// 	shouldShowCheckpoints = lastModifiedMessage?.ask === "resume_completed_task" || lastModifiedMessage?.ask === "resume_task"
	// }

	const shouldShowSettings = useMemo(() => {
		const lastMessage = messages[messages.length - 1]
		return lastMessage?.ask === "browser_action_launch" || lastMessage?.say === "browser_action_launch"
	}, [messages])

	// Calculate maxWidth
	const maxWidth = browserSettings.viewport.width < BROWSER_VIEWPORT_PRESETS["Small Desktop (900x600)"].width ? 200 : undefined;

	const [browserSessionRow, { height }] = useSize(
		<BrowserSessionRowContainer style={{ marginBottom: -10 }}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "10px",
					marginBottom: "10px",
				}}>
				{isBrowsing ? (
					<ProgressIndicator />
				) : (
					<span
						className={`codicon codicon-inspect`}
						style={{
							color: "var(--vscode-foreground)",
							marginBottom: "-1.5px",
						}}></span>
				)}
				<span style={{ fontWeight: "bold" }}>
					<>{isAutoApproved ? "Apex is using the browser:" : "Apex wants to use the browser:"}</>
				</span>
			</div>

			{/* Render BrowserStateDisplay */}
			<BrowserStateDisplay
				displayState={displayState}
				browserSettings={browserSettings}
				mousePosition={mousePosition}
				consoleLogsExpanded={consoleLogsExpanded}
				setConsoleLogsExpanded={setConsoleLogsExpanded}
				maxWidth={maxWidth}
				shouldShowSettings={shouldShowSettings}
			/>

			{/* Render BrowserActionList */}
			{/* Note: minHeight logic needs reconsideration or removal if BrowserActionList handles its own layout */}
			<div style={{ minHeight: maxActionHeight }}> {/* Keep minHeight wrapper for now */}
				<BrowserActionList
					currentPage={currentPage}
					isBrowsing={isBrowsing}
					initialUrl={initialUrl}
					isExpanded={props.isExpanded} // Pass down props
					onToggleExpand={props.onToggleExpand} // Pass down props
					lastModifiedMessage={lastModifiedMessage}
					isLast={isLast}
					setMaxActionHeight={setMaxActionHeight}
				/>
			</div> {/* Add missing closing div for the minHeight wrapper */}
			{/* Render BrowserPagination */}
			<BrowserPagination
				currentPageIndex={currentPageIndex}
				totalPages={pages.length}
				isBrowsing={isBrowsing}
				setCurrentPageIndex={setCurrentPageIndex}
			/>

			{/* Checkpoint overlay logic remains */}
			{/* {shouldShowCheckpoints && <CheckpointOverlay messageTs={lastCheckpointMessageTs} />} */}
		</BrowserSessionRowContainer>,
	)

	// Height change effect
	useEffect(() => {
		const isInitialRender = prevHeightRef.current === 0
		if (isLast && height !== 0 && height !== Infinity && height !== prevHeightRef.current) {
			if (!isInitialRender) {
				onHeightChange(height > prevHeightRef.current)
			}
			prevHeightRef.current = height
		}
	}, [height, isLast, onHeightChange])

	return browserSessionRow;
}, deepEqual); // Keep deepEqual for now as props structure is complex

// Removed BrowserSessionRowContent, BrowserActionBox, BrowserCursor components

const BrowserSessionRowContainer = styled.div`
	padding: 10px 6px 10px 15px;
	position: relative;

	&:hover ${CheckpointControls} {
		opacity: 1;
	}
`

export default BrowserSessionRow
