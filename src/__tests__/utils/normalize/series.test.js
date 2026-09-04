/**
 * @fileoverview Tests for the series response normalizers.
 */

import {describe, expect, it} from 'vitest';
import {extractTargetDatesArray, normalizeSeriesBestAnalogs, normalizeSeriesValuesPercentiles, normalizeSeriesValuesPercentilesHistory} from '@/utils/normalize/series.js';

describe('normalize/series', () => {
  describe('extractTargetDatesArray', () => {
    it('should extract from series_values.target_dates', () => {
      const input = {
        series_values: {target_dates: ['2023-01-15', '2023-01-16']}
      };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15', '2023-01-16']);
    });

    it('should extract from target_dates property', () => {
      const input = {target_dates: ['2023-01-15', '2023-01-16']};
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15', '2023-01-16']);
    });

    it('should extract from series_percentiles[0].target_dates', () => {
      const input = {
        series_percentiles: [{target_dates: ['2023-01-15']}]
      };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15']);
    });

    it('should extract from series[0].target_dates', () => {
      const input = {
        series: [{target_dates: ['2023-01-15']}]
      };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15']);
    });

    it('should return array of strings directly', () => {
      const input = ['2023-01-15', '2023-01-16'];
      expect(extractTargetDatesArray(input)).toEqual(input);
    });

    it('should extract from first element if array of objects with target_dates', () => {
      const input = [{target_dates: ['2023-01-15']}];
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15']);
    });

    it('should return empty array for null', () => {
      expect(extractTargetDatesArray(null)).toEqual([]);
    });

    it('should return empty array for object without target dates', () => {
      expect(extractTargetDatesArray({other: 'data'})).toEqual([]);
    });
  });

  describe('normalizeSeriesValuesPercentiles', () => {
    it('handles missing series_values gracefully', () => {
      const result = normalizeSeriesValuesPercentiles({}, null);
      expect(result.dates).toEqual([]);
      expect(result.percentiles).toEqual({});
      expect(result.pctList).toEqual([]);
    });

    it('handles null response', () => {
      const result = normalizeSeriesValuesPercentiles(null, null);
      expect(result.dates).toEqual([]);
    });

    it('handles invalid date formats', () => {
      const resp = {
        series_values: {
          target_dates: ['invalid-date', '2020-01-01'],
          series_percentiles: []
        }
      };
      const result = normalizeSeriesValuesPercentiles(resp, null);
      expect(result.dates.length).toBeGreaterThan(0);
    });

    it('handles percentile with non-finite values', () => {
      const resp = {
        series_values: {
          target_dates: ['2020-01-01'],
          series_percentiles: [
            {percentile: 'not-a-number', series_values: [1]},
            {percentile: 50, series_values: [2]}
          ]
        }
      };
      const result = normalizeSeriesValuesPercentiles(resp, null);
      expect(result.pctList).toEqual([50]);
    });

    it('uses custom parseDateFn when provided', () => {
      const parseDateFn = vi.fn((d) => new Date(d));
      const resp = {
        series_values: {
          target_dates: ['2020-01-01'],
          series_percentiles: [{percentile: 50, series_values: [1]}]
        }
      };
      normalizeSeriesValuesPercentiles(resp, parseDateFn);
      expect(parseDateFn).toHaveBeenCalled();
    });

    it('handles non-numeric series values', () => {
      const resp = {
        series_values: {
          target_dates: ['2020-01-01'],
          series_percentiles: [
            {percentile: 50, series_values: ['not-a-number', 10, null, undefined]}
          ]
        }
      };
      const result = normalizeSeriesValuesPercentiles(resp, null);
      expect(result.percentiles[50].length).toBe(4);
      expect(result.percentiles[50][1]).toBe(10);
      expect(result.percentiles[50][2]).toBeNull();
    });
  });

  describe('normalizeSeriesValuesPercentilesHistory', () => {
    it('handles empty past_forecasts', () => {
      const result = normalizeSeriesValuesPercentilesHistory({}, null);
      expect(result).toEqual([]);
    });

    it('filters out entries with no target dates', () => {
      const resp = {
        past_forecasts: [
          {forecast_date: '2020-01-01', target_dates: [], series_percentiles: []},
          {forecast_date: '2020-01-02', target_dates: ['2020-01-03'], series_percentiles: []}
        ]
      };
      const result = normalizeSeriesValuesPercentilesHistory(resp, null);
      expect(result.length).toBe(1);
    });

    it('uses custom parseDateFn', () => {
      const parseDateFn = vi.fn((d) => new Date(d));
      const resp = {
        past_forecasts: [
          {
            forecast_date: '2020-01-01',
            target_dates: ['2020-01-02'],
            series_percentiles: [{percentile: 50, series_values: [1]}]
          }
        ]
      };
      normalizeSeriesValuesPercentilesHistory(resp, parseDateFn);
      expect(parseDateFn).toHaveBeenCalled();
    });

    it('handles series_percentiles with non-finite percentile', () => {
      const resp = {
        past_forecasts: [
          {
            forecast_date: '2020-01-01',
            target_dates: ['2020-01-02'],
            series_percentiles: [
              {percentile: NaN, series_values: [1]},
              {percentile: 90, series_values: [2]}
            ]
          }
        ]
      };
      const result = normalizeSeriesValuesPercentilesHistory(resp, null);
      expect(Object.keys(result[0].percentiles)).toEqual(['90']);
    });
  });

  describe('normalizeSeriesBestAnalogs', () => {
    it('returns null for null response', () => {
      const result = normalizeSeriesBestAnalogs(null, null);
      expect(result).toBeNull();
    });

    it('returns null for response without series_values', () => {
      const result = normalizeSeriesBestAnalogs({}, null);
      expect(result).toBeNull();
    });

    it('returns null for empty series_values', () => {
      const result = normalizeSeriesBestAnalogs({series_values: []}, null);
      expect(result).toBeNull();
    });

    it('detects analog hours when analog dates have time components', () => {
      const resp = {
        series_values: [[1, 2]],
        series_dates: [['2020-01-01T10:30:00', '2020-01-01T14:00:00']],
        target_dates: ['2020-01-02']
      };
      const result = normalizeSeriesBestAnalogs(resp, null);
      expect(result.hasAnalogHours).toBe(true);
    });

    it('does not detect analog hours for midnight dates', () => {
      const resp = {
        series_values: [[1, 2]],
        series_dates: [['2020-01-01T00:00:00', '2020-01-02T00:00:00']],
        target_dates: ['2020-01-02']
      };
      const result = normalizeSeriesBestAnalogs(resp, null);
      expect(result.hasAnalogHours).toBe(false);
    });

    it('handles missing series_dates', () => {
      const resp = {
        series_values: [[1, 2]],
        target_dates: ['2020-01-02']
      };
      const result = normalizeSeriesBestAnalogs(resp, null);
      expect(result.items[0].datesByAnalog[0]).toBeNull();
    });

    it('handles non-numeric values in series_values', () => {
      const resp = {
        series_values: [['not-a-number'], [10], [null]],
        target_dates: ['2020-01-02', '2020-01-03', '2020-01-04']
      };
      const result = normalizeSeriesBestAnalogs(resp, null);
      expect(result.items[0].values[1]).toBe(10);
      expect(result.items[0].values[2]).toBeNull();
    });

    it('uses parsedTargetDates when available', () => {
      const parseDateFn = (d) => new Date(d);
      const resp = {
        series_values: [[1]],
        target_dates: ['2020-01-01']
      };
      const result = normalizeSeriesBestAnalogs(resp, parseDateFn);
      expect(result.dates).toBeDefined();
      expect(result.dates[0]).toBeInstanceOf(Date);
    });

    it('handles invalid analog dates gracefully', () => {
      const resp = {
        series_values: [[1]],
        series_dates: [['invalid-date']],
        target_dates: ['2020-01-01']
      };
      const result = normalizeSeriesBestAnalogs(resp, null);
      expect(result.items[0].datesByAnalog[0]).toBeNull();
    });
  });

  it('normalizeSeriesValuesPercentiles builds pct map', () => {
    const resp = {
      series_values: {
        target_dates: ['2020-01-01'],
        series_percentiles: [{percentile: 50, series_values: [1]}]
      }
    };
    const out = normalizeSeriesValuesPercentiles(resp);
    expect(out.pctList).toEqual([50]);
    expect(out.percentiles[50][0]).toBe(1);
  });

  it('normalizeSeriesValuesPercentilesHistory parses past forecasts', () => {
    const resp = {
      past_forecasts: [{
        forecast_date: '2020-01-01',
        target_dates: ['2020-01-02'],
        series_percentiles: [{percentile: 10, series_values: [2]}]
      }]
    };
    const out = normalizeSeriesValuesPercentilesHistory(resp);
    expect(out[0].percentiles[10][0]).toBe(2);
  });

  it('normalizeSeriesBestAnalogs returns null for invalid shape', () => {
    expect(normalizeSeriesBestAnalogs({})).toBeNull();
  });

  it('normalizeSeriesBestAnalogs parses values & dates', () => {
    const resp = {
      series_values: [[1, 2], [3, 4]],
      series_dates: [['2020-01-01', '2020-01-02'], ['2020-01-03', '2020-01-04']]
    };
    const out = normalizeSeriesBestAnalogs(resp);
    expect(out.items.length).toBe(2);
    expect(out.items[0].values[0]).toBe(1);
  });
});
