// Removed unused imports: VSCodeButton, debounce, useRef, Virtuoso, VirtuosoHandle, styled
import { useCallback, useEffect, useMemo, useRef, useState } from "react" // Added useCallback back, keep useRef for textAreaRef
import { useEvent, useMount } from "react-use"
import {
	ApexApiReqInfo,
	ApexMessage,
	ApexSayBrowserAction,
	// ApexSayTool, // Not directly used here anymore
	ExtensionMessage,
} from "../../../../src/shared/ExtensionMessage"
import { findLast } from "../../../../src/shared/array"
import { combineApiRequests } from "../../../../src/shared/combineApiRequests"
import { combineCommandSequences } from "../../../../src/shared/combineCommandSequences"
import { getApiMetrics } from "../../../../src/shared/getApiMetrics"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"
// import HistoryPreview from "../history/HistoryPreview" // Moved to ChatViewWelcome
import { normalizeApiConfiguration } from "../settings/ApiOptions"
// import Announcement from "./Announcement" // Moved to ChatViewWelcome
import ChatViewWelcome from "./ChatView/ChatViewWelcome"
import { useChatViewState } from "./ChatView/useChatViewState"
import { useChatScrollManager } from "./ChatView/useChatScrollManager" // Import the scroll hook
import AutoApproveMenu from "./AutoApproveMenu"
// import BrowserSessionRow from "./BrowserSessionRow"
// import ChatRow from "./ChatRow"
import ChatMessageList from "./ChatView/ChatMessageList"
import ChatInputArea from "./ChatView/ChatInputArea" // Import the new component
import TaskHeader from "./TaskHeader"

interface ChatViewProps {
	isHidden: boolean
	showAnnouncement: boolean
	hideAnnouncement: () => void
	showHistoryView: () => void
}

export const MAX_IMAGES_PER_MESSAGE = 20 // Anthropic limits to 20 images

const ChatView = ({ isHidden, showAnnouncement, hideAnnouncement, showHistoryView }: ChatViewProps) => {
	const { version, apexMessages: messages, taskHistory, apiConfiguration, telemetrySetting } = useExtensionState()

	//const task = messages.length > 0 ? (messages[0].say === "task" ? messages[0] : undefined) : undefined) : undefined
	const task = useMemo(() => messages.at(0), [messages]) // leaving this less safe version here since if the first message is not a task, then the extension is in a bad state and needs to be debugged (see Apex.abort)
	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
	// has to be after api_req_finished are all reduced into api_req_started messages
	const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

	const lastApiReqTotalTokens = useMemo(() => {
		const getTotalTokensFromApiReqMessage = (msg: ApexMessage) => {
			if (!msg.text) return 0
			const { tokensIn, tokensOut, cacheWrites, cacheReads }: ApexApiReqInfo = JSON.parse(msg.text)
			return (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
		}
		const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
			if (msg.say !== "api_req_started") return false
			return getTotalTokensFromApiReqMessage(msg) > 0
		})
		if (!lastApiReqMessage) return undefined
		return getTotalTokensFromApiReqMessage(lastApiReqMessage)
	}, [modifiedMessages])

	const [inputValue, setInputValue] = useState("")
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const [textAreaDisabled, setTextAreaDisabled] = useState(false)
	const [selectedImages, setSelectedImages] = useState<string[]>([])

	// State logic moved to useChatViewState hook
	const {
		apexAsk,
		enableButtons,
		primaryButtonText,
		secondaryButtonText,
		didClickCancel,
		setApexAsk, // Get setters from hook
		setEnableButtons,
		setDidClickCancel,
	} = useChatViewState(messages)

	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

	// Define groupedMessages *before* calling useChatScrollManager
	const visibleMessages = useMemo(() => {
		return modifiedMessages.filter((message) => {
			switch (message.ask) {
				case "completion_result":
					// don't show a chat row for a completion_result ask without text. This specific type of message only occurs if apex wants to execute a command as part of its completion result, in which case we interject the completion_result tool with the execute_command tool.
					if (message.text === "") {
						return false
					}
					break
				case "api_req_failed": // this message is used to update the latest api_req_started that the request failed
				case "resume_task":
				case "resume_completed_task":
					return false
			}
			switch (message.say) {
				case "api_req_finished": // combineApiRequests removes this from modifiedMessages anyways
				case "api_req_retried": // this message is used to update the latest api_req_started that the request was retried
				case "deleted_api_reqs": // aggregated api_req metrics from deleted messages
					return false
				case "text":
					// Sometimes apex returns an empty text message, we don't want to render these. (We also use a say text for user messages, so in case they just sent images we still render that)
					if ((message.text ?? "") === "" && (message.images?.length ?? 0) === 0) {
						return false
					}
					break
				case "mcp_server_request_started":
					return false
			}
			return true
		})
	}, [modifiedMessages])

	const isBrowserSessionMessage = (message: ApexMessage): boolean => {
		// which of visible messages are browser session messages, see above
		if (message.type === "ask") {
			return ["browser_action_launch"].includes(message.ask!)
		}
		if (message.type === "say") {
			return ["browser_action_launch", "api_req_started", "text", "browser_action", "browser_action_result"].includes(
				message.say!,
			)
		}
		return false
	}

	const groupedMessages = useMemo(() => {
		const result: (ApexMessage | ApexMessage[])[] = []
		let currentGroup: ApexMessage[] = []
		let isInBrowserSession = false

		const endBrowserSession = () => {
			if (currentGroup.length > 0) {
				result.push([...currentGroup])
				currentGroup = []
				isInBrowserSession = false
			}
		}

		visibleMessages.forEach((message) => {
			if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
				// complete existing browser session if any
				endBrowserSession()
				// start new
				isInBrowserSession = true
				currentGroup.push(message)
			} else if (isInBrowserSession) {
				// end session if api_req_started is cancelled

				if (message.say === "api_req_started") {
					// get last api_req_started in currentGroup to check if it's cancelled. If it is then this api req is not part of the current browser session
					const lastApiReqStarted = [...currentGroup].reverse().find((m) => m.say === "api_req_started")
					if (lastApiReqStarted?.text != null) {
						const info = JSON.parse(lastApiReqStarted.text)
						const isCancelled = info.cancelReason != null
						if (isCancelled) {
							endBrowserSession()
							result.push(message)
							return
						}
					}
				}

				if (isBrowserSessionMessage(message)) {
					currentGroup.push(message)

					// Check if this is a close action
					if (message.say === "browser_action") {
						const browserAction = JSON.parse(message.text || "{}") as ApexSayBrowserAction
						if (browserAction.action === "close") {
							endBrowserSession()
						}
					}
				} else {
					// complete existing browser session if any
					endBrowserSession()
					result.push(message)
				}
			} else {
				result.push(message)
			}
		})

		// Handle case where browser session is the last group
		if (currentGroup.length > 0) {
			result.push([...currentGroup])
		}

		return result
	}, [visibleMessages])


	// Scroll logic moved to useChatScrollManager hook
	const {
		virtuosoRef, // Get ref from hook
		scrollContainerRef, // Get ref from hook
		disableAutoScrollRef, // Get ref from hook
		showScrollToBottom, // Get state from hook
		isAtBottom, // Get state from hook
		scrollToBottomSmooth, // Get handler from hook
		scrollToBottomAuto, // Get handler from hook
		// handleWheel, // Handled internally by the hook
		toggleRowExpansion, // Get handler from hook
		handleRowHeightChange, // Get handler from hook
		setIsAtBottom, // Get setter from hook
		setShowScrollToBottom, // Get setter from hook
	} = useChatScrollManager({ groupedMessages, expandedRows, setExpandedRows }) // Pass dependencies (now groupedMessages is defined)

	// Effect to handle text area disabled state based on ask type and partial status
	const lastMessage = useMemo(() => messages.at(-1), [messages]) // Keep this for textAreaDisabled logic
	useEffect(() => {
		if (lastMessage?.type === "ask") {
			const isPartial = lastMessage.partial === true
			switch (lastMessage.ask) {
				case "api_req_failed":
				case "auto_approval_max_req_reached":
					setTextAreaDisabled(true)
					break
				case "mistake_limit_reached":
				case "command_output":
				case "resume_task":
				case "resume_completed_task":
					setTextAreaDisabled(false)
					break
				case "followup":
				case "plan_mode_respond":
				case "tool":
				case "browser_action_launch":
				case "command":
				case "use_mcp_server":
				case "completion_result":
					setTextAreaDisabled(isPartial)
					break
			}
		} else if (lastMessage?.say === "api_req_started" && messages.at(-2)?.ask === "command_output") {
			// Handle the specific case moved from the old effect
			setTextAreaDisabled(true)
		} else if (messages.length === 0) {
			// Reset for new task
			setTextAreaDisabled(false)
		}
		// Note: We don't explicitly set it back to false on 'say' messages here,
		// because the 'askResponse' handlers already set it to true when sending.
		// The effect above handles enabling it based on the *next* ask message.
	}, [lastMessage, messages]) // Dependency on messages handles the length === 0 case implicitly

	useEffect(() => {
		setExpandedRows({})
	}, [task?.ts])

	const isStreaming = useMemo(() => {
		const isLastAsk = !!modifiedMessages.at(-1)?.ask // checking apexAsk isn't enough since messages effect may be called again for a tool for example, set apexAsk to its value, and if the next message is not an ask then it doesn't reset. This is likely due to how much more often we're updating messages as compared to before, and should be resolved with optimizations as it's likely a rendering bug. but as a final guard for now, the cancel button will show if the last message is not an ask
		const isToolCurrentlyAsking = isLastAsk && apexAsk !== undefined && enableButtons && primaryButtonText !== undefined
		if (isToolCurrentlyAsking) {
			return false
		}

		const isLastMessagePartial = modifiedMessages.at(-1)?.partial === true
		if (isLastMessagePartial) {
			return true
		} else {
			const lastApiReqStarted = findLast(modifiedMessages, (message) => message.say === "api_req_started")
			if (lastApiReqStarted && lastApiReqStarted.text != null && lastApiReqStarted.say === "api_req_started") {
				const cost = JSON.parse(lastApiReqStarted.text).cost
				if (cost === undefined) {
					// api request has not finished yet
					return true
				}
			}
		}

		return false
	}, [modifiedMessages, apexAsk, enableButtons, primaryButtonText])

	const handleSendMessage = useCallback(
		(text: string, images: string[]) => {
			text = text.trim()
			if (text || images.length > 0) {
				if (messages.length === 0) {
					vscode.postMessage({ type: "newTask", text, images })
				} else if (apexAsk) {
					switch (apexAsk) {
						case "followup":
						case "plan_mode_respond":
						case "tool":
						case "browser_action_launch":
						case "command": // user can provide feedback to a tool or command use
						case "command_output": // user can send input to command stdin
						case "use_mcp_server":
						case "completion_result": // if this happens then the user has feedback for the completion result
						case "resume_task":
						case "resume_completed_task":
						case "mistake_limit_reached":
							vscode.postMessage({
								type: "askResponse",
								askResponse: "messageResponse",
								text,
								images,
							})
							break
						// there is no other case that a textfield should be enabled
					}
				}
				setInputValue("")
				setTextAreaDisabled(true)
				setSelectedImages([])
				setApexAsk(undefined)
				setEnableButtons(false)
				// setPrimaryButtonText(undefined)
				// setSecondaryButtonText(undefined)
				disableAutoScrollRef.current = false // Use ref from hook
			}
		},
		[messages.length, apexAsk, setApexAsk, setEnableButtons, disableAutoScrollRef], // Updated dependencies
	)

	const startNewTask = useCallback(() => {
		vscode.postMessage({ type: "clearTask" })
	}, [])

	/*
	This logic depends on the useEffect[messages] above to set apexAsk, after which buttons are shown and we then send an askResponse to the extension.
	*/
	const handlePrimaryButtonClick = useCallback(
		(text?: string, images?: string[]) => {
			const trimmedInput = text?.trim()
			switch (apexAsk) {
				case "api_req_failed":
				case "command":
				case "command_output":
				case "tool":
				case "browser_action_launch":
				case "use_mcp_server":
				case "resume_task":
				case "mistake_limit_reached":
				case "auto_approval_max_req_reached":
					if (trimmedInput || (images && images.length > 0)) {
						vscode.postMessage({
							type: "askResponse",
							askResponse: "yesButtonClicked",
							text: trimmedInput,
							images: images,
						})
					} else {
						vscode.postMessage({
							type: "askResponse",
							askResponse: "yesButtonClicked",
						})
					}
					// Clear input state after sending
					setInputValue("")
					setSelectedImages([])
					break
				case "completion_result":
				case "resume_completed_task":
					// extension waiting for feedback. but we can just present a new task button
					startNewTask()
					break
			}
			setTextAreaDisabled(true)
			setApexAsk(undefined)
			setEnableButtons(false)
			// setPrimaryButtonText(undefined)
			// setSecondaryButtonText(undefined)
			disableAutoScrollRef.current = false // Use ref from hook
		},
		[apexAsk, startNewTask, setApexAsk, setEnableButtons, disableAutoScrollRef], // Updated dependencies
	)

	const handleSecondaryButtonClick = useCallback(
		(text?: string, images?: string[]) => {
			const trimmedInput = text?.trim()
			if (isStreaming) {
				vscode.postMessage({ type: "cancelTask" })
				setDidClickCancel(true)
				return
			}

			switch (apexAsk) {
				case "api_req_failed":
				case "mistake_limit_reached":
				case "auto_approval_max_req_reached":
					startNewTask()
					break
				case "command":
				case "tool":
				case "browser_action_launch":
				case "use_mcp_server":
					if (trimmedInput || (images && images.length > 0)) {
						vscode.postMessage({
							type: "askResponse",
							askResponse: "noButtonClicked",
							text: trimmedInput,
							images: images,
						})
					} else {
						// responds to the API with a "This operation failed" and lets it try again
						vscode.postMessage({
							type: "askResponse",
							askResponse: "noButtonClicked",
						})
					}
					// Clear input state after sending
					setInputValue("")
					setSelectedImages([])
					break
			}
			setTextAreaDisabled(true)
			setApexAsk(undefined)
			setEnableButtons(false)
			// setPrimaryButtonText(undefined)
			// setSecondaryButtonText(undefined)
			disableAutoScrollRef.current = false // Use ref from hook
		},
		[apexAsk, startNewTask, isStreaming, setApexAsk, setEnableButtons, setDidClickCancel, disableAutoScrollRef], // Updated dependencies
	)

	const handleTaskCloseButtonClick = useCallback(() => {
		startNewTask()
	}, [startNewTask])

	const { selectedModelInfo } = useMemo(() => {
		return normalizeApiConfiguration(apiConfiguration)
	}, [apiConfiguration])

	const selectImages = useCallback(() => {
		vscode.postMessage({ type: "selectImages" })
	}, [])

	const shouldDisableImages =
		!selectedModelInfo.supportsImages || textAreaDisabled || selectedImages.length >= MAX_IMAGES_PER_MESSAGE

	const handleMessage = useCallback(
		(e: MessageEvent) => {
			const message: ExtensionMessage = e.data
			switch (message.type) {
				case "action":
					switch (message.action!) {
						case "didBecomeVisible":
							if (!isHidden && !textAreaDisabled && !enableButtons) {
								textAreaRef.current?.focus()
							}
							break
					}
					break
				case "selectedImages":
					const newImages = message.images ?? []
					if (newImages.length > 0) {
						setSelectedImages((prevImages) => [...prevImages, ...newImages].slice(0, MAX_IMAGES_PER_MESSAGE))
					}
					break
				case "addToInput":
					setInputValue((prevValue) => {
						const newText = message.text ?? ""
						return prevValue ? `${prevValue}\n${newText}` : newText
					})
					// Add scroll to bottom after state update
					setTimeout(() => {
						if (textAreaRef.current) {
							textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight
						}
					}, 0)
					break
				case "invoke":
					switch (message.invoke!) {
						case "sendMessage":
							handleSendMessage(message.text ?? "", message.images ?? [])
							break
						case "primaryButtonClick":
							handlePrimaryButtonClick(message.text ?? "", message.images ?? [])
							break
						case "secondaryButtonClick":
							handleSecondaryButtonClick(message.text ?? "", message.images ?? [])
							break
					}
			}
			// textAreaRef.current is not explicitly required here since react guarantees that ref will be stable across re-renders, and we're not using its value but its reference.
		},
		[isHidden, textAreaDisabled, enableButtons, handleSendMessage, handlePrimaryButtonClick, handleSecondaryButtonClick],
	)

	useEvent("message", handleMessage)

	useMount(() => {
		// NOTE: the vscode window needs to be focused for this to work
		textAreaRef.current?.focus()
	})

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!isHidden && !textAreaDisabled && !enableButtons) {
				textAreaRef.current?.focus()
			}
		}, 50)
		return () => {
			clearTimeout(timer)
		}
	}, [isHidden, textAreaDisabled, enableButtons])

	// Scroll logic (callbacks, effects) is now handled by useChatScrollManager hook
	// Removed scrollToBottomSmooth, scrollToBottomAuto, toggleRowExpansion, handleRowHeightChange, handleWheel, and useEvent('wheel', ...)

	const placeholderText = useMemo(() => {
		// Updated placeholder text
		const text = task ? "Ask follow-up questions or provide feedback..." : "Describe the task for Apex..."
		return text
	}, [task])

	// itemContent logic moved to ChatMessageList component
	// Removed itemContent definition

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: isHidden ? "none" : "flex",
				flexDirection: "column",
				height: "100%", // Ensure full height
				overflow: "hidden",
			}}>
			{/* Main Content Area (Task view or Welcome view) */}
			<div style={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
				{task ? (
					<>
						<TaskHeader
							task={task}
					tokensIn={apiMetrics.totalTokensIn}
					tokensOut={apiMetrics.totalTokensOut}
					doesModelSupportPromptCache={selectedModelInfo.supportsPromptCache}
					cacheWrites={apiMetrics.totalCacheWrites}
					cacheReads={apiMetrics.totalCacheReads}
					totalCost={apiMetrics.totalCost}
					lastApiReqTotalTokens={lastApiReqTotalTokens}
							onClose={handleTaskCloseButtonClick}
						/>
						{/* Message List Container - only shown when task is active */}
						<div style={{ flexGrow: 1, display: "flex" }} ref={scrollContainerRef}>
							<ChatMessageList
								virtuosoRef={virtuosoRef}
								taskTs={task.ts}
								groupedMessages={groupedMessages}
								modifiedMessages={modifiedMessages}
								expandedRows={expandedRows}
								setExpandedRows={setExpandedRows}
								toggleRowExpansion={toggleRowExpansion}
								handleRowHeightChange={handleRowHeightChange}
								setIsAtBottom={setIsAtBottom}
								setShowScrollToBottom={setShowScrollToBottom}
								disableAutoScrollRef={disableAutoScrollRef}
							/>
						</div>
					</>
				) : (
					// Use ChatViewWelcome component when no task is active
					<ChatViewWelcome
						version={version}
						telemetrySetting={telemetrySetting}
						showAnnouncement={showAnnouncement}
						hideAnnouncement={hideAnnouncement}
						taskHistory={taskHistory}
						showHistoryView={showHistoryView}
					/>
				)}
			</div>

			{/* Optional AutoApproveMenu (only when no task) */}
			{/*
			// Flex layout explanation:
			// 1. Content div above uses flex: "1 1 0" to:
			//    - Grow to fill available space (flex-grow: 1) 
			//    - Shrink when AutoApproveMenu needs space (flex-shrink: 1)
			//    - Start from zero size (flex-basis: 0) to ensure proper distribution
			//    minHeight: 0 allows it to shrink below its content height
			//
			// 2. AutoApproveMenu uses flex: "0 1 auto" to:
			//    - Not grow beyond its content (flex-grow: 0)
			//    - Shrink when viewport is small (flex-shrink: 1) 
			//    - Use its content size as basis (flex-basis: auto)
			//    This ensures it takes its natural height when there's space
			//    but becomes scrollable when the viewport is too small
			*/}
			{!task && (
				<AutoApproveMenu
					style={{
						marginBottom: -2,
						flexShrink: 0, // Prevent shrinking
					}}
				/>
			)}

			{/* Always visible Input Area */}
			{/* Note: AutoApproveMenu is handled internally by ChatInputArea when task is active */}
			<div style={{ flexShrink: 0 }}> {/* Wrapper to prevent shrinking */}
				<ChatInputArea
					// Pass task status to ChatInputArea if it needs to conditionally render AutoApproveMenu
					// Assuming ChatInputArea handles this internally based on other props or context
					isTaskActive={!!task} // Example prop, adjust if needed based on ChatInputArea implementation
					textAreaRef={textAreaRef} // Pass ref
					inputValue={inputValue}
						setInputValue={setInputValue}
						textAreaDisabled={textAreaDisabled}
						placeholderText={placeholderText}
						selectedImages={selectedImages}
						setSelectedImages={setSelectedImages}
						onSend={() => handleSendMessage(inputValue, selectedImages)}
						onSelectImages={selectImages}
						shouldDisableImages={shouldDisableImages}
						onHeightChange={() => { // Pass the height change handler
							if (isAtBottom) {
								scrollToBottomAuto()
							}
						}}
						// Button related props
						showScrollToBottom={showScrollToBottom}
						scrollToBottomSmooth={scrollToBottomSmooth}
						disableAutoScrollRef={disableAutoScrollRef}
						primaryButtonText={primaryButtonText}
						secondaryButtonText={secondaryButtonText}
						isStreaming={isStreaming}
						enableButtons={enableButtons}
						didClickCancel={didClickCancel}
						handlePrimaryButtonClick={handlePrimaryButtonClick}
						handleSecondaryButtonClick={handleSecondaryButtonClick}
					/>
				{/* Previous conditional rendering of buttons moved inside ChatInputArea */}
				{/* {showScrollToBottom ? (
						<div
							style={{
								display: "flex",
								padding: "10px 15px 0px 15px",
							}}>
							<ScrollToBottomButton
								onClick={() => {
									scrollToBottomSmooth()
									disableAutoScrollRef.current = false
								}}>
								<span className="codicon codicon-chevron-down" style={{ fontSize: "18px" }}></span>
							</ScrollToBottomButton>
						</div>
					) : ( // Logic moved to ChatInputArea
						<div
							style={{
								opacity:
									primaryButtonText || secondaryButtonText || isStreaming
										? enableButtons || (isStreaming && !didClickCancel)
											? 1
											: 0.5
										: 0,
								display: "flex",
								padding: `${primaryButtonText || secondaryButtonText || isStreaming ? "10" : "0"}px 15px 0px 15px`,
							}}>
							{primaryButtonText && !isStreaming && (
								<VSCodeButton
									appearance="primary"
									disabled={!enableButtons}
									style={{
										flex: secondaryButtonText ? 1 : 2,
										marginRight: secondaryButtonText ? "6px" : "0",
									}}
									onClick={() => handlePrimaryButtonClick(inputValue, selectedImages)}>
									{primaryButtonText}
								</VSCodeButton>
							)}
							{(secondaryButtonText || isStreaming) && (
								<VSCodeButton
									appearance="secondary"
									disabled={!enableButtons && !(isStreaming && !didClickCancel)}
									style={{
										flex: isStreaming ? 2 : 1,
										marginLeft: isStreaming ? 0 : "6px",
									}}
									onClick={() => handleSecondaryButtonClick(inputValue, selectedImages)}>
									{isStreaming ? "Cancel" : secondaryButtonText}
								</VSCodeButton>
							)}
						</div>
					)} */}
			</div>
		</div>
	)
}

// ScrollToBottomButton moved to ChatInputArea component

export default ChatView
