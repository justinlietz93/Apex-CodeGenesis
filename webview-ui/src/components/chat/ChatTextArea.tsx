import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import DynamicTextArea from "react-textarea-autosize"
import { useClickAway, useEvent, useWindowSize } from "react-use"
import styled from "styled-components"
import { mentionRegexGlobal, mentionRegex } from "../../../../src/shared/context-mentions"
import { ExtensionMessage } from "../../../../src/shared/ExtensionMessage"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { ContextMenuOptionType, getContextMenuOptions } from "../../utils/context-mentions"
import { useMetaKeyDetection, useShortcut } from "../../utils/hooks"
import { validateApiConfiguration, validateModelId } from "../../utils/validate"
import { vscode } from "../../utils/vscode"
import { CODE_BLOCK_BG_COLOR } from "../common/CodeBlock"
// import Thumbnails from "../common/Thumbnails" // Replaced by ImageThumbnails
import Tooltip from "../common/Tooltip"
import ApiOptions, { normalizeApiConfiguration } from "../settings/ApiOptions"
import { MAX_IMAGES_PER_MESSAGE } from "./ChatView"
import ContextMenu from "./ContextMenu"
import { useContextMentions } from "./ChatTextArea/useContextMentions"
import { ChatSettings } from "../../../../src/shared/ChatSettings"
import ImageThumbnails from "./ChatTextArea/ImageThumbnails"
import ChatControls from "./ChatTextArea/ChatControls" // Import ChatControls

interface ChatTextAreaProps {
	inputValue: string
	setInputValue: (value: string) => void
	textAreaDisabled: boolean
	placeholderText: string
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	onSend: () => void
	onSelectImages: () => void
	shouldDisableImages: boolean
	onHeightChange?: (height: number) => void
}

// --- Styled Components (Keep only those used directly in this file) ---
const PLAN_MODE_COLOR = "var(--vscode-inputValidation-warningBorder)"
// Remove styled components moved to sub-components (SwitchOption, SwitchContainer, Slider, ButtonGroup, ButtonContainer, ControlsContainer, ModelSelectorTooltip, ModelContainer, ModelButtonWrapper, ModelDisplayButton, ModelButtonContent)

const ChatTextArea = forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(
	(
		{
			inputValue,
			setInputValue,
			textAreaDisabled,
			placeholderText,
			selectedImages,
			setSelectedImages,
			onSend,
			onSelectImages,
			shouldDisableImages,
			onHeightChange,
		},
		ref,
	) => {
		const { filePaths, chatSettings, apiConfiguration, openRouterModels } = useExtensionState() // Removed platform as it's used in ModeSwitch
		const [isTextAreaFocused, setIsTextAreaFocused] = useState(false)
		const [thumbnailsHeight, setThumbnailsHeight] = useState(0) // Keep for border calculation
		const [textAreaBaseHeight, setTextAreaBaseHeight] = useState<number | undefined>(undefined)
		const internalTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
		const highlightLayerRef = useRef<HTMLDivElement>(null)
		// Model Selector state/refs moved to ModelSelector.tsx
		// Mode Switch state moved to ModeSwitch.tsx

		// --- Context Mention Hook ---
		const {
			showContextMenu,
			searchQuery,
			selectedMenuIndex,
			selectedType,
			contextMenuContainerRef,
			handleKeyDown: handleMentionKeyDown,
			handleInputChange: handleMentionInputChange,
			handleBlur: handleMentionBlur,
			handlePaste: handleMentionPaste,
			handleKeyUp: handleMentionKeyUp,
			handleMenuMouseDown,
			onMentionSelect,
			contextMenuOptions,
		} = useContextMentions({
			inputValue,
			setInputValue,
			textAreaRef: internalTextAreaRef,
			filePaths,
		})
		// --- End Context Mention Hook ---

		// --- Combined Event Handlers ---
		const handleKeyDown = useCallback(
			(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
				handleMentionKeyDown(event)
				const isComposing = event.nativeEvent?.isComposing ?? false
				if (event.key === "Enter" && !event.shiftKey && !isComposing && !showContextMenu) {
					event.preventDefault()
					setIsTextAreaFocused(false)
					onSend()
				}
			},
			[handleMentionKeyDown, onSend, showContextMenu],
		)

		const handleInputChange = useCallback(
			(e: React.ChangeEvent<HTMLTextAreaElement>) => {
				handleMentionInputChange(e)
				updateHighlights()
			},
			[handleMentionInputChange /* updateHighlights dependency added below */],
		)

		const handleBlur = useCallback(() => {
			handleMentionBlur()
			setIsTextAreaFocused(false)
		}, [handleMentionBlur])

		const handlePaste = useCallback(
			async (e: React.ClipboardEvent) => {
				await handleMentionPaste(e)
				if (!e.defaultPrevented) {
					const items = e.clipboardData.items
					const acceptedTypes = ["png", "jpeg", "webp"]
					const imageItems = Array.from(items).filter((item) => {
						const [type, subtype] = item.type.split("/")
						return type === "image" && acceptedTypes.includes(subtype)
					})
					if (!shouldDisableImages && imageItems.length > 0) {
						e.preventDefault()
						const imagePromises = imageItems.map((item) => {
							return new Promise<string | null>((resolve) => {
								const blob = item.getAsFile()
								if (!blob) {
									resolve(null)
									return
								}
								const reader = new FileReader()
								reader.onloadend = () => {
									if (reader.error) {
										console.error("Error reading file:", reader.error)
										resolve(null)
									} else {
										const result = reader.result
										resolve(typeof result === "string" ? result : null)
									}
								}
								reader.readAsDataURL(blob)
							})
						})
						const imageDataArray = await Promise.all(imagePromises)
						const dataUrls = imageDataArray.filter((dataUrl): dataUrl is string => dataUrl !== null)
						if (dataUrls.length > 0) {
							setSelectedImages((prevImages) => [...prevImages, ...dataUrls].slice(0, MAX_IMAGES_PER_MESSAGE))
						} else {
							console.warn("No valid images were processed")
						}
					}
				}
			},
			[handleMentionPaste, shouldDisableImages, setSelectedImages],
		)

		const handleKeyUp = useCallback(
			(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
				handleMentionKeyUp(e)
			},
			[handleMentionKeyUp],
		)
		// --- End Combined Event Handlers ---

		// --- Highlight Layer Logic ---
		const updateHighlights = useCallback(() => {
			if (!internalTextAreaRef.current || !highlightLayerRef.current) return
			const text = internalTextAreaRef.current.value
			const mentionRegexGlobal = new RegExp(mentionRegex.source, "g")
			highlightLayerRef.current.innerHTML = text
				.replace(/\n$/, "\n\n")
				.replace(/[<>&]/g, (c) => ({ "<": "<", ">": ">", "&": "&" })[c] || c)
				.replace(mentionRegexGlobal, '<mark class="mention-context-textarea-highlight">$&</mark>')

			highlightLayerRef.current.scrollTop = internalTextAreaRef.current.scrollTop
			highlightLayerRef.current.scrollLeft = internalTextAreaRef.current.scrollLeft
		}, [])

		useLayoutEffect(() => {
			updateHighlights()
		}, [inputValue, updateHighlights])
		// --- End Highlight Layer Logic ---

		// --- Model Selector Logic (Moved to ModelSelector.tsx) ---
		// --- Mode Switch Logic (Moved to ModeSwitch.tsx) ---
		const submitApiConfig = useCallback(() => {
			// Keep submitApiConfig for onModeToggle
			const apiValidationResult = validateApiConfiguration(apiConfiguration)
			const modelIdValidationResult = validateModelId(apiConfiguration, openRouterModels)

			if (!apiValidationResult && !modelIdValidationResult) {
				vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
			} else {
				vscode.postMessage({ type: "getLatestState" })
			}
		}, [apiConfiguration, openRouterModels])

		const onModeToggle = useCallback(() => {
			// Keep onModeToggle for ChatControls
			// Logic involving showModelSelector needs adjustment if state is fully moved
			// For now, assume submitApiConfig is called correctly within ModelSelector/useClickAway
			// let changeModeDelay = 0
			// if (showModelSelector) { // showModelSelector state is no longer here
			// 	submitApiConfig()
			// 	changeModeDelay = 250
			// }
			// setTimeout(() => {
			const newMode = chatSettings.mode === "plan" ? "act" : "plan"
			vscode.postMessage({
				type: "togglePlanActMode",
				chatSettings: { mode: newMode },
				chatContent: {
					message: inputValue.trim() ? inputValue : undefined,
					images: selectedImages.length > 0 ? selectedImages : undefined,
				},
			})
			setTimeout(() => {
				internalTextAreaRef.current?.focus()
			}, 100)
			// }, changeModeDelay) // Remove delay logic tied to showModelSelector
		}, [chatSettings.mode, /* submitApiConfig, */ inputValue, selectedImages]) // Removed submitApiConfig dependency for now

		useShortcut("Meta+Shift+a", onModeToggle, { disableTextInputs: false })
		// --- End Mode Switch Logic ---

		// --- Context Button Logic ---
		const handleContextButtonClick = useCallback(() => {
			if (textAreaDisabled) return
			internalTextAreaRef.current?.focus()
			const currentVal = internalTextAreaRef.current?.value ?? inputValue
			const currentPos = internalTextAreaRef.current?.selectionStart ?? currentVal.length

			let newValue: string
			let newCursorPos: number

			if (!currentVal.trim() || currentVal.endsWith(" ")) {
				newValue = currentVal.slice(0, currentPos) + "@" + currentVal.slice(currentPos)
				newCursorPos = currentPos + 1
			} else {
				newValue = currentVal.slice(0, currentPos) + " @" + currentVal.slice(currentPos)
				newCursorPos = currentPos + 2
			}

			const fakeEvent = {
				target: { value: newValue, selectionStart: newCursorPos },
			} as React.ChangeEvent<HTMLTextAreaElement>
			handleMentionInputChange(fakeEvent)
			updateHighlights()
		}, [inputValue, textAreaDisabled, handleMentionInputChange, updateHighlights])
		// --- End Context Button Logic ---

		// --- Drag and Drop Logic ---
		const onDragOver = (e: React.DragEvent) => {
			e.preventDefault()
		}

		const onDrop = async (e: React.DragEvent) => {
			e.preventDefault()
			const files = Array.from(e.dataTransfer.files)
			const text = e.dataTransfer.getData("text")

			if (text) {
				handleTextDrop(text)
				return
			}

			const acceptedTypes = ["png", "jpeg", "webp"]
			const imageFiles = files.filter((file) => {
				const [type, subtype] = file.type.split("/")
				return type === "image" && acceptedTypes.includes(subtype)
			})

			if (shouldDisableImages || imageFiles.length === 0) return

			const imageDataArray = await readImageFiles(imageFiles)
			const dataUrls = imageDataArray.filter((dataUrl): dataUrl is string => dataUrl !== null)

			if (dataUrls.length > 0) {
				setSelectedImages((prevImages) => [...prevImages, ...dataUrls].slice(0, MAX_IMAGES_PER_MESSAGE))
			} else {
				console.warn("No valid images were processed")
			}
		}

		const handleTextDrop = (text: string) => {
			const currentVal = internalTextAreaRef.current?.value ?? inputValue
			const currentPos = internalTextAreaRef.current?.selectionStart ?? currentVal.length
			const newValue = currentVal.slice(0, currentPos) + text + currentVal.slice(currentPos)
			setInputValue(newValue)
			const newCursorPosition = currentPos + text.length
			const fakeEvent = {
				target: { value: newValue, selectionStart: newCursorPosition },
			} as React.ChangeEvent<HTMLTextAreaElement>
			handleMentionInputChange(fakeEvent)
		}

		const readImageFiles = (imageFiles: File[]): Promise<(string | null)[]> => {
			return Promise.all(
				imageFiles.map(
					(file) =>
						new Promise<string | null>((resolve) => {
							const reader = new FileReader()
							reader.onloadend = () => {
								if (reader.error) {
									console.error("Error reading file:", reader.error)
									resolve(null)
								} else {
									const result = reader.result
									resolve(typeof result === "string" ? result : null)
								}
							}
							reader.readAsDataURL(file)
						}),
				),
			)
		}
		// --- End Drag and Drop Logic ---

		return (
			<div>
				<div
					style={{
						padding: "10px 15px",
						opacity: textAreaDisabled ? 0.5 : 1,
						position: "relative",
						display: "flex",
					}}
					onDrop={onDrop}
					onDragOver={onDragOver}>
					{showContextMenu && (
						<div ref={contextMenuContainerRef}>
							<ContextMenu
								onSelect={onMentionSelect}
								searchQuery={searchQuery}
								onMouseDown={handleMenuMouseDown}
								selectedIndex={selectedMenuIndex}
								selectedType={selectedType}
								queryItems={contextMenuOptions}
							/>
						</div>
					)}
					{!isTextAreaFocused && (
						<div
							style={{
								position: "absolute",
								inset: "10px 15px",
								border: "1px solid var(--vscode-input-border)",
								borderRadius: 2,
								pointerEvents: "none",
								zIndex: 5,
							}}
						/>
					)}
					<div
						ref={highlightLayerRef}
						style={{
							position: "absolute",
							top: 10,
							left: 15,
							right: 15,
							bottom: 10,
							pointerEvents: "none",
							whiteSpace: "pre-wrap",
							wordWrap: "break-word",
							color: "transparent",
							overflow: "hidden",
							backgroundColor: "var(--vscode-input-background)",
							fontFamily: "var(--vscode-font-family)",
							fontSize: "var(--vscode-editor-font-size)",
							lineHeight: "var(--vscode-editor-line-height)",
							borderRadius: 2,
							borderLeft: 0,
							borderRight: 0,
							borderTop: 0,
							borderColor: "transparent",
							borderBottom: `${thumbnailsHeight + 6}px solid transparent`,
							padding: "9px 28px 3px 9px",
						}}
					/>
					<DynamicTextArea
						data-testid="chat-input"
						ref={(el) => {
							if (typeof ref === "function") ref(el)
							else if (ref) ref.current = el
							internalTextAreaRef.current = el
						}}
						value={inputValue}
						disabled={textAreaDisabled}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						onKeyUp={handleKeyUp}
						onFocus={() => setIsTextAreaFocused(true)}
						onBlur={handleBlur}
						onPaste={handlePaste}
						onHeightChange={(height) => {
							if (textAreaBaseHeight === undefined || height < textAreaBaseHeight) {
								setTextAreaBaseHeight(height)
							}
							onHeightChange?.(height)
						}}
						placeholder={placeholderText}
						maxRows={10}
						autoFocus={true}
						style={{
							width: "100%",
							boxSizing: "border-box",
							backgroundColor: "transparent",
							color: "var(--vscode-input-foreground)",
							borderRadius: 2,
							fontFamily: "var(--vscode-font-family)",
							fontSize: "var(--vscode-editor-font-size)",
							lineHeight: "var(--vscode-editor-line-height)",
							resize: "none",
							overflowX: "hidden",
							overflowY: "scroll",
							scrollbarWidth: "none",
							borderLeft: 0,
							borderRight: 0,
							borderTop: 0,
							borderBottom: `${thumbnailsHeight + 6}px solid transparent`,
							borderColor: "transparent",
							padding: "9px 28px 3px 9px",
							cursor: textAreaDisabled ? "not-allowed" : undefined,
							flex: 1,
							zIndex: 1,
							outline: isTextAreaFocused
								? `1px solid ${chatSettings.mode === "plan" ? PLAN_MODE_COLOR : "var(--vscode-focusBorder)"}`
								: "none",
						}}
						onScroll={updateHighlights}
					/>
					<ImageThumbnails
						selectedImages={selectedImages}
						setSelectedImages={setSelectedImages}
						onHeightChange={setThumbnailsHeight} // Pass state setter
					/>
					<div
						style={{
							position: "absolute",
							right: 23,
							display: "flex",
							alignItems: "flex-center",
							height: textAreaBaseHeight || 31,
							bottom: 9.5,
							zIndex: 2,
						}}>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
							}}>
							<div
								data-testid="send-button"
								className={`input-icon-button ${textAreaDisabled ? "disabled" : ""} codicon codicon-send`}
								onClick={() => {
									if (!textAreaDisabled) {
										setIsTextAreaFocused(false)
										onSend()
									}
								}}
								style={{ fontSize: 15 }}></div>
						</div>
					</div>
				</div>

				{/* Render ChatControls component */}
				<ChatControls
					textAreaDisabled={textAreaDisabled}
					shouldDisableImages={shouldDisableImages}
					handleContextButtonClick={handleContextButtonClick}
					onSelectImages={onSelectImages}
					apiConfiguration={apiConfiguration}
					openRouterModels={openRouterModels}
					chatSettings={chatSettings}
					onModeToggle={onModeToggle}
				/>
			</div>
		)
	},
)

// Keep this interface definition as it's used by a styled component within this file
interface ModelSelectorTooltipProps {
	arrowPosition: number
	menuPosition: number
}

export default ChatTextArea
