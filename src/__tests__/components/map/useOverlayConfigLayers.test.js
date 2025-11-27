// filepath: d:\Development\atmoswing-web-viewer\src\__tests__\hooks\useOverlayConfigLayers.test.js

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import useOverlayConfigLayers from '@/components/map/hooks/useOverlayConfigLayers.js';

// Mock OpenLayers Vector layer constructor to store/get keys and allow setStyle
vi.mock('ol/layer/Vector', () => ({
  default: vi.fn(function (options) {
    const store = {...(options || {})};
    return {
      set: (k, v) => {
        store[k] = v;
      },
      get: (k) => store[k],
      setStyle: vi.fn((s) => {
        store._style = s;
      }),
    };
  }),
}));

// Mock Vector source
vi.mock('ol/source/Vector', () => ({
  default: vi.fn(function () {
    return {
      addFeatures: vi.fn(),
      clear: vi.fn(),
    };
  }),
}));

// Minimal style / format mocks
vi.mock('ol/style', () => ({
  Circle: vi.fn(),
  Fill: vi.fn(),
  Stroke: vi.fn(),
  Style: vi.fn(() => ({})),
}));
vi.mock('ol/format/GeoJSON', () => ({
  default: vi.fn(function () {
    return {
      readFeatures: vi.fn(() => []),
    };
  }),
}));

// Mock shpjs to resolve to a simple geojson
vi.mock('shpjs', () => ({
  default: vi.fn((url) => Promise.resolve({type: 'FeatureCollection', features: []})),
}));

// Mock projection/style utils
vi.mock('@/components/map/utils/olProjectionUtils.js', () => ({
  ensureProjDefined: vi.fn(),
}));
vi.mock('@/components/map/utils/olStyleUtils.js', () => ({
  resolveOverlayStyle: vi.fn((item, fallback) => Promise.resolve(fallback)),
}));

vi.mock('@/config.js', () => ({default: {API_DEBUG: false}}));

describe('useOverlayConfigLayers (smoke)', () => {
  let mockLayersCollection, mockOverlayGroup, mockLayerSwitcher;
  let originalFetch;
  let originalAbortController;

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

    mockLayerSwitcher = {renderPanel: vi.fn()};

    // Save/replace global.fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    // Mock AbortController so we can assert abort() was called on cleanup
    originalAbortController = global.AbortController;
    global.__abortSpy = vi.fn();
    global.AbortController = function () {
      this.signal = {};
      this.abort = global.__abortSpy;
    };
  });

  afterEach(() => {
    // restore
    global.fetch = originalFetch;
    global.AbortController = originalAbortController;
    delete global.__abortSpy;
  });

  it('does nothing when map is not ready', () => {
    renderHook(() =>
      useOverlayConfigLayers({
        mapReady: false,
        runtimeConfig: {},
        workspace: 'demo',
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    expect(mockLayersCollection.push).not.toHaveBeenCalled();
  });

  it('removes old workspace overlay layers', () => {
    const oldLayer = {
      get: vi.fn((k) => (k === '__fromWorkspaceConfig' ? true : null)),
    };
    mockLayersCollection.getArray.mockReturnValue([oldLayer]);

    renderHook(() =>
      useOverlayConfigLayers({
        mapReady: true,
        runtimeConfig: {workspaces: [{key: 'demo', shapefiles: []}]},
        workspace: 'demo',
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    expect(mockLayersCollection.remove).toHaveBeenCalledWith(oldLayer);
  });

  it('loads GeoJSON shapefile overlay', async () => {
    const url = 'http://example.com/overlay.geojson';
    const mockGeoJSON = {type: 'FeatureCollection', features: []};
    global.fetch.mockResolvedValue({ok: true, json: async () => mockGeoJSON});

    const runtimeConfig = {workspaces: [{key: 'demo', shapefiles: [{name: 'Test', url, display: true}]}]};

    renderHook(() =>
      useOverlayConfigLayers({
        mapReady: true,
        runtimeConfig,
        workspace: 'demo',
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({cache: 'no-store'}));
    });

    await waitFor(() => {
      expect(mockLayersCollection.push).toHaveBeenCalled();
    });
  }, {timeout: 3000});

  it('loads Shapefile (.zip/.shp) overlay via shpjs', async () => {
    const url = 'http://example.com/data.zip';
    const runtimeConfig = {workspaces: [{key: 'demo', shapefiles: [{name: 'Zipped', url, display: true}]}]};

    // import the mocked shp to assert it gets called
    const shp = await import('shpjs');

    renderHook(() =>
      useOverlayConfigLayers({
        mapReady: true,
        runtimeConfig,
        workspace: 'demo',
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    await waitFor(() => {
      expect(shp.default).toHaveBeenCalledWith(url);
      expect(mockLayersCollection.push).toHaveBeenCalled();
    }, {timeout: 3000});
  });

  it('attaches AbortController and aborts on unmount', async () => {
    const url = 'http://example.com/overlay.geojson';
    const mockGeoJSON = {type: 'FeatureCollection', features: []};
    global.fetch.mockResolvedValue({ok: true, json: async () => mockGeoJSON});

    const runtimeConfig = {workspaces: [{key: 'demo', shapefiles: [{name: 'AbortTest', url, display: true}]}]};

    const {unmount} = renderHook(() =>
      useOverlayConfigLayers({
        mapReady: true,
        runtimeConfig,
        workspace: 'demo',
        overlayGroupRef: {current: mockOverlayGroup},
        layerSwitcherRef: {current: mockLayerSwitcher},
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockLayersCollection.push).toHaveBeenCalled();
    }, {timeout: 3000});

    // unmount should trigger cleanup and abort any attached controllers
    unmount();

    expect(global.__abortSpy).toHaveBeenCalled();
  });
});

