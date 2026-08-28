/**
 * @fileoverview Tests for useMethodConfigOptions.
 *
 * The option lists are chained: entities need a method and config, leads need an entity. These
 * assert that chaining directly, without rendering the four dropdowns that consume it.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';

vi.mock('@/contexts/ForecastSessionContext.jsx', () => ({
  useForecastSession: vi.fn(() => ({
    workspace: 'ws',
    activeForecastDate: '2025-01-01',
    forecastBaseDate: new Date('2025-01-01T00:00:00Z')
  }))
}));

vi.mock('@/services/api.js', () => ({
  getMethodsAndConfigs: vi.fn(() => Promise.resolve({
    methods: [{id: 'm1', name: 'Method 1', configurations: [{id: 'c1', name: 'Config 1'}]}]
  })),
  getEntities: vi.fn(() => Promise.resolve({entities: [{id: 2, name: 'Bravo'}, {id: 1, name: 'Alpha'}]})),
  getSeriesValuesPercentiles: vi.fn(() => Promise.resolve({
    parameters: {forecast_date: '2025-01-01T00:00:00Z'},
    target_dates: ['2025-01-02T00:00:00Z']
  })),
  getRelevantEntities: vi.fn(() => Promise.resolve({entities: [{id: 1}]}))
}));

import * as api from '@/services/api.js';
import {clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {useMethodConfigOptions} from '@/components/modals/hooks/useMethodConfigOptions.js';

const render = (value, open = true) =>
  renderHook(({v}) => useMethodConfigOptions({cachePrefix: 'test_', open, value: v}), {initialProps: {v: value}});

describe('useMethodConfigOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedRequests();
  });

  it('fetches nothing while the modal is closed', () => {
    render({methodId: 'm1', configId: 'c1', entityId: 1}, false);
    expect(api.getMethodsAndConfigs).not.toHaveBeenCalled();
    expect(api.getEntities).not.toHaveBeenCalled();
  });

  it('loads methods and resolves the first config when none is chosen', async () => {
    const {result} = render({methodId: 'm1', configId: null, entityId: null});

    await waitFor(() => expect(result.current.methodOptions.length).toBe(1), {timeout: 3000});
    expect(result.current.resolvedConfig).toBe('c1');
    expect(result.current.configsForSelectedMethod).toHaveLength(1);
  });

  it('does not request entities until a method is selected', async () => {
    const {result} = render({methodId: null, configId: null, entityId: null});

    await waitFor(() => expect(result.current.methodOptions.length).toBe(1), {timeout: 3000});
    expect(api.getEntities).not.toHaveBeenCalled();
    expect(result.current.stations).toEqual([]);
  });

  it('sorts the entities by name once a method and config are chosen', async () => {
    const {result} = render({methodId: 'm1', configId: 'c1', entityId: null});

    await waitFor(() => expect(result.current.stations.length).toBe(2), {timeout: 3000});
    expect(result.current.stations.map(s => s.name)).toEqual(['Alpha', 'Bravo']);
  });

  it('does not request leads until an entity is chosen', async () => {
    const {result} = render({methodId: 'm1', configId: 'c1', entityId: null});

    await waitFor(() => expect(result.current.stations.length).toBe(2), {timeout: 3000});
    expect(api.getSeriesValuesPercentiles).not.toHaveBeenCalled();
    expect(result.current.leads).toEqual([]);
  });

  it('derives lead hours from the forecast base date', async () => {
    const {result} = render({methodId: 'm1', configId: 'c1', entityId: 1});

    await waitFor(() => expect(result.current.leads.length).toBe(1), {timeout: 3000});
    expect(result.current.leads[0].lead).toBe(24);
  });

  it('exposes which configurations the entity is relevant to', async () => {
    const {result} = render({methodId: 'm1', configId: 'c1', entityId: 1});

    await waitFor(() => expect(result.current.relevantConfigIds.size).toBe(1), {timeout: 3000});
    expect(result.current.relevantConfigIds.get('c1')).toBe(true);
  });
});
