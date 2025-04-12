import React from 'react';
// Import McpMarketplaceCatalog directly from ExtensionMessage where it's re-exported
import {
  ApexAskUseMcpServer,
  ApexMessage,
  McpServer,
  McpMarketplaceCatalog,
} from '../../../../../src/shared/ExtensionMessage';
import { findMatchingResourceOrTemplate } from '../../../utils/mcp';
import CodeAccordian from '../../common/CodeAccordian';
import McpResourceRow from '../../mcp/McpResourceRow';
import McpToolRow from '../../mcp/McpToolRow';
import MessageHeader from './MessageHeader'; // Import MessageHeader

interface McpRendererProps {
  message: ApexMessage;
  mcpServers: McpServer[];
  mcpMarketplaceCatalog: McpMarketplaceCatalog;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMcpServerResponding?: boolean; // Needed for MessageHeader
}

const McpRenderer: React.FC<McpRendererProps> = ({
  message,
  mcpServers,
  mcpMarketplaceCatalog,
  isExpanded, // isExpanded is for the arguments accordian, not the main message
  onToggleExpand,
  isMcpServerResponding,
}) => {
  let useMcpServer: ApexAskUseMcpServer | null = null;
  try {
    useMcpServer = JSON.parse(message.text || '{}') as ApexAskUseMcpServer;
  } catch (e) {
    console.error('Failed to parse MCP server use message:', message.text, e);
    return <div>Error parsing MCP message</div>; // Render error state
  }

  // Ensure useMcpServer is not null before proceeding
  if (!useMcpServer) {
    return <div>Invalid MCP message data</div>; // Or some other error indication
  }

  const server = mcpServers.find(
    (server) => server.name === useMcpServer?.serverName
  );

  return (
    <>
      <MessageHeader
        message={message}
        isMcpServerResponding={isMcpServerResponding}
        // Pass other relevant props if needed by MessageHeader for MCP
      />
      <div
        style={{
          background: 'var(--vscode-textCodeBlock-background)',
          borderRadius: '3px',
          padding: '8px 10px',
          marginTop: '8px',
        }}
      >
        {useMcpServer.type === 'access_mcp_resource' && (
          <McpResourceRow
            item={{
              ...(findMatchingResourceOrTemplate(
                useMcpServer.uri || '',
                server?.resources,
                server?.resourceTemplates
              ) || {
                name: '',
                mimeType: '',
                description: '',
              }),
              uri: useMcpServer.uri || '',
            }}
          />
        )}

        {useMcpServer.type === 'use_mcp_tool' && (
          <>
            <div onClick={(e) => e.stopPropagation()}>
              <McpToolRow
                tool={{
                  name: useMcpServer.toolName || '',
                  description:
                    server?.tools?.find(
                      (tool: { name: string }) =>
                        tool.name === useMcpServer?.toolName
                    )?.description || '',
                  autoApprove:
                    server?.tools?.find(
                      (tool: { name: string }) =>
                        tool.name === useMcpServer?.toolName
                    )?.autoApprove || false,
                }}
                serverName={useMcpServer.serverName}
              />
            </div>
            {useMcpServer.arguments && useMcpServer.arguments !== '{}' && (
              <div style={{ marginTop: '8px' }}>
                <div
                  style={{
                    marginBottom: '4px',
                    opacity: 0.8,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  Arguments
                </div>
                <CodeAccordian
                  code={useMcpServer.arguments}
                  language="json"
                  isExpanded={true} // Arguments are always expanded by default in this context
                  onToggleExpand={onToggleExpand} // Pass toggle handler if needed for future flexibility
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default McpRenderer;
