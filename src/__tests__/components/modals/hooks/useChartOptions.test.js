/**
 * @fileoverview Tests for the shared chart display options.
 *
 * The mutual-exclusion rule between the two return-period options used to be copied into
 * both chart modals; these pin it now that it lives in one place.
 */

import {describe, expect, it} from 'vitest';
import {act, renderHook} from '@testing-library/react';

import {useChartOptions} from '@/components/modals/hooks/useChartOptions.js';

const INITIAL = {
  mainQuantiles: true,
  bestAnalogs: false,
  tenYearReturn: true,
  allReturnPeriods: false
};

/** Fires a checkbox change for `key`. */
function toggle(result, key, checked) {
  act(() => {
    result.current.handleOptionChange(key)({target: {checked}});
  });
}

describe('useChartOptions', () => {
  it('starts from the values it was given', () => {
    const {result} = renderHook(() => useChartOptions(INITIAL));
    expect(result.current.options).toEqual(INITIAL);
  });

  it('toggles an ordinary option without touching the others', () => {
    const {result} = renderHook(() => useChartOptions(INITIAL));

    toggle(result, 'bestAnalogs', true);

    expect(result.current.options.bestAnalogs).toBe(true);
    expect(result.current.options.mainQuantiles).toBe(true);
    expect(result.current.options.tenYearReturn).toBe(true);
  });

  it('clears allReturnPeriods when tenYearReturn is switched on', () => {
    const {result} = renderHook(() => useChartOptions({...INITIAL, tenYearReturn: false, allReturnPeriods: true}));

    toggle(result, 'tenYearReturn', true);

    expect(result.current.options.tenYearReturn).toBe(true);
    expect(result.current.options.allReturnPeriods).toBe(false);
  });

  it('clears tenYearReturn when allReturnPeriods is switched on', () => {
    const {result} = renderHook(() => useChartOptions(INITIAL));

    toggle(result, 'allReturnPeriods', true);

    expect(result.current.options.allReturnPeriods).toBe(true);
    expect(result.current.options.tenYearReturn).toBe(false);
  });

  it('leaves the paired option alone when one is switched off', () => {
    // Unchecking must not silently enable the other: both off is a valid state.
    const {result} = renderHook(() => useChartOptions(INITIAL));

    toggle(result, 'tenYearReturn', false);

    expect(result.current.options.tenYearReturn).toBe(false);
    expect(result.current.options.allReturnPeriods).toBe(false);
  });

  it('survives repeated switching between the paired options', () => {
    const {result} = renderHook(() => useChartOptions(INITIAL));

    toggle(result, 'allReturnPeriods', true);
    toggle(result, 'tenYearReturn', true);
    toggle(result, 'allReturnPeriods', true);

    expect(result.current.options.allReturnPeriods).toBe(true);
    expect(result.current.options.tenYearReturn).toBe(false);
  });

  it('does not introduce a paired key the modal never declared', () => {
    // The distributions modal offers both, but a modal offering only one must not gain the
    // other as an undeclared `false`.
    const {result} = renderHook(() => useChartOptions({tenYearReturn: false}));

    toggle(result, 'tenYearReturn', true);

    expect(result.current.options).toEqual({tenYearReturn: true});
    expect('allReturnPeriods' in result.current.options).toBe(false);
  });

  it('exposes setOptions for direct updates', () => {
    const {result} = renderHook(() => useChartOptions(INITIAL));

    act(() => result.current.setOptions({...INITIAL, bestAnalogs: true}));

    expect(result.current.options.bestAnalogs).toBe(true);
  });

  it('keeps a stable change handler across renders', () => {
    const {result} = renderHook(() => useChartOptions(INITIAL));
    const first = result.current.handleOptionChange;

    toggle(result, 'bestAnalogs', true);

    expect(result.current.handleOptionChange).toBe(first);
  });
});
