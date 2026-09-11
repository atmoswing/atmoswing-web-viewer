/**
 * @fileoverview Tests for the shared modal title bar.
 */

import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ModalTitleBar from '@/components/modals/common/ModalTitleBar.jsx';

describe('ModalTitleBar', () => {
  it('shows the title', () => {
    render(<ModalTitleBar title="Sion" onClose={vi.fn()} closeLabel="Close"/>);
    expect(screen.getByText('Sion')).toBeInTheDocument();
  });

  it('labels the close button for assistive technology', () => {
    render(<ModalTitleBar title="Sion" onClose={vi.fn()} closeLabel="Fermer"/>);
    expect(screen.getByRole('button', {name: 'Fermer'})).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalTitleBar title="Sion" onClose={onClose} closeLabel="Close"/>);

    await user.click(screen.getByRole('button', {name: 'Close'}));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders actions between the title and the close button', () => {
    const {container} = render(
      <ModalTitleBar title="Sion" onClose={vi.fn()} closeLabel="Close">
        <button type="button">Export</button>
      </ModalTitleBar>
    );
    const buttons = [...container.querySelectorAll('button')].map(b => b.textContent || b.getAttribute('aria-label'));
    expect(buttons).toEqual(['Export', 'Close']);
  });

  it('renders without actions', () => {
    render(<ModalTitleBar title="Sion" onClose={vi.fn()} closeLabel="Close"/>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
