import React from 'react';
import { VSCodeBadge } from '@vscode/webview-ui-toolkit/react';
import { ApexMessage } from '../../../../../src/shared/ExtensionMessage';
import CodeAccordian from '../../common/CodeAccordian';
import CreditLimitError from '../CreditLimitError';
import MessageHeader from './MessageHeader'; // Import MessageHeader

interface ApiRequestRendererProps {
  message: ApexMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
  cost?: number;
  apiRequestFailedMessage?: string;
  apiReqStreamingFailedMessage?: string;
  apiReqCancelReason?: string; // Added cancel reason
}

// Helper function moved from ChatRow.tsx
function parseErrorText(text: string | undefined) {
  if (!text) {
    return undefined;
  }
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonStr = text.substring(startIndex, endIndex + 1);
      const errorObject = JSON.parse(jsonStr);
      return errorObject;
    }
  } catch (e) {
    // Not JSON or missing required fields
  }
  return undefined; // Explicitly return undefined if parsing fails or text is invalid
}

const ApiRequestRenderer: React.FC<ApiRequestRendererProps> = ({
  message,
  isExpanded,
  onToggleExpand,
  cost,
  apiRequestFailedMessage,
  apiReqStreamingFailedMessage,
  apiReqCancelReason,
}) => {
  const pStyle: React.CSSProperties = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  };

  // Safely parse the request content
  let requestContent: string | undefined;
  try {
    requestContent = JSON.parse(message.text || '{}').request;
  } catch (e) {
    console.error('Failed to parse API request content:', message.text, e);
    requestContent = 'Error parsing request content.'; // Provide fallback content
  }

  return (
    <>
      {/* Header is now part of the expandable section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom:
            (cost == null && apiRequestFailedMessage) ||
            apiReqStreamingFailedMessage
              ? 10
              : 0,
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
        onClick={onToggleExpand}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* Render MessageHeader inline */}
          <MessageHeader
            message={message}
            cost={cost}
            apiReqCancelReason={apiReqCancelReason}
            apiRequestFailedMessage={apiRequestFailedMessage}
          />
          {/* Badge rendering */}
          <VSCodeBadge
            style={{
              opacity: cost != null && cost > 0 ? 1 : 0,
            }}
          >
            ${Number(cost || 0)?.toFixed(4)}
          </VSCodeBadge>
        </div>
        <span
          className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'}`}
        ></span>
      </div>
      {/* Error/Failure Message Display */}
      {((cost == null && apiRequestFailedMessage) ||
        apiReqStreamingFailedMessage) && (
        <>
          {(() => {
            // Try to parse the error message as JSON for credit limit error
            const errorData = parseErrorText(apiRequestFailedMessage);
            if (errorData) {
              if (
                errorData.code === 'insufficient_credits' &&
                typeof errorData.current_balance === 'number' &&
                typeof errorData.total_spent === 'number' &&
                typeof errorData.total_promotions === 'number' &&
                typeof errorData.message === 'string'
              ) {
                return (
                  <CreditLimitError
                    currentBalance={errorData.current_balance}
                    totalSpent={errorData.total_spent}
                    totalPromotions={errorData.total_promotions}
                    message={errorData.message}
                  />
                );
              }
            }

            // Default error display
            return (
              <p
                style={{
                  ...pStyle,
                  color: 'var(--vscode-errorForeground)',
                }}
              >
                {apiRequestFailedMessage || apiReqStreamingFailedMessage}
                {apiRequestFailedMessage
                  ?.toLowerCase()
                  .includes('powershell') && (
                  <>
                    <br />
                    <br />
                    It seems like you're having Windows PowerShell issues,
                    please see this{' '}
                    <a
                      href="https://github.com/apex/apex/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22"
                      style={{
                        color: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      troubleshooting guide
                    </a>
                    .
                  </>
                )}
              </p>
            );
          })()}
        </>
      )}

      {/* Expanded Request Content */}
      {isExpanded && (
        <div style={{ marginTop: '10px' }}>
          <CodeAccordian
            code={requestContent} // Use safely parsed content
            language="markdown"
            isExpanded={true} // Always expanded when the parent is expanded
            onToggleExpand={onToggleExpand} // Pass toggle handler
          />
        </div>
      )}
    </>
  );
};

export default ApiRequestRenderer;
