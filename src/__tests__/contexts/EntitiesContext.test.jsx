/**
 * @fileoverview Tests for EntitiesContext
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {EntitiesProvider, useEntities} from '@/contexts/EntitiesContext.jsx';
import {ForecastSessionProvider} from '@/contexts/ForecastSessionContext.jsx';
import {MethodsProvider} from '@/contexts/MethodsContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import * as api from '@/services/api.js';
import * as apiNormalization from '@/utils/apiNormalization.js';

// Mock dependencies
vi.mock('@/services/api.js');
vi.mock('@/utils/apiNormalization.js');
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));

describe('EntitiesContext', () => {
  const mockEntities = [
    {id: 1, name: 'Station 1', lat: 46.5, lon: 6.5},
    {id: 2, name: 'Station 2', lat: 47.0, lon: 7.0}
  ];

  const mockRelevantEntityIds = [1];

  const mockWorkspaceData = {
    __workspace: 'test',
    date: {last_forecast_date: '2024-01-01_12'},
    methodsAndConfigs: {
      methods: [{
        id: 'method1',
        name: 'Method 1',
        configs: [{id: 'config1', name: 'Config 1'}]
      }]
    }
  };

  const createWrapper = () => {
    return ({children}) => (
      <ConfigProvider>
        <WorkspaceProvider>
          <ForecastSessionProvider>
            <MethodsProvider>
              <EntitiesProvider>
                {children}
              </EntitiesProvider>
            </MethodsProvider>
          </ForecastSessionProvider>
        </WorkspaceProvider>
      </ConfigProvider>
    );
  };

  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({
        workspaces: [{key: 'test', name: 'Test'}],
        workspace_data: mockWorkspaceData
      })
    });

    // Mock API calls
    api.getEntities = vi.fn().mockResolvedValue({entities: mockEntities});
    api.getRelevantEntities = vi.fn().mockResolvedValue({relevant_entity_ids: mockRelevantEntityIds});
    api.getMethodsAndConfigs = vi.fn().mockResolvedValue(mockWorkspaceData.methodsAndConfigs);

    // Mock normalization
    apiNormalization.normalizeEntitiesResponse = vi.fn(resp => resp.entities || []);
    apiNormalization.normalizeRelevantEntityIds = vi.fn(resp => resp.relevant_entity_ids || null);
    apiNormalization.normalizeMethodsAndConfigs = vi.fn(data => data.methods || []);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides initial empty entities array', () => {
    const {result} = renderHook(() => useEntities(), {wrapper: createWrapper()});

    expect(result.current.entities).toEqual([]);
    expect(result.current.entitiesLoading).toBe(false);
    expect(result.current.entitiesError).toBe(null);
    expect(result.current.relevantEntities).toBe(null);
  });

  it('provides entity-related state and functions', () => {
    const {result} = renderHook(() => useEntities(), {wrapper: createWrapper()});

    expect(result.current).toHaveProperty('entities');
    expect(result.current).toHaveProperty('entitiesLoading');
    expect(result.current).toHaveProperty('entitiesError');
    expect(result.current).toHaveProperty('relevantEntities');
  });
});

