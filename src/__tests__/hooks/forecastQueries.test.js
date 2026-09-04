/**
 * @fileoverview Tests for the shared forecast query hooks.
 *
 * The point of this module is that separate consumers land on one cache entry, so the tests
 * assert the keys directly and then prove a second consumer of the same selection does not
 * re-request. Consumer-specific key prefixes used to make that impossible.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';

const {getMethodsAndConfigs, getEntities, getReferenceValues} = vi.hoisted(() => ({
  getMethodsAndConfigs: vi.fn(),
  getEntities: vi.fn(),
  getReferenceValues: vi.fn()
}));

vi.mock('@/services/api.js', () => ({getMethodsAndConfigs, getEntities, getReferenceValues}));
vi.mock('@/utils/apiNormalization.js', () => ({
  normalizeEntitiesResponse: (r) => r?.entities ?? [],
  normalizeReferenceValues: (r) => r?.values ?? null
}));

import {clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {
  entitiesKey,
  methodsAndConfigsKey,
  referenceValuesKey,
  useEntitiesList,
  useMethodsAndConfigs,
  useReferenceValues
} from '@/hooks/forecastQueries.js';

const WS = 'rhone';
const DATE = '2025-01-01T06:00';

describe('forecast query cache keys', () => {
  it('build a stable key per resource', () => {
    expect(methodsAndConfigsKey(WS, DATE)).toBe('methods|rhone|2025-01-01T06:00');
    expect(entitiesKey(WS, DATE, 'm1', 'c1')).toBe('entities|rhone|2025-01-01T06:00|m1|c1');
    expect(referenceValuesKey(WS, DATE, 'm1', 'c1', 42))
      .toBe('reference|rhone|2025-01-01T06:00|m1|c1|42');
  });

  it('return null when any part of the selection is missing', () => {
    expect(methodsAndConfigsKey(null, DATE)).toBeNull();
    expect(methodsAndConfigsKey(WS, null)).toBeNull();
    expect(entitiesKey(WS, DATE, 'm1', null)).toBeNull();
    expect(referenceValuesKey(WS, DATE, 'm1', 'c1', null)).toBeNull();
  });

  it('treats entity id 0 as a real selection', () => {
    // A falsy-but-valid id must not disable the request.
    expect(referenceValuesKey(WS, DATE, 'm1', 'c1', 0))
      .toBe('reference|rhone|2025-01-01T06:00|m1|c1|0');
  });
});

describe('forecast query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedRequests();
  });

  it('useMethodsAndConfigs serves a second consumer from cache', async () => {
    getMethodsAndConfigs.mockResolvedValue({methods: [{id: 'm1'}]});

    const first = renderHook(() => useMethodsAndConfigs(WS, DATE));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.data).toEqual({methods: [{id: 'm1'}]});
    expect(getMethodsAndConfigs).toHaveBeenCalledTimes(1);

    // A different part of the app asking for the same workspace/date must not re-request:
    // this is exactly what the per-consumer key prefixes used to prevent.
    const second = renderHook(() => useMethodsAndConfigs(WS, DATE));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.data).toEqual({methods: [{id: 'm1'}]});
    expect(getMethodsAndConfigs).toHaveBeenCalledTimes(1);
  });

  it('useEntitiesList shares one entry across consumers and exposes its key', async () => {
    getEntities.mockResolvedValue({entities: [{id: 1, name: 'A'}]});

    const first = renderHook(() => useEntitiesList(WS, DATE, 'm1', 'c1'));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.data).toEqual([{id: 1, name: 'A'}]);
    expect(first.result.current.key).toBe('entities|rhone|2025-01-01T06:00|m1|c1');

    const second = renderHook(() => useEntitiesList(WS, DATE, 'm1', 'c1'));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(getEntities).toHaveBeenCalledTimes(1);
  });

  it('useReferenceValues is shared between the two modals that request it', async () => {
    getReferenceValues.mockResolvedValue({values: {10: 50}});

    const series = renderHook(() => useReferenceValues(WS, DATE, 'm1', 'c1', 42));
    await waitFor(() => expect(series.result.current.loading).toBe(false));
    expect(series.result.current.data).toEqual({10: 50});

    const distribution = renderHook(() => useReferenceValues(WS, DATE, 'm1', 'c1', 42));
    await waitFor(() => expect(distribution.result.current.loading).toBe(false));
    expect(getReferenceValues).toHaveBeenCalledTimes(1);
  });

  it('a different selection is a different entry', async () => {
    getEntities.mockResolvedValue({entities: []});

    const a = renderHook(() => useEntitiesList(WS, DATE, 'm1', 'c1'));
    await waitFor(() => expect(a.result.current.loading).toBe(false));

    const b = renderHook(() => useEntitiesList(WS, DATE, 'm1', 'c2'));
    await waitFor(() => expect(b.result.current.loading).toBe(false));

    expect(getEntities).toHaveBeenCalledTimes(2);
  });

  it('requests nothing while disabled', async () => {
    const {result} = renderHook(() => useMethodsAndConfigs(WS, DATE, {enabled: false}));
    expect(result.current.key).toBeNull();
    expect(result.current.data).toBeNull();
    expect(getMethodsAndConfigs).not.toHaveBeenCalled();
  });
});
