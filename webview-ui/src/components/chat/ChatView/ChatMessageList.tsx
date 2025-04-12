import React, { useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ApexMessage } from '../../../../../src/shared/ExtensionMessage';
import BrowserSessionRow from '../BrowserSessionRow'; // Assuming path is correct
import ChatRow from '../ChatRow'; // Assuming path is correct

// Define props based on moved logic
interface ChatMessageListProps {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  taskTs: number; // For Virtuoso key
  groupedMessages: (ApexMessage | ApexMessage[])[];
  modifiedMessages: ApexMessage[]; // For lastModifiedMessage in ChatRow/BrowserSessionRow
  expandedRows: Record<number, boolean>;
  setExpandedRows: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >; // For BrowserSessionRow
  toggleRowExpansion: (ts: number) => void; // For ChatRow
  handleRowHeightChange: (isTaller: boolean) => void; // For ChatRow/BrowserSessionRow
  setIsAtBottom: (isAtBottom: boolean) => void;
  setShowScrollToBottom: (show: boolean) => void;
  disableAutoScrollRef: React.RefObject<boolean>;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  virtuosoRef,
  taskTs,
  groupedMessages,
  modifiedMessages,
  expandedRows,
  setExpandedRows,
  toggleRowExpansion,
  handleRowHeightChange,
  setIsAtBottom,
  setShowScrollToBottom,
  disableAutoScrollRef,
}) => {
  const itemContent = useCallback(
    (index: number, messageOrGroup: ApexMessage | ApexMessage[]) => {
      // browser session group
      if (Array.isArray(messageOrGroup)) {
        return (
          <BrowserSessionRow
            messages={messageOrGroup}
            isLast={index === groupedMessages.length - 1}
            lastModifiedMessage={modifiedMessages.at(-1)}
            onHeightChange={handleRowHeightChange}
            // Pass handlers for each message in the group
            isExpanded={(messageTs: number) => expandedRows[messageTs] ?? false}
            onToggleExpand={(messageTs: number) => {
              // Need to manage expandedRows state here or pass down setter
              // For now, passing down setExpandedRows
              setExpandedRows((prev) => ({
                ...prev,
                [messageTs]: !prev[messageTs],
              }));
            }}
          />
        );
      }

      // regular message
      return (
        <ChatRow
          key={messageOrGroup.ts}
          message={messageOrGroup}
          isExpanded={expandedRows[messageOrGroup.ts] || false}
          onToggleExpand={() => toggleRowExpansion(messageOrGroup.ts)}
          lastModifiedMessage={modifiedMessages.at(-1)}
          isLast={index === groupedMessages.length - 1}
          onHeightChange={handleRowHeightChange}
        />
      );
    },
    [
      expandedRows,
      modifiedMessages,
      groupedMessages.length,
      toggleRowExpansion,
      handleRowHeightChange,
      setExpandedRows,
    ] // Added setExpandedRows
  );

  return (
    <Virtuoso
      ref={virtuosoRef}
      key={taskTs} // trick to make sure virtuoso re-renders when task changes, and we use initialTopMostItemIndex to start at the bottom
      className="scrollable"
      style={{
        flexGrow: 1,
        overflowY: 'scroll', // always show scrollbar
      }}
      components={{
        Footer: () => <div style={{ height: 5 }} />, // Add empty padding at the bottom
      }}
      // increasing top by 3_000 to prevent jumping around when user collapses a row
      increaseViewportBy={{
        top: 3_000,
        bottom: Number.MAX_SAFE_INTEGER,
      }} // hack to make sure the last message is always rendered to get truly perfect scroll to bottom animation when new messages are added (Number.MAX_SAFE_INTEGER is safe for arithmetic operations, which is all virtuoso uses this value for in src/sizeRangeSystem.ts)
      data={groupedMessages} // messages is the raw format returned by extension, modifiedMessages is the manipulated structure that combines certain messages of related type, and visibleMessages is the filtered structure that removes messages that should not be rendered
      itemContent={itemContent}
      atBottomStateChange={(atBottom) => {
        // Renamed variable for clarity
        setIsAtBottom(atBottom);
        // Logic to modify disableAutoScrollRef should happen in the parent hook/component
        // if (atBottom) {
        //   disableAutoScrollRef.current = false // Cannot modify ref passed as prop
        // }
        // Ensure boolean value is passed
        setShowScrollToBottom(!!(disableAutoScrollRef.current && !atBottom));
      }}
      atBottomThreshold={10} // anything lower causes issues with followOutput
      initialTopMostItemIndex={groupedMessages.length - 1}
    />
  );
};

export default ChatMessageList;
