import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import React from 'react';

import MapViewer from '@/components/map/MapViewer.jsx';

// Like the shared i18n mock, but with one `t` for all renders, as react-i18next gives: MapViewer
// builds its layer error reporter from `t`, and the test checks that reporter stays the same.
vi.mock('react-i18next', async () => {
  const {useTranslation} = (await import('@/__tests__/testUtils.js')).i18nMockModule();
  const stable = useTranslation();
  return {useTranslation: () => stable};
});

// Provide mutable state holders so tests can change hook return values per-case
let ENTITIES = {
  entities: [],
  entitiesWorkspace: null,
  entitiesLoading: false,
  relevantEntities: [],
  entitiesKey: 'k'
};
let FORECAST_VALUES = {
  forecastValues: null,
  forecastValuesNorm: null,
  forecastLoading: false,
  forecastUnavailable: false
};
let FORECAST_PARAMS = {percentile: 50, normalizationRef: undefined};
let SYNTHESIS = {selectedTargetDate: null};
let FORECAST_SESSION = {
  baseDateSearchFailed: false, clearBaseDateSearchFailed: () => {
  }, workspace: 'ws'
};
let WORKSPACE = {workspace: 'ws'};
let RUNTIME_CONFIG = {ENTITIES_SOURCE_EPSG: 'EPSG:4326'};
let SNACK = {
  enqueueSnackbar: () => {
  }
};

// Arguments the map hooks last received from MapViewer, by hook name.
let HOOK_ARGS = {};

vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useEntities: () => ENTITIES,
  useForecastValues: () => FORECAST_VALUES,
  useForecastParameters: () => FORECAST_PARAMS,
  useSynthesis: () => SYNTHESIS,
  useSelectedEntity: () => ({setSelectedEntityId: vi.fn()}),
  useForecastSession: () => FORECAST_SESSION
}));

vi.mock('@/contexts/WorkspaceContext.jsx', () => ({useWorkspace: () => WORKSPACE}));
vi.mock('@/contexts/ConfigContext.jsx', () => ({useConfig: () => RUNTIME_CONFIG}));
vi.mock('@/contexts/SnackbarContext.jsx', () => ({useSnackbar: () => SNACK}));

// Mock map-related hooks to no-op or return simple refs
vi.mock('@/components/map/hooks/useMapInit.js', () => ({
  default: (args) => (HOOK_ARGS.useMapInit = args, {
    containerRef: {current: null},
    mapRef: {current: null},
    forecastLayerRef: {
      current: {
        getSource: () => ({
          clear: () => {
          }
        })
      }
    },
    overlayGroupRef: {current: null},
    layerSwitcherRef: {current: null},
    mapReady: true
  })
}));
vi.mock('@/components/map/hooks/useWorkspaceLayers.js', () => ({
  default: (args) => {
    HOOK_ARGS.useWorkspaceLayers = args;
  }
}));
vi.mock('@/components/map/hooks/useOverlayGlobalLayers.js', () => ({
  default: (args) => {
    HOOK_ARGS.useOverlayGlobalLayers = args;
  }
}));
vi.mock('@/components/map/hooks/useForecastPoints.js', () => ({
  default: () => {
  }
}));
vi.mock('@/components/map/hooks/useMapInteractions.js', () => ({
  default: () => {
  }
}));
vi.mock('@/components/map/hooks/useProjectionRegistration.js', () => ({default: () => ({current: undefined})}));
vi.mock('@/components/map/hooks/useDarkMode.js', () => ({default: () => false}));

describe('MapViewer smoke', () => {
  beforeEach(() => {
    // reset defaults
    ENTITIES = {entities: [], entitiesWorkspace: null, entitiesLoading: false, relevantEntities: [], entitiesKey: 'k'};
    FORECAST_VALUES = {
      forecastValues: null,
      forecastValuesNorm: null,
      forecastLoading: false,
      forecastUnavailable: false
    };
    FORECAST_PARAMS = {percentile: 50, normalizationRef: undefined};
    SYNTHESIS = {selectedTargetDate: null};
    FORECAST_SESSION = {
      baseDateSearchFailed: false, clearBaseDateSearchFailed: () => {
      }, workspace: 'ws'
    };
    WORKSPACE = {workspace: 'ws'};
    RUNTIME_CONFIG = {ENTITIES_SOURCE_EPSG: 'EPSG:4326'};
    SNACK = {
      enqueueSnackbar: () => {
      }
    };
    HOOK_ARGS = {};
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders and shows loading overlay when entitiesLoading is true', () => {
    ENTITIES.entitiesLoading = true;

    const {container} = render(<MapViewer/>);
    const overlay = container.querySelector('.map-loading-overlay');
    expect(overlay).toBeTruthy();
  });

  it('shows no-forecast-available message when forecastUnavailable and selectedTargetDate present', () => {
    SYNTHESIS.selectedTargetDate = '2024-01-01';
    FORECAST_VALUES.forecastUnavailable = true;
    FORECAST_VALUES.forecastLoading = false;
    ENTITIES.entitiesLoading = false;

    render(<MapViewer/>);
    // translation returns the key
    expect(screen.getByText('map.loading.noForecastAvailable')).toBeInTheDocument();
  });

  it('shows search failed overlay when baseDateSearchFailed is true', () => {
    FORECAST_SESSION.baseDateSearchFailed = true;
    FORECAST_VALUES.forecastLoading = false;
    ENTITIES.entitiesLoading = false;

    render(<MapViewer/>);
    expect(screen.getByText('map.loading.noForecastFoundSearch')).toBeInTheDocument();
  });

  describe('layer failures', () => {
    it('reports a layer failure from any map hook as a translated warning', () => {
      const enqueueSnackbar = vi.fn();
      SNACK = {enqueueSnackbar};
      render(<MapViewer/>);

      const report = HOOK_ARGS.useMapInit.reportLayerError;
      // One reporter shared by the three hooks that load layers.
      expect(HOOK_ARGS.useOverlayGlobalLayers.reportLayerError).toBe(report);
      expect(HOOK_ARGS.useWorkspaceLayers.reportLayerError).toBe(report);

      report('Vigilance Vigicrues', 'HTTP 502');
      // The i18n mock returns the key; the French text itself is checked in i18n.test.js.
      expect(enqueueSnackbar).toHaveBeenCalledExactlyOnceWith('map.layerLoadFailed', {variant: 'warning'});
    });

    it('keeps the same reporter across renders, so the map is not rebuilt', () => {
      // useMapInit lists it in its effect dependencies: a new function per render would tear the
      // map down and rebuild it, as every snackbar used to.
      const {rerender} = render(<MapViewer/>);
      const first = HOOK_ARGS.useMapInit.reportLayerError;
      rerender(<MapViewer/>);
      expect(HOOK_ARGS.useMapInit.reportLayerError).toBe(first);
    });
  });
});
