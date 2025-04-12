import React from 'react';
import { HistoryItem } from '../../../../../src/shared/HistoryItem';
import { TelemetrySetting } from '../../../../../src/shared/TelemetrySetting';
import HistoryPreview from '../../history/HistoryPreview'; // Remove props import
import Announcement from '../Announcement'; // Remove props import
import TelemetryBanner from '../../common/TelemetryBanner'; // Remove props import

interface ChatViewWelcomeProps {
  version: string;
  telemetrySetting: TelemetrySetting;
  showAnnouncement: boolean;
  hideAnnouncement: () => void;
  taskHistory: HistoryItem[];
  showHistoryView: () => void;
}

const ChatViewWelcome: React.FC<ChatViewWelcomeProps> = ({
  version,
  telemetrySetting,
  showAnnouncement,
  hideAnnouncement,
  taskHistory,
  showHistoryView,
}) => {
  return (
    <>
      <div
        style={{
          flex: '1 1 0', // flex-grow: 1, flex-shrink: 1, flex-basis: 0
          minHeight: 0, // Allow shrinking below content height
          overflowY: 'auto', // Enable scrolling if content overflows
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '15px 15px 0 15px' }}>
          <h1 style={{ marginTop: 0, marginBottom: 5 }}>Apex IDE</h1>
          <p style={{ marginTop: 0, marginBottom: 15, opacity: 0.7 }}>
            v{version}
          </p>
          {/* TODO: Fix prop types for child components */}
          {/* <TelemetryBanner {...({ telemetrySetting } as any)} /> */}{' '}
          {/* Disabled telemetry banner */}
          {showAnnouncement && (
            <Announcement {...({ onClose: hideAnnouncement } as any)} />
          )}
        </div>
        <HistoryPreview {...({ taskHistory, showHistoryView } as any)} />
      </div>
    </>
  );
};

export default ChatViewWelcome;
