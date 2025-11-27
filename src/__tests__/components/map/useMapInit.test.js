// filepath: d:\Development\atmoswing-web-viewer\src\__tests__\components\map\hooks\useMapInit.test.js

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import useMapInit from '@/components/map/hooks/useMapInit.js';

// Inline i18n mock (mirrors setupI18nMock in testUtils.js)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts && opts.date ? String(opts.date) : k),
    i18n: {language: 'en'}
  })
}));

// Mock OpenLayers primitives used by the hook
vi.mock('ol/Map', () => ({
  default: vi.fn(function (opts) {
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
  default: vi.fn(function (opts) {
    return {setCenter: vi.fn(), setZoom: vi.fn()};
  })
}));
vi.mock('ol/layer/Tile', () => ({
  default: vi.fn(function (opts) {
    return {get: vi.fn((k) => opts && opts[k]), set: vi.fn()};
  })
}));
vi.mock('ol/layer/Group', () => ({
  default: vi.fn(function (opts) {
    return {getLayers: vi.fn(() => ({getArray: vi.fn(() => opts && opts.layers || [])})), get: vi.fn(), set: vi.fn()};
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
  default: vi.fn(function (opts) {
    return {renderPanel: vi.fn(), on: vi.fn()};
  })
}));

// Mock WMTS helpers used by the hook
vi.mock('@/components/map/utils/loadWmtsCapabilities.js', () => ({
  loadWmtsCapabilities: vi.fn(async () => ({})),
  createWmtsTileLayer: vi.fn(() => ({url: 'test'})),
}));

vi.mock('@/components/map/mapConstants.js', () => ({DEFAULT_PROJECTION: 'EPSG:3857'}));
vi.mock('@/config.js', () => ({default: {API_DEBUG: false}}));

describe('useMapInit (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when container is not set or runtimeConfig not loaded', () => {
    const t = (k) => k;
    const enqueueSnackbar = vi.fn();

    const {result, rerender} = renderHook((props) => useMapInit(props), {
      initialProps: {t, runtimeConfig: {}, enqueueSnackbar}
    });

    // containerRef is null by default, effect should early-return
    expect(result.current.mapRef.current).toBeNull();
    expect(result.current.mapReady).toBe(false);

    // Now set a container but keep runtimeConfig not loaded
    const div = document.createElement('div');
    result.current.containerRef.current = div;
    rerender({t, runtimeConfig: {}, enqueueSnackbar});

    // Still should not initialize because __workspacesLoaded is required
    expect(result.current.mapRef.current).toBeNull();
    expect(result.current.mapReady).toBe(false);
  });

  it('initializes map when container is present and runtimeConfig.__workspacesLoaded is true', async () => {
    const t = (k) => k;
    const enqueueSnackbar = vi.fn();

    // import mocked constructors so we can assert they were called
    const MapMock = (await import('ol/Map')).default;
    const LayerSwitcherMock = (await import('ol-layerswitcher')).default;

    const {result, rerender, unmount} = renderHook((props) => useMapInit(props), {
      initialProps: {t, runtimeConfig: {}, enqueueSnackbar}
    });

    // Set a container
    const div = document.createElement('div');
    // add size to avoid accidental layout issues
    Object.defineProperty(div, 'clientWidth', {get: () => 800});
    Object.defineProperty(div, 'clientHeight', {get: () => 600});

    result.current.containerRef.current = div;

    // Trigger initialization by providing runtimeConfig with __workspacesLoaded
    act(() => rerender({t, runtimeConfig: {__workspacesLoaded: true, baseLayers: []}, enqueueSnackbar}));

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
