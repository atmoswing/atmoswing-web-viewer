import { describe, it, expect } from 'vitest';
import {
  normalizeEntitiesResponse,
  normalizeRelevantEntityIds,
  normalizeAnalogsResponse,
  extractTargetDatesArray,
  normalizeForecastValuesResponse
} from '@/utils/apiNormalization.js';

describe('apiNormalization', () => {
  describe('normalizeEntitiesResponse', () => {
    it('should return array as-is if response is array', () => {
      const input = [{ id: 1, name: 'Station A' }, { id: 2, name: 'Station B' }];
      expect(normalizeEntitiesResponse(input)).toEqual(input);
    });

    it('should extract entities property from object', () => {
      const input = {
        entities: [{ id: 1, name: 'Station A' }]
      };
      expect(normalizeEntitiesResponse(input)).toEqual(input.entities);
    });

    it('should return empty array for null', () => {
      expect(normalizeEntitiesResponse(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(normalizeEntitiesResponse(undefined)).toEqual([]);
    });

    it('should return empty array for object without entities', () => {
      expect(normalizeEntitiesResponse({ other: 'data' })).toEqual([]);
    });

    it('should return empty array for non-array entities property', () => {
      expect(normalizeEntitiesResponse({ entities: 'not array' })).toEqual([]);
    });
  });

  describe('normalizeRelevantEntityIds', () => {
    it('should extract entity_ids from object', () => {
      const input = { entity_ids: [1, 2, 3] };
      const result = normalizeRelevantEntityIds(input);
      expect(result).toBeInstanceOf(Set);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should extract entities_ids (alternate spelling)', () => {
      const input = { entities_ids: [1, 2, 3] };
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should extract ids property', () => {
      const input = { ids: [1, 2, 3] };
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should extract from entities array', () => {
      const input = { entities: [{ id: 1 }, { id: 2 }] };
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2]);
    });

    it('should handle array of objects with id', () => {
      const input = [{ id: 1 }, { entity_id: 2 }, { id: 3 }];
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result).sort()).toEqual([1, 2, 3]);
    });

    it('should handle array of primitives', () => {
      const input = [1, 2, 3];
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    it('should filter out null/undefined ids', () => {
      const input = [{ id: 1 }, { id: null }, { entity_id: 2 }, {}];
      const result = normalizeRelevantEntityIds(input);
      expect(Array.from(result).sort()).toEqual([1, 2]);
    });

    it('should return empty Set for null', () => {
      const result = normalizeRelevantEntityIds(null);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });

  describe('normalizeAnalogsResponse', () => {
    it('should normalize array of analog objects', () => {
      const input = [
        { rank: 1, date: '2020-01-15', value: 25.3, criteria: 0.95 },
        { rank: 2, date: '2020-02-10', value: 30.1, criteria: 0.92 }
      ];
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ rank: 1, date: '2020-01-15', value: 25.3, criteria: 0.95 });
    });

    it('should extract from analogs property', () => {
      const input = {
        analogs: [{ rank: 1, date: '2020-01-15', value: 25.3 }]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
      expect(result[0].rank).toBe(1);
    });

    it('should extract from analog_values property', () => {
      const input = {
        analog_values: [{ rank: 1, value: 25.3 }]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should extract from values property', () => {
      const input = {
        values: [{ value: 25.3 }]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should extract from data property', () => {
      const input = {
        data: [{ value: 25.3 }]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should extract from items property', () => {
      const input = {
        items: [{ value: 25.3 }]
      };
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(1);
    });

    it('should handle array of numbers', () => {
      const input = [25.3, 30.1, 15.7];
      const result = normalizeAnalogsResponse(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ rank: 1, date: null, value: 25.3, criteria: null });
      expect(result[1]).toEqual({ rank: 2, date: null, value: 30.1, criteria: null });
    });

    it('should generate rank from index if not present', () => {
      const input = [{ value: 25.3 }, { value: 30.1 }];
      const result = normalizeAnalogsResponse(input);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it('should extract date from various property names', () => {
      const inputs = [
        { date: '2020-01-15', value: 1 },
        { analog_date: '2020-01-16', value: 2 },
        { analog_date_str: '2020-01-17', value: 3 },
        { dt: '2020-01-18', value: 4 },
        { date_str: '2020-01-19', value: 5 },
        { target_date: '2020-01-20', value: 6 }
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
        { value: 1 },
        { precip_value: 2 },
        { value_mm: 3 },
        { amount: 4 },
        { val: 5 },
        { precip: 6 },
        { precipitation: 7 }
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
        { criteria: 0.95, value: 1 },
        { score: 0.92, value: 2 },
        { criterion: 0.90, value: 3 },
        { crit: 0.88, value: 4 }
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

  describe('extractTargetDatesArray', () => {
    it('should extract from series_values.target_dates', () => {
      const input = {
        series_values: { target_dates: ['2023-01-15', '2023-01-16'] }
      };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15', '2023-01-16']);
    });

    it('should extract from target_dates property', () => {
      const input = { target_dates: ['2023-01-15', '2023-01-16'] };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15', '2023-01-16']);
    });

    it('should extract from series_percentiles[0].target_dates', () => {
      const input = {
        series_percentiles: [{ target_dates: ['2023-01-15'] }]
      };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15']);
    });

    it('should extract from series[0].target_dates', () => {
      const input = {
        series: [{ target_dates: ['2023-01-15'] }]
      };
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15']);
    });

    it('should return array of strings directly', () => {
      const input = ['2023-01-15', '2023-01-16'];
      expect(extractTargetDatesArray(input)).toEqual(input);
    });

    it('should extract from first element if array of objects with target_dates', () => {
      const input = [{ target_dates: ['2023-01-15'] }];
      expect(extractTargetDatesArray(input)).toEqual(['2023-01-15']);
    });

    it('should return empty array for null', () => {
      expect(extractTargetDatesArray(null)).toEqual([]);
    });

    it('should return empty array for object without target dates', () => {
      expect(extractTargetDatesArray({ other: 'data' })).toEqual([]);
    });
  });

  describe('normalizeForecastValuesResponse', () => {
    it('should normalize complete response', () => {
      const input = {
        entity_ids: [1, 2, 3],
        values_normalized: [0.5, 0.8, 0.3],
        values: [25.5, 40.2, 15.1]
      };
      const result = normalizeForecastValuesResponse(input);
      expect(result.unavailable).toBe(false);
      expect(result.norm).toEqual({ 1: 0.5, 2: 0.8, 3: 0.3 });
      expect(result.raw).toEqual({ 1: 25.5, 2: 40.2, 3: 15.1 });
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
      expect(result.norm).toEqual({ 1: 0.5, 2: 0.8 });
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
});

