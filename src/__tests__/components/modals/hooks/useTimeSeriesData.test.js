/**
 * @fileoverview Tests for useTimeSeriesData.
 *
 * These exercise the modal's data layer directly: no dialog is rendered, so what is asserted
 * is which endpoints get called for a given selection and set of display options.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';

// Mocked inline rather than via setupI18nMock(): that helper wraps vi.mock in a function call,
// which vitest cannot hoist, so react-i18next would stay real in this provider-less hook test.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({t: (k, opts) => (opts && opts.index ? `${k}${opts.index}` : k), i18n: {language: 'en'}})
}));

vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useSelectedEntity: vi.fn(() => ({selectedEntityId: 7})),
  useMethods: vi.fn(() => ({
    selectedMethodConfig: {method: {id: 'm1'}, config: {id: 'c1'}},
    methodConfigTree: [{id: 'm1', children: [{id: 'c1'}]}]
  })),
  useForecastSession: vi.fn(() => ({workspace: 'ws', activeForecastDate: '2025-01-01'}))
}));

vi.mock('@/services/api.js', () => ({
  getSeriesValuesPercentiles: vi.fn(() => Promise.resolve({series_values: []})),
  getReferenceValues: vi.fn(() => Promise.resolve({})),
  getSeriesBestAnalogs: vi.fn(() => Promise.resolve({})),
  getSeriesValuesPercentilesHistory: vi.fn(() => Promise.resolve({})),
  getRelevantEntities: vi.fn(() => Promise.resolve({entities: []}))
}));

vi.mock('@/utils/normalize/series.js', () => ({
  normalizeSeriesValuesPercentiles: vi.fn(() => ({percentiles: [10, 50, 90]})),
  normalizeSeriesBestAnalogs: vi.fn(() => ({items: [{values: []}]})),
  normalizeSeriesValuesPercentilesHistory: vi.fn(() => ({past: true}))
}));
vi.mock('@/utils/normalize/values.js', () => ({
  normalizeReferenceValues: vi.fn(() => ({axis: [], values: []}))
}));

import * as api from '@/services/api.js';
import {clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {useTimeSeriesData} from '@/components/modals/hooks/useTimeSeriesData.js';

const ALL_OFF = {
  mainQuantiles: true,
  allQuantiles: false,
  bestAnalogs: false,
  tenYearReturn: false,
  allReturnPeriods: false,
  previousForecasts: false
};

describe('useTimeSeriesData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedRequests();
  });

  it('loads the percentile series for the current selection', async () => {
    const {result} = renderHook(() => useTimeSeriesData(ALL_OFF));

    await waitFor(() => expect(result.current.series).not.toBeNull(), {timeout: 3000});

    expect(api.getSeriesValuesPercentiles).toHaveBeenCalledWith(
      'ws', '2025-01-01', 'm1', 'c1', 7, expect.any(Array)
    );
    expect(result.current.series).toEqual({percentiles: [10, 50, 90]});
    expect(result.current.error).toBeNull();
    expect(result.current.resolvedConfigId).toBe('c1');
  });

  it('does not request the optional series while their options are off', async () => {
    const {result} = renderHook(() => useTimeSeriesData(ALL_OFF));

    await waitFor(() => expect(result.current.series).not.toBeNull(), {timeout: 3000});

    expect(api.getReferenceValues).not.toHaveBeenCalled();
    expect(api.getSeriesBestAnalogs).not.toHaveBeenCalled();
    expect(api.getSeriesValuesPercentilesHistory).not.toHaveBeenCalled();
    expect(result.current.referenceValues).toBeNull();
    expect(result.current.bestAnalogs).toBeNull();
    expect(result.current.pastForecasts).toBeNull();
  });

  it('requests best analogs only once that option is enabled', async () => {
    const {result, rerender} = renderHook(
      ({options}) => useTimeSeriesData(options),
      {initialProps: {options: ALL_OFF}}
    );

    await waitFor(() => expect(result.current.series).not.toBeNull(), {timeout: 3000});
    expect(api.getSeriesBestAnalogs).not.toHaveBeenCalled();

    rerender({options: {...ALL_OFF, bestAnalogs: true}});

    await waitFor(() => expect(result.current.bestAnalogs).not.toBeNull(), {timeout: 3000});
    expect(api.getSeriesBestAnalogs).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 7);
  });

  it('requests reference values for either return-period option', async () => {
    const {result} = renderHook(() => useTimeSeriesData({...ALL_OFF, tenYearReturn: true}));

    await waitFor(() => expect(result.current.referenceValues).not.toBeNull(), {timeout: 3000});
    expect(api.getReferenceValues).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 7);
  });

  it('requests the history only once previous forecasts are enabled', async () => {
    const {result} = renderHook(() => useTimeSeriesData({...ALL_OFF, previousForecasts: true}));

    await waitFor(() => expect(result.current.pastForecasts).not.toBeNull(), {timeout: 3000});
    expect(api.getSeriesValuesPercentilesHistory).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 7);
  });

  it('asks for a wider percentile set when allQuantiles is on', async () => {
    const {result} = renderHook(() => useTimeSeriesData({...ALL_OFF, allQuantiles: true}));

    await waitFor(() => expect(result.current.series).not.toBeNull(), {timeout: 3000});

    const defaultCall = api.getSeriesValuesPercentiles.mock.calls[0];
    expect(defaultCall[5].length).toBeGreaterThan(3);
  });
});
