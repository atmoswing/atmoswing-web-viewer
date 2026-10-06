// filepath: d:\Development\atmoswing-web-viewer\src\__tests__\components\map\hooks\useMapInit.test.js

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import useMapInit from '@/components/map/hooks/useMapInit.js';

// Inline i18n mock (mirrors i18nMockModule in testUtils.js)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts && opts.date ? String(opts.date) : k),
    i18n: {language: 'en'}
  })
}));

// Mock OpenLayers primitives used by the hook
vi.mock('ol/Map', () => ({
  default: vi.fn(function (_opts) {
    return {
      addControl: vi.fn(),
      addLayer: vi.fn(),
      setTarget: vi.fn(),
      un: vi.fn(),
      on: vi.fn(),
      getLayers: vi.fn(() => ({getArray: vi.fn(() => [])})),
      __singleClickHandler: null,
    };
  }),
}));

vi.mock('ol/View', () => ({
  default: vi.fn(function (_opts) {
    return {setCenter: vi.fn(), setZoom: vi.fn()};
  })
}));
vi.mock('ol/layer/Tile', () => ({
  default: vi.fn(function (opts) {
    let visible = !!(opts && opts.visible);
    return {
      opts,
      get: vi.fn((k) => opts && opts[k]),
      set: vi.fn(),
      setSource: vi.fn(),
      getVisible: vi.fn(() => visible),
      setVisible: vi.fn((v) => {
        visible = v;
      })
    };
  })
}));
vi.mock('ol/layer/Group', () => ({
  default: vi.fn(function (opts) {
    const layers = (opts && opts.layers) || [];
    return {
      layers,
      getLayers: vi.fn(() => ({
        getArray: vi.fn(() => layers),
        remove: vi.fn((l) => layers.splice(layers.indexOf(l), 1))
      })),
      get: vi.fn(),
      set: vi.fn()
    };
  })
}));
vi.mock('ol/source/OSM', () => ({
  default: vi.fn(function () {
    return {};
  })
}));
vi.mock('ol/source/XYZ', () => ({
  default: vi.fn(function () {
    return {};
  })
}));
vi.mock('ol/layer/Vector', () => ({
  default: vi.fn(function (opts) {
    return {get: vi.fn((k) => (opts && opts[k])), set: vi.fn(), setStyle: vi.fn()};
  })
}));
vi.mock('ol/source/Vector', () => ({
  default: vi.fn(function () {
    return {addFeatures: vi.fn(), clear: vi.fn()};
  })
}));

// Mock layer switcher control
vi.mock('ol-layerswitcher', () => ({
  default: vi.fn(function (_opts) {
    return {renderPanel: vi.fn(), on: vi.fn()};
  })
}));

// Mock WMTS helpers used by the hook
vi.mock('@/components/map/utils/loadWmtsCapabilities.js', () => ({
  loadWmtsCapabilities: vi.fn(async () => ({})),
  createWmtsTileLayer: vi.fn(() => ({url: 'test'})),
  applyWmtsSource: vi.fn((layer, source) => layer.setSource(source)),
}));

vi.mock('@/components/map/mapConstants.js', () => ({DEFAULT_PROJECTION: 'EPSG:3857'}));
vi.mock('@/config.js', () => ({default: {API_DEBUG: false}}));

describe('useMapInit (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when container is not set or runtimeConfig not loaded', () => {
    const t = (k) => k;
    const reportLayerError = vi.fn();

    const {result, rerender} = renderHook((props) => useMapInit(props), {
      initialProps: {t, runtimeConfig: {}, reportLayerError}
    });

    // containerRef is null by default, effect should early-return
    expect(result.current.mapRef.current).toBeNull();
    expect(result.current.mapReady).toBe(false);

    // Now set a container but keep runtimeConfig not loaded
    const div = document.createElement('div');
    result.current.containerRef.current = div;
    rerender({t, runtimeConfig: {}, reportLayerError});

    // Still should not initialize because __workspacesLoaded is required
    expect(result.current.mapRef.current).toBeNull();
    expect(result.current.mapReady).toBe(false);
  });

  it('initializes map when container is present and runtimeConfig.__workspacesLoaded is true', async () => {
    const t = (k) => k;
    const reportLayerError = vi.fn();

    // import mocked constructors so we can assert they were called
    const MapMock = (await import('ol/Map')).default;
    const LayerSwitcherMock = (await import('ol-layerswitcher')).default;

    const {result, rerender, unmount} = renderHook((props) => useMapInit(props), {
      initialProps: {t, runtimeConfig: {}, reportLayerError}
    });

    // Set a container
    const div = document.createElement('div');
    // add size to avoid accidental layout issues
    Object.defineProperty(div, 'clientWidth', {get: () => 800});
    Object.defineProperty(div, 'clientHeight', {get: () => 600});

    result.current.containerRef.current = div;

    // Trigger initialization by providing runtimeConfig with __workspacesLoaded
    act(() => rerender({t, runtimeConfig: {__workspacesLoaded: true, baseLayers: []}, reportLayerError}));

    // Wait for async initialization to complete and mapReady to become true
    await waitFor(() => expect(result.current.mapReady).toBe(true));

    // Map constructor should have been called and a map instance assigned
    expect(MapMock).toHaveBeenCalled();
    expect(result.current.mapRef.current).not.toBeNull();

    // LayerSwitcher should have been created and added as control
    expect(LayerSwitcherMock).toHaveBeenCalled();
    expect(result.current.layerSwitcherRef.current).toBeDefined();

    // Now unmount and verify cleanup called setTarget(null)
    const mapInstance = result.current.mapRef.current;
    expect(mapInstance.setTarget).toBeDefined();

    unmount();

    // setTarget should have been called with null during cleanup
    expect(mapInstance.setTarget).toHaveBeenCalledWith(null);
  });
});

describe('useMapInit WMTS base layers', () => {
  const ignItem = {source: 'wmts', provider: 'IGN', wmtsLayer: 'PLAN', title: 'Plan IGN', visible: true};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const init = (runtimeConfig) => {
    const hook = renderHook((props) => useMapInit(props), {
      initialProps: {t: (k) => k, runtimeConfig: {}, reportLayerError: vi.fn()}
    });
    hook.result.current.containerRef.current = document.createElement('div');
    act(() => hook.rerender({t: (k) => k, runtimeConfig, reportLayerError: vi.fn()}));
    return hook;
  };
  const baseGroup = async () => (await import('ol/layer/Group')).default.mock.results[0].value;
  const titled = (group, title) => group.layers.find(l => l.opts.title === title);

  it('shows the map without waiting for the capabilities', async () => {
    const {loadWmtsCapabilities} = await import('@/components/map/utils/loadWmtsCapabilities.js');
    loadWmtsCapabilities.mockReturnValueOnce(new Promise(() => {}));

    const {result} = init({__workspacesLoaded: true, baseLayers: [ignItem]});

    expect(result.current.mapReady).toBe(true);
    const ign = titled(await baseGroup(), 'Plan IGN');
    expect(ign).toBeDefined();
    expect(ign.setSource).not.toHaveBeenCalled();
  });

  it('gives the layer its source once the capabilities arrive, asking only for base layers', async () => {
    const {loadWmtsCapabilities, createWmtsTileLayer} = await import('@/components/map/utils/loadWmtsCapabilities.js');
    const source = {url: 'ign'};
    createWmtsTileLayer.mockReturnValueOnce(source);

    init({__workspacesLoaded: true, baseLayers: [ignItem], overlayLayers: [{source: 'wmts', wmtsLayer: 'X'}]});

    const ign = titled(await baseGroup(), 'Plan IGN');
    await waitFor(() => expect(ign.setSource).toHaveBeenCalledWith(source));
    expect(loadWmtsCapabilities).toHaveBeenCalledWith(expect.anything(), expect.any(Function), {items: [ignItem]});
  });

  it('drops a layer that could not be built and falls back to OpenStreetMap', async () => {
    const {createWmtsTileLayer} = await import('@/components/map/utils/loadWmtsCapabilities.js');
    createWmtsTileLayer.mockReturnValueOnce(null);

    init({__workspacesLoaded: true, baseLayers: [ignItem]});

    const group = await baseGroup();
    const osm = titled(group, 'map.layers.osm');
    await waitFor(() => expect(osm.setVisible).toHaveBeenCalledWith(true));
    expect(titled(group, 'Plan IGN')).toBeUndefined();
  });

  it('does not request capabilities without WMTS base layers', async () => {
    const {loadWmtsCapabilities} = await import('@/components/map/utils/loadWmtsCapabilities.js');
    const {result} = init({__workspacesLoaded: true, baseLayers: []});
    expect(result.current.mapReady).toBe(true);
    expect(loadWmtsCapabilities).not.toHaveBeenCalled();
  });
});
