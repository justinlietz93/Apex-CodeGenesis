import React from "react"
import styled from "styled-components"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import ModelSelector from "./ModelSelector" // Assuming path
import ModeSwitch from "./ModeSwitch" // Assuming path
import { ChatSettings } from "../../../../../src/shared/ChatSettings" // Adjust path
import { ApiConfiguration, ModelInfo } from "../../../../../src/shared/api" // Adjust path

// Define props based on moved logic
interface ChatControlsProps {
	textAreaDisabled: boolean
	shouldDisableImages: boolean
	handleContextButtonClick: () => void
	onSelectImages: () => void
	// Props needed for ModelSelector
	apiConfiguration?: ApiConfiguration
	openRouterModels?: Record<string, ModelInfo>
	// Props needed for ModeSwitch
	chatSettings: ChatSettings
	onModeToggle: () => void
}

// Copied styled components from ChatTextArea.tsx
const ControlsContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: -5px;
	padding: 0px 15px 5px 15px;
`

const ButtonGroup = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
	flex: 1;
	min-width: 0;
`

const ButtonContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 3px;
	font-size: 10px;
	white-space: nowrap;
	min-width: 0;
	width: 100%;
`

const ChatControls: React.FC<ChatControlsProps> = ({
	textAreaDisabled,
	shouldDisableImages,
	handleContextButtonClick,
	onSelectImages,
	apiConfiguration,
	openRouterModels,
	chatSettings,
	onModeToggle,
}) => {
	return (
		<ControlsContainer>
			<ButtonGroup>
				<VSCodeButton
					data-testid="context-button"
					appearance="icon"
					aria-label="Add Context"
					disabled={textAreaDisabled}
					onClick={handleContextButtonClick}
					style={{ padding: "0px 0px", height: "20px" }}>
					<ButtonContainer>
						<span style={{ fontSize: "13px", marginBottom: 1 }}>@</span>
						{/* {showButtonText && <span style={{ fontSize: "10px" }}>Context</span>} */}
					</ButtonContainer>
				</VSCodeButton>

				<VSCodeButton
					data-testid="images-button"
					appearance="icon"
					aria-label="Add Images"
					disabled={shouldDisableImages}
					onClick={() => {
						if (!shouldDisableImages) {
							onSelectImages()
						}
					}}
					style={{ padding: "0px 0px", height: "20px" }}>
					<ButtonContainer>
						<span className="codicon codicon-device-camera" style={{ fontSize: "14px", marginBottom: -3 }} />
						{/* {showButtonText && <span style={{ fontSize: "10px" }}>Images</span>} */}
					</ButtonContainer>
				</VSCodeButton>

				{/* Render ModelSelector here */}
				<ModelSelector apiConfiguration={apiConfiguration} openRouterModels={openRouterModels} />
			</ButtonGroup>
			{/* Render ModeSwitch here */}
			<ModeSwitch
				chatSettings={chatSettings}
				onModeToggle={onModeToggle}
				textAreaDisabled={textAreaDisabled} // Pass prop
			/>
		</ControlsContainer>
	)
}

export default ChatControls
