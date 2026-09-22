/**
 * @fileoverview Smoke tests for ToolBar component
 */

// Call i18n setup early
import {beforeEach, describe, expect, it, vi} from 'vitest';
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

const {openForecastDetails} = vi.hoisted(() => ({openForecastDetails: vi.fn()}));
vi.mock('@/contexts/ForecastDetailsContext.jsx', () => ({
  useForecastDetails: () => ({openForecastDetails})
}));

// Mock SVG imports
vi.mock('@/assets/toolbar/frame_distributions.svg?react', () => ({
  default: () => <svg data-testid="distributions-icon"/>
}));

describe('ToolBar', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('opens the forecast details on the current selection', async () => {
    const user = userEvent.setup();
    render(<ToolBar/>);

    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));

    expect(openForecastDetails).toHaveBeenCalledTimes(1);
    expect(openForecastDetails).toHaveBeenCalledWith();
  });
});
