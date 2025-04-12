import React from 'react';
import {
  ApexMessage,
  ApexSayTool,
} from '../../../../../src/shared/ExtensionMessage';
import CodeAccordian from '../../common/CodeAccordian';
import Thumbnails from '../../common/Thumbnails';
import { highlightMentions } from '../TaskHeader'; // Assuming TaskHeader is in the parent directory

interface FeedbackRendererProps {
  message: ApexMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const FeedbackRenderer: React.FC<FeedbackRendererProps> = ({
  message,
  isExpanded,
  onToggleExpand,
}) => {
  if (message.say === 'user_feedback') {
    return (
      <div
        style={{
          backgroundColor: 'var(--vscode-badge-background)',
          color: 'var(--vscode-badge-foreground)',
          borderRadius: '3px',
          padding: '9px',
          whiteSpace: 'pre-line',
          wordWrap: 'break-word',
        }}
      >
        <span style={{ display: 'block' }}>
          {highlightMentions(message.text)}
        </span>
        {message.images && message.images.length > 0 && (
          <Thumbnails images={message.images} style={{ marginTop: '8px' }} />
        )}
      </div>
    );
  }

  if (message.say === 'user_feedback_diff') {
    let tool: ApexSayTool | null = null;
    try {
      tool = JSON.parse(message.text || '{}') as ApexSayTool;
    } catch (e) {
      console.error(
        'Failed to parse user feedback diff message:',
        message.text,
        e
      );
      return <div>Error parsing feedback diff</div>; // Render error state
    }

    if (!tool || !tool.diff) {
      console.error('Invalid user feedback diff data:', tool);
      return <div>Invalid feedback diff data</div>; // Render error state
    }

    return (
      <div
        style={{
          marginTop: -10, // Keep original styling adjustment
          width: '100%',
        }}
      >
        <CodeAccordian
          diff={tool.diff}
          isFeedback={true}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
        />
      </div>
    );
  }

  // Should not happen if called correctly, but return null as a fallback
  return null;
};

export default FeedbackRenderer;
