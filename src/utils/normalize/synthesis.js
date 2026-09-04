/**
 * @module utils/normalize/synthesis
 * @description Synthesis responses and the forecast-availability checks.
 *
 * Normalizers turn the API's varying response shapes into one predictable structure, so
 * nothing downstream has to branch on which form arrived.
 */

export function normalizePerMethodSynthesis(resp) {
  return Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
}

// Normalize synthesis has leads -> boolean
export function normalizeSynthesisHasLeads(resp) {
  if (!resp || typeof resp !== 'object') return false;
  const arr = Array.isArray(resp.series_percentiles) ? resp.series_percentiles : [];
  for (let i = 0; i < arr.length; i++) {
    const sp = arr[i];
    if (Array.isArray(sp?.target_dates) && sp.target_dates.length > 0) return true;
  }
  return false;
}

// Normalize hasForecastDate response -> boolean
export function normalizeHasForecastDate(resp) {
  if (!resp || typeof resp !== 'object') return false;
  return !!(resp.has_forecasts || resp.hasForecasts);
}
