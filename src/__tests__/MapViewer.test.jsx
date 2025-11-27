import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import React from 'react';

import { setupI18nMock } from './testUtils.js';
setupI18nMock();

// Provide mutable state holders so tests can change hook return values per-case
let ENTITIES = {
  entities: [],
  entitiesWorkspace: null,
  entitiesLoading: false,
  relevantEntities: [],
  entitiesKey: 'k'
};
let FORECAST_VALUES = { forecastValues: null, forecastValuesNorm: null, forecastLoading: false, forecastUnavailable: false };
let FORECAST_PARAMS = { percentile: 50, normalizationRef: undefined };
let SYNTHESIS = { selectedTargetDate: null };
let FORECAST_SESSION = { baseDateSearchFailed: false, clearBaseDateSearchFailed: () => {}, workspace: 'ws' };
let WORKSPACE = { workspace: 'ws' };
let RUNTIME_CONFIG = { ENTITIES_SOURCE_EPSG: 'EPSG:4326' };
let SNACK = { enqueueSnackbar: () => {} };

// vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }) }));

vi.mock('@/contexts/ForecastsContext.jsx', () => ({
  useEntities: () => ENTITIES,
  useForecastValues: () => FORECAST_VALUES,
  useForecastParameters: () => FORECAST_PARAMS,
  useSynthesis: () => SYNTHESIS,
  useSelectedEntity: () => ({ setSelectedEntityId: vi.fn() }),
  useForecastSession: () => FORECAST_SESSION
}));

vi.mock('@/contexts/WorkspaceContext.jsx', () => ({ useWorkspace: () => WORKSPACE }));
vi.mock('@/contexts/ConfigContext.jsx', () => ({ useConfig: () => RUNTIME_CONFIG }));
vi.mock('@/contexts/SnackbarContext.jsx', () => ({ useSnackbar: () => SNACK }));

// Mock map-related hooks to no-op or return simple refs
vi.mock('@/components/map/hooks/useMapInit.js', () => ({
  default: () => ({
    containerRef: { current: null },
    mapRef: { current: null },
    forecastLayerRef: { current: { getSource: () => ({ clear: () => {} }) } },
    overlayGroupRef: { current: null },
    layerSwitcherRef: { current: null },
    mapReady: true
  })
}));
vi.mock('@/components/map/hooks/useOverlayConfigLayers.js', () => ({ default: () => {} }));
vi.mock('@/components/map/hooks/useOverlayGlobalLayers.js', () => ({ default: () => {} }));
vi.mock('@/components/map/hooks/useForecastPoints.js', () => ({ default: () => {} }));
vi.mock('@/components/map/hooks/useMapInteractions.js', () => ({ default: () => {} }));
vi.mock('@/components/map/hooks/useProjectionRegistration.js', () => ({ default: () => ({ current: undefined }) }));
vi.mock('@/components/map/hooks/useDarkMode.js', () => ({ default: () => false }));

import MapViewer from '@/components/map/MapViewer.jsx';

describe('MapViewer smoke', () => {
  beforeEach(() => {
    // reset defaults
    ENTITIES = { entities: [], entitiesWorkspace: null, entitiesLoading: false, relevantEntities: [], entitiesKey: 'k' };
    FORECAST_VALUES = { forecastValues: null, forecastValuesNorm: null, forecastLoading: false, forecastUnavailable: false };
    FORECAST_PARAMS = { percentile: 50, normalizationRef: undefined };
    SYNTHESIS = { selectedTargetDate: null };
    FORECAST_SESSION = { baseDateSearchFailed: false, clearBaseDateSearchFailed: () => {}, workspace: 'ws' };
    WORKSPACE = { workspace: 'ws' };
    RUNTIME_CONFIG = { ENTITIES_SOURCE_EPSG: 'EPSG:4326' };
    SNACK = { enqueueSnackbar: () => {} };
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders and shows loading overlay when entitiesLoading is true', () => {
    ENTITIES.entitiesLoading = true;

    const {container} = render(<MapViewer />);
    const overlay = container.querySelector('.map-loading-overlay');
    expect(overlay).toBeTruthy();
  });

  it('shows no-forecast-available message when forecastUnavailable and selectedTargetDate present', () => {
    SYNTHESIS.selectedTargetDate = '2024-01-01';
    FORECAST_VALUES.forecastUnavailable = true;
    FORECAST_VALUES.forecastLoading = false;
    ENTITIES.entitiesLoading = false;

    render(<MapViewer />);
    // translation returns the key
    expect(screen.getByText('map.loading.noForecastAvailable')).toBeInTheDocument();
  });

  it('shows search failed overlay when baseDateSearchFailed is true', () => {
    FORECAST_SESSION.baseDateSearchFailed = true;
    FORECAST_VALUES.forecastLoading = false;
    ENTITIES.entitiesLoading = false;

    render(<MapViewer />);
    expect(screen.getByText('map.loading.noForecastFoundSearch')).toBeInTheDocument();
  });
});
