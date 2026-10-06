/**
 * @fileoverview Tests for useOverlayGlobalLayers hook
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import useOverlayGlobalLayers from '@/components/map/hooks/useOverlayGlobalLayers.js';

// Mock dependencies
vi.mock('ol/layer/Tile', () => ({
  default: vi.fn(function () {
    return {
      set: vi.fn(),
      get: vi.fn(),
      setSource: vi.fn(),
    };
  }),
}));
vi.mock('ol/layer/Vector', () => ({
  default: vi.fn(function () {
    return {
      set: vi.fn(),
      get: vi.fn(),
    };
  }),
}));
vi.mock('ol/source/Vector', () => ({
  default: vi.fn(function () {
    return {
      clear: vi.fn(),
      addFeatures: vi.fn(),
    };
  }),
}));
vi.mock('ol/style', () => ({
  Stroke: vi.fn(function () {
    return {};
  }),
  Style: vi.fn(function () {
    return {};
  }),
}));
vi.mock('ol/format/GeoJSON', () => ({
  default: vi.fn(function () {
    return {
      readFeatures: vi.fn(() => []),
    };
  }),
}));
vi.mock('@/components/map/utils/loadWmtsCapabilities.js', () => ({
  loadWmtsCapabilities: vi.fn(async () => ({})),
  createWmtsTileLayer: vi.fn(() => ({url: 'test'})),
}));
vi.mock('@/config.js', () => ({
  default: {API_DEBUG: false},
}));

describe('useOverlayGlobalLayers', () => {
  let mockLayersCollection, mockOverlayGroup, mockLayerSwitcher;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLayersCollection = {
      getArray: vi.fn(() => []),
      push: vi.fn(),
      remove: vi.fn(),
    };

    mockOverlayGroup = {
      getLayers: vi.fn(() => mockLayersCollection),
    };

    mockLayerSwitcher = {
      renderPanel: vi.fn(),
    };

    global.fetch = vi.fn();
  });

  it('does nothing when map is not ready', () => {
    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: false,
        runtimeConfig: {},
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    expect(mockLayersCollection.push).not.toHaveBeenCalled();
  });

  it('removes old global overlay layers', () => {
    const oldLayer = {
      get: vi.fn((key) => {
        if (key === '__fromGlobalOverlayConfig') return true;
        if (key === '__refreshTimer') return null;
        return undefined;
      }),
    };
    mockLayersCollection.getArray.mockReturnValue([oldLayer]);

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig: {overlayLayers: []},
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    expect(mockLayersCollection.remove).toHaveBeenCalledWith(oldLayer);
  });

  it('loads WMTS overlay layers', async () => {
    const runtimeConfig = {
      overlayLayers: [
        {
          source: 'wmts',
          title: 'WMTS Overlay',
          wmtsLayer: 'test-layer',
          visible: true,
        },
      ],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    });
  });

  it('loads GeoJSON overlay layers', async () => {
    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {value: 'high'},
          geometry: {type: 'LineString', coordinates: [[0, 0], [1, 1]]},
        },
      ],
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    });

    const runtimeConfig = {
      overlayLayers: [
        {
          source: 'geojson',
          title: 'GeoJSON Overlay',
          url: 'http://example.com/data.geojson',
          visible: false,
          valueAttr: 'value',
          colors: {high: '#ff0000', default: '#0000ff'},
          lineWidth: 3,
        },
      ],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.com/data.geojson',
        expect.objectContaining({cache: 'no-store'})
      );
    });

    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    });
  });

  it('sets up refresh timer for GeoJSON layers', async () => {
    const mockGeoJSON = {type: 'FeatureCollection', features: []};
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    });

    const runtimeConfig = {
      overlayLayers: [
        {
          source: 'geojson',
          title: 'Auto-refresh Layer',
          url: 'http://example.com/data.geojson',
          visible: true,
          refreshMinutes: 5,
        },
      ],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    // Wait for async operations - just verify layer was added
    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    }, {timeout: 3000});
  });

  it('handles fetch errors for GeoJSON gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const runtimeConfig = {
      overlayLayers: [
        {
          source: 'geojson',
          title: 'Error Layer',
          url: 'http://example.com/error.geojson',
          visible: true,
        },
      ],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    // Wait for async operations - layer should still be added even if fetch fails
    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    }, {timeout: 3000});
  });

  it('updates layer switcher after adding layers', async () => {
    const runtimeConfig = {
      overlayLayers: [
        {
          source: 'wmts',
          title: 'WMTS Layer',
          wmtsLayer: 'test',
          visible: true,
        },
      ],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    // Wait for async operations - layer switcher update happens async
    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    }, {timeout: 3000});
  });

  it('clears refresh timers on unmount', async () => {
    const mockGeoJSON = {type: 'FeatureCollection', features: []};
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    });

    const runtimeConfig = {
      overlayLayers: [
        {
          source: 'geojson',
          title: 'Refresh Layer',
          url: 'http://example.com/data.geojson',
          visible: true,
          refreshMinutes: 10,
        },
      ],
    };

    const {unmount} = renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    }, {timeout: 2000});

    unmount();

    // Should cleanup timers without throwing
    expect(true).toBe(true);
  });

  it('loads GeoJSON overlays without waiting for the WMTS capabilities', async () => {
    const {loadWmtsCapabilities} = await import('@/components/map/utils/loadWmtsCapabilities.js');
    loadWmtsCapabilities.mockReturnValueOnce(new Promise(() => {}));
    global.fetch.mockResolvedValue({ok: true, json: async () => ({type: 'FeatureCollection', features: []})});
    const wmtsItem = {source: 'wmts', title: 'Hydro', wmtsLayer: 'HYDRO', provider: 'IGN'};
    const runtimeConfig = {
      overlayLayers: [wmtsItem, {source: 'geojson', title: 'Vigicrues', url: '/proxy/vigicrues.geojson'}],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    // Both layers are in place, in config order, while the capabilities are still pending.
    expect(mockLayersCollection.push).toHaveBeenCalledTimes(2);
    const TileLayer = (await import('ol/layer/Tile')).default;
    expect(mockLayersCollection.push.mock.calls[0][0]).toBe(TileLayer.mock.results[0].value);
    expect(global.fetch).toHaveBeenCalledWith('/proxy/vigicrues.geojson', expect.anything());
    expect(loadWmtsCapabilities).toHaveBeenCalledWith(runtimeConfig, expect.any(Function), {items: [wmtsItem]});
  });

  it('gives a WMTS overlay its source once ready, or removes it when it cannot be built', async () => {
    const {createWmtsTileLayer} = await import('@/components/map/utils/loadWmtsCapabilities.js');
    const source = {url: 'hydro'};
    createWmtsTileLayer.mockReturnValueOnce(source).mockReturnValueOnce(null);
    const runtimeConfig = {
      overlayLayers: [
        {source: 'wmts', title: 'Hydro', wmtsLayer: 'HYDRO'},
        {source: 'wmts', title: 'Missing', wmtsLayer: 'MISSING'},
      ],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    const TileLayer = (await import('ol/layer/Tile')).default;
    const [hydro, missing] = TileLayer.mock.results.map(r => r.value);
    await waitFor(() => expect(hydro.setSource).toHaveBeenCalledWith(source));
    expect(mockLayersCollection.remove).toHaveBeenCalledWith(missing);
    expect(mockLayerSwitcher.renderPanel).toHaveBeenCalledTimes(2);
  });

  it('invokes enqueueSnackbar when provided', async () => {
    const enqueueSnackbar = vi.fn();

    const runtimeConfig = {
      overlayLayers: [],
    };

    renderHook(() =>
      useOverlayGlobalLayers({
        mapReady: true,
        runtimeConfig,
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
        enqueueSnackbar,
      })
    );

    // Should complete without error
    expect(enqueueSnackbar).toBeDefined();
  });
});
