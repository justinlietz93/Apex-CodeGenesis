import React from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

interface BrowserPaginationProps {
  currentPageIndex: number;
  totalPages: number;
  isBrowsing: boolean;
  setCurrentPageIndex: (updateFn: (index: number) => number) => void; // Function to update index
}

const BrowserPagination: React.FC<BrowserPaginationProps> = ({
  currentPageIndex,
  totalPages,
  isBrowsing,
  setCurrentPageIndex,
}) => {
  // Only render if there's more than one page
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0px',
        marginTop: '15px',
        borderTop: '1px solid var(--vscode-editorGroup-border)',
      }}
    >
      <div>
        Step {currentPageIndex + 1} of {totalPages}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <VSCodeButton
          disabled={currentPageIndex === 0 || isBrowsing}
          onClick={() => setCurrentPageIndex((i) => i - 1)}
        >
          Previous
        </VSCodeButton>
        <VSCodeButton
          disabled={currentPageIndex === totalPages - 1 || isBrowsing}
          onClick={() => setCurrentPageIndex((i) => i + 1)}
        >
          Next
        </VSCodeButton>
      </div>
    </div>
  );
};

export default BrowserPagination;
