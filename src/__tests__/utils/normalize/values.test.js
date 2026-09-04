/**
 * @fileoverview Tests for the values response normalizers.
 */

import {describe, expect, it} from 'vitest';
import {normalizeForecastValuesResponse, normalizeReferenceValues} from '@/utils/normalize/values.js';

describe('normalize/values', () => {
  describe('normalizeForecastValuesResponse', () => {
    it('should normalize complete response', () => {
      const input = {
        entity_ids: [1, 2, 3],
        values_normalized: [0.5, 0.8, 0.3],
        values: [25.5, 40.2, 15.1]
      };
      const result = normalizeForecastValuesResponse(input);
      expect(result.unavailable).toBe(false);
      expect(result.norm).toEqual({1: 0.5, 2: 0.8, 3: 0.3});
      expect(result.raw).toEqual({1: 25.5, 2: 40.2, 3: 15.1});
    });

    it('should handle missing values', () => {
      const input = {
        entity_ids: [1, 2],
        values_normalized: [],
        values: []
      };
      const result = normalizeForecastValuesResponse(input);
      expect(result.unavailable).toBe(true);
      expect(result.norm).toEqual({});
      expect(result.raw).toEqual({});
    });

    it('should handle length mismatch', () => {
      const input = {
        entity_ids: [1, 2, 3],
        values_normalized: [0.5],
        values: [25.5]
      };
      const result = normalizeForecastValuesResponse(input);
      expect(result.unavailable).toBe(true);
    });

    it('should allow partial data if some values exist', () => {
      const input = {
        entity_ids: [1, 2],
        values_normalized: [0.5, 0.8],
        values: []
      };
      const result = normalizeForecastValuesResponse(input);
      expect(result.unavailable).toBe(false);
      expect(result.norm).toEqual({1: 0.5, 2: 0.8});
    });

    it('should return unavailable for null', () => {
      const result = normalizeForecastValuesResponse(null);
      expect(result.unavailable).toBe(true);
      expect(result.norm).toEqual({});
      expect(result.raw).toEqual({});
    });

    it('should return unavailable for non-object', () => {
      const result = normalizeForecastValuesResponse('not an object');
      expect(result.unavailable).toBe(true);
    });

    it('should handle empty entity_ids', () => {
      const input = {
        entity_ids: [],
        values_normalized: [],
        values: []
      };
      const result = normalizeForecastValuesResponse(input);
      expect(result.unavailable).toBe(false);
      expect(result.norm).toEqual({});
      expect(result.raw).toEqual({});
    });
  });

  describe('normalizeReferenceValues', () => {
    it('handles items with return_period instead of rp', () => {
      const resp = {
        items: [
          {return_period: 5, value: 100},
          {return_period: 10, value: 200}
        ]
      };
      const result = normalizeReferenceValues(resp);
      expect(result.axis).toEqual([5, 10]);
      expect(result.values).toEqual([100, 200]);
    });

    it('handles items with x/y instead of rp/value', () => {
      const resp = {
        items: [
          {x: 5, y: 100},
          {x: 10, y: 200}
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

  it('normalizeReferenceValues handles axis/value arrays', () => {
    const resp = {reference_axis: [1, 2], reference_values: [10, 20]};
    const out = normalizeReferenceValues(resp);
    expect(out.axis[1]).toBe(2);
    expect(out.values[0]).toBe(10);
  });

  it('normalizeReferenceValues handles items fallback', () => {
    const resp = {items: [{rp: 5, value: 100}, {return_period: 10, value: 200}]};
    const out = normalizeReferenceValues(resp);
    expect(out.axis).toEqual([5, 10]);
  });
});
