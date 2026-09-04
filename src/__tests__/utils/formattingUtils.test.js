import {describe, expect, it} from 'vitest';
import {
  compareEntitiesByName,
  entityDisplayName,
  formatCriteria,
  formatDateHour,
  formatDateISO,
  formatDateDDMMYYYY,
  formatDateLabel,
  formatPrecipitation
} from '@/utils/formattingUtils.js';

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
      const a = {name: 'Station B', id: 1};
      const b = {name: 'Station A', id: 2};
      expect(compareEntitiesByName(a, b)).toBe(1);
      expect(compareEntitiesByName(b, a)).toBe(-1);
    });

    it('should be case-insensitive', () => {
      const a = {name: 'station b'};
      const b = {name: 'Station A'};
      expect(compareEntitiesByName(a, b)).toBe(1);
    });

    it('should return 0 for equal names', () => {
      const a = {name: 'Station A'};
      const b = {name: 'Station A'};
      expect(compareEntitiesByName(a, b)).toBe(0);
    });

    it('should fall back to id if name is missing', () => {
      const a = {id: 2};
      const b = {id: 1};
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
      const a = {id: 10};
      const b = {id: 2};
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

describe('formatDateISO', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateISO(new Date(2025, 10, 5))).toBe('2025-11-05');
  });

  it('pads single-digit months and days', () => {
    expect(formatDateISO(new Date(2025, 0, 2))).toBe('2025-01-02');
  });

  it('uses local date parts, so a late-evening time keeps its own day', () => {
    // toISOString() would roll this back to the 4th for any timezone east of UTC.
    expect(formatDateISO(new Date(2025, 10, 5, 23, 30))).toBe('2025-11-05');
  });

  it('accepts strings and timestamps', () => {
    expect(formatDateISO('2025-11-05T06:00')).toBe('2025-11-05');
    expect(formatDateISO(new Date(2025, 10, 5).getTime())).toBe('2025-11-05');
  });

  it('returns an empty string for unusable input', () => {
    expect(formatDateISO(null)).toBe('');
    expect(formatDateISO(undefined)).toBe('');
    expect(formatDateISO('')).toBe('');
    expect(formatDateISO('not a date')).toBe('');
  });
});

describe('formatDateHour', () => {
  it('appends the zero-padded hour to the date', () => {
    expect(formatDateHour(new Date(2025, 10, 5, 6))).toBe('05.11.2025 06h');
    expect(formatDateHour(new Date(2025, 10, 5, 18))).toBe('05.11.2025 18h');
  });

  it('keeps midnight as 00h rather than dropping it', () => {
    expect(formatDateHour(new Date(2025, 10, 5, 0))).toBe('05.11.2025 00h');
  });

  it('returns an empty string for unusable input', () => {
    expect(formatDateHour(null)).toBe('');
    expect(formatDateHour('not a date')).toBe('');
  });
});

describe('entityDisplayName', () => {
  const entities = [{id: 3, name: 'Sion'}, {id: 4, name: ''}, {id: 5}];

  it('prefers the entity name', () => {
    expect(entityDisplayName(entities, 3)).toBe('Sion');
  });

  it('falls back to the id when the name is missing or blank', () => {
    expect(entityDisplayName(entities, 4)).toBe('4');
    expect(entityDisplayName(entities, 5)).toBe('5');
  });

  it('falls back to the requested id when the entity is not in the list', () => {
    expect(entityDisplayName(entities, 99)).toBe('99');
    expect(entityDisplayName([], 99)).toBe('99');
  });

  it('returns an empty string when nothing is selected', () => {
    expect(entityDisplayName(entities, null)).toBe('');
    expect(entityDisplayName(entities, undefined)).toBe('');
  });

  it('treats id 0 as a real selection', () => {
    // A truthiness check here would render an empty label for a valid entity.
    expect(entityDisplayName([{id: 0, name: 'Zero'}], 0)).toBe('Zero');
    expect(entityDisplayName([], 0)).toBe('0');
  });

  it('tolerates a missing or non-array entity list', () => {
    expect(entityDisplayName(null, 3)).toBe('3');
    expect(entityDisplayName(undefined, 3)).toBe('3');
  });
});
