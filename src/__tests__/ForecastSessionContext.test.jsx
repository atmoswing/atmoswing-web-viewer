/**
 * @fileoverview Tests for ForecastSessionContext
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {ForecastSessionProvider, useForecastSession} from '@/contexts/ForecastSessionContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import {getLastForecastDate, getMethodsAndConfigs, hasForecastDate, getSynthesisTotal} from '@/services/api.js';

// Mock dependencies
vi.mock('@/services/api.js', () => ({
  getLastForecastDate: vi.fn(),
  getMethodsAndConfigs: vi.fn(),
  hasForecastDate: vi.fn(),
  getSynthesisTotal: vi.fn()
}));
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));

describe('ForecastSessionContext', () => {
  const mockWorkspaceData = {
    __workspace: 'test',
    date: {last_forecast_date: '2024-01-01_12'},
    methodsAndConfigs: {methods: []}
  };

  const createWrapper = () => ({children}) => (
    <ConfigProvider>
      <WorkspaceProvider>
        <ForecastSessionProvider>{children}</ForecastSessionProvider>
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
    hasForecastDate.mockResolvedValue({exists: true});
    getSynthesisTotal.mockResolvedValue({
      series_percentiles: [{
        time_step: 24,
        target_dates: ['2024-01-02', '2024-01-03'],
        values_normalized: [0.5, 0.7]
      }]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes activeForecastDate (null or a forecast date string)', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    const val = result.current.activeForecastDate;
    expect(val === null || typeof val === 'string').toBe(true);
  });

  it('provides initial forecast session state defaults', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    expect(result.current.percentile).toBe(90);
    expect(result.current.normalizationRef).toBe(10);
  });

  it('updates percentile', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    act(() => result.current.setPercentile(80));
    expect(result.current.percentile).toBe(80);
  });

  it('updates normalizationRef', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    act(() => result.current.setNormalizationRef(25));
    expect(result.current.normalizationRef).toBe(25);
  });

  it('exposes shiftForecastBaseDate & restoreLastAvailableForecast functions', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    expect(typeof result.current.shiftForecastBaseDate).toBe('function');
    expect(typeof result.current.restoreLastAvailableForecast).toBe('function');
  });

  it('has numeric resetVersion', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    expect(typeof result.current.resetVersion).toBe('number');
  });

  it('exposes baseDate searching flags', () => {
    const {result} = renderHook(() => useForecastSession(), {wrapper: createWrapper()});
    expect(typeof result.current.baseDateSearching).toBe('boolean');
    expect(typeof result.current.baseDateSearchFailed).toBe('boolean');
  });
});
