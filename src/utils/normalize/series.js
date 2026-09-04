/**
 * @module utils/normalize/series
 * @description Time series responses, whose dates need the application date parser.
 *
 * Normalizers turn the API's varying response shapes into one predictable structure, so
 * nothing downstream has to branch on which form arrived.
 */

/**
 * Extracts target dates array from various API response formats.
 *
 * @param {*} resp - Raw API response (can be object, array, or nested structure)
 * @returns {Array<string>} Array of target date strings, or empty array if not found
 * @example
 * extractTargetDatesArray({series_values: {target_dates: ['2023-01-15', '2023-01-16']}})
 * // Returns: ['2023-01-15', '2023-01-16']
 */
export function extractTargetDatesArray(resp) {
  if (!resp) return [];
  if (resp.series_values && Array.isArray(resp.series_values.target_dates)) return resp.series_values.target_dates;
  if (Array.isArray(resp.target_dates)) return resp.target_dates;
  if (Array.isArray(resp.series_percentiles) && resp.series_percentiles.length && Array.isArray(resp.series_percentiles[0].target_dates)) return resp.series_percentiles[0].target_dates;
  if (Array.isArray(resp.series) && resp.series.length && Array.isArray(resp.series[0].target_dates)) return resp.series[0].target_dates;
  if (Array.isArray(resp)) {
    if (resp.length && typeof resp[0] === 'string') return resp;
    if (resp.length && resp[0] && Array.isArray(resp[0].target_dates)) return resp[0].target_dates;
  }
  return [];
}

/**
 * Parses an API date with the caller's parser, falling back to `Date` when it cannot.
 *
 * The series endpoints return dates in the application's own forecast format, which `Date`
 * does not understand, so callers pass `parseForecastDate`. The fallback keeps plain ISO
 * responses working and makes the parser optional.
 *
 * @private
 * @param {*} value - Raw date from the API
 * @param {Function} [parseDateFn] - Preferred parser
 * @returns {Date} Parsed date, possibly invalid — callers filter with `isNaN`
 */
function toDate(value, parseDateFn) {
  return parseDateFn ? (parseDateFn(value) || new Date(value)) : new Date(value);
}

// Normalize series values percentiles -> { dates: Date[], percentiles: Record<number, number[]>, pctList: number[] }
export function normalizeSeriesValuesPercentiles(resp, parseDateFn) {
  if (!resp || typeof resp !== 'object') return {dates: [], percentiles: {}, pctList: []};
  const rawDates = resp?.series_values?.target_dates || [];
  const dates = Array.isArray(rawDates)
    ? rawDates.map(d => toDate(d, parseDateFn)).filter(dt => dt && !isNaN(dt))
    : [];
  const seriesPercentiles = Array.isArray(resp?.series_values?.series_percentiles) ? resp.series_values.series_percentiles : [];
  const pctMap = {};
  seriesPercentiles.forEach(sp => {
    const p = Number(sp?.percentile);
    if (!Number.isFinite(p)) return;
    const arr = Array.isArray(sp?.series_values) ? sp.series_values.map(v => (typeof v === 'number' ? v : (v == null ? null : Number(v)))) : [];
    pctMap[p] = arr;
  });
  const pctList = Object.keys(pctMap).map(Number).sort((a, b) => a - b);
  return {dates, percentiles: pctMap, pctList};
}

// Normalize history of series percentiles -> Array<{ forecastDate: Date, dates: Date[], percentiles: Record<number, number[]> }>
export function normalizeSeriesValuesPercentilesHistory(resp, parseDateFn) {
  const raw = Array.isArray(resp?.past_forecasts) ? resp.past_forecasts : [];
  return raw.map(item => {
    const forecastDate = toDate(item.forecast_date, parseDateFn);
    const dates = Array.isArray(item.target_dates)
      ? item.target_dates.map(d => toDate(d, parseDateFn)).filter(dt => dt && !isNaN(dt))
      : [];
    const pctMap = {};
    if (Array.isArray(item.series_percentiles)) {
      item.series_percentiles.forEach(sp => {
        const pNum = Number(sp.percentile);
        if (!Number.isFinite(pNum)) return;
        pctMap[pNum] = Array.isArray(sp.series_values) ? sp.series_values.map(v => (typeof v === 'number' ? v : (v == null ? null : Number(v)))) : [];
      });
    }
    return {forecastDate, dates, percentiles: pctMap};
  }).filter(p => p.dates && p.dates.length);
}

// Normalize best analogs for series -> { items: {values:number[], datesByAnalog:(Date|null)[]}[], dates?: Date[], hasAnalogHours:boolean }
export function normalizeSeriesBestAnalogs(resp, parseDateFn) {
  if (!resp || typeof resp !== 'object' || !Array.isArray(resp.series_values) || !resp.series_values.length) return null;
  const parsedTargetDates = Array.isArray(resp.target_dates)
    ? resp.target_dates.map(d => toDate(d, parseDateFn))
    : null;
  const rowsValues = resp.series_values;
  const nRows = rowsValues.length;
  const nAnalogs = rowsValues.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
  const rowsDates = Array.isArray(resp.series_dates) ? resp.series_dates : null;
  const items = [];
  let hasAnalogHours = false;
  for (let c = 0; c < nAnalogs; c++) {
    const values = [];
    const analogDates = [];
    for (let r = 0; r < nRows; r++) {
      const rowVals = rowsValues[r];
      const v = (Array.isArray(rowVals) && rowVals.length > c) ? rowVals[c] : null;
      values.push(typeof v === 'number' ? v : (v == null ? null : Number(v)));
      if (rowsDates && Array.isArray(rowsDates[r])) {
        const rawDate = rowsDates[r].length > c ? rowsDates[r][c] : null;
        const dt = rawDate ? toDate(rawDate, parseDateFn) : null;
        analogDates.push(dt && !isNaN(dt) ? dt : null);
        if (dt && (dt.getHours() !== 0 || dt.getMinutes() !== 0 || dt.getSeconds() !== 0)) {
          hasAnalogHours = true;
        }
      } else {
        analogDates.push(null);
      }
    }
    items.push({values, datesByAnalog: analogDates});
  }
  return {items, dates: parsedTargetDates || undefined, hasAnalogHours};
}
