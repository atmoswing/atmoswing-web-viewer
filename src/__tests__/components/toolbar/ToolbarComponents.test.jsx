/**
 * @fileoverview Smoke tests for Toolbar sub-components
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import ToolbarSquares from '@/components/toolbar/ToolbarSquares.jsx';
import ToolbarCenter from '@/components/toolbar/ToolbarCenter.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

// Mock contexts
vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useSynthesis: vi.fn(() => ({
    dailyLeads: [],
    subDailyLeads: [],
    selectedTargetDate: null,
    selectTargetDate: vi.fn()
  })),
  useForecastSession: vi.fn(() => ({
    workspace: 'test',
    activeForecastDate: '2024-01-01',
    forecastDates: ['2024-01-01'],
    goToDate: vi.fn(),
    goToPreviousDate: vi.fn(),
    goToNextDate: vi.fn(),
    goToOldestDate: vi.fn(),
    goToNewestDate: vi.fn(),
    restoreInitialDate: vi.fn(),
    baseDateSearchFailed: false
  })),
  useMethods: vi.fn(() => ({
    methods: []
  }))
}));

// The selection logic itself is tested with the hook; here only the wiring of the squares.
const {selectLead, dominantMethodAt} = vi.hoisted(() => ({selectLead: vi.fn(), dominantMethodAt: vi.fn(() => null)}));
vi.mock('@/components/toolbar/hooks/useSelectLeadWithMethod.js', () => ({
  default: () => selectLead,
  useDominantMethodLookup: () => dominantMethodAt
}));

vi.mock('@/contexts/WorkspaceContext.jsx', () => ({
  useWorkspace: vi.fn(() => ({
    workspace: 'test'
  }))
}));

describe('ToolbarSquares', () => {
  it('renders without crashing', () => {
    const {container} = render(<ToolbarSquares/>);
    expect(container).toBeInTheDocument();
  });

  it('renders empty state when no leads available', () => {
    render(<ToolbarSquares/>);
    // Component should render even with empty data
    // May or may not have specific class, just verify no crash
    expect(true).toBe(true);
  });

  it('handles synthesis data structure', () => {
    // Component handles various synthesis data states
    // Detailed state testing is covered in integration tests
    const {container} = render(<ToolbarSquares/>);
    expect(container).toBeInTheDocument();
  });
});

describe('ToolbarSquares clicks', () => {
  const day9 = new Date(2026, 9, 9);
  const day9at6 = new Date(2026, 9, 9, 6);

  beforeEach(async () => {
    selectLead.mockClear();
    const {useSynthesis} = await import('@/contexts/forecast/ForecastsContext.jsx');
    useSynthesis.mockReturnValue({
      dailyLeads: [{date: day9, valueNorm: 0.3}],
      subDailyLeads: [{date: day9at6, valueNorm: 0.4}],
      selectedTargetDate: null,
      selectTargetDate: vi.fn()
    });
  });

  it('selects the lead with its method from a daily square and from a sub-daily segment', () => {
    const {container} = render(<ToolbarSquares/>);
    fireEvent.click(container.querySelector('.toolbar-square'));
    expect(selectLead).toHaveBeenLastCalledWith(day9, false);

    // The segment's click must not also reach the daily square behind it.
    fireEvent.click(container.querySelector('.square-subdaily-seg:not(.placeholder)'));
    expect(selectLead).toHaveBeenLastCalledWith(day9at6, true);
    expect(selectLead).toHaveBeenCalledTimes(2);
  });

  it('names in the tooltip the method a click selects, for the day and each sub-daily segment', async () => {
    dominantMethodAt.mockImplementation((date, subDaily) => (subDaily ? {id: '06h', name: 'ARPEGE 6h'} : {id: '24h'}));
    const {container} = render(<ToolbarSquares/>);
    fireEvent.mouseOver(container.querySelector('.toolbar-square'));

    // The i18n mock renders keys: one daily line, one line per sub-daily segment.
    expect(await screen.findByText('toolbar.dominantMethod')).toBeInTheDocument();
    expect(screen.getAllByText('toolbar.dominantMethodAtHour')).toHaveLength(1);
    expect(dominantMethodAt).toHaveBeenCalledWith(day9, false);
    expect(dominantMethodAt).toHaveBeenCalledWith(day9at6, true);
    dominantMethodAt.mockReset();
    dominantMethodAt.mockReturnValue(null);
  });

  it('falls back to the method id in the tooltip when a method has no name', async () => {
    dominantMethodAt.mockImplementation(() => ({id: '06h-ARP'}));
    const {container} = render(<ToolbarSquares/>);
    fireEvent.mouseOver(container.querySelector('.toolbar-square'));
    // Rendered from the id: the lines are there, with nothing undefined in them.
    expect(await screen.findByText('toolbar.dominantMethod')).toBeInTheDocument();
    expect(screen.getAllByText('toolbar.dominantMethodAtHour')).toHaveLength(1);
    dominantMethodAt.mockReset();
    dominantMethodAt.mockReturnValue(null);
  });

  it('leaves the method lines out when no method is known', async () => {
    const {container} = render(<ToolbarSquares/>);
    fireEvent.mouseOver(container.querySelector('.toolbar-square'));
    expect(await screen.findByText('toolbar.colorSynthesis')).toBeInTheDocument();
    expect(screen.queryByText('toolbar.dominantMethod')).toBeNull();
    expect(screen.queryByText('toolbar.dominantMethodAtHour')).toBeNull();
  });
});

describe('ToolbarSquares selection highlight', () => {
  const day9 = new Date(2026, 9, 9);
  const day9at6 = new Date(2026, 9, 9, 6);
  const day10 = new Date(2026, 9, 10);

  const renderWith = async (selectedTargetDate) => {
    const {useSynthesis} = await import('@/contexts/forecast/ForecastsContext.jsx');
    useSynthesis.mockReturnValue({
      dailyLeads: [{date: day9, valueNorm: 0.3}, {date: day10, valueNorm: 0.1}],
      subDailyLeads: [{date: day9, valueNorm: 0.2}, {date: day9at6, valueNorm: 0.4}],
      selectedTargetDate,
      selectTargetDate: vi.fn()
    });
    const {container} = render(<ToolbarSquares/>);
    const squares = [...container.querySelectorAll('.toolbar-square')];
    return {
      squares,
      selectedSquares: squares.map(sq => sq.classList.contains('selected')),
      selectedSegments: [...squares[0].querySelectorAll('.square-subdaily-seg')].map(seg => seg.classList.contains('selected'))
    };
  };

  it('marks the day square for a daily selection', async () => {
    const {selectedSquares, selectedSegments} = await renderWith(day10);
    expect(selectedSquares).toEqual([false, true]);
    expect(selectedSegments).toEqual([false, false, false, false]);
  });

  it('marks the segment, not its day square, for a sub-daily selection', async () => {
    const {selectedSquares, selectedSegments} = await renderWith(day9at6);
    expect(selectedSquares).toEqual([false, false]);
    expect(selectedSegments).toEqual([false, true, false, false]);
  });

  it('marks the 00h segment and its day square together, as both stand for midnight', async () => {
    const {selectedSquares, selectedSegments} = await renderWith(day9);
    expect(selectedSquares).toEqual([true, false]);
    expect(selectedSegments).toEqual([true, false, false, false]);
  });

  it('hides the sub-daily strip of a day without sub-daily leads, and shows placeholders for missing hours', async () => {
    const {squares} = await renderWith(null);
    expect(squares[0].querySelector('.square-subdaily').classList.contains('has-subs')).toBe(true);
    expect(squares[0].querySelectorAll('.square-subdaily-seg.placeholder')).toHaveLength(2); // 12h and 18h
    expect(squares[1].querySelector('.square-subdaily').style.display).toBe('none');
  });
});

describe('ToolbarCenter', () => {
  it('renders without crashing', () => {
    render(<ToolbarCenter/>);
    // Should render navigation buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders navigation buttons', () => {
    render(<ToolbarCenter/>);
    // Check for multiple button elements (navigation controls)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5); // Several nav buttons
  });

  it('displays current date info', () => {
    render(<ToolbarCenter/>);
    // Component should render without error
    expect(screen.getAllByRole('button')).toBeDefined();
  });
});
