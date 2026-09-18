/**
 * @fileoverview Tests for useForecastDetailsData.
 *
 * Asserts which endpoints the forecast details window hits for a given selection and set of
 * display options, and how one analogs request feeds the table and both distributions, with no
 * dialog rendered.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';

vi.mock('@/contexts/forecast/ForecastSessionContext.jsx', () => ({
  useForecastSession: vi.fn(() => ({workspace: 'ws', activeForecastDate: '2025-01-01'}))
}));

vi.mock('@/components/modals/hooks/useModalSelectionData.js', () => ({
  useModalSelectionData: vi.fn(() => ({
    resolvedMethodId: 'm1',
    resolvedConfigId: 'c1',
    resolvedEntityId: 3
  }))
}));

const {analogRecords} = vi.hoisted(() => ({
  analogRecords: {
    current: [
      {rank: 2, date: '2019-09-03T00:00:00', value: 12, criteria: 5},
      {rank: 1, date: '1990-09-04T00:00:00', value: 30, criteria: 2}
    ]
  }
}));

vi.mock('@/services/api.js', () => ({
  getAnalogs: vi.fn(() => Promise.resolve({})),
  getAnalogValuesPercentiles: vi.fn(() => Promise.resolve({})),
  getReferenceValues: vi.fn(() => Promise.resolve({})),
  getEntities: vi.fn(() => Promise.resolve({}))
}));

vi.mock('@/utils/normalize/analogs.js', () => ({
  normalizeAnalogsResponse: vi.fn(() => analogRecords.current),
  normalizeAnalogPercentiles: vi.fn(() => ({90: 42}))
}));
vi.mock('@/utils/normalize/entities.js', () => ({
  normalizeEntitiesResponse: vi.fn(() => [{id: 3, name: 'Station C'}])
}));
vi.mock('@/utils/normalize/values.js', () => ({
  normalizeReferenceValues: vi.fn(() => ({axis: [10], values: [99]}))
}));

import * as api from '@/services/api.js';
import {clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {useForecastDetailsData} from '@/components/modals/hooks/useForecastDetailsData.js';

const OPTIONS_OFF = {bestAnalogs: false, tenYearReturn: false, allReturnPeriods: false};
const SELECTION = {methodId: 'm1', configId: 'c1', entityId: 3, lead: 24};
const TWO_ANALOGS = analogRecords.current;

describe('useForecastDetailsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedRequests();
    analogRecords.current = TWO_ANALOGS;
  });

  it('fetches nothing while the window is closed', () => {
    renderHook(() => useForecastDetailsData({open: false, selection: SELECTION, options: OPTIONS_OFF}));
    expect(api.getAnalogs).not.toHaveBeenCalled();
  });

  it('feeds the table, both distributions and the station name from one analogs request', async () => {
    const {result} = renderHook(() => useForecastDetailsData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.analogValues).not.toBeNull(), {timeout: 3000});
    expect(api.getAnalogs).toHaveBeenCalledTimes(1);
    expect(api.getAnalogs).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 3, 24);
    expect(result.current.analogs).toEqual(TWO_ANALOGS);
    expect(result.current.analogValues).toEqual(TWO_ANALOGS);
    expect(result.current.criteriaValues).toEqual([{index: 1, value: 5}, {index: 2, value: 2}]);
    expect(result.current.stationName).toBe('Station C');
  });

  it('does not request reference values while both return-period options are off', async () => {
    const {result} = renderHook(() => useForecastDetailsData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.analogValues).not.toBeNull(), {timeout: 3000});
    expect(api.getReferenceValues).not.toHaveBeenCalled();
    expect(result.current.referenceValues).toBeNull();
  });

  it('requests reference values once a return-period option is on', async () => {
    const {result} = renderHook(() => useForecastDetailsData({
      open: true, selection: SELECTION, options: {...OPTIONS_OFF, allReturnPeriods: true}
    }));

    await waitFor(() => expect(result.current.referenceValues).not.toBeNull(), {timeout: 3000});
    expect(api.getReferenceValues).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 3);
  });

  it('loads the percentile markers for the selection', async () => {
    const {result} = renderHook(() => useForecastDetailsData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.percentileMarkers).toEqual({90: 42}), {timeout: 3000});
    expect(api.getAnalogValuesPercentiles).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 3, 24, [20, 60, 90]);
  });

  it('reports no criteria when the analogs carry none', async () => {
    analogRecords.current = [{rank: 1, value: 3, criteria: null}];
    const {result} = renderHook(() => useForecastDetailsData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.analogValues).not.toBeNull(), {timeout: 3000});
    expect(result.current.criteriaValues).toBeNull();
  });

  it('only computes the best analogs overlay when the option is enabled', async () => {
    const {result, rerender} = renderHook(
      ({options}) => useForecastDetailsData({open: true, selection: SELECTION, options}),
      {initialProps: {options: OPTIONS_OFF}}
    );

    await waitFor(() => expect(result.current.analogValues).not.toBeNull(), {timeout: 3000});
    expect(result.current.bestAnalogsData).toBeNull();

    rerender({options: {...OPTIONS_OFF, bestAnalogs: true}});

    // Fewer than ten carry a criteria, so the fallback sorts by rank.
    expect(result.current.bestAnalogsData).toEqual([
      {rank: 1, value: 30},
      {rank: 2, value: 12}
    ]);
  });

  it('picks the best analogs by criteria once enough records carry one', async () => {
    // What /analogs returns: every record has a criteria, lower being better.
    analogRecords.current = Array.from({length: 12}, (_, i) => ({rank: i + 1, value: i, criteria: 50 - i}));
    const {result} = renderHook(() => useForecastDetailsData({
      open: true, selection: SELECTION, options: {...OPTIONS_OFF, bestAnalogs: true}
    }));

    await waitFor(() => expect(result.current.bestAnalogsData).not.toBeNull(), {timeout: 3000});
    expect(result.current.bestAnalogsData).toHaveLength(10);
    expect(result.current.bestAnalogsData[0]).toEqual({rank: 12, value: 11}); // lowest criteria
  });

  it('skips the per-lead requests when no lead is selected', async () => {
    const {result} = renderHook(() => useForecastDetailsData({
      open: true, selection: {...SELECTION, lead: null}, options: OPTIONS_OFF
    }));

    await waitFor(() => expect(result.current.stationName).toBe('Station C'), {timeout: 3000});
    expect(api.getAnalogs).not.toHaveBeenCalled();
    expect(api.getAnalogValuesPercentiles).not.toHaveBeenCalled();
    expect(result.current.analogs).toEqual([]);
    expect(result.current.analogValues).toBeNull();
  });
});
