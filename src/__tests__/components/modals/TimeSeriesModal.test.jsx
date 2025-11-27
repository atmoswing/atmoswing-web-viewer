/**
 * @fileoverview Smoke tests for TimeSeriesModal
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// Call i18n setup early
import {setupI18nMock, setupUseCachedRequestMock} from '../../testUtils.js';
// Import after mocks
import TimeSeriesModal from '@/components/modals/TimeSeriesModal.jsx';

setupI18nMock();
setupUseCachedRequestMock();

// Mocks must be before component import
vi.mock('@/contexts/ForecastsContext.jsx', () => ({
  useSelectedEntity: vi.fn(() => ({
    selectedEntityId: 1,
    setSelectedEntityId: vi.fn()
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

vi.mock('@/services/api.js', () => ({
  getSeriesValuesPercentiles: vi.fn(() => Promise.resolve({})),
  getReferenceValues: vi.fn(() => Promise.resolve({})),
  getEntities: vi.fn(() => Promise.resolve({entities: []}))
}));

vi.mock('@/utils/apiNormalization.js', () => ({
  normalizeSeriesValuesPercentiles: vi.fn(d => d),
  normalizeEntitiesResponse: vi.fn(d => d),
  normalizeReferenceValues: vi.fn(d => d)
}));

vi.mock('@/components/modals/charts/TimeSeriesChart.jsx', () => ({
  default: () => <div data-testid="timeseries-chart">Chart</div>
}));

vi.mock('@/components/modals/common/ExportMenu.jsx', () => ({
  default: () => <button data-testid="export-menu">Export</button>
}));

describe('TimeSeriesModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when closed', () => {
    const {container} = render(<TimeSeriesModal open={false} onClose={mockOnClose}/>);
    expect(container).toBeInTheDocument();
  });

  it('renders without crashing when open', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose}/>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('includes close button', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose}/>);
    const closeButton = screen.getByLabelText('seriesModal.close');
    expect(closeButton).toBeInTheDocument();
  });

  it('renders dialog with controls', () => {
    render(<TimeSeriesModal open={true} onClose={mockOnClose}/>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });
});
