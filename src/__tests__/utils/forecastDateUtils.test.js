import {describe, expect, it} from 'vitest';
import {formatForecastDateForApi, leadHours, nearestDateIndex, parseForecastDate} from '@/utils/forecastDateUtils.js';

describe('forecastDateUtils', () => {
  describe('parseForecastDate', () => {
    it('should return null for empty string', () => {
      expect(parseForecastDate('')).toBeNull();
      expect(parseForecastDate(null)).toBeNull();
      expect(parseForecastDate(undefined)).toBeNull();
    });

    it('should parse ISO 8601 date with time', () => {
      const result = parseForecastDate('2023-01-15T12:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(12);
    });

    it('should parse hour-only format (YYYY-MM-DDThh)', () => {
      const result = parseForecastDate('2023-01-15T12');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });

    it('should parse space-separated format', () => {
      const result = parseForecastDate('2023-01-15 12:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
    });

    it('should parse underscore-separated format', () => {
      const result = parseForecastDate('2023-01-15_12:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
    });

    it('should parse space-separated format with seconds', () => {
      const result = parseForecastDate('2023-01-15 12:00:30');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
    });

    it('should parse compact format (YYYYMMDDhh)', () => {
      const result = parseForecastDate('2023011512');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(12);
    });

    it('should parse compact format with minutes (YYYYMMDDhhmm)', () => {
      const result = parseForecastDate('202301151230');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(12);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it('should return null for invalid date string', () => {
      const result = parseForecastDate('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for completely malformed input', () => {
      const result = parseForecastDate('not a date at all');
      expect(result).toBeNull();
    });
  });

  describe('formatForecastDateForApi', () => {
    it('should return null for invalid date', () => {
      expect(formatForecastDateForApi(null)).toBeNull();
      expect(formatForecastDateForApi(undefined)).toBeNull();
      expect(formatForecastDateForApi(new Date('invalid'))).toBeNull();
    });

    it('should format to hour-only when reference matches pattern', () => {
      const date = new Date(2023, 0, 15, 12, 30, 0);
      const result = formatForecastDateForApi(date, '2023-01-01T00');
      expect(result).toBe('2023-01-15T12');
    });

    it('should format to date with hour:00 when reference is date-only', () => {
      const date = new Date(2023, 0, 15, 12, 30, 0);
      const result = formatForecastDateForApi(date, '2023-01-01');
      expect(result).toBe('2023-01-15 12:00');
    });

    it('should format to date with hours and minutes when no reference', () => {
      const date = new Date(2023, 0, 15, 12, 30, 0);
      const result = formatForecastDateForApi(date);
      expect(result).toBe('2023-01-15 12:30');
    });

    it('should format to ISO string for other reference formats', () => {
      const date = new Date('2023-01-15T12:30:00Z');
      const result = formatForecastDateForApi(date, 'some-other-format');
      expect(result).toContain('2023-01-15');
      expect(result).toContain('T');
    });

    it('should pad single-digit months and dates', () => {
      const date = new Date(2023, 0, 5, 9, 5, 0);
      const result = formatForecastDateForApi(date);
      expect(result).toBe('2023-01-05 09:05');
    });
  });
});

describe('leadHours', () => {
  const base = new Date(2025, 0, 1, 12);

  it('counts whole hours from the base date, negative before it', () => {
    expect(leadHours(base, new Date(2025, 0, 2, 12))).toBe(24);
    expect(leadHours(base, new Date(2025, 0, 1, 0))).toBe(-12);
    expect(leadHours(base, new Date(2025, 0, 1, 18, 20))).toBe(6);
  });

  it('agrees with the leads of dates parsed from the API', () => {
    const apiBase = parseForecastDate('2025-01-01T00');
    expect(leadHours(apiBase, parseForecastDate('2025-01-03T00:00:00'))).toBe(48);
  });

  it('returns null for a missing or invalid date', () => {
    expect(leadHours(null, base)).toBeNull();
    expect(leadHours(base, new Date('nope'))).toBeNull();
  });
});

describe('nearestDateIndex', () => {
  const dates = [new Date(2025, 0, 1), new Date(2025, 0, 2), new Date(2025, 0, 3)];

  it('finds the closest date', () => {
    expect(nearestDateIndex(dates, new Date(2025, 0, 2, 20))).toBe(2);
    expect(nearestDateIndex(dates, new Date(2024, 11, 1))).toBe(0);
  });

  it('prefers the earlier date on a tie', () => {
    expect(nearestDateIndex(dates, new Date(2025, 0, 1, 12))).toBe(0);
  });

  it('returns -1 when there is nothing to match', () => {
    expect(nearestDateIndex([], new Date())).toBe(-1);
    expect(nearestDateIndex(dates, null)).toBe(-1);
    expect(nearestDateIndex(null, new Date())).toBe(-1);
  });
});
