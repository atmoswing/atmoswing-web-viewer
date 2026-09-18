/**
 * @fileoverview Smoke tests for ToolBar component
 */

// Call i18n setup early
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolBar from '@/components/toolbar/ToolBar.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

// Mock child components
vi.mock('@/components/toolbar/ToolbarSquares.jsx', () => ({
  default: () => <div data-testid="toolbar-squares">ToolbarSquares</div>
}));

vi.mock('@/components/toolbar/ToolbarCenter.jsx', () => ({
  default: () => <div data-testid="toolbar-center">ToolbarCenter</div>
}));

// The modal is lazy loaded by ToolBar, so it is mocked at its own module path.
vi.mock('@/components/modals/ForecastDetailsModal.jsx', () => ({
  default: ({open, onClose}) =>
    open ? <div data-testid="details-modal" onClick={() => onClose()}>Details Modal</div> : null
}));

// ToolBar reports a failed modal through a snackbar.
vi.mock('@/contexts/SnackbarContext.jsx', () => ({
  useSnackbar: () => ({enqueueSnackbar: vi.fn()})
}));

// Mock SVG imports
vi.mock('@/assets/toolbar/frame_distributions.svg?react', () => ({
  default: () => <svg data-testid="distributions-icon"/>
}));

describe('ToolBar', () => {
  it('renders without crashing', () => {
    render(<ToolBar/>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders child toolbar components', () => {
    render(<ToolBar/>);
    expect(screen.getByTestId('toolbar-squares')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-center')).toBeInTheDocument();
  });

  it('offers a single forecast details button', () => {
    render(<ToolBar/>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByLabelText('toolbar.openForecastDetails')).toBeInTheDocument();
    expect(screen.getByTestId('distributions-icon')).toBeInTheDocument();
  });

  it('opens the forecast details modal when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolBar/>);

    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));

    expect(await screen.findByTestId('details-modal', {}, {timeout: 5000})).toBeInTheDocument();
  });

  it('closes the modal when its close handler is called', async () => {
    const user = userEvent.setup();
    render(<ToolBar/>);

    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));
    expect(await screen.findByTestId('details-modal', {}, {timeout: 5000})).toBeInTheDocument();

    await user.click(screen.getByTestId('details-modal'));
    expect(screen.queryByTestId('details-modal')).not.toBeInTheDocument();
  });
});
