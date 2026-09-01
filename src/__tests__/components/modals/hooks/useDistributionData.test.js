/**
 * @fileoverview Tests for useDistributionData.
 *
 * Asserts which endpoints the distributions modal hits for a given selection and set of display
 * options, and how the criteria fall back to the analog values, with no dialog rendered.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';

vi.mock('@/contexts/forecast/ForecastSessionContext.jsx', () => ({
  useForecastSession: vi.fn(() => ({workspace: 'ws', activeForecastDate: '2025-01-01'}))
}));

vi.mock('@/components/modals/common/useModalSelectionData.js', () => ({
  useModalSelectionData: vi.fn(() => ({
    resolvedMethodId: 'm1',
    resolvedConfigId: 'c1',
    resolvedEntityId: 3
  }))
}));

const analogRecords = [
  {rank: 2, value: 12, criteria: 5},
  {rank: 1, value: 30, criteria: 2}
];

vi.mock('@/services/api.js', () => ({
  getAnalogValues: vi.fn(() => Promise.resolve({})),
  getAnalogyCriteria: vi.fn(() => Promise.resolve({})),
  getAnalogValuesPercentiles: vi.fn(() => Promise.resolve({})),
  getReferenceValues: vi.fn(() => Promise.resolve({})),
  getEntities: vi.fn(() => Promise.resolve({}))
}));

vi.mock('@/utils/apiNormalization.js', () => ({
  normalizeAnalogsResponse: vi.fn(() => analogRecords),
  normalizeAnalogCriteriaArray: vi.fn(() => null),
  normalizeAnalogPercentiles: vi.fn(() => ({90: 42})),
  normalizeReferenceValues: vi.fn(() => ({axis: [10], values: [99]})),
  normalizeEntitiesResponse: vi.fn(() => [{id: 3, name: 'Station C'}])
}));

import * as api from '@/services/api.js';
import {clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {useDistributionData} from '@/components/modals/hooks/useDistributionData.js';

const OPTIONS_OFF = {bestAnalogs: false, tenYearReturn: false, allReturnPeriods: false};
const SELECTION = {methodId: 'm1', configId: 'c1', entityId: 3, lead: 24};

describe('useDistributionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCachedRequests();
  });

  it('fetches nothing while the modal is closed', () => {
    renderHook(() => useDistributionData({open: false, selection: SELECTION, options: OPTIONS_OFF}));
    expect(api.getAnalogValues).not.toHaveBeenCalled();
    expect(api.getAnalogyCriteria).not.toHaveBeenCalled();
  });

  it('loads analog values and the station name for the selection', async () => {
    const {result} = renderHook(() => useDistributionData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.analogValues).not.toBeNull(), {timeout: 3000});
    expect(api.getAnalogValues).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 3, 24);
    expect(result.current.stationName).toBe('Station C');
  });

  it('does not request reference values while both return-period options are off', async () => {
    const {result} = renderHook(() => useDistributionData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.analogValues).not.toBeNull(), {timeout: 3000});
    expect(api.getReferenceValues).not.toHaveBeenCalled();
    expect(result.current.referenceValues).toBeNull();
  });

  it('requests reference values once a return-period option is on', async () => {
    const {result} = renderHook(() => useDistributionData({
      open: true, selection: SELECTION, options: {...OPTIONS_OFF, allReturnPeriods: true}
    }));

    await waitFor(() => expect(result.current.referenceValues).not.toBeNull(), {timeout: 3000});
    expect(api.getReferenceValues).toHaveBeenCalledWith('ws', '2025-01-01', 'm1', 'c1', 3);
  });

  it('derives criteria from the analog values when the API returns none', async () => {
    const {result} = renderHook(() => useDistributionData({open: true, selection: SELECTION, options: OPTIONS_OFF}));

    await waitFor(() => expect(result.current.criteriaValues).not.toBeNull(), {timeout: 3000});
    expect(result.current.criteriaValues).toEqual([
      {index: 1, value: 5},
      {index: 2, value: 2}
    ]);
  });

  it('only computes the best analogs overlay when the option is enabled', async () => {
    const {result, rerender} = renderHook(
      ({options}) => useDistributionData({open: true, selection: SELECTION, options}),
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

  it('skips the analog request when no lead is selected', async () => {
    const {result} = renderHook(() => useDistributionData({
      open: true, selection: {...SELECTION, lead: null}, options: OPTIONS_OFF
    }));

    await waitFor(() => expect(result.current.stationName).toBe('Station C'), {timeout: 3000});
    expect(api.getAnalogValues).not.toHaveBeenCalled();
    expect(result.current.analogValues).toBeNull();
  });
});
