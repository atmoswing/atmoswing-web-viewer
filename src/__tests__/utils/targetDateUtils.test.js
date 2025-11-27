import { describe, it, expect } from 'vitest';
import {
  SUB_HOURS,
  makeDayKey,
  parseDayKey,
  computeLeadHours,
  isSameDay,
  isSameInstant,
  hasTargetDate
} from '@/utils/targetDateUtils.js';

describe('targetDateUtils', () => {
  describe('SUB_HOURS', () => {
    it('should export sub-daily hour intervals', () => {
      expect(SUB_HOURS).toEqual([0, 6, 12, 18]);
    });
  });

  describe('makeDayKey', () => {
    it('should create YYYY-M-D key from date', () => {
      const date = new Date(2025, 10, 5); // Nov 5, 2025 (month is 0-based)
      expect(makeDayKey(date)).toBe('2025-10-5');
    });

    it('should handle single-digit dates', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(makeDayKey(date)).toBe('2025-0-5');
    });

    it('should return empty string for non-Date object', () => {
      expect(makeDayKey('not a date')).toBe('');
      expect(makeDayKey(null)).toBe('');
      expect(makeDayKey(undefined)).toBe('');
    });
  });

  describe('parseDayKey', () => {
    it('should parse YYYY-M-D key to Date', () => {
      const result = parseDayKey('2025-10-5');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10); // 0-based
      expect(result.getDate()).toBe(5);
    });

    it('should return Invalid Date for null', () => {
      const result = parseDayKey(null);
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('should return Invalid Date for invalid string', () => {
      const result = parseDayKey('invalid');
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('should return Invalid Date for non-string input', () => {
      const result = parseDayKey(12345);
      expect(isNaN(result.getTime())).toBe(true);
    });
  });

  describe('computeLeadHours', () => {
    it('should compute lead hours from base and target dates', () => {
      const baseDate = new Date(2025, 10, 5, 0, 0);
      const targetDate = new Date(2025, 10, 5, 12, 0);
      const result = computeLeadHours(baseDate, targetDate, 'daily', 0, [], []);
      expect(result).toBe(12);
    });

    it('should compute lead hours for multi-day difference', () => {
      const baseDate = new Date(2025, 10, 5, 0, 0);
      const targetDate = new Date(2025, 10, 7, 0, 0);
      const result = computeLeadHours(baseDate, targetDate, 'daily', 0, [], []);
      expect(result).toBe(48);
    });

    it('should return 0 for negative time difference', () => {
      const baseDate = new Date(2025, 10, 7, 0, 0);
      const targetDate = new Date(2025, 10, 5, 0, 0);
      const result = computeLeadHours(baseDate, targetDate, 'daily', 0, [], []);
      expect(result).toBe(0); // clamped to 0
    });

    it('should fall back to sub-daily leads when dates are invalid', () => {
      const subDailyLeads = [
        { time_step: 6, date: new Date() },
        { time_step: 6, date: new Date() }
      ];
      const result = computeLeadHours(null, null, 'sub', 2, [], subDailyLeads);
      expect(result).toBe(12); // 6 * 2
    });

    it('should fall back to daily leads when dates are invalid', () => {
      const dailyLeads = [
        { time_step: 24, date: new Date() },
        { time_step: 24, date: new Date() }
      ];
      const result = computeLeadHours(null, null, 'daily', 3, dailyLeads, []);
      expect(result).toBe(72); // 24 * 3
    });

    it('should use default time_step of 24 for daily if not in array', () => {
      const result = computeLeadHours(null, null, 'daily', 2, [], []);
      expect(result).toBe(48); // 24 * 2
    });

    it('should use default time_step of 0 for sub-daily if not in array', () => {
      const result = computeLeadHours(null, null, 'sub', 2, [], []);
      expect(result).toBe(0); // 0 * 2
    });

    it('should handle timezone offset differences', () => {
      const baseDate = new Date('2025-11-05T00:00:00');
      const targetDate = new Date('2025-11-05T12:00:00');
      const result = computeLeadHours(baseDate, targetDate, 'daily', 0, [], []);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same calendar day', () => {
      const date1 = new Date(2025, 10, 5, 10, 0);
      const date2 = new Date(2025, 10, 5, 18, 0);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2025, 10, 5);
      const date2 = new Date(2025, 10, 6);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2025, 10, 5);
      const date2 = new Date(2025, 9, 5);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date(2025, 10, 5);
      const date2 = new Date(2024, 10, 5);
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for non-Date objects', () => {
      expect(isSameDay('not a date', new Date())).toBe(false);
      expect(isSameDay(new Date(), null)).toBe(false);
    });
  });

  describe('isSameInstant', () => {
    it('should return true for exact same timestamp', () => {
      const date1 = new Date('2025-11-05T12:30:00Z');
      const date2 = new Date('2025-11-05T12:30:00Z');
      expect(isSameInstant(date1, date2)).toBe(true);
    });

    it('should return false for different timestamps', () => {
      const date1 = new Date('2025-11-05T12:30:00Z');
      const date2 = new Date('2025-11-05T12:30:01Z');
      expect(isSameInstant(date1, date2)).toBe(false);
    });

    it('should return false for non-Date objects', () => {
      expect(isSameInstant('not a date', new Date())).toBe(false);
      expect(isSameInstant(new Date(), null)).toBe(false);
    });
  });

  describe('hasTargetDate', () => {
    const targetDate = new Date('2025-11-05T12:00:00Z');
    const dailyLeads = [
      { date: new Date('2025-11-05T00:00:00Z') },
      { date: new Date('2025-11-06T00:00:00Z') }
    ];
    const subDailyLeads = [
      { date: new Date('2025-11-05T12:00:00Z') },
      { date: new Date('2025-11-05T18:00:00Z') }
    ];

    it('should find target date in sub-daily leads by exact instant', () => {
      const result = hasTargetDate('sub', targetDate, [], subDailyLeads);
      expect(result).toBe(true);
    });

    it('should not find target date in sub-daily leads if time differs', () => {
      const wrongTime = new Date('2025-11-05T14:00:00Z');
      const result = hasTargetDate('sub', wrongTime, [], subDailyLeads);
      expect(result).toBe(false);
    });

    it('should find target date in daily leads by same day', () => {
      const result = hasTargetDate('daily', targetDate, dailyLeads, []);
      expect(result).toBe(true);
    });

    it('should not find target date in daily leads if day differs', () => {
      const wrongDay = new Date('2025-11-07T12:00:00Z');
      const result = hasTargetDate('daily', wrongDay, dailyLeads, []);
      expect(result).toBe(false);
    });

    it('should return false if target date is null', () => {
      const result = hasTargetDate('daily', null, dailyLeads, []);
      expect(result).toBe(false);
    });

    it('should return false if leads array is empty', () => {
      const result = hasTargetDate('daily', targetDate, [], []);
      expect(result).toBe(false);
    });
  });
});

