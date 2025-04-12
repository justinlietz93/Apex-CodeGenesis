import React from 'react';
import {
  ApexMessage,
  ApexSayTool,
} from '../../../../../src/shared/ExtensionMessage';
import CodeAccordian, { cleanPathPrefix } from '../../common/CodeAccordian';
import { CODE_BLOCK_BG_COLOR } from '../../common/CodeBlock';
import { vscode } from '../../../utils/vscode';

interface ToolCallRendererProps {
  tool: ApexSayTool;
  message: ApexMessage; // Added message prop to determine ask/say for header text
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ToolCallRenderer: React.FC<ToolCallRendererProps> = ({
  tool,
  message,
  isExpanded,
  onToggleExpand,
}) => {
  const toolIcon = (name: string) => (
    <span
      className={`codicon codicon-${name}`}
      style={{
        color: 'var(--vscode-foreground)',
        marginBottom: '-1.5px',
      }}
    ></span>
  );

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  };

  switch (tool.tool) {
    case 'editedExistingFile':
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('edit')}
            <span style={{ fontWeight: 'bold' }}>
              Apex wants to edit this file:
            </span>
          </div>
          <CodeAccordian
            // isLoading={message.partial} // message prop not passed yet, consider adding if needed
            code={tool.content}
            path={tool.path!}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        </>
      );
    case 'newFileCreated':
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('new-file')}
            <span style={{ fontWeight: 'bold' }}>
              Apex wants to create a new file:
            </span>
          </div>
          <CodeAccordian
            isLoading={message.partial} // Use message prop
            code={tool.content!}
            path={tool.path!}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        </>
      );
    case 'readFile':
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('file-code')}
            <span style={{ fontWeight: 'bold' }}>
              {/* {message.type === "ask" ? "" : "Apex read this file:"} */}
              Apex wants to read this file:
            </span>
          </div>
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
                color: 'var(--vscode-descriptionForeground)',
                display: 'flex',
                alignItems: 'center',
                padding: '9px 10px',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
              onClick={() => {
                vscode.postMessage({
                  type: 'openFile',
                  text: tool.content, // Content might not be available in 'ask' state, handle appropriately if needed
                });
              }}
            >
              {tool.path?.startsWith('.') && <span>.</span>}
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginRight: '8px',
                  direction: 'rtl',
                  textAlign: 'left',
                }}
              >
                {cleanPathPrefix(tool.path ?? '') + '\u200E'}
              </span>
              <div style={{ flexGrow: 1 }}></div>
              <span
                className={`codicon codicon-link-external`}
                style={{
                  fontSize: 13.5,
                  margin: '1px 0',
                }}
              ></span>
            </div>
          </div>
        </>
      );
    case 'listFilesTopLevel':
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('folder-opened')}
            <span style={{ fontWeight: 'bold' }}>
              {message.type === 'ask' // Use message prop
                ? 'Apex wants to view the top level files in this directory:'
                : 'Apex viewed the top level files in this directory:'}
            </span>
          </div>
          <CodeAccordian
            code={tool.content!}
            path={tool.path!}
            language="shell-session"
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        </>
      );
    case 'listFilesRecursive':
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('folder-opened')}
            <span style={{ fontWeight: 'bold' }}>
              {message.type === 'ask' // Use message prop
                ? 'Apex wants to recursively view all files in this directory:'
                : 'Apex recursively viewed all files in this directory:'}
            </span>
          </div>
          <CodeAccordian
            code={tool.content!}
            path={tool.path!}
            language="shell-session"
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        </>
      );
    case 'listCodeDefinitionNames':
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('file-code')}
            <span style={{ fontWeight: 'bold' }}>
              {message.type === 'ask' // Use message prop
                ? 'Apex wants to view source code definition names used in this directory:'
                : 'Apex viewed source code definition names used in this directory:'}
            </span>
          </div>
          <CodeAccordian
            code={tool.content!}
            path={tool.path!}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        </>
      );
    case 'searchFiles':
      // Ensure tool.regex is defined before using it
      const regexDisplay = tool.regex ? (
        <code>{tool.regex}</code>
      ) : (
        <span>an unspecified pattern</span>
      );
      return (
        <>
          <div style={headerStyle}>
            {toolIcon('search')}
            <span style={{ fontWeight: 'bold' }}>
              Apex wants to search this directory for {regexDisplay}:
            </span>
          </div>
          <CodeAccordian
            code={tool.content!}
            path={
              tool.path! + (tool.filePattern ? `/(${tool.filePattern})` : '')
            }
            language="plaintext"
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        </>
      );
    default:
      // Optionally handle unknown tool types or return null
      console.warn(
        'Unknown tool type encountered in ToolCallRenderer:',
        tool.tool
      );
      return null;
  }
};

export default ToolCallRenderer;
