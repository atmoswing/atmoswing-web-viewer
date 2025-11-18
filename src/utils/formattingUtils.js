/**
 * @module utils/formattingUtils
 * @description Generic formatting utilities for dates, numbers, and entity names.
 * Provides consistent formatting across the application for display purposes.
 */

/**
 * Format a Date or date-like value to DD.MM.YYYY format (e.g., 05.11.2025).
 * Returns empty string on invalid input.
 *
 * @param {Date|string|number} dateLike - Date object, timestamp, or date string
 * @returns {string} Formatted date string or empty string if invalid
 * @example
 * formatDateDDMMYYYY(new Date('2025-11-05')) // Returns: "05.11.2025"
 * formatDateDDMMYYYY('2025-11-05') // Returns: "05.11.2025"
 * formatDateDDMMYYYY(null) // Returns: ""
 */
export function formatDateDDMMYYYY(dateLike) {
  if (!dateLike && dateLike !== 0) return '';
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (!(d instanceof Date) || isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Formats precipitation value to string with one decimal place.
 *
 * @param {number|string|null} value - Precipitation value to format
 * @returns {string} Formatted string: number with 1 decimal, '0' for zero, '-' for null/undefined
 * @example
 * formatPrecipitation(25.67) // Returns: "25.7"
 * formatPrecipitation(0) // Returns: "0"
 * formatPrecipitation(null) // Returns: "-"
 */
export function formatPrecipitation(value) {
  if (value == null) return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n === 0) return '0';
  return n.toFixed(1);
}

/**
 * Formats a criteria/score value to string with two decimal places.
 *
 * @param {number|string|null} value - Criteria value to format
 * @returns {string} Formatted string with 2 decimals, or '-' for null/undefined
 * @example
 * formatCriteria(0.12345) // Returns: "0.12"
 * formatCriteria(null) // Returns: "-"
 */
export function formatCriteria(value) {
  if (value == null) return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2);
}

/**
 * Compares two entity objects by name for sorting, case-insensitive.
 * Falls back to comparing by id if name is not available.
 *
 * @param {Object} a - First entity with name and/or id
 * @param {Object} b - Second entity with name and/or id
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
 * @example
 * const entities = [{name: "Station B"}, {name: "Station A"}];
 * entities.sort(compareEntitiesByName);
 * // Results in: [{name: "Station A"}, {name: "Station B"}]
 */
export function compareEntitiesByName(a, b) {
  const aName = (a?.name ?? a?.id ?? '').toString().toLowerCase();
  const bName = (b?.name ?? b?.id ?? '').toString().toLowerCase();
  if (aName < bName) return -1;
  if (aName > bName) return 1;
  return 0;
}

/**
 * Formats a Date into a display label with optional time component.
 * Includes time (HH:MM) only if hours or minutes are non-zero.
 *
 * @param {Date|string|number} date - Date object, timestamp, or date string
 * @returns {string} Formatted string "DD.MM.YYYY" or "DD.MM.YYYY HH:MM"
 * @example
 * formatDateLabel(new Date('2025-11-05T00:00')) // Returns: "05.11.2025"
 * formatDateLabel(new Date('2025-11-05T14:30')) // Returns: "05.11.2025 14:30"
 */
export function formatDateLabel(date) {
  if (!date && date !== 0) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (!(d instanceof Date) || isNaN(d)) return '';
  const base = formatDateDDMMYYYY(d);
  const hh = d.getHours();
  const mm = d.getMinutes();
  if (hh || mm) {
    return `${base} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return base;
}
