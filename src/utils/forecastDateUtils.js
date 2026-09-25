/**
 * @module utils/forecastDateUtils
 * @description Date parsing and formatting utilities for forecast dates.
 * Handles various date formats used by the API and provides consistent parsing/formatting.
 */

/**
 * Parses various forecast date string formats into a JavaScript Date object.
 *
 * Supported formats:
 * - ISO 8601: "2023-01-15T12:00:00Z"
 * - Hour-only: "2023-01-15T12"
 * - Space/underscore: "2023-01-15 12:00", "2023-01-15_12:00"
 * - Compact: "2023011512" or "202301151200"
 *
 * @param {string} str - Date string to parse
 * @returns {Date|null} Parsed Date object, or null if parsing fails
 * @example
 * parseForecastDate("2023-01-15T12") // Returns: Date object for Jan 15, 2023 12:00
 * parseForecastDate("2023011512") // Returns: Date object for Jan 15, 2023 12:00
 * parseForecastDate("invalid") // Returns: null
 */
export function parseForecastDate(str) {
  if (!str) return null;
  const mHourOnly = str?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
  if (mHourOnly) {
    const [, y, mo, d, h] = mHourOnly;
    const dt = new Date(+y, +mo - 1, +d, +h, 0, 0);
    if (!isNaN(dt)) return dt;
  }
  let dt = new Date(str);
  if (!isNaN(dt)) return dt;
  if (/^\d{4}-\d{2}-\d{2}[ _]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    dt = new Date(str.replace(/[ _]/, 'T') + (str.length === 16 ? ':00' : '') + 'Z');
    if (!isNaN(dt)) return dt;
  }
  if (/^\d{10}(\d{2})?$/.test(str)) {
    const year = str.slice(0, 4), mo = str.slice(4, 6), d = str.slice(6, 8), h = str.slice(8, 10),
      mi = str.length >= 12 ? str.slice(10, 12) : '00';
    dt = new Date(`${year}-${mo}-${d}T${h}:${mi}:00Z`);
    if (!isNaN(dt)) return dt;
  }
  return null;
}

/**
 * Formats a Date object to a string format suitable for API requests.
 * The output format is determined by examining a reference string format.
 *
 * Output formats based on reference:
 * - "YYYY-MM-DDThh" reference → "YYYY-MM-DDThh"
 * - "YYYY-MM-DD" reference → "YYYY-MM-DD hh:mm"
 * - No reference → "YYYY-MM-DD hh:mm"
 * - Other references → ISO 8601 string
 *
 * @param {Date} dateObj - Date object to format
 * @param {string} [reference] - Reference format string to match
 * @returns {string|null} Formatted date string, or null if invalid date
 * @example
 * formatForecastDateForApi(new Date('2023-01-15T12:00'), '2023-01-01T00')
 * // Returns: "2023-01-15T12"
 *
 * formatForecastDateForApi(new Date('2023-01-15T12:00'), '2023-01-01')
 * // Returns: "2023-01-15 12:00"
 */
export function formatForecastDateForApi(dateObj, reference) {
  if (!dateObj || isNaN(dateObj)) return null;
  const pad = n => String(n).padStart(2, '0');
  if (reference && /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(reference)) {
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(reference || '')) {
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:00`;
  }
  if (!reference) return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
  return dateObj.toISOString();
}


/**
 * Lead time in hours of a target date, counted from the forecast base date.
 *
 * The one place leads are derived from dates: the details window lists its leads with it and the
 * time series converts a clicked date with it, so both sides agree on the lead of a given date.
 *
 * @param {Date|null} baseDate - Forecast base date
 * @param {Date|null} targetDate - Target date
 * @returns {number|null} Lead in whole hours (negative before the base date), or null if either date is invalid
 * @example
 * leadHours(new Date('2025-01-01T00:00'), new Date('2025-01-02T00:00')) // 24
 */
export function leadHours(baseDate, targetDate) {
  const valid = d => d instanceof Date && !isNaN(d);
  if (!valid(baseDate) || !valid(targetDate)) return null;
  return Math.round((targetDate.getTime() - baseDate.getTime()) / 3600000);
}

/**
 * Index of the date closest in time to a target; the earlier one on a tie.
 *
 * @param {Array<Date>} dates - Candidate dates
 * @param {Date|null} target - Date to match
 * @returns {number} Index into `dates`, or -1 when there is no valid candidate or target
 * @example
 * nearestDateIndex([new Date('2025-01-01'), new Date('2025-01-02')], new Date('2025-01-01T20:00')) // 1
 */
export function nearestDateIndex(dates, target) {
  if (!Array.isArray(dates) || !(target instanceof Date) || isNaN(target)) return -1;
  let best = -1;
  let bestDist = Infinity;
  dates.forEach((d, i) => {
    if (!(d instanceof Date) || isNaN(d)) return;
    const dist = Math.abs(d.getTime() - target.getTime());
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  });
  return best;
}
