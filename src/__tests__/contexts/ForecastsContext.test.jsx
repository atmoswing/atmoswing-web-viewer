/**
 * @fileoverview Tests for ForecastsContext composite provider
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, renderHook, screen} from '@testing-library/react';
import {
  ForecastsProvider,
  useEntities,
  useForecastParameters,
  useForecastSession,
  useForecastValues,
  useMethods,
  useSelectedEntity,
  useSynthesis
} from '@/contexts/ForecastsContext.jsx';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import * as api from '@/services/api.js';

// Mock dependencies
vi.mock('@/services/api.js');
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));

describe('ForecastsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          workspaces: [{key: 'test', name: 'Test'}],
          workspace_data: {
            __workspace: 'test',
            date: {last_forecast_date: '2024-01-01_12'},
            methodsAndConfigs: {methods: []}
          }
        })
      })
    );

    // Mock API calls
    api.getMethodsAndConfigs = vi.fn().mockResolvedValue({methods: []});
    api.getSynthesisTotal = vi.fn().mockResolvedValue({series_percentiles: []});
    api.getEntities = vi.fn().mockResolvedValue({entities: []});
  });

  it('renders children without crashing', () => {
    render(
      <ConfigProvider>
        <WorkspaceProvider>
          <ForecastsProvider>
            <div>Test Child</div>
          </ForecastsProvider>
        </WorkspaceProvider>
      </ConfigProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provides all forecast contexts', () => {
    const wrapper = ({children}) => (
      <ConfigProvider>
        <WorkspaceProvider>
          <ForecastsProvider>
            {children}
          </ForecastsProvider>
        </WorkspaceProvider>
      </ConfigProvider>
    );

    const {result: methodsResult} = renderHook(() => useMethods(), {wrapper});
    const {result: entitiesResult} = renderHook(() => useEntities(), {wrapper});
    const {result: synthesisResult} = renderHook(() => useSynthesis(), {wrapper});
    const {result: valuesResult} = renderHook(() => useForecastValues(), {wrapper});
    const {result: paramsResult} = renderHook(() => useForecastParameters(), {wrapper});
    const {result: sessionResult} = renderHook(() => useForecastSession(), {wrapper});
    const {result: entityResult} = renderHook(() => useSelectedEntity(), {wrapper});

    expect(methodsResult.current).toBeDefined();
    expect(entitiesResult.current).toBeDefined();
    expect(synthesisResult.current).toBeDefined();
    expect(valuesResult.current).toBeDefined();
    expect(paramsResult.current).toBeDefined();
    expect(sessionResult.current).toBeDefined();
    expect(entityResult.current).toBeDefined();
  });

  it('useForecastParameters provides percentile and normalization', () => {
    const wrapper = ({children}) => (
      <ConfigProvider>
        <WorkspaceProvider>
          <ForecastsProvider>
            {children}
          </ForecastsProvider>
        </WorkspaceProvider>
      </ConfigProvider>
    );

    const {result} = renderHook(() => useForecastParameters(), {wrapper});

    expect(result.current.percentile).toBeDefined();
    expect(result.current.setPercentile).toBeTypeOf('function');
    expect(result.current.normalizationRef).toBeDefined();
    expect(result.current.setNormalizationRef).toBeTypeOf('function');
  });
});

