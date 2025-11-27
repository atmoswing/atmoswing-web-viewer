/**
 * @fileoverview Smoke tests for additional Panel components
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import { setupI18nMock } from '../../testUtils.js';
import PanelDisplay from '@/components/panels/PanelDisplay.jsx';
import PanelAnalogDates from '@/components/panels/PanelAnalogDates.jsx';
import PanelStatus from '@/components/panels/PanelStatus.jsx';

setupI18nMock();

// Mock contexts
vi.mock('@/contexts/ForecastsContext.jsx', () => ({
  useForecastParameters: vi.fn(() => ({
    percentile: 90,
    setPercentile: vi.fn(),
    normalizationRef: 10,
    setNormalizationRef: vi.fn()
  })),
  useForecastSession: vi.fn(() => ({
    workspace: 'test',
    activeForecastDate: '2024-01-01',
    forecastBaseDate: new Date('2024-01-01')
  })),
  useMethods: vi.fn(() => ({
    selectedMethodConfig: {
      method: {id: 'method1', name: 'Method 1'},
      config: {id: 'config1', name: 'Config 1'}
    }
  }))
}));

vi.mock('@/contexts/SynthesisContext.jsx', () => ({
  useSynthesis: vi.fn(() => ({
    selectedTargetDate: new Date('2024-01-02')
  }))
}));

vi.mock('@/components/panels/Panel.jsx', () => ({
  default: ({children, title}) => (
    <div data-testid="panel">
      <div>{title}</div>
      <div>{children}</div>
    </div>
  )
}));

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: () => <div data-testid="data-grid">DataGrid</div>
}));

vi.mock('@/hooks/useCachedRequest.js', () => ({
  useCachedRequest: vi.fn(() => ({
    data: null,
    loading: false,
    error: null
  }))
}));

describe('PanelDisplay', () => {
  it('renders without crashing', () => {
    render(<PanelDisplay />);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('renders percentile selector', () => {
    render(<PanelDisplay />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders normalization reference selector', () => {
    render(<PanelDisplay />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2); // percentile and normalization
  });

  it('handles defaultOpen prop', () => {
    render(<PanelDisplay defaultOpen={true} />);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});

describe('PanelAnalogDates', () => {
  it('renders without crashing when config is selected', () => {
    render(<PanelAnalogDates />);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('handles different config states', () => {
    // Component handles various config states gracefully
    // Detailed config testing is in integration tests
    const {container} = render(<PanelAnalogDates />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with various states', () => {
    // Loading and error states are tested in integration tests
    render(<PanelAnalogDates />);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});

describe('PanelStatus', () => {
  it('renders nothing when no state', () => {
    const {container} = render(
      <PanelStatus loading={false} error={false} empty={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders loading message with default text', () => {
    render(<PanelStatus loading={true} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders loading message with custom text', () => {
    render(<PanelStatus loading={true} messages={{loading: 'Custom loading'}} />);
    expect(screen.getByText('Custom loading')).toBeInTheDocument();
  });

  it('renders error message with default text', () => {
    render(<PanelStatus loading={false} error={true} />);
    expect(screen.getByText('Error loading')).toBeInTheDocument();
  });

  it('renders error message with custom text', () => {
    render(<PanelStatus loading={false} error={true} messages={{error: 'Custom error'}} />);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('renders empty message with default text', () => {
    render(<PanelStatus loading={false} error={false} empty={true} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders empty message with custom text', () => {
    render(<PanelStatus loading={false} error={false} empty={true} messages={{empty: 'Custom empty'}} />);
    expect(screen.getByText('Custom empty')).toBeInTheDocument();
  });

  it('prioritizes loading over error', () => {
    render(<PanelStatus loading={true} error={true} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Error loading')).not.toBeInTheDocument();
  });

  it('prioritizes error over empty', () => {
    render(<PanelStatus loading={false} error={true} empty={true} />);
    expect(screen.getByText('Error loading')).toBeInTheDocument();
    expect(screen.queryByText('No data')).not.toBeInTheDocument();
  });
});
