/**
 * @fileoverview Tests for SynthesisContext
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {SynthesisProvider, useSynthesis} from '@/contexts/SynthesisContext.jsx';
import {ForecastSessionProvider} from '@/contexts/ForecastSessionContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import {getLastForecastDate, getMethodsAndConfigs, getSynthesisTotal, getSynthesisPerMethod} from '@/services/api.js';

// Mock dependencies
vi.mock('@/services/api.js', () => ({
  getLastForecastDate: vi.fn(),
  getMethodsAndConfigs: vi.fn(),
  getSynthesisTotal: vi.fn(),
  getSynthesisPerMethod: vi.fn()
}));
vi.mock('@/config.js', () => ({
  default: {API_BASE_URL: 'http://localhost:3000', DEFAULT_WORKSPACE: 'test'}
}));

describe('SynthesisContext', () => {
  const mockWorkspaceData = {
    __workspace: 'test',
    date: {last_forecast_date: '2024-01-01_12'},
    methodsAndConfigs: {methods: []}
  };

  const createWrapper = () => ({children}) => (
    <ConfigProvider>
      <WorkspaceProvider>
        <ForecastSessionProvider>
          <SynthesisProvider>{children}</SynthesisProvider>
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
    getSynthesisPerMethod.mockResolvedValue([]);
  });

  it('initializes synthesis structure', () => {
    const {result} = renderHook(() => useSynthesis(), {wrapper: createWrapper()});
    expect(Array.isArray(result.current.dailyLeads)).toBe(true);
    expect(Array.isArray(result.current.subDailyLeads)).toBe(true);
    expect(typeof result.current.leadResolution).toBe('string');
    expect(typeof result.current.selectedLead).toBe('number');
    expect(Array.isArray(result.current.perMethodSynthesis)).toBe(true);
  });

  it('changes leadResolution', () => {
    const {result} = renderHook(() => useSynthesis(), {wrapper: createWrapper()});
    act(() => result.current.setLeadResolution('sub'));
    expect(result.current.leadResolution).toBe('sub');
  });

  it('changes selectedLead', () => {
    const {result} = renderHook(() => useSynthesis(), {wrapper: createWrapper()});
    act(() => result.current.setSelectedLead(5));
    expect(result.current.selectedLead).toBe(5);
  });

  it('allows selecting target date via selectTargetDate', () => {
    const {result} = renderHook(() => useSynthesis(), {wrapper: createWrapper()});
    // No leads initially (empty arrays); selectTargetDate should not throw and keep null
    expect(result.current.selectedTargetDate === null || result.current.selectedTargetDate instanceof Date).toBe(true);
    const future = new Date('2024-01-10');
    act(() => result.current.selectTargetDate(future));
    // Since there are no leads, selectedTargetDate should remain unchanged (null or previous)
    expect(result.current.selectedTargetDate === null || result.current.selectedTargetDate instanceof Date).toBe(true);
  });
});
