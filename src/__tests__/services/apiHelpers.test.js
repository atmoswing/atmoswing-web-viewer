import {describe, expect, it} from 'vitest';
import {
  appendQuery,
  buildNormalizeQuery,
  buildPercentilesQuery,
  buildRepeatedParamQuery
} from '@/services/apiHelpers.js';

describe('apiHelpers', () => {
  describe('buildRepeatedParamQuery', () => {
    it('should build query string with repeated parameters', () => {
      const result = buildRepeatedParamQuery('percentiles', [10, 50, 90]);
      expect(result).toBe('?percentiles=10&percentiles=50&percentiles=90');
    });

    it('should return empty string for empty array', () => {
      expect(buildRepeatedParamQuery('key', [])).toBe('');
    });

    it('should return empty string for null', () => {
      expect(buildRepeatedParamQuery('key', null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(buildRepeatedParamQuery('key', undefined)).toBe('');
    });

    it('should handle single value', () => {
      const result = buildRepeatedParamQuery('key', [42]);
      expect(result).toBe('?key=42');
    });

    it('should URL-encode special characters', () => {
      const result = buildRepeatedParamQuery('key', ['value with space', 'value&special']);
      expect(result).toContain('value%20with%20space');
      expect(result).toContain('value%26special');
    });

    it('should handle non-array values gracefully', () => {
      const result = buildRepeatedParamQuery('key', 'not an array');
      expect(result).toBe('');
    });
  });

  describe('buildPercentilesQuery', () => {
    it('should build percentiles query string', () => {
      const result = buildPercentilesQuery([10, 50, 90]);
      expect(result).toBe('?percentiles=10&percentiles=50&percentiles=90');
    });

    it('should return empty string for empty array', () => {
      expect(buildPercentilesQuery([])).toBe('');
    });

    it('should return empty string for null', () => {
      expect(buildPercentilesQuery(null)).toBe('');
    });
  });

  describe('buildNormalizeQuery', () => {
    it('should build query string for true', () => {
      expect(buildNormalizeQuery(true)).toBe('?normalize=true');
    });

    it('should build query string for false', () => {
      expect(buildNormalizeQuery(false)).toBe('?normalize=false');
    });

    it('should build query string for string value', () => {
      expect(buildNormalizeQuery('yes')).toBe('?normalize=yes');
    });

    it('should return empty string for null', () => {
      expect(buildNormalizeQuery(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(buildNormalizeQuery(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(buildNormalizeQuery('')).toBe('');
    });

    it('should URL-encode special characters', () => {
      const result = buildNormalizeQuery('value&special');
      expect(result).toBe('?normalize=value%26special');
    });
  });

  describe('appendQuery', () => {
    it('should append query to path without existing query', () => {
      const result = appendQuery('/api/data', 'sort=asc');
      expect(result).toBe('/api/data?sort=asc');
    });

    it('should append query to path with existing query', () => {
      const result = appendQuery('/api/data?page=1', 'sort=asc');
      expect(result).toBe('/api/data?page=1&sort=asc');
    });

    it('should handle query with leading ?', () => {
      const result = appendQuery('/api/data', '?sort=asc');
      expect(result).toBe('/api/data?sort=asc');
    });

    it('should handle query with leading ? and existing query', () => {
      const result = appendQuery('/api/data?page=1', '?sort=asc');
      expect(result).toBe('/api/data?page=1&sort=asc');
    });

    it('should return path unchanged for empty query', () => {
      expect(appendQuery('/api/data', '')).toBe('/api/data');
      expect(appendQuery('/api/data', null)).toBe('/api/data');
      expect(appendQuery('/api/data', undefined)).toBe('/api/data');
    });

    it('should handle complex query strings', () => {
      const result = appendQuery('/api/data?page=1', 'sort=asc&limit=10');
      expect(result).toBe('/api/data?page=1&sort=asc&limit=10');
    });

    it('should handle path with fragment', () => {
      const result = appendQuery('/api/data#section', 'sort=asc');
      expect(result).toBe('/api/data#section?sort=asc');
    });
  });
});
