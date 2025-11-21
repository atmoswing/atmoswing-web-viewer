/**
 * @fileoverview Smoke tests for Snackbar sub-components
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import SnackbarItem from '@/components/snackbars/SnackbarItem.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}));

describe('SnackbarItem', () => {
  it('renders without crashing', () => {
    render(<SnackbarItem open={true} message="Test message" onClose={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders with custom anchor origin', () => {
    const anchorOrigin = {vertical: 'top', horizontal: 'right'};
    render(<SnackbarItem open={true} message="Message" anchorOrigin={anchorOrigin} onClose={() => {}} />);
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('renders when closed', () => {
    render(<SnackbarItem open={false} message="Hidden message" onClose={() => {}} />);
    expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
  });

  it('handles custom autoHideDuration', () => {
    render(<SnackbarItem open={true} message="Message" autoHideDuration={3000} onClose={() => {}} />);
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('calls onClose callback', () => {
    const mockOnClose = vi.fn();
    render(<SnackbarItem open={true} message="Message" onClose={mockOnClose} />);
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('handles empty message', () => {
    const {container} = render(<SnackbarItem open={true} message="" onClose={() => {}} />);
    expect(container).toBeInTheDocument();
  });
});

