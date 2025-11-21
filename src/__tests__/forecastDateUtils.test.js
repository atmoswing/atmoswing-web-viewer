import { describe, it, expect } from 'vitest';
import {
  parseForecastDate,
  formatForecastDateForApi
} from '@/utils/forecastDateUtils';

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

