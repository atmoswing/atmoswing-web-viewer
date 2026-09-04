// filepath: d:\Development\atmoswing-web-viewer\src\__tests__\components\panels\PanelSynthesis.test.jsx

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {setupI18nMock} from '../../testUtils.js';
import PanelSynthesis from '@/components/panels/PanelSynthesis.jsx';

// setup i18n before importing the component
setupI18nMock();

// Mock Panel and PanelStatus the same way other panel tests do
vi.mock('@/components/panels/Panel.jsx', () => ({
  default: ({children, title}) => (
    <div data-testid="panel">
      <div data-testid="panel-title">{title}</div>
      <div>{children}</div>
    </div>
  )
}));

vi.mock('@/components/panels/PanelStatus.jsx', () => ({
  default: ({loading, error, empty, messages}) => {
    if (loading) return <div data-testid="panel-status-loading">{messages?.loading || 'Loading'}</div>;
    if (error) return <div data-testid="panel-status-error">{messages?.error || 'Error'}</div>;
    if (empty) return <div data-testid="panel-status-empty">{messages?.empty || 'Empty'}</div>;
    return null;
  }
}));

// Provide mocked context hooks (we'll set return values per-test)
vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useMethods: vi.fn(),
  useSynthesis: vi.fn()
}));

// Stubbed so this file tests the panel's wiring only. The strip's own rendering and click
// handling are covered directly in SubDailyStrip.test.jsx, and going through its real DOM
// here is what made the sub-daily case awkward to assert.
vi.mock('@/components/panels/SubDailyStrip.jsx', () => ({
  default: ({segmentsByHour}) => (
    <div data-testid="sub-daily-strip" data-hours={[...segmentsByHour.keys()].sort((a, b) => a - b).join(',')}/>
  )
}));

// helpers
function makeDateISO(y, m, d, h = 0) {
  // months are 1-based here for readability
  // Create a local Date so that getHours() in the component matches `h` when rendered in jsdom
  const dt = new Date(y, m - 1, d, h, 0, 0);
  return dt.toISOString();
}

describe('PanelSynthesis (more tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading PanelStatus when synthesis is loading', async () => {
    const ctx = await import('@/contexts/forecast/ForecastsContext.jsx');
    ctx.useMethods.mockReturnValue({
      methodConfigTree: [],
      selectedMethodConfig: null,
      setSelectedMethodConfig: vi.fn()
    });
    ctx.useSynthesis.mockReturnValue({
      perMethodSynthesis: [],
      perMethodSynthesisLoading: true,
      perMethodSynthesisError: null,
      selectTargetDate: vi.fn(),
      selectedTargetDate: null,
      dailyLeads: []
    });

    render(<PanelSynthesis/>);

    expect(screen.getByTestId('panel-status-loading')).toBeInTheDocument();
  });

  it('renders daily single segment cells and clicking selects method/date', async () => {
    const ctx = await import('@/contexts/forecast/ForecastsContext.jsx');

    const setSelectedMethodConfig = vi.fn();
    const selectTargetDate = vi.fn();

    ctx.useMethods.mockReturnValue({
      methodConfigTree: [{id: 'm1', name: 'M1'}],
      selectedMethodConfig: {method: null, config: null},
      setSelectedMethodConfig
    });

    const dateISO = makeDateISO(2025, 11, 27, 0);
    ctx.useSynthesis.mockReturnValue({
      perMethodSynthesis: [{method_id: 'm1', target_dates: [dateISO], values_normalized: [0.5]}],
      perMethodSynthesisLoading: false,
      perMethodSynthesisError: null,
      selectTargetDate,
      selectedTargetDate: null,
      dailyLeads: []
    });

    render(<PanelSynthesis/>);

    // cell should have a title with method name
    const cells = screen.getAllByTitle('M1');
    expect(cells.length).toBeGreaterThan(0);

    // click the first cell
    fireEvent.click(cells[0]);

    expect(setSelectedMethodConfig).toHaveBeenCalled();
    expect(selectTargetDate).toHaveBeenCalled();
    // ensure the date passed is a Date object
    expect(selectTargetDate.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it('renders a sub-daily strip for a day with sub-daily leads, and selects on cell click', async () => {
    const ctx = await import('@/contexts/forecast/ForecastsContext.jsx');

    const setSelectedMethodConfig = vi.fn();
    const selectTargetDate = vi.fn();

    ctx.useMethods.mockReturnValue({
      methodConfigTree: [{id: 'm1', name: 'M1'}],
      selectedMethodConfig: {method: null, config: null},
      setSelectedMethodConfig
    });

    const d1 = makeDateISO(2025, 11, 28, 0);
    const d2 = makeDateISO(2025, 11, 28, 6); // sub-daily non-zero hour

    ctx.useSynthesis.mockReturnValue({
      perMethodSynthesis: [{method_id: 'm1', target_dates: [d1, d2], values_normalized: [0.2, 0.8]}],
      perMethodSynthesisLoading: false,
      perMethodSynthesisError: null,
      selectTargetDate,
      selectedTargetDate: null,
      dailyLeads: []
    });

    render(<PanelSynthesis/>);

    // The day carries a 00h and an 06h lead, so the panel must hand both to the strip.
    const strip = screen.getByTestId('sub-daily-strip');
    expect(strip.getAttribute('data-hours')).toBe('0,6');

    const cell = strip.closest('td');
    expect(cell).toBeTruthy();

    // Clicking the cell itself (not a segment) still selects the method and the day.
    fireEvent.click(cell);

    expect(setSelectedMethodConfig).toHaveBeenCalled();
    expect(selectTargetDate).toHaveBeenCalled();
    expect(selectTargetDate.mock.calls[0][0]).toBeInstanceOf(Date);
  });
});
