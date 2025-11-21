import { describe, it, expect } from 'vitest';
import {
  formatDateDDMMYYYY,
  formatPrecipitation,
  formatCriteria,
  compareEntitiesByName,
  formatDateLabel
} from '@/utils/formattingUtils';

describe('formattingUtils', () => {
  describe('formatDateDDMMYYYY', () => {
    it('should format Date object to DD.MM.YYYY', () => {
      const date = new Date(2025, 10, 5); // Nov 5, 2025
      expect(formatDateDDMMYYYY(date)).toBe('05.11.2025');
    });

    it('should format date string to DD.MM.YYYY', () => {
      expect(formatDateDDMMYYYY('2025-11-05')).toBe('05.11.2025');
    });

    it('should format timestamp to DD.MM.YYYY', () => {
      const timestamp = new Date(2025, 10, 5).getTime();
      expect(formatDateDDMMYYYY(timestamp)).toBe('05.11.2025');
    });

    it('should pad single-digit day and month', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatDateDDMMYYYY(date)).toBe('05.01.2025');
    });

    it('should return empty string for null', () => {
      expect(formatDateDDMMYYYY(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateDDMMYYYY(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateDDMMYYYY('invalid')).toBe('');
    });

    it('should handle timestamp 0', () => {
      expect(formatDateDDMMYYYY(0)).toBe('01.01.1970');
    });
  });

  describe('formatPrecipitation', () => {
    it('should format number to one decimal place', () => {
      expect(formatPrecipitation(25.67)).toBe('25.7');
    });

    it('should format zero as "0"', () => {
      expect(formatPrecipitation(0)).toBe('0');
    });

    it('should return "-" for null', () => {
      expect(formatPrecipitation(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(formatPrecipitation(undefined)).toBe('-');
    });

    it('should format string numbers', () => {
      expect(formatPrecipitation('25.67')).toBe('25.7');
    });

    it('should return original string for non-numeric strings', () => {
      expect(formatPrecipitation('not a number')).toBe('not a number');
    });

    it('should round correctly', () => {
      expect(formatPrecipitation(25.96)).toBe('26.0');
      expect(formatPrecipitation(25.94)).toBe('25.9');
    });
  });

  describe('formatCriteria', () => {
    it('should format number to two decimal places', () => {
      expect(formatCriteria(0.12345)).toBe('0.12');
    });

    it('should return "-" for null', () => {
      expect(formatCriteria(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(formatCriteria(undefined)).toBe('-');
    });

    it('should format string numbers', () => {
      expect(formatCriteria('0.12345')).toBe('0.12');
    });

    it('should return original string for non-numeric strings', () => {
      expect(formatCriteria('not a number')).toBe('not a number');
    });

    it('should format zero correctly', () => {
      expect(formatCriteria(0)).toBe('0.00');
    });

    it('should round correctly', () => {
      expect(formatCriteria(0.125)).toBe('0.13');
      expect(formatCriteria(0.124)).toBe('0.12');
    });
  });

  describe('compareEntitiesByName', () => {
    it('should sort entities by name alphabetically', () => {
      const a = { name: 'Station B', id: 1 };
      const b = { name: 'Station A', id: 2 };
      expect(compareEntitiesByName(a, b)).toBe(1);
      expect(compareEntitiesByName(b, a)).toBe(-1);
    });

    it('should be case-insensitive', () => {
      const a = { name: 'station b' };
      const b = { name: 'Station A' };
      expect(compareEntitiesByName(a, b)).toBe(1);
    });

    it('should return 0 for equal names', () => {
      const a = { name: 'Station A' };
      const b = { name: 'Station A' };
      expect(compareEntitiesByName(a, b)).toBe(0);
    });

    it('should fall back to id if name is missing', () => {
      const a = { id: 2 };
      const b = { id: 1 };
      expect(compareEntitiesByName(a, b)).toBe(1);
    });

    it('should handle entities with no name or id', () => {
      const a = {};
      const b = {};
      expect(compareEntitiesByName(a, b)).toBe(0);
    });

    it('should handle null entities gracefully', () => {
      const result = compareEntitiesByName(null, null);
      expect(typeof result).toBe('number');
    });

    it('should handle numeric ids by converting to string', () => {
      const a = { id: 10 };
      const b = { id: 2 };
      expect(compareEntitiesByName(a, b)).toBe(-1); // '10' < '2' lexically
    });
  });

  describe('formatDateLabel', () => {
    it('should format date without time when hours and minutes are zero', () => {
      const date = new Date(2025, 10, 5, 0, 0);
      expect(formatDateLabel(date)).toBe('05.11.2025');
    });

    it('should include time when hours are non-zero', () => {
      const date = new Date(2025, 10, 5, 14, 0);
      expect(formatDateLabel(date)).toBe('05.11.2025 14:00');
    });

    it('should include time when minutes are non-zero', () => {
      const date = new Date(2025, 10, 5, 0, 30);
      expect(formatDateLabel(date)).toBe('05.11.2025 00:30');
    });

    it('should format time with proper padding', () => {
      const date = new Date(2025, 10, 5, 9, 5);
      expect(formatDateLabel(date)).toBe('05.11.2025 09:05');
    });

    it('should handle date strings', () => {
      const result = formatDateLabel('2025-11-05T14:30:00');
      expect(result).toContain('05.11.2025');
      expect(result).toContain('14:30');
    });

    it('should return empty string for null', () => {
      expect(formatDateLabel(null)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateLabel('invalid')).toBe('');
    });

    it('should handle timestamp 0', () => {
      expect(formatDateLabel(0)).toContain('01.01.1970');
    });
  });
});

