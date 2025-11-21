/**
 * @module utils/targetDateUtils
 * @description Utility helpers for lead time calculations and date comparisons.
 * Centralizes logic for working with forecast target dates and lead times.
 */

/**
 * Sub-daily hour intervals for forecast resolution.
 * @constant {Array<number>}
 */
export const SUB_HOURS = [0, 6, 12, 18];

/**
 * Creates a stable YYYY-M-D key string for a date.
 * Note: Month is 0-based as per JavaScript Date API.
 *
 * @param {Date} date - Date object to convert to key
 * @returns {string} Date key in format "YYYY-M-D", or empty string if invalid
 * @example
 * makeDayKey(new Date(2025, 10, 5)) // Returns: "2025-10-5"
 */
export function makeDayKey(date) {
  if (!(date instanceof Date)) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Parses a YYYY-M-D key string back to a Date object.
 * Month is treated as 0-based (JavaScript Date convention).
 *
 * @param {string} key - Date key in format "YYYY-M-D"
 * @returns {Date} Date object, or Invalid Date if parsing fails
 * @example
 * parseDayKey("2025-10-5") // Returns: Date object for November 5, 2025
 */
export function parseDayKey(key) {
  if (!key || typeof key !== 'string') return new Date(NaN);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m, d);
}

/**
 * Compute lead hours given either a base date + target date (preferred) or fallback indices.
 * Applies timezone offset adjustment when both dates are provided to keep consistent hour differences.
 *
 * @param {Date|null} forecastBaseDate
 * @param {Date|null} selectedTargetDate
 * @param {'daily'|'sub'} leadResolution
 * @param {number} selectedLead
 * @param {Array<{time_step:number,date:Date}>} dailyLeads
 * @param {Array<{time_step:number,date:Date}>} subDailyLeads
 * @returns {number} non-negative integer lead hours
 */
export function computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads) {
  let leadHours = 0;
  if (forecastBaseDate instanceof Date && selectedTargetDate instanceof Date && !isNaN(forecastBaseDate) && !isNaN(selectedTargetDate)) {
    leadHours = Math.max(0, Math.round((selectedTargetDate.getTime() - forecastBaseDate.getTime()) / 3600000));
    // Timezone offset difference adjustment (minutes -> hours) to maintain logical hour lead independent of TZ shifts
    const tzDiffMinutes = selectedTargetDate.getTimezoneOffset() - forecastBaseDate.getTimezoneOffset();
    if (tzDiffMinutes) leadHours -= tzDiffMinutes / 60;
    return leadHours;
  }
  // Fallback: derive from arrays & index
  if (leadResolution === 'sub') {
    const step = subDailyLeads?.[selectedLead]?.time_step || subDailyLeads?.[0]?.time_step || 0;
    leadHours = step * selectedLead;
  } else {
    const step = dailyLeads?.[selectedLead]?.time_step || dailyLeads?.[0]?.time_step || 24;
    leadHours = step * selectedLead;
  }
  return leadHours < 0 ? 0 : leadHours;
}

/** Compare two dates on calendar day only. */
export function isSameDay(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Strict timestamp equality (ms). */
export function isSameInstant(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return a.getTime() === b.getTime();
}

/** Determine if target date is present among leads given resolution. */
export function hasTargetDate(leadResolution, selectedTargetDate, dailyLeads, subDailyLeads) {
  if (!selectedTargetDate) return false;
  if (leadResolution === 'sub') {
    return !!subDailyLeads?.find(l => isSameInstant(l.date, selectedTargetDate));
  }
  return !!dailyLeads?.find(l => isSameDay(l.date, selectedTargetDate));
}
