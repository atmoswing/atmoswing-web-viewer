// Generic formatting helpers

/**
 * Format a Date or date-like value to DD.MM.YYYY (e.g., 05.11.2025).
 * Returns empty string on invalid input.
 * @param {Date|string|number} dateLike
 * @returns {string}
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
 * Format precipitation value: numeric with one decimal, '-' if null/undefined, '0' if zero.
 * Accepts string/number; returns string.
 */
export function formatPrecipitation(value) {
  if (value == null) return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n === 0) return '0';
  return n.toFixed(1);
}

/**
 * Format a generic criteria/score number with 2 decimals; '-' if null/undefined.
 */
export function formatCriteria(value) {
  if (value == null) return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2);
}

/**
 * Compare two entity-like objects {name?, id?} by name (fallback to id), case-insensitive.
 * Returns -1/0/1
 */
export function compareEntitiesByName(a, b) {
  const aName = (a?.name ?? a?.id ?? '').toString().toLowerCase();
  const bName = (b?.name ?? b?.id ?? '').toString().toLowerCase();
  if (aName < bName) return -1;
  if (aName > bName) return 1;
  return 0;
}

/**
 * Format a Date into label: DD.MM.YYYY[ HH:MM] if time exists.
 */
export function formatDateLabel(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const base = formatDateDDMMYYYY(date);
  const hh = date.getHours();
  const mm = date.getMinutes();
  if (hh || mm) {
    return `${base} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return base;
}
