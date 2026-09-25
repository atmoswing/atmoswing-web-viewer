/**
 * @fileoverview Tests for useResolvedEntityConfig: which configuration the time series shows for
 * the selected entity when the user has not chosen one.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';

const {app, getRelevantEntities} = vi.hoisted(() => ({
  app: {methodConfig: null, entityId: null},
  getRelevantEntities: vi.fn()
}));

vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useSelectedEntity: () => ({selectedEntityId: app.entityId}),
  useMethods: () => ({selectedMethodConfig: app.methodConfig, methodConfigTree: TREE}),
  useForecastSession: () => ({workspace: 'ws', activeForecastDate: '2025-01-01'})
}));
vi.mock('@/services/api.js', () => ({getRelevantEntities}));
vi.mock('@/utils/normalize/entities.js', () => ({
  normalizeRelevantEntityIds: (r) => new Set((r?.entities ?? []).map(e => e.id))
}));

import {clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {useResolvedEntityConfig} from '@/components/modals/hooks/useResolvedEntityConfig.js';

const TREE = [{id: 'm1', children: [{id: 'north'}, {id: 'south'}]}];
// Entity 1 belongs to the northern configuration, entity 2 to the southern one.
const RELEVANT = {north: [{id: 1}], south: [{id: 2}]};

describe('useResolvedEntityConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedRequests();
    getRelevantEntities.mockImplementation((ws, date, m, c) => Promise.resolve({entities: RELEVANT[c]}));
    app.methodConfig = {method: {id: 'm1'}, config: null};
    app.entityId = 2;
  });

  it('resolves the configuration the entity is relevant to', async () => {
    const {result} = renderHook(() => useResolvedEntityConfig());

    await waitFor(() => expect(result.current.resolvedConfigId).toBe('south'));
    expect(result.current.resolvingConfig).toBe(false);
  });

  it('reports that it is resolving, and holds back the configuration until it knows', () => {
    const {result} = renderHook(() => useResolvedEntityConfig());

    expect(result.current.resolvedConfigId).toBeNull();
    expect(result.current.resolvingConfig).toBe(true);
  });

  it('keeps an explicit choice without asking for relevance', () => {
    app.methodConfig = {method: {id: 'm1'}, config: {id: 'north'}};
    const {result} = renderHook(() => useResolvedEntityConfig());

    expect(result.current.resolvedConfigId).toBe('north');
    expect(result.current.resolvingConfig).toBe(false);
    expect(getRelevantEntities).not.toHaveBeenCalled();
  });

  it('falls back to the first configuration when the entity is relevant to none', async () => {
    app.entityId = 99;
    const {result} = renderHook(() => useResolvedEntityConfig());

    await waitFor(() => expect(result.current.resolvedConfigId).toBe('north'));
  });

  it('resolves nothing without a method or an entity', () => {
    app.entityId = null;
    const {result, rerender} = renderHook(() => useResolvedEntityConfig());
    expect(result.current).toEqual({resolvedConfigId: null, resolvingConfig: false});

    app.entityId = 2;
    app.methodConfig = null;
    rerender();
    expect(result.current).toEqual({resolvedConfigId: null, resolvingConfig: false});
    expect(getRelevantEntities).not.toHaveBeenCalled();
  });

  it('follows the entity to its own configuration', async () => {
    const {result, rerender} = renderHook(() => useResolvedEntityConfig());
    await waitFor(() => expect(result.current.resolvedConfigId).toBe('south'));

    app.entityId = 1;
    rerender();

    await waitFor(() => expect(result.current.resolvedConfigId).toBe('north'));
    // The relevance lists do not depend on the entity, so they are not requested again.
    expect(getRelevantEntities).toHaveBeenCalledTimes(2); // one per configuration
  });
});
