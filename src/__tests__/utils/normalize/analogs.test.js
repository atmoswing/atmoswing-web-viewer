/**
 * @fileoverview Tests for the analogs response normalizers.
 */

import {describe, expect, it} from 'vitest';
import {normalizeAnalogCriteriaArray, normalizeAnalogDatesArray, normalizeAnalogPercentiles, normalizeAnalogsResponse} from '@/utils/normalize/analogs.js';

describe('normalize/analogs', () => {
  describe('normalizeAnalogsResponse', () => {
    it('should normalize array of analog objects', () => {
      const input = [
        {rank: 1, date: '2020-01-15', value: 25.3, criteria: 0.95},
        {rank: 2, date: '2020-02-10', value: 30.1, criteria: 0.92}
      ];
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({rank: 1, date: '2020-01-15', value: 25.3, criteria: 0.95});
    });

    it('should extract from analogs property', () => {
      const input = {
        analogs: [{rank: 1, date: '2020-01-15', value: 25.3}]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
    });

    it('should extract from analog_values property', () => {
      const input = {
        analog_values: [{rank: 1, value: 25.3}]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should extract from values property', () => {
      const input = {
        values: [{value: 25.3}]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should extract from data property', () => {
      const input = {
        data: [{value: 25.3}]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should extract from items property', () => {
      const input = {
        items: [{value: 25.3}]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should handle array of numbers', () => {
      const input = [25.3, 30.1, 15.7];
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({rank: 1, date: null, value: 25.3, criteria: null});
      expect(result[1]).toEqual({rank: 2, date: null, value: 30.1, criteria: null});
    });

    it('should generate rank from index if not present', () => {
      const input = [{value: 25.3}, {value: 30.1}];
      const result = normalizeAnalogsResponse(input);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it('should extract date from various property names', () => {
      const inputs = [
        {date: '2020-01-15', value: 1},
        {analog_date: '2020-01-16', value: 2},
        {analog_date_str: '2020-01-17', value: 3},
        {dt: '2020-01-18', value: 4},
        {date_str: '2020-01-19', value: 5},
        {target_date: '2020-01-20', value: 6}
      ];
      const result = normalizeAnalogsResponse(inputs);
      expect(result[0].date).toBe('2020-01-15');
      expect(result[1].date).toBe('2020-01-16');
      expect(result[2].date).toBe('2020-01-17');
      expect(result[3].date).toBe('2020-01-18');
      expect(result[4].date).toBe('2020-01-19');
      expect(result[5].date).toBe('2020-01-20');
    });

    it('should extract value from various property names', () => {
      const inputs = [
        {value: 1},
        {precip_value: 2},
        {value_mm: 3},
        {amount: 4},
        {val: 5},
        {precip: 6},
        {precipitation: 7}
      ];
      const result = normalizeAnalogsResponse(inputs);
      expect(result[0].value).toBe(1);
      expect(result[1].value).toBe(2);
      expect(result[2].value).toBe(3);
      expect(result[3].value).toBe(4);
      expect(result[4].value).toBe(5);
      expect(result[5].value).toBe(6);
      expect(result[6].value).toBe(7);
    });

    it('should extract criteria from various property names', () => {
      const inputs = [
        {criteria: 0.95, value: 1},
        {score: 0.92, value: 2},
        {criterion: 0.90, value: 3},
        {crit: 0.88, value: 4}
      ];
      const result = normalizeAnalogsResponse(inputs);
      expect(result[0].criteria).toBe(0.95);
      expect(result[1].criteria).toBe(0.92);
      expect(result[2].criteria).toBe(0.90);
      expect(result[3].criteria).toBe(0.88);
    });

    it('should return empty array for null', () => {
      expect(normalizeAnalogsResponse(null)).toEqual([]);
    });
  });

  it('normalizeAnalogDatesArray finds analog_dates', () => {
    expect(normalizeAnalogDatesArray({analog_dates: ['2020-01-01']})).toEqual(['2020-01-01']);
  });

  it('normalizeAnalogCriteriaArray extracts criteria arrays', () => {
    expect(normalizeAnalogCriteriaArray({criteria: [0.1, 0.2]})).toEqual([0.1, 0.2]);
  });

  it('normalizeAnalogPercentiles maps percentiles to values', () => {
    const resp = {percentiles: [20, 60], values: [5.5, 12.3]};
    const out = normalizeAnalogPercentiles(resp);
    expect(out[20]).toBe(5.5);
  });

  it('normalizeAnalogPercentiles returns null when empty', () => {
    expect(normalizeAnalogPercentiles({})).toBeNull();
  });
});
