import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Announcement from '../Announcement';
import '@testing-library/jest-dom';

vi.mock('@vscode/webview-ui-toolkit/react', () => ({
  useTheme: () => ({ themeType: 'light' }),
  VSCodeButton: (props: any) => <button {...props}>{props.children}</button>,
  VSCodeLink: ({ children }: { children: React.ReactNode }) => (
    <a>{children}</a>
  ),
}));

describe('Announcement', () => {
  const hideAnnouncement = vi.fn();

  it('renders the announcement with the correct version', () => {
    render(
      <Announcement version="2.0.0" hideAnnouncement={hideAnnouncement} />
    );
    expect(screen.getByText(/New in v2.0/)).toBeInTheDocument();
  });

  it('calls hideAnnouncement when close button is clicked', () => {
    render(
      <Announcement version="2.0.0" hideAnnouncement={hideAnnouncement} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(hideAnnouncement).toHaveBeenCalled();
  });

  it('renders the Enhanced MCP Support feature', () => {
    render(
      <Announcement version="2.0.0" hideAnnouncement={hideAnnouncement} />
    );
    expect(screen.getByText(/Enhanced MCP Support:/)).toBeInTheDocument();
  });

  it('renders the Add to Apex feature', () => {
    render(
      <Announcement version="2.0.0" hideAnnouncement={hideAnnouncement} />
    );
    expect(screen.getByText(/Add to Apex:/)).toBeInTheDocument();
  });

  it('renders the social media links', () => {
    render(
      <Announcement version="2.0.0" hideAnnouncement={hideAnnouncement} />
    );
    expect(screen.getByText(/Join us on/)).toBeInTheDocument();
    expect(screen.getByText(/X,/)).toBeInTheDocument();
    expect(screen.getByText(/discord,/)).toBeInTheDocument();
    expect(screen.getByText(/r\/apex/)).toBeInTheDocument();
  });
});
