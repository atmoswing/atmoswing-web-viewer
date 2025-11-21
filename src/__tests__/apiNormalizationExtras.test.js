import { describe, it, expect } from 'vitest';
import {
  normalizeMethodsAndConfigs,
  normalizePerMethodSynthesis,
  normalizeAnalogDatesArray,
  normalizeAnalogCriteriaArray,
  normalizeHasForecastDate,
  normalizeReferenceValues,
  normalizeAnalogPercentiles,
  normalizeSeriesValuesPercentiles,
  normalizeSeriesValuesPercentilesHistory,
  normalizeSeriesBestAnalogs,
  normalizeSynthesisHasLeads
} from '@/utils/apiNormalization.js';

describe('apiNormalization extra functions', () => {
  it('normalizeMethodsAndConfigs builds children array', () => {
    const resp = { methods: [{ id: 1, name: 'A', configurations: [{ id: 10, name: 'Cfg' }] }] };
    const out = normalizeMethodsAndConfigs(resp);
    expect(out[0].children[0].id).toBe(10);
  });

  it('normalizePerMethodSynthesis passes through series_percentiles', () => {
    const resp = { series_percentiles: [{ p: 10 }, { p: 20 }] };
    expect(normalizePerMethodSynthesis(resp).length).toBe(2);
  });

  it('normalizeAnalogDatesArray finds analog_dates', () => {
    expect(normalizeAnalogDatesArray({ analog_dates: ['2020-01-01'] })).toEqual(['2020-01-01']);
  });

  it('normalizeAnalogCriteriaArray extracts criteria arrays', () => {
    expect(normalizeAnalogCriteriaArray({ criteria: [0.1, 0.2] })).toEqual([0.1, 0.2]);
  });

  it('normalizeHasForecastDate detects flags', () => {
    expect(normalizeHasForecastDate({ has_forecasts: true })).toBe(true);
    expect(normalizeHasForecastDate({ hasForecasts: true })).toBe(true);
    expect(normalizeHasForecastDate({})).toBe(false);
  });

  it('normalizeReferenceValues handles axis/value arrays', () => {
    const resp = { reference_axis: [1, 2], reference_values: [10, 20] };
    const out = normalizeReferenceValues(resp);
    expect(out.axis[1]).toBe(2);
    expect(out.values[0]).toBe(10);
  });

  it('normalizeReferenceValues handles items fallback', () => {
    const resp = { items: [{ rp: 5, value: 100 }, { return_period: 10, value: 200 }] };
    const out = normalizeReferenceValues(resp);
    expect(out.axis).toEqual([5, 10]);
  });

  it('normalizeAnalogPercentiles maps percentiles to values', () => {
    const resp = { percentiles: [20, 60], values: [5.5, 12.3] };
    const out = normalizeAnalogPercentiles(resp);
    expect(out[20]).toBe(5.5);
  });

  it('normalizeAnalogPercentiles returns null when empty', () => {
    expect(normalizeAnalogPercentiles({})).toBeNull();
  });

  it('normalizeSeriesValuesPercentiles builds pct map', () => {
    const resp = { series_values: { target_dates: ['2020-01-01'], series_percentiles: [{ percentile: 50, series_values: [1] }] } };
    const out = normalizeSeriesValuesPercentiles(resp);
    expect(out.pctList).toEqual([50]);
    expect(out.percentiles[50][0]).toBe(1);
  });

  it('normalizeSeriesValuesPercentilesHistory parses past forecasts', () => {
    const resp = { past_forecasts: [{ forecast_date: '2020-01-01', target_dates: ['2020-01-02'], series_percentiles: [{ percentile: 10, series_values: [2] }] }] };
    const out = normalizeSeriesValuesPercentilesHistory(resp);
    expect(out[0].percentiles[10][0]).toBe(2);
  });

  it('normalizeSeriesBestAnalogs returns null for invalid shape', () => {
    expect(normalizeSeriesBestAnalogs({})).toBeNull();
  });

  it('normalizeSeriesBestAnalogs parses values & dates', () => {
    const resp = { series_values: [[1,2],[3,4]], series_dates: [['2020-01-01','2020-01-02'],['2020-01-03','2020-01-04']] };
    const out = normalizeSeriesBestAnalogs(resp);
    expect(out.items.length).toBe(2);
    expect(out.items[0].values[0]).toBe(1);
  });

  it('normalizeSynthesisHasLeads detects presence', () => {
    expect(normalizeSynthesisHasLeads({ series_percentiles: [{ target_dates: ['2020-01-01'] }] })).toBe(true);
    expect(normalizeSynthesisHasLeads({ series_percentiles: [] })).toBe(false);
  });
});

