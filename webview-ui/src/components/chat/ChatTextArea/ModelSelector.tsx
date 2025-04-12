import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import styled from 'styled-components';
import { useClickAway, useWindowSize } from 'react-use';
import { ApiConfiguration, ModelInfo } from '../../../../../src/shared/api'; // Adjust path
import { CODE_BLOCK_BG_COLOR } from '../../common/CodeBlock'; // Adjust path
import ApiOptions, {
  normalizeApiConfiguration,
} from '../../settings/ApiOptions'; // Adjust path
import { vscode } from '../../../utils/vscode'; // Adjust path
import {
  validateApiConfiguration,
  validateModelId,
} from '../../../utils/validate'; // Adjust path

// Define props based on moved logic
interface ModelSelectorProps {
  apiConfiguration?: ApiConfiguration;
  openRouterModels?: Record<string, ModelInfo>;
}

// Copied styled components from ChatTextArea.tsx
const ModelSelectorTooltip = styled.div<ModelSelectorTooltipProps>`
  position: fixed;
  bottom: calc(100% + 9px);
  left: 15px;
  right: 15px;
  background: ${CODE_BLOCK_BG_COLOR};
  border: 1px solid var(--vscode-editorGroup-border);
  padding: 12px;
  border-radius: 3px;
  z-index: 1000;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  overscroll-behavior: contain;

  &::before {
    content: '';
    position: fixed;
    bottom: ${(props) => `calc(100vh - ${props.menuPosition}px - 2px)`};
    left: 0;
    right: 0;
    height: 8px;
  }

  &::after {
    content: '';
    position: fixed;
    bottom: ${(props) => `calc(100vh - ${props.menuPosition}px)`};
    right: ${(props) => props.arrowPosition}px;
    width: 10px;
    height: 10px;
    background: ${CODE_BLOCK_BG_COLOR};
    border-right: 1px solid var(--vscode-editorGroup-border);
    border-bottom: 1px solid var(--vscode-editorGroup-border);
    transform: rotate(45deg);
    z-index: -1;
  }
`;

const ModelContainer = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
`;

const ModelButtonWrapper = styled.div`
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
`;

const ModelDisplayButton = styled.a<{ isActive?: boolean; disabled?: boolean }>`
  padding: 0px 0px;
  height: 20px;
  width: 100%;
  min-width: 0;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  text-decoration: ${(props) => (props.isActive ? 'underline' : 'none')};
  color: ${(props) =>
    props.isActive
      ? 'var(--vscode-foreground)'
      : 'var(--vscode-descriptionForeground)'};
  display: flex;
  align-items: center;
  font-size: 10px;
  outline: none;
  user-select: none;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  pointer-events: ${(props) => (props.disabled ? 'none' : 'auto')};

  &:hover,
  &:focus {
    color: ${(props) =>
      props.disabled
        ? 'var(--vscode-descriptionForeground)'
        : 'var(--vscode-foreground)'};
    text-decoration: ${(props) => (props.disabled ? 'none' : 'underline')};
    outline: none;
  }

  &:active {
    color: ${(props) =>
      props.disabled
        ? 'var(--vscode-descriptionForeground)'
        : 'var(--vscode-foreground)'};
    text-decoration: ${(props) => (props.disabled ? 'none' : 'underline')};
    outline: none;
  }

  &:focus-visible {
    outline: none;
  }
`;

const ModelButtonContent = styled.div`
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface ModelSelectorTooltipProps {
  arrowPosition: number;
  menuPosition: number;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  apiConfiguration,
  openRouterModels,
}) => {
  // State and refs moved from ChatTextArea
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const { width: viewportWidth, height: viewportHeight } = useWindowSize();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [arrowPosition, setArrowPosition] = useState(0);
  const [menuPosition, setMenuPosition] = useState(0);
  const prevShowModelSelector = useRef(showModelSelector);

  // Handlers and Effects moved from ChatTextArea
  const submitApiConfig = useCallback(() => {
    const apiValidationResult = validateApiConfiguration(apiConfiguration);
    const modelIdValidationResult = validateModelId(
      apiConfiguration,
      openRouterModels
    );

    if (!apiValidationResult && !modelIdValidationResult) {
      vscode.postMessage({ type: 'apiConfiguration', apiConfiguration });
    } else {
      console.warn(
        'API Configuration validation failed on model selector close.'
      );
    }
  }, [apiConfiguration, openRouterModels]);

  useEffect(() => {
    if (prevShowModelSelector.current && !showModelSelector) {
      submitApiConfig();
    }
    prevShowModelSelector.current = showModelSelector;
  }, [showModelSelector, submitApiConfig]);

  const handleModelButtonClick = () => {
    setShowModelSelector(!showModelSelector);
  };

  useClickAway(modelSelectorRef, () => {
    if (showModelSelector) {
      submitApiConfig();
    }
    setShowModelSelector(false);
  });

  const modelDisplayName = useMemo(() => {
    const { selectedProvider, selectedModelId } =
      normalizeApiConfiguration(apiConfiguration);
    const unknownModel = 'unknown';
    if (!apiConfiguration) return unknownModel;
    switch (selectedProvider) {
      case 'apex':
        return `${selectedProvider}:${selectedModelId}`;
      case 'openai':
        return `openai-compat:${selectedModelId}`;
      case 'vscode-lm':
        return `vscode-lm:${apiConfiguration.vsCodeLmModelSelector ? `${apiConfiguration.vsCodeLmModelSelector.vendor ?? ''}/${apiConfiguration.vsCodeLmModelSelector.family ?? ''}` : unknownModel}`;
      case 'together':
        return `${selectedProvider}:${apiConfiguration.togetherModelId}`;
      case 'lmstudio':
        return `${selectedProvider}:${apiConfiguration.lmStudioModelId}`;
      case 'ollama':
        return `${selectedProvider}:${apiConfiguration.ollamaModelId}`;
      case 'litellm':
        return `${selectedProvider}:${apiConfiguration.liteLlmModelId}`;
      case 'requesty':
      case 'anthropic':
      case 'openrouter':
      default:
        return `${selectedProvider}:${selectedModelId}`;
    }
  }, [apiConfiguration]);

  useEffect(() => {
    if (showModelSelector && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const rightPosition =
        document.documentElement.clientWidth - buttonCenter - 5;
      setArrowPosition(rightPosition);
      setMenuPosition(buttonRect.top + 1);
    }
  }, [showModelSelector, viewportWidth, viewportHeight]);

  useEffect(() => {
    if (!showModelSelector) {
      const button = buttonRef.current?.querySelector('a');
      if (button) button.blur();
    }
  }, [showModelSelector]);

  return (
    <ModelContainer ref={modelSelectorRef}>
      <ModelButtonWrapper ref={buttonRef}>
        <ModelDisplayButton
          role="button"
          isActive={showModelSelector}
          disabled={false} // Determine disabled state based on props/context if needed
          onClick={handleModelButtonClick}
          tabIndex={0}
        >
          <ModelButtonContent>{modelDisplayName}</ModelButtonContent>
        </ModelDisplayButton>
      </ModelButtonWrapper>
      {showModelSelector && (
        <ModelSelectorTooltip
          arrowPosition={arrowPosition}
          menuPosition={menuPosition}
          style={{
            bottom: `calc(100vh - ${menuPosition}px + 6px)`,
          }}
        >
          <ApiOptions
            showModelOptions={true}
            apiErrorMessage={undefined} // Pass errors if needed
            modelIdErrorMessage={undefined} // Pass errors if needed
            isPopup={true}
          />
        </ModelSelectorTooltip>
      )}
    </ModelContainer>
  );
};

export default ModelSelector;
