/**
 * @fileoverview Tests for useMapInteractions hook
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import useMapInteractions from '@/components/map/hooks/useMapInteractions.js';

describe('useMapInteractions', () => {
  let mockMap, mockLayer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLayer = {current: {name: 'forecastLayer'}};

    mockMap = {
      on: vi.fn(),
      un: vi.fn(),
      forEachFeatureAtPixel: vi.fn(),
    };
  });

  it('does not set up handlers when map is not ready', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: false,
      })
    );

    expect(mockMap.on).not.toHaveBeenCalled();
  });

  it('sets up click handler when map is ready', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    expect(mockMap.on).toHaveBeenCalledWith('singleclick', expect.any(Function));
  });

  it('sets up pointer move and out handlers', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    expect(mockMap.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith('pointerout', expect.any(Function));
  });

  it('handles feature click and sets entity ID', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    const mockFeature = {
      getId: () => 123,
      get: vi.fn(),
    };

    mockMap.forEachFeatureAtPixel.mockImplementation((pixel, callback) => {
      return callback(mockFeature);
    });

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    // Get the click handler
    const clickHandler = mockMap.on.mock.calls.find(
      (call) => call[0] === 'singleclick'
    )?.[1];

    expect(clickHandler).toBeDefined();

    // Simulate click
    clickHandler({pixel: [100, 100]});

    expect(setSelectedEntityId).toHaveBeenCalledWith(123);
  });

  it('handles feature without getId method', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    const mockFeature = {
      get: vi.fn((key) => {
        if (key === 'id') return 456;
        return undefined;
      }),
    };

    mockMap.forEachFeatureAtPixel.mockImplementation((pixel, callback) => {
      return callback(mockFeature);
    });

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    const clickHandler = mockMap.on.mock.calls.find(
      (call) => call[0] === 'singleclick'
    )?.[1];

    clickHandler({pixel: [100, 100]});

    expect(setSelectedEntityId).toHaveBeenCalledWith(456);
  });

  it('shows tooltip on pointer move over feature', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    const mockFeature = {
      get: vi.fn((key) => {
        if (key === 'name') return 'Test Station';
        if (key === 'valueRaw') return 42.5;
        return undefined;
      }),
    };

    mockMap.forEachFeatureAtPixel.mockImplementation((pixel, callback) => {
      return callback(mockFeature);
    });

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    const moveHandler = mockMap.on.mock.calls.find(
      (call) => call[0] === 'pointermove'
    )?.[1];

    moveHandler({pixel: [100, 150]});

    expect(setTooltip).toHaveBeenCalledWith({
      x: 100,
      y: 150,
      name: 'Test Station',
      valueRaw: 42.5,
    });
  });

  it('clears tooltip on pointer move away from features', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    mockMap.forEachFeatureAtPixel.mockReturnValue(null);

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    const moveHandler = mockMap.on.mock.calls.find(
      (call) => call[0] === 'pointermove'
    )?.[1];

    moveHandler({pixel: [100, 150]});

    expect(setTooltip).toHaveBeenCalledWith(null);
  });

  it('clears tooltip on pointer out', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    const outHandler = mockMap.on.mock.calls.find(
      (call) => call[0] === 'pointerout'
    )?.[1];

    outHandler();

    expect(setTooltip).toHaveBeenCalledWith(null);
  });

  it('cleans up event handlers on unmount', () => {
    const setSelectedEntityId = vi.fn();
    const setTooltip = vi.fn();

    const {unmount} = renderHook(() =>
      useMapInteractions({
        mapRef: {current: mockMap},
        forecastLayerRef: mockLayer,
        setSelectedEntityId,
        setTooltip,
        mapReady: true,
      })
    );

    unmount();

    expect(mockMap.un).toHaveBeenCalledTimes(3); // singleclick, pointermove, pointerout
  });
});

