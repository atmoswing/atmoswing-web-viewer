/**
 * @fileoverview Tests for ForecastValuesContext
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {ForecastValuesProvider, useForecastValues} from '@/contexts/ForecastValuesContext.jsx';
import {ForecastSessionProvider} from '@/contexts/ForecastSessionContext.jsx';
import {MethodsProvider} from '@/contexts/MethodsContext.jsx';
import {SynthesisProvider} from '@/contexts/SynthesisContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import {
  getAggregatedEntitiesValues,
  getEntitiesValuesPercentile,
  getLastForecastDate,
  getMethodsAndConfigs,
  getSynthesisTotal
} from '@/services/api.js';

// Mock dependencies
vi.mock('@/services/api.js', () => ({
  getLastForecastDate: vi.fn(),
  getMethodsAndConfigs: vi.fn(),
  getSynthesisTotal: vi.fn(),
  getEntitiesValuesPercentile: vi.fn(),
  getAggregatedEntitiesValues: vi.fn()
}));
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));

describe('ForecastValuesContext', () => {
  const mockWorkspaceData = {
    __workspace: 'test',
    date: {last_forecast_date: '2024-01-01_12'},
    methodsAndConfigs: {methods: []}
  };

  const createWrapper = () => ({children}) => (
    <ConfigProvider>
      <WorkspaceProvider>
        <ForecastSessionProvider>
          <SynthesisProvider>
            <MethodsProvider>
              <ForecastValuesProvider>{children}</ForecastValuesProvider>
            </MethodsProvider>
          </SynthesisProvider>
        </ForecastSessionProvider>
      </WorkspaceProvider>
    </ConfigProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({
        workspaces: [{key: 'test', name: 'Test'}],
        workspace_data: mockWorkspaceData
      })
    }));

    getLastForecastDate.mockResolvedValue({last_forecast_date: '2024-01-01_12'});
    getMethodsAndConfigs.mockResolvedValue(mockWorkspaceData.methodsAndConfigs);
    getSynthesisTotal.mockResolvedValue({series_percentiles: []});
    getEntitiesValuesPercentile.mockResolvedValue({});
    getAggregatedEntitiesValues.mockResolvedValue({});
  });

  it('initializes forecast values state structure', () => {
    const {result} = renderHook(() => useForecastValues(), {wrapper: createWrapper()});
    expect(result.current.forecastValues).toEqual({});
    expect(result.current.forecastValuesNorm).toEqual({});
    expect(typeof result.current.forecastLoading).toBe('boolean');
    expect(result.current.forecastError === null || result.current.forecastError instanceof Error).toBe(true);
    expect(typeof result.current.forecastUnavailable).toBe('boolean');
  });

  it('exposes normalized and raw value objects', () => {
    const {result} = renderHook(() => useForecastValues(), {wrapper: createWrapper()});
    expect(typeof result.current.forecastValues).toBe('object');
    expect(typeof result.current.forecastValuesNorm).toBe('object');
  });

  it('exposes loading and unavailable flags', () => {
    const {result} = renderHook(() => useForecastValues(), {wrapper: createWrapper()});
    expect(typeof result.current.forecastLoading).toBe('boolean');
    expect(typeof result.current.forecastUnavailable).toBe('boolean');
  });

  it('exposes error state', () => {
    const {result} = renderHook(() => useForecastValues(), {wrapper: createWrapper()});
    expect(result.current.forecastError === null || result.current.forecastError instanceof Error).toBe(true);
  });
});
