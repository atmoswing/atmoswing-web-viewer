/**
 * @fileoverview Tests for MethodsContext
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderHook, act, waitFor} from '@testing-library/react';
import {MethodsProvider, useMethods} from '@/contexts/MethodsContext.jsx';

// Mock dependent contexts to provide synchronous workspace & forecast date
vi.mock('@/contexts/ForecastSessionContext.jsx', () => ({
  useForecastSession: () => ({
    workspace: 'test',
    activeForecastDate: '2024-01-01_12'
  })
}));
vi.mock('@/contexts/WorkspaceContext.jsx', () => ({
  useWorkspace: () => ({
    workspaceData: {
      __workspace: 'test',
      date: {last_forecast_date: '2024-01-01_12'},
      methodsAndConfigs: {
        methods: [
          {id: 'method1', name: 'Method 1', configs: [{id: 'config1', name: 'Config 1'}]},
          {id: 'method2', name: 'Method 2', configs: [{id: 'config2', name: 'Config 2'}]}
        ]
      }
    }
  })
}));

import {normalizeMethodsAndConfigs} from '@/utils/apiNormalization.js';

vi.mock('@/utils/apiNormalization.js', () => ({
  normalizeMethodsAndConfigs: vi.fn()
}));
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));
vi.mock('@/hooks/useCachedRequest.js', () => {
  const mockData = {
    methods: [
      {id: 'method1', name: 'Method 1', configs: [{id: 'config1', name: 'Config 1'}]},
      {id: 'method2', name: 'Method 2', configs: [{id: 'config2', name: 'Config 2'}]}
    ]
  };
  return {
    useCachedRequest: (key) => ({
      data: key ? mockData : null,
      loading: false,
      error: null
    }),
    clearCachedRequests: vi.fn()
  };
});

const createWrapper = () => ({children}) => <MethodsProvider>{children}</MethodsProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  normalizeMethodsAndConfigs.mockImplementation(data => data.methods || []);
});

afterEach(() => vi.restoreAllMocks());

describe('MethodsContext', () => {
  it('auto-selects first method after initialization', async () => {
    const {result} = renderHook(() => useMethods(), {wrapper: createWrapper()});
    await waitFor(() => expect(result.current.selectedMethodConfig?.method?.id).toBe('method1'));
    expect(result.current.methodConfigTree.length).toBeGreaterThan(0);
  });

  it('can manually set a different method', async () => {
    const {result} = renderHook(() => useMethods(), {wrapper: createWrapper()});
    await waitFor(() => expect(result.current.selectedMethodConfig?.method?.id).toBe('method1'));
    act(() => result.current.setSelectedMethodConfig({method: {id: 'method2', name: 'Method 2'}, config: null}));
    expect(result.current.selectedMethodConfig?.method?.id).toBe('method2');
  });

  it('clears selection (auto re-selects first method)', async () => {
    const {result} = renderHook(() => useMethods(), {wrapper: createWrapper()});
    await waitFor(() => expect(result.current.selectedMethodConfig?.method?.id).toBe('method1'));
    act(() => result.current.setSelectedMethodConfig(null));
    await waitFor(() => expect(result.current.selectedMethodConfig?.method?.id).toBe('method1'));
  });

  it('provides loading and error flags with expected types', () => {
    const {result} = renderHook(() => useMethods(), {wrapper: createWrapper()});
    expect(typeof result.current.methodsLoading).toBe('boolean');
    expect(result.current.methodsError === null || result.current.methodsError instanceof Error).toBe(true);
  });

  it('exposes setSelectedMethodConfig function', () => {
    const {result} = renderHook(() => useMethods(), {wrapper: createWrapper()});
    expect(typeof result.current.setSelectedMethodConfig).toBe('function');
  });
});
