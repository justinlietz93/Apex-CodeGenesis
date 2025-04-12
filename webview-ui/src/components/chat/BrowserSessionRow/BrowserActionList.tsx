import React from 'react';
import {
  ApexMessage,
  BrowserAction,
  ApexSayBrowserAction,
} from '../../../../../src/shared/ExtensionMessage';
import { ChatRowContent } from '../ChatRow'; // Assuming ChatRowContent is needed
import CodeBlock, { CODE_BLOCK_BG_COLOR } from '../../common/CodeBlock'; // Import CodeBlock and color

// Define the structure for currentPage based on usage in BrowserSessionRow.tsx
interface CurrentPage {
  currentState: {
    // Add currentState property
    messages: ApexMessage[]; // Include messages array within currentState
    // Add other potential properties if needed based on original usage
    url?: string;
    screenshot?: string;
    mousePosition?: string;
    consoleLogs?: string;
  };
  nextAction?: {
    messages: ApexMessage[];
  };
}

interface BrowserActionListProps {
  currentPage?: CurrentPage; // Make currentPage optional as it might not exist initially
  isBrowsing: boolean;
  initialUrl: string; // Needed for the initial launch action box
  // messages prop seems redundant if currentPage.nextAction.messages is used
  isExpanded: (messageTs: number) => boolean; // Pass the function type
  onToggleExpand: (messageTs: number) => void; // Pass the function type
  lastModifiedMessage?: ApexMessage;
  isLast: boolean;
  setMaxActionHeight: (height: number) => void;
}

// Define BrowserActionBox component locally (moved from BrowserSessionRow.tsx)
const BrowserActionBox = ({
  action,
  coordinate,
  text,
}: {
  action: BrowserAction;
  coordinate?: string;
  text?: string;
}) => {
  const getBrowserActionText = (
    action: BrowserAction,
    coordinate?: string,
    text?: string
  ) => {
    switch (action) {
      case 'launch':
        return `Launch browser at ${text}`;
      case 'click':
        return `Click (${coordinate?.replace(',', ', ')})`;
      case 'type':
        return `Type "${text}"`;
      case 'scroll_down':
        return 'Scroll down';
      case 'scroll_up':
        return 'Scroll up';
      case 'close':
        return 'Close browser';
      default:
        return action;
    }
  };
  return (
    <div style={{ padding: '10px 0 0 0' }}>
      <div
        style={{
          borderRadius: 3,
          backgroundColor: CODE_BLOCK_BG_COLOR,
          overflow: 'hidden',
          border: '1px solid var(--vscode-editorGroup-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '9px 10px',
          }}
        >
          <span
            style={{
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ fontWeight: 500 }}>Browse Action: </span>
            {getBrowserActionText(action, coordinate, text)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Define BrowserSessionRowContent component locally (moved from BrowserSessionRow.tsx)
// Note: This component might need further refactoring if ChatRowContent handles most cases
const BrowserSessionRowContent = ({
  message,
  isExpanded,
  onToggleExpand,
  lastModifiedMessage,
  isLast,
  setMaxActionHeight,
}: {
  // Define props inline for simplicity here
  message: ApexMessage;
  isExpanded: (messageTs: number) => boolean;
  onToggleExpand: (messageTs: number) => void;
  lastModifiedMessage?: ApexMessage;
  isLast: boolean;
  setMaxActionHeight: (height: number) => void;
}) => {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  };

  if (
    message.ask === 'browser_action_launch' ||
    message.say === 'browser_action_launch'
  ) {
    // This case is likely handled outside BrowserActionList now, but kept for reference
    return (
      <>
        <div style={headerStyle}>
          <span style={{ fontWeight: 'bold' }}>Browser Session Started</span>
        </div>
        <div
          style={{
            borderRadius: 3,
            border: '1px solid var(--vscode-editorGroup-border)',
            overflow: 'hidden',
            backgroundColor: CODE_BLOCK_BG_COLOR,
          }}
        >
          <CodeBlock
            source={`${'```'}shell\n${message.text}\n${'```'}`}
            forceWrap={true}
          />
        </div>
      </>
    );
  }

  switch (message.type) {
    case 'say':
      switch (message.say) {
        case 'api_req_started':
        case 'text':
          // Render using ChatRowContent for consistency
          return (
            <div style={{ padding: '10px 0 10px 0' }}>
              <ChatRowContent
                message={message}
                isExpanded={isExpanded(message.ts)}
                onToggleExpand={() => {
                  // Reset max height when expanding API requests within the action list
                  if (message.say === 'api_req_started') {
                    setMaxActionHeight(0);
                  }
                  onToggleExpand(message.ts);
                }}
                lastModifiedMessage={lastModifiedMessage}
                isLast={isLast} // Pass isLast down
              />
            </div>
          );

        case 'browser_action':
          let browserAction: ApexSayBrowserAction | null = null;
          try {
            browserAction = JSON.parse(
              message.text || '{}'
            ) as ApexSayBrowserAction;
          } catch (e) {
            console.error('Failed to parse browser action:', message.text, e);
            return <div>Error parsing browser action</div>;
          }
          if (!browserAction) return <div>Invalid browser action data</div>;

          return (
            <BrowserActionBox
              action={browserAction.action}
              coordinate={browserAction.coordinate}
              text={browserAction.text}
            />
          );

        default:
          // Render other 'say' types using ChatRowContent if needed, or return null
          // Example: return <ChatRowContent message={message} ... />;
          return null;
      }

    case 'ask':
      // Handle 'ask' types if they appear within the action list
      // Example: return <ChatRowContent message={message} ... />;
      return null; // Or render appropriately
  }
};

const BrowserActionList: React.FC<BrowserActionListProps> = ({
  currentPage,
  isBrowsing,
  initialUrl,
  isExpanded,
  onToggleExpand,
  lastModifiedMessage,
  isLast,
  setMaxActionHeight,
}) => {
  // Note: The useSize hook was applied to the wrapper div in the original component.
  // If height calculation is still needed specifically for this list, re-introduce useSize here.
  return (
    <div>
      {/* Map over messages in the current page's next action */}
      {currentPage?.nextAction?.messages.map((message) => (
        <BrowserSessionRowContent
          key={message.ts}
          message={message}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          lastModifiedMessage={lastModifiedMessage}
          isLast={isLast}
          setMaxActionHeight={setMaxActionHeight}
        />
      ))}
      {/* Render initial launch action box if applicable */}
      {!isBrowsing &&
        currentPage?.nextAction?.messages.length === 0 &&
        currentPage?.currentState.messages.some(
          (m: ApexMessage) => m.say === 'browser_action_result'
        ) && <BrowserActionBox action={'launch'} text={initialUrl} />}
      {/* Simplified condition: Show launch box only if there are no next actions on the first page after results started appearing */}
      {/* {!isBrowsing && currentPageIndex === 0 && messages.some((m) => m.say === "browser_action_result") && !currentPage?.nextAction && (
             <BrowserActionBox action={"launch"} text={initialUrl} />
         )} */}
    </div>
  );
};

export default BrowserActionList;
