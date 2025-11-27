/**
 * @fileoverview Smoke tests for Panel components
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {setupI18nMock} from '../../testUtils.js';
import PanelForecasts from '@/components/panels/PanelForecasts.jsx';
import PanelStations from '@/components/panels/PanelStations.jsx';
import PanelSynthesis from '@/components/panels/PanelSynthesis.jsx';

// Call i18n setup before importing components
setupI18nMock();

// Mock contexts
vi.mock('@/contexts/ForecastsContext.jsx', () => ({
  useMethods: vi.fn(() => ({
    methodConfigTree: [
      {
        id: 'method1',
        name: 'Method 1',
        children: [
          {id: 'config1', name: 'Config 1'},
          {id: 'config2', name: 'Config 2'}
        ]
      }
    ],
    selectedMethodConfig: {method: null, config: null},
    setSelectedMethodConfig: vi.fn(),
    methodsLoading: false,
    methodsError: null
  })),
  useEntities: vi.fn(() => ({
    entities: [
      {id: 1, name: 'Station A'},
      {id: 2, name: 'Station B'}
    ],
    entitiesLoading: false,
    entitiesError: null
  })),
  useSelectedEntity: vi.fn(() => ({
    selectedEntityId: null,
    setSelectedEntityId: vi.fn()
  })),
  useSynthesis: vi.fn(() => ({
    synthesis: [],
    perMethodSynthesis: [],
    synthesisLoading: false,
    synthesisError: null,
    selectedTargetDate: null,
    setSelectedTargetDate: vi.fn(),
    selectTargetDate: vi.fn(),
    selectedMethodId: null,
    setSelectedMethodId: vi.fn(),
    dailyLeads: []
  }))
}));

vi.mock('@/components/panels/Panel.jsx', () => ({
  default: ({children, title, defaultOpen}) => (
    <div data-testid="panel">
      <div data-testid="panel-title">{title}</div>
      <div>{children}</div>
    </div>
  )
}));

vi.mock('@/components/panels/PanelStatus.jsx', () => ({
  default: ({loading, error, empty}) => {
    if (loading) return <div data-testid="panel-status-loading">Loading...</div>;
    if (error) return <div data-testid="panel-status-error">{error}</div>;
    if (empty) return <div data-testid="panel-status-empty">{empty}</div>;
    return null;
  }
}));

describe('PanelForecasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PanelForecasts/>);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('renders tree view with methods', () => {
    render(<PanelForecasts/>);
    expect(screen.getByText('Method 1')).toBeInTheDocument();
  });

  it('handles defaultOpen prop', () => {
    render(<PanelForecasts defaultOpen={true}/>);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});

describe('PanelStations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PanelStations/>);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('renders station dropdown', () => {
    render(<PanelStations/>);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays available stations', async () => {
    const user = userEvent.setup();
    render(<PanelStations/>);

    const select = screen.getByRole('combobox');
    await user.click(select);

    expect(screen.getByText('Station A')).toBeInTheDocument();
    expect(screen.getByText('Station B')).toBeInTheDocument();
  });
});

describe('PanelSynthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PanelSynthesis/>);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('handles defaultOpen prop', () => {
    render(<PanelSynthesis defaultOpen={false}/>);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});
