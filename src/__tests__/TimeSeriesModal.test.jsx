/**
 * @fileoverview Smoke tests for TimeSeriesModal
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeSeriesModal from '@/components/modals/TimeSeriesModal.jsx';

// Mock contexts
vi.mock('@/contexts/ForecastsContext.jsx', () => ({
  useSelectedEntity: vi.fn(() => ({
    selectedEntityId: 1
  })),
  useEntities: vi.fn(() => ({
    entities: [{id: 1, name: 'Entity 1'}]
  })),
  useMethods: vi.fn(() => ({
    methods: [{id: 'method1', name: 'Method 1'}],
    methodConfigTree: [],
    selectedMethodConfig: {method: null, config: null}
  })),
  useForecastSession: vi.fn(() => ({
    workspace: 'test',
    activeForecastDate: '2024-01-01'
  }))
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {language: 'en'}
  })
}));

vi.mock('@/hooks/useCachedRequest.js', () => ({
  useCachedRequest: vi.fn(() => ({
    data: null,
    loading: false,
    error: null
  })),
  clearCachedRequests: vi.fn()
}));

vi.mock('@/services/api.js', () => ({
  getAnalogValues: vi.fn(() => Promise.resolve({analogs: []})),
  getReferenceValues: vi.fn(() => Promise.resolve({values: []})),
  getEntities: vi.fn(() => Promise.resolve({entities: []}))
}));

vi.mock('@/utils/apiNormalization.js', () => ({
  normalizeAnalogsResponse: vi.fn(d => d),
  normalizeEntitiesResponse: vi.fn(d => d),
  normalizeReferenceValues: vi.fn(d => d)
}));

vi.mock('@/components/modals/common/MethodConfigSelector.jsx', () => ({
  default: () => <div data-testid="method-config-selector">Selector</div>,
  useModalSelectionData: vi.fn(() => ({
    resolvedMethodId: 'method1',
    resolvedConfigId: 'config1',
    resolvedEntityId: 1
  }))
}));

vi.mock('@/components/modals/common/ExportMenu.jsx', () => ({
  default: () => <button data-testid="export-menu">Export</button>
}));

vi.mock('@/components/modals/charts/TimeSeriesChart.jsx', () => ({
  default: () => <div data-testid="timeseries-chart">Chart</div>
}));

describe('TimeSeriesModal', () => {
  const mockOnClose = vi.fn();

  it('renders without crashing when closed', () => {
    render(<TimeSeriesModal open={false} onClose={mockOnClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders without crashing when open', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);
    expect(screen.getByText('timeseries.title')).toBeInTheDocument();
  });

  it('includes close button', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('timeseries.close');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('timeseries.close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders method config selector', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('method-config-selector')).toBeInTheDocument();
  });

  it('renders export menu', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('export-menu')).toBeInTheDocument();
  });

  it('shows select station message when no entity selected', () => {
    const {usSelectedEntity} = require('@/contexts/ForecastsContext.jsx');
    render(<TimeSeriesModal open={true} onClose={mockOnClose} />);
    expect(screen.getByText('seriesModal.selectStation')).toBeInTheDocument();
  });
});

