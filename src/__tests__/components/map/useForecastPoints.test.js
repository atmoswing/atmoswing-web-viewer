/**
 * @fileoverview Tests for useForecastPoints hook
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import useForecastPoints from '@/components/map/hooks/useForecastPoints.js';
import proj4 from 'proj4';

// Mock dependencies
vi.mock('proj4');
vi.mock('ol/Feature');
vi.mock('ol/geom/Point');
vi.mock('ol/style');
vi.mock('ol/proj', () => ({
  transform: vi.fn((coord) => coord),
}));
vi.mock('@/utils/colorUtils.js', () => ({
  valueToColor: vi.fn(() => [255, 0, 0]),
}));
vi.mock('@/config.js', () => ({
  default: {API_DEBUG: false},
}));
vi.mock('@/components/map/utils/buildLegendStops.js', () => ({
  buildLegendStops: vi.fn(() => []),
}));

describe('useForecastPoints', () => {
  let mockSource, mockLayer, mockView, mockMap;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSource = {
      clear: vi.fn(),
      addFeature: vi.fn(),
    };

    mockLayer = {
      getSource: vi.fn(() => mockSource),
    };

    mockView = {
      fit: vi.fn(),
    };

    mockMap = {
      getView: vi.fn(() => mockView),
    };

    proj4.defs = {'EPSG:4326': true};
  });

  it('does not render when map is not ready', () => {
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    renderHook(() =>
      useForecastPoints({
        ENTITIES_SOURCE_EPSG: 'EPSG:4326',
        mapReady: false,
        entities: [],
        entitiesWorkspace: 'test',
        entitiesKey: 'key1',
        relevantEntities: new Set(),
        workspace: 'test',
        forecastValuesNorm: {},
        forecastValues: {},
        forecastUnavailable: false,
        forecastLayerRef: {current: mockLayer},
        mapRef: {current: mockMap},
        setLegendStops,
        setLegendMax,
      })
    );

    expect(mockSource.clear).not.toHaveBeenCalled();
  });

  it('clears layer when forecast is unavailable', () => {
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    renderHook(() =>
      useForecastPoints({
        ENTITIES_SOURCE_EPSG: 'EPSG:4326',
        mapReady: true,
        entities: [],
        entitiesWorkspace: 'test',
        entitiesKey: 'key1',
        relevantEntities: new Set(),
        workspace: 'test',
        forecastValuesNorm: {},
        forecastValues: {},
        forecastUnavailable: true,
        forecastLayerRef: {current: mockLayer},
        mapRef: {current: mockMap},
        setLegendStops,
        setLegendMax,
      })
    );

    expect(mockSource.clear).toHaveBeenCalled();
    expect(setLegendStops).toHaveBeenCalledWith([]);
  });

  it('does not render when projection is not defined', () => {
    proj4.defs = {};
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    renderHook(() =>
      useForecastPoints({
        ENTITIES_SOURCE_EPSG: 'EPSG:2154',
        mapReady: true,
        entities: [{id: 1, x: 0, y: 0}],
        entitiesWorkspace: 'test',
        entitiesKey: 'key1',
        relevantEntities: new Set([1]),
        workspace: 'test',
        forecastValuesNorm: {1: 0.5},
        forecastValues: {1: 10},
        forecastUnavailable: false,
        forecastLayerRef: {current: mockLayer},
        mapRef: {current: mockMap},
        setLegendStops,
        setLegendMax,
      })
    );

    expect(mockSource.addFeature).not.toHaveBeenCalled();
  });

  it('renders entities as map features', () => {
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    const entities = [
      {id: 1, x: 0, y: 0, name: 'Station 1'},
      {id: 2, x: 1, y: 1, name: 'Station 2'},
    ];

    renderHook(() =>
      useForecastPoints({
        ENTITIES_SOURCE_EPSG: 'EPSG:4326',
        mapReady: true,
        entities,
        entitiesWorkspace: 'test',
        entitiesKey: 'key1',
        relevantEntities: new Set([1, 2]),
        workspace: 'test',
        forecastValuesNorm: {1: 0.5, 2: 0.8},
        forecastValues: {1: 10, 2: 20},
        forecastUnavailable: false,
        forecastLayerRef: {current: mockLayer},
        mapRef: {current: mockMap},
        setLegendStops,
        setLegendMax,
      })
    );

    expect(mockSource.clear).toHaveBeenCalled();
    expect(setLegendMax).toHaveBeenCalledWith(1);
    expect(setLegendStops).toHaveBeenCalled();
    expect(mockSource.addFeature).toHaveBeenCalledTimes(2);
  });

  it('clears layer when entities key changes', () => {
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    const {rerender} = renderHook(
      ({entitiesKey}) =>
        useForecastPoints({
          ENTITIES_SOURCE_EPSG: 'EPSG:4326',
          mapReady: true,
          entities: [{id: 1, x: 0, y: 0}],
          entitiesWorkspace: 'test',
          entitiesKey,
          relevantEntities: new Set([1]),
          workspace: 'test',
          forecastValuesNorm: {1: 0.5},
          forecastValues: {1: 10},
          forecastUnavailable: false,
          forecastLayerRef: {current: mockLayer},
          mapRef: {current: mockMap},
          setLegendStops,
          setLegendMax,
        }),
      {initialProps: {entitiesKey: 'key1'}}
    );

    mockSource.clear.mockClear();

    rerender({entitiesKey: 'key2'});

    expect(mockSource.clear).toHaveBeenCalled();
  });

  it('fits map extent to entities on first render for workspace', () => {
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    const entities = [
      {id: 1, x: 0, y: 0, name: 'Station 1'},
      {id: 2, x: 10, y: 10, name: 'Station 2'},
    ];

    renderHook(() =>
      useForecastPoints({
        ENTITIES_SOURCE_EPSG: 'EPSG:4326',
        mapReady: true,
        entities,
        entitiesWorkspace: 'test',
        entitiesKey: 'key1',
        relevantEntities: new Set([1, 2]),
        workspace: 'test',
        forecastValuesNorm: {1: 0.5, 2: 0.8},
        forecastValues: {1: 10, 2: 20},
        forecastUnavailable: false,
        forecastLayerRef: {current: mockLayer},
        mapRef: {current: mockMap},
        setLegendStops,
        setLegendMax,
      })
    );

    expect(mockView.fit).toHaveBeenCalled();
  });

  it('handles entities with missing forecast values', () => {
    const setLegendStops = vi.fn();
    const setLegendMax = vi.fn();

    const entities = [
      {id: 1, x: 0, y: 0, name: 'Station 1'},
      {id: 2, x: 1, y: 1, name: 'Station 2'},
    ];

    renderHook(() =>
      useForecastPoints({
        ENTITIES_SOURCE_EPSG: 'EPSG:4326',
        mapReady: true,
        entities,
        entitiesWorkspace: 'test',
        entitiesKey: 'key1',
        relevantEntities: new Set([1]),
        workspace: 'test',
        forecastValuesNorm: {1: 0.5},
        forecastValues: null,
        forecastUnavailable: false,
        forecastLayerRef: {current: mockLayer},
        mapRef: {current: mockMap},
        setLegendStops,
        setLegendMax,
      })
    );

    expect(mockSource.addFeature).toHaveBeenCalledTimes(2);
  });
});

