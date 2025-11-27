/**
 * @fileoverview Smoke tests for ToolBar component
 */

// Call i18n setup early
import { setupI18nMock } from '../../testUtils.js';
setupI18nMock();

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolBar from '@/components/toolbar/ToolBar.jsx';

// Mock child components
vi.mock('@/components/toolbar/ToolbarSquares.jsx', () => ({
  default: () => <div data-testid="toolbar-squares">ToolbarSquares</div>
}));

vi.mock('@/components/toolbar/ToolbarCenter.jsx', () => ({
  default: () => <div data-testid="toolbar-center">ToolbarCenter</div>
}));

vi.mock('@/components/modals', () => ({
  DetailsAnalogsModal: ({open, onClose}) =>
    open ? <div data-testid="analogs-modal" onClick={() => onClose()}>Analogs Modal</div> : null,
  DistributionsModal: ({open, onClose}) =>
    open ? <div data-testid="distributions-modal" onClick={() => onClose()}>Distributions Modal</div> : null
}));

// Mock SVG imports
vi.mock('@/assets/toolbar/frame_distributions.svg?react', () => ({
  default: () => <svg data-testid="distributions-icon" />
}));

vi.mock('@/assets/toolbar/frame_analogs.svg?react', () => ({
  default: () => <svg data-testid="analogs-icon" />
}));

describe('ToolBar', () => {
  it('renders without crashing', () => {
    render(<ToolBar />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders child toolbar components', () => {
    render(<ToolBar />);
    expect(screen.getByTestId('toolbar-squares')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-center')).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    render(<ToolBar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('opens distributions modal when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolBar />);

    const distributionsButton = screen.getByLabelText('toolbar.openDistributions');
    await user.click(distributionsButton);

    expect(screen.getByTestId('distributions-modal')).toBeInTheDocument();
  });

  it('opens analogs modal when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolBar />);

    const analogsButton = screen.getByLabelText('toolbar.openAnalogs');
    await user.click(analogsButton);

    expect(screen.getByTestId('analogs-modal')).toBeInTheDocument();
  });

  it('closes modals when close handler is called', async () => {
    const user = userEvent.setup();
    render(<ToolBar />);

    // Open and close distributions modal
    const distributionsButton = screen.getByLabelText('toolbar.openDistributions');
    await user.click(distributionsButton);
    expect(screen.getByTestId('distributions-modal')).toBeInTheDocument();

    await user.click(screen.getByTestId('distributions-modal'));
    expect(screen.queryByTestId('distributions-modal')).not.toBeInTheDocument();
  });
});
