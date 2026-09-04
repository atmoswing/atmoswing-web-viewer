/**
 * @fileoverview Tests for the synthesis response normalizers.
 */

import {describe, expect, it} from 'vitest';
import {normalizeHasForecastDate, normalizePerMethodSynthesis, normalizeSynthesisHasLeads} from '@/utils/normalize/synthesis.js';

describe('normalize/synthesis', () => {
  it('normalizePerMethodSynthesis passes through series_percentiles', () => {
    const resp = {series_percentiles: [{p: 10}, {p: 20}]};
    expect(normalizePerMethodSynthesis(resp).length).toBe(2);
  });

  it('normalizeHasForecastDate detects flags', () => {
    expect(normalizeHasForecastDate({has_forecasts: true})).toBe(true);
    expect(normalizeHasForecastDate({hasForecasts: true})).toBe(true);
    expect(normalizeHasForecastDate({})).toBe(false);
  });

  it('normalizeSynthesisHasLeads detects presence', () => {
    expect(normalizeSynthesisHasLeads({series_percentiles: [{target_dates: ['2020-01-01']}]})).toBe(true);
    expect(normalizeSynthesisHasLeads({series_percentiles: []})).toBe(false);
  });
});
