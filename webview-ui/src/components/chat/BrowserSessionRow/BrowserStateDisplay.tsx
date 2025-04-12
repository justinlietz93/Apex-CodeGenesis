import React from 'react';
import { BrowserSettings } from '../../../../../src/shared/BrowserSettings';
import { vscode } from '../../../utils/vscode';
import { BrowserSettingsMenu } from '../../browser/BrowserSettingsMenu';
import CodeBlock, { CODE_BLOCK_BG_COLOR } from '../../common/CodeBlock';

// Define the structure for displayState based on usage in BrowserSessionRow.tsx
interface DisplayState {
  url?: string;
  screenshot?: string;
  mousePosition?: string;
  consoleLogs?: string;
}

interface BrowserStateDisplayProps {
  displayState: DisplayState;
  browserSettings: BrowserSettings;
  mousePosition: string; // The potentially live mouse position
  consoleLogsExpanded: boolean;
  setConsoleLogsExpanded: (expanded: boolean) => void;
  maxWidth?: number;
  shouldShowSettings: boolean;
}

// Define BrowserCursor component locally or import if moved to common
const BrowserCursor: React.FC<{ style?: React.CSSProperties }> = ({
  style,
}) => {
  // (can't use svgs in vsc extensions)
  const cursorBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAFaADAAQAAAABAAAAGAAAAADwi9a/AAADGElEQVQ4EZ2VbUiTURTH772be/PxZdsz3cZwC4RVaB8SAjMpxQwSWZbQG/TFkN7oW1Df+h6IRV9C+hCpKUSIZUXOfGM5tAKViijFFEyfZ7Ol29S1Pbdzl8Uw9+aBu91zzv3/nt17zt2DEZjBYOAkKrtFMXIghAWM8U2vMN/FctsxGRMpM7NbEEYNMM2CYUSInlJx3OpawO9i+XSNQYkmk2uFb9njzkcfVSr1p/GJiQKMULVaw2WuBv296UKRxWJR6wxGCmM1EAhSNppv33GBH9qI32cPTAtss9lUm6EM3N7R+RbigT+5/CeosFCZKpjEW+iorS1pb30wDUXzQfHqtD/9L3ieZ2ee1OJCmbL8QHnRs+4uj0wmW4QzrpCwvJ8zGg3JqAmhTLynuLiwv8/5KyND8Q3cEkUEDWu15oJE4KRQJt5hs1rcriGNRqP+DK4dyyWXXm/aFQ+cEpSJ8/LyDGPuEZNOmzsOroUSOqzXG/dtBU4ZysTZYKNut91sNo2Cq6cE9enz86s2g9OCMrFSqVC5hgb32u072W3jKMU90Hb1seC0oUwsB+t92bO/rKx0EFGkgFCnjjc1/gVvC8rE0L+4o63t4InjxwbAJQjTe3qD8QrLkXA4DC24fWtuajp06cLFYSBIFKGmXKPRRmAnME9sPt+yLwIWb9WN69fKoTneQz4Dh2mpPNkvfeV0jjecb9wNAkwIEVQq5VJOds4Kb+DXoAsiVquVwI1Dougpij6UyGYx+5cKroeDEFibm5lWRRMbH1+npmYrq6qhwlQHIbajZEf1fElcqGGFpGg9HMuKzpfBjhytCTMgkJ56RX09zy/ysENTBElmjIgJnmNChJqohDVQqpEfwkILE8v/o0GAnV9F1eEvofVQCbiTBEXOIPQh5PGgefDZeAcjrpGZjULBr/m3tZOnz7oEQWRAQZLjWlEU/XEJWySiILgRc5Cz1DkcAyuBFcnpfF0JiXWKpcolQXizhS5hKAqFpr0MVbgbuxJ6+5xX+P4wNpbqPPrugZfbmIbLmgQR3Aw8QSi66hUXulOFbF73GxqjE5BNXWNeAAAAAElFTkSuQmCC';

  return (
    <img
      src={cursorBase64}
      style={{
        width: '17px',
        height: '22px',
        ...style,
      }}
      alt="cursor"
    />
  );
};

const BrowserStateDisplay: React.FC<BrowserStateDisplayProps> = ({
  displayState,
  browserSettings,
  mousePosition,
  consoleLogsExpanded,
  setConsoleLogsExpanded,
  maxWidth,
  shouldShowSettings,
}) => {
  return (
    <div
      style={{
        borderRadius: 3,
        border: '1px solid var(--vscode-editorGroup-border)',
        backgroundColor: CODE_BLOCK_BG_COLOR,
        maxWidth,
        margin: '0 auto 10px auto', // Center the container
      }}
    >
      {/* URL Bar */}
      <div
        style={{
          margin: '5px auto',
          width: 'calc(100% - 10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '4px',
            padding: '3px 5px',
            minWidth: 0,
            color: displayState.url
              ? 'var(--vscode-input-foreground)'
              : 'var(--vscode-descriptionForeground)',
            fontSize: '12px',
          }}
        >
          <div
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {displayState.url || 'http'}
          </div>
        </div>
        <BrowserSettingsMenu
          disabled={!shouldShowSettings}
          maxWidth={maxWidth}
        />
      </div>

      {/* Screenshot Area */}
      <div
        style={{
          width: '100%',
          paddingBottom: `${(browserSettings.viewport.height / browserSettings.viewport.width) * 100}%`,
          position: 'relative',
          backgroundColor: 'var(--vscode-input-background)',
        }}
      >
        {displayState.screenshot ? (
          <img
            src={displayState.screenshot}
            alt="Browser screenshot"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: 'pointer',
            }}
            onClick={() =>
              vscode.postMessage({
                type: 'openImage',
                text: displayState.screenshot,
              })
            }
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className="codicon codicon-globe"
              style={{
                fontSize: '80px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            />
          </div>
        )}
        {displayState.mousePosition && ( // Use displayState.mousePosition to determine if cursor should be shown based on the *page's* state
          <BrowserCursor
            style={{
              position: 'absolute',
              // Use the potentially live mousePosition prop for actual positioning
              top: `${(parseInt(mousePosition.split(',')[1]) / browserSettings.viewport.height) * 100}%`,
              left: `${(parseInt(mousePosition.split(',')[0]) / browserSettings.viewport.width) * 100}%`,
              transition: 'top 0.3s ease-out, left 0.3s ease-out',
            }}
          />
        )}
      </div>

      {/* Console Logs Area */}
      <div style={{ width: '100%' }}>
        <div
          onClick={() => {
            setConsoleLogsExpanded(!consoleLogsExpanded);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            padding: `9px 8px ${consoleLogsExpanded ? 0 : 8}px 8px`,
          }}
        >
          <span
            className={`codicon codicon-chevron-${consoleLogsExpanded ? 'down' : 'right'}`}
          ></span>
          <span style={{ fontSize: '0.8em' }}>Console Logs</span>
        </div>
        {consoleLogsExpanded && (
          <CodeBlock
            source={`${'```'}shell\n${displayState.consoleLogs || '(No new logs)'}\n${'```'}`}
          />
        )}
      </div>
    </div>
  );
};

export default BrowserStateDisplay;
