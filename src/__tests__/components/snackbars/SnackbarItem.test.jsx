/**
 * @fileoverview Smoke tests for SnackbarItem component
 */

import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import {SnackbarItem} from '@/components/snackbars/SnackbarItem.jsx';

describe('SnackbarItem', () => {
  it('renders without crashing', () => {
    render(<SnackbarItem open={true} message="Test message" onClose={() => {}} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders when closed', () => {
    render(<SnackbarItem open={false} message="Hidden message" onClose={() => {}} />);
    expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
  });

  it('handles empty message', () => {
    const {container} = render(<SnackbarItem open={true} message="" onClose={() => {}} />);
    expect(container).toBeInTheDocument();
  });
});

