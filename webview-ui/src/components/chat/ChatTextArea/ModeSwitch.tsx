import React, { useState } from 'react';
import styled from 'styled-components';
import Tooltip from '../../common/Tooltip'; // Adjust path as needed
import { ChatSettings } from '../../../../../src/shared/ChatSettings'; // Adjust path as needed
import { useMetaKeyDetection } from '../../../utils/hooks'; // Adjust path as needed
import { useExtensionState } from '../../../context/ExtensionStateContext'; // Adjust path as needed

import { ApiConfiguration } from '../../../../../src/shared/api'; // Import needed type

// Define props based on moved logic
interface ModeSwitchProps {
  chatSettings: ChatSettings;
  onModeToggle: () => void;
  textAreaDisabled: boolean; // Added prop
  // Props potentially needed by onModeToggle if it's not fully self-contained
  // showModelSelector: boolean;
  // submitApiConfig: () => void;
  // inputValue: string;
  // selectedImages: string[];
}

// Copied styled components from ChatTextArea.tsx
const PLAN_MODE_COLOR = 'var(--vscode-inputValidation-warningBorder)';

const SwitchOption = styled.div<{ isActive: boolean }>`
  padding: 2px 8px;
  color: ${(props) =>
    props.isActive ? 'white' : 'var(--vscode-input-foreground)'};
  z-index: 1;
  transition: color 0.2s ease;
  font-size: 12px;
  width: 50%;
  text-align: center;

  &:hover {
    background-color: ${(props) =>
      !props.isActive
        ? 'var(--vscode-toolbar-hoverBackground)'
        : 'transparent'};
  }
`;

const SwitchContainer = styled.div<{ disabled: boolean }>`
  display: flex;
  align-items: center;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 12px;
  overflow: hidden;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  transform: scale(0.85);
  transform-origin: right center;
  margin-left: -10px; // compensate for the transform so flex spacing works
  user-select: none; // Prevent text selection
`;

const Slider = styled.div<{ isAct: boolean; isPlan?: boolean }>`
  position: absolute;
  height: 100%;
  width: 50%;
  background-color: ${(props) =>
    props.isPlan ? PLAN_MODE_COLOR : 'var(--vscode-focusBorder)'};
  transition: transform 0.2s ease;
  transform: translateX(${(props) => (props.isAct ? '100%' : '0%')});
`;

const ModeSwitch: React.FC<ModeSwitchProps> = ({
  chatSettings,
  onModeToggle,
  textAreaDisabled, // Destructure added prop
}) => {
  const { platform } = useExtensionState(); // Keep single declaration
  const [shownTooltipMode, setShownTooltipMode] = useState<
    ChatSettings['mode'] | null
  >(null); // Keep single declaration
  const [, metaKeyChar] = useMetaKeyDetection(platform);

  // Determine disabled state based on props
  const isDisabled = textAreaDisabled; // Add other conditions if needed

  return (
    <Tooltip
      style={{ zIndex: 1000 }}
      visible={shownTooltipMode !== null}
      tipText={`In ${shownTooltipMode === 'act' ? 'Act' : 'Plan'}  mode, Apex will ${shownTooltipMode === 'act' ? 'complete the task immediately' : 'gather information to architect a plan'}`}
      hintText={`Toggle w/ ${metaKeyChar}+Shift+A`}
    >
      <SwitchContainer
        data-testid="mode-switch"
        disabled={isDisabled}
        onClick={!isDisabled ? onModeToggle : undefined}
      >
        {' '}
        {/* Use calculated disabled state */}
        <Slider
          isAct={chatSettings.mode === 'act'}
          isPlan={chatSettings.mode === 'plan'}
        />
        <SwitchOption
          isActive={chatSettings.mode === 'plan'}
          onMouseOver={() => setShownTooltipMode('plan')}
          onMouseLeave={() => setShownTooltipMode(null)}
        >
          Plan
        </SwitchOption>
        <SwitchOption
          isActive={chatSettings.mode === 'act'}
          onMouseOver={() => setShownTooltipMode('act')}
          onMouseLeave={() => setShownTooltipMode(null)}
        >
          Act
        </SwitchOption>
      </SwitchContainer>
    </Tooltip>
  );
};

export default ModeSwitch;
