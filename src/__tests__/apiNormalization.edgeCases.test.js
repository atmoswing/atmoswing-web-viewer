import { describe, it, expect } from 'vitest';
import {
  normalizeSeriesValuesPercentiles,
  normalizeSeriesValuesPercentilesHistory,
  normalizeSeriesBestAnalogs,
  normalizeReferenceValues
} from '@/utils/apiNormalization.js';

describe('apiNormalization - edge cases', () => {
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
            { percentile: 'not-a-number', series_values: [1] },
            { percentile: 50, series_values: [2] }
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
          series_percentiles: [{ percentile: 50, series_values: [1] }]
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
            { percentile: 50, series_values: ['not-a-number', 10, null, undefined] }
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
          { forecast_date: '2020-01-01', target_dates: [], series_percentiles: [] },
          { forecast_date: '2020-01-02', target_dates: ['2020-01-03'], series_percentiles: [] }
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
            series_percentiles: [{ percentile: 50, series_values: [1] }]
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
              { percentile: NaN, series_values: [1] },
              { percentile: 90, series_values: [2] }
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
      const result = normalizeSeriesBestAnalogs({ series_values: [] }, null);
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

  describe('normalizeReferenceValues', () => {
    it('handles items with return_period instead of rp', () => {
      const resp = {
        items: [
          { return_period: 5, value: 100 },
          { return_period: 10, value: 200 }
        ]
      };
      const result = normalizeReferenceValues(resp);
      expect(result.axis).toEqual([5, 10]);
      expect(result.values).toEqual([100, 200]);
    });

    it('handles items with x/y instead of rp/value', () => {
      const resp = {
        items: [
          { x: 5, y: 100 },
          { x: 10, y: 200 }
        ]
      };
      const result = normalizeReferenceValues(resp);
      expect(result.axis).toEqual([5, 10]);
      expect(result.values).toEqual([100, 200]);
    });

    it('returns null for mismatched axis/values lengths', () => {
      const resp = {
        reference_axis: [1, 2, 3],
        reference_values: [10, 20]
      };
      const result = normalizeReferenceValues(resp);
      expect(result).toBeNull();
    });

    it('returns null for empty arrays', () => {
      const resp = {
        reference_axis: [],
        reference_values: []
      };
      const result = normalizeReferenceValues(resp);
      expect(result).toBeNull();
    });

    it('returns null for null response', () => {
      const result = normalizeReferenceValues(null);
      expect(result).toBeNull();
    });

    it('handles axis/values as alternative keys', () => {
      const resp = {
        axis: [1, 2],
        values: [10, 20]
      };
      const result = normalizeReferenceValues(resp);
      expect(result.axis).toEqual([1, 2]);
      expect(result.values).toEqual([10, 20]);
    });
  });
});

