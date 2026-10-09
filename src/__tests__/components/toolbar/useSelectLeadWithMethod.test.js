/**
 * @fileoverview Tests for useSelectLeadWithMethod: a click on a toolbar lead square selects the
 * lead and the method carrying its colour.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import useSelectLeadWithMethod from '@/components/toolbar/hooks/useSelectLeadWithMethod.js';
import {useMethods, useSynthesis} from '@/contexts/forecast/ForecastsContext.jsx';

vi.mock('@/contexts/forecast/ForecastsContext.jsx', () => ({
  useSynthesis: vi.fn(),
  useMethods: vi.fn()
}));

const ARP = {id: '24h-ARP', name: 'ARPEGE 24h', children: []};
const GFS = {id: '24h-GFS', name: 'GFS 24h', children: []};
const SUB = {id: '06h-ARP', name: 'ARPEGE 6h', children: []};

const perMethodSynthesis = [
  {method_id: '24h-ARP', target_dates: ['2026-10-09T00:00:00', '2026-10-10T00:00:00'], values_normalized: [0.11, 0.30]},
  {method_id: '24h-GFS', target_dates: ['2026-10-09T00:00:00', '2026-10-10T00:00:00'], values_normalized: [0.19, 0.30]},
  {
    method_id: '06h-ARP',
    target_dates: ['2026-10-09T00:00:00', '2026-10-09T06:00:00'],
    values_normalized: [0.90, 0.40]
  }
];

let selectTargetDate, setSelectedMethodConfig;

const setup = ({selected = ARP, tree = [ARP, GFS, SUB], perMethod = perMethodSynthesis} = {}) => {
  useSynthesis.mockReturnValue({perMethodSynthesis: perMethod, selectTargetDate});
  useMethods.mockReturnValue({
    methodConfigTree: tree,
    selectedMethodConfig: selected ? {method: selected, config: null} : null,
    setSelectedMethodConfig
  });
  return renderHook(() => useSelectLeadWithMethod()).result.current;
};

describe('useSelectLeadWithMethod', () => {
  beforeEach(() => {
    selectTargetDate = vi.fn();
    setSelectedMethodConfig = vi.fn();
  });

  it('selects the lead and the method carrying the daily square colour', () => {
    const day = new Date(2026, 9, 9);
    setup()(day, false);
    expect(selectTargetDate).toHaveBeenCalledWith(day, false);
    expect(setSelectedMethodConfig).toHaveBeenCalledWith({method: GFS, config: null});
  });

  it('only compares sub-daily methods for a sub-daily segment', () => {
    const at6 = new Date(2026, 9, 9, 6);
    setup()(at6, true);
    expect(selectTargetDate).toHaveBeenCalledWith(at6, true);
    expect(setSelectedMethodConfig).toHaveBeenCalledWith({method: SUB, config: null});
  });

  it('leaves the selection (and its configuration) alone when the dominant method is already selected', () => {
    setup({selected: GFS})(new Date(2026, 9, 9), false);
    expect(selectTargetDate).toHaveBeenCalled();
    expect(setSelectedMethodConfig).not.toHaveBeenCalled();
  });

  it('keeps the selected method on a tie', () => {
    // Both daily methods are at 0.30 on the 10th.
    setup({selected: ARP})(new Date(2026, 9, 10), false);
    expect(setSelectedMethodConfig).not.toHaveBeenCalled();
  });

  it('breaks a tie by the method list order when the selected method is not tied', () => {
    setup({selected: SUB, tree: [GFS, ARP, SUB]})(new Date(2026, 9, 10), false);
    expect(setSelectedMethodConfig).toHaveBeenCalledWith({method: GFS, config: null});
  });

  it('only changes the lead when no method has a value there', () => {
    setup()(new Date(2026, 9, 20), false);
    expect(selectTargetDate).toHaveBeenCalled();
    expect(setSelectedMethodConfig).not.toHaveBeenCalled();
  });

  it('only changes the lead while the per-method synthesis is not loaded', () => {
    setup({perMethod: []})(new Date(2026, 9, 9), false);
    expect(selectTargetDate).toHaveBeenCalled();
    expect(setSelectedMethodConfig).not.toHaveBeenCalled();
  });

  it('only changes the lead when the dominant method is not in the method list', () => {
    setup({tree: [ARP, SUB]})(new Date(2026, 9, 9), false);
    expect(setSelectedMethodConfig).not.toHaveBeenCalled();
  });

  it('selects a method when none is selected yet', () => {
    setup({selected: null})(new Date(2026, 9, 9), false);
    expect(setSelectedMethodConfig).toHaveBeenCalledWith({method: GFS, config: null});
  });

  it('ignores a click without a date', () => {
    setup()(null, false);
    expect(selectTargetDate).not.toHaveBeenCalled();
    expect(setSelectedMethodConfig).not.toHaveBeenCalled();
  });
});
