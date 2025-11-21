/**
 * @fileoverview Smoke tests for additional Panel components
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import PanelDisplay from '@/components/panels/PanelDisplay.jsx';
import PanelAnalogDates from '@/components/panels/PanelAnalogDates.jsx';
import PanelStatus from '@/components/panels/PanelStatus.jsx';

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}));

vi.mock('@/components/panels/Panel.jsx', () => ({
  default: ({children, title}) => (
    <div data-testid="panel">
      <div>{title}</div>
      <div>{children}</div>
    </div>
  )
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

  it('handles no config selected', () => {
    const {useMethods} = require('@/contexts/ForecastsContext.jsx');
    useMethods.mockReturnValue({
      selectedMethodConfig: {method: null, config: null}
    });

    const {container} = render(<PanelAnalogDates />);
    // Should return null or empty when no config
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with loading state', () => {
    const {useCachedRequest} = require('@/hooks/useCachedRequest.js');
    useCachedRequest.mockReturnValue({
      data: null,
      loading: true,
      error: null
    });

    render(<PanelAnalogDates />);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});

describe('PanelStatus', () => {
  it('renders nothing when no state', () => {
    const {container} = render(
      <PanelStatus loading={false} error={null} empty={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders loading message', () => {
    render(<PanelStatus loading={true} loadingMsg="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<PanelStatus loading={false} error="Error occurred" />);
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('renders empty message', () => {
    render(<PanelStatus loading={false} error={null} empty="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('prioritizes loading over error', () => {
    render(<PanelStatus loading={true} loadingMsg="Loading..." error="Error" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('prioritizes error over empty', () => {
    render(<PanelStatus loading={false} error="Error" empty="Empty" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });
});

