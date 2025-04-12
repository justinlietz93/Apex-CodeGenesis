import React from 'react';
import styled from 'styled-components';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import ChatTextArea from '../ChatTextArea'; // Assuming path
import AutoApproveMenu from '../AutoApproveMenu'; // Assuming path

// Define props based on moved logic
interface ChatInputAreaProps {
  isTaskActive: boolean; // Added to fix TS error from ChatView
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  inputValue: string;
  setInputValue: (value: string) => void;
  textAreaDisabled: boolean;
  placeholderText: string;
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>; // Correct type
  onSend: () => void;
  onSelectImages: () => void;
  shouldDisableImages: boolean;
  onHeightChange: () => void; // For ChatTextArea height changes
  // Button related props
  showScrollToBottom: boolean;
  scrollToBottomSmooth: () => void;
  disableAutoScrollRef: React.RefObject<boolean>; // Needed for scroll button logic
  primaryButtonText?: string;
  secondaryButtonText?: string;
  isStreaming: boolean;
  enableButtons: boolean;
  didClickCancel: boolean;
  handlePrimaryButtonClick: (text?: string, images?: string[]) => void;
  handleSecondaryButtonClick: (text?: string, images?: string[]) => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  isTaskActive, // Destructure the new prop
  textAreaRef,
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
  showScrollToBottom,
  scrollToBottomSmooth,
  disableAutoScrollRef,
  primaryButtonText,
  secondaryButtonText,
  isStreaming,
  enableButtons,
  didClickCancel,
  handlePrimaryButtonClick,
  handleSecondaryButtonClick,
}) => {
  return (
    <>
      {/* AutoApproveMenu might need context or props depending on its implementation */}
      {/* <AutoApproveMenu /> */}
      {showScrollToBottom ? (
        <div
          style={{
            display: 'flex',
            padding: '10px 15px 0px 15px',
          }}
        >
          <ScrollToBottomButton
            onClick={() => {
              scrollToBottomSmooth();
              // Modification removed, should be handled in useChatScrollManager or parent
              // if (disableAutoScrollRef.current) disableAutoScrollRef.current = false;
            }}
          >
            <span
              className="codicon codicon-chevron-down"
              style={{ fontSize: '18px' }}
            ></span>
          </ScrollToBottomButton>
        </div>
      ) : (
        <div
          style={{
            opacity:
              primaryButtonText || secondaryButtonText || isStreaming
                ? enableButtons || (isStreaming && !didClickCancel)
                  ? 1
                  : 0.5
                : 0,
            display: 'flex',
            padding: `${primaryButtonText || secondaryButtonText || isStreaming ? '10' : '0'}px 15px 0px 15px`,
          }}
        >
          {primaryButtonText && !isStreaming && (
            <VSCodeButton
              appearance="primary"
              disabled={!enableButtons}
              style={{
                flex: secondaryButtonText ? 1 : 2,
                marginRight: secondaryButtonText ? '6px' : '0',
              }}
              onClick={() =>
                handlePrimaryButtonClick(inputValue, selectedImages)
              }
            >
              {primaryButtonText}
            </VSCodeButton>
          )}
          {(secondaryButtonText || isStreaming) && (
            <VSCodeButton
              appearance="secondary"
              disabled={!enableButtons && !(isStreaming && !didClickCancel)}
              style={{
                flex: isStreaming ? 2 : 1,
                marginLeft: isStreaming ? 0 : '6px',
              }}
              onClick={() =>
                handleSecondaryButtonClick(inputValue, selectedImages)
              }
            >
              {isStreaming ? 'Cancel' : secondaryButtonText}
            </VSCodeButton>
          )}
        </div>
      )}
      <ChatTextArea
        ref={textAreaRef}
        inputValue={inputValue}
        setInputValue={setInputValue}
        textAreaDisabled={textAreaDisabled}
        placeholderText={placeholderText}
        selectedImages={selectedImages}
        setSelectedImages={setSelectedImages}
        onSend={onSend}
        onSelectImages={onSelectImages}
        shouldDisableImages={shouldDisableImages}
        onHeightChange={onHeightChange}
      />
    </>
  );
};

// Copied from ChatView.tsx
const ScrollToBottomButton = styled.div`
  background-color: color-mix(
    in srgb,
    var(--vscode-toolbar-hoverBackground) 55%,
    transparent
  );
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  height: 25px;

  &:hover {
    background-color: color-mix(
      in srgb,
      var(--vscode-toolbar-hoverBackground) 90%,
      transparent
    );
  }

  &:active {
    background-color: color-mix(
      in srgb,
      var(--vscode-toolbar-hoverBackground) 70%,
      transparent
    );
  }
`;

export default ChatInputArea;
