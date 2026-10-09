/**
 * @module utils/dominantMethod
 * @description Finds the method whose forecast gives a toolbar lead square its colour.
 *
 * A square is coloured by the total synthesis, which at each lead is the highest normalised value
 * among the methods of that lead's resolution. The per-method synthesis carries those same values
 * (checked against the API: the maximum matches the total at every lead), so the method behind a
 * colour is found in the browser, from data already loaded.
 */

import {parseForecastDate} from '@/utils/forecastDateUtils.js';
import {isSameDay, isSameInstant} from '@/utils/targetDateUtils.js';

// Normalised values are rounded by the API (two decimals), so equal-looking values are equal.
const TIE_EPSILON = 1e-9;

const toDate = (value) => {
  if (value instanceof Date) return value;
  const parsed = parseForecastDate(value) || new Date(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * @typedef {Object} DominantMethodOptions
 * @property {boolean} [subDaily] - Whether the lead is a sub-daily one. Daily squares only
 *   compare daily methods and sub-daily segments only sub-daily ones, as the total does.
 * @property {Array<string>} [methodOrder] - Method ids in display order, used to break ties
 * @property {string} [preferredMethodId] - Method kept when it is among the tied ones (the
 *   current selection, so a click does not switch method for nothing)
 */

/**
 * @typedef {Object} DominantMethod
 * @property {string} methodId - Id of the method carrying the highest value
 * @property {number} value - Its normalised value at the lead
 */

/**
 * Finds the method with the highest normalised value at a lead.
 *
 * The per-method entries have no time step, so an entry is taken as sub-daily when any of its
 * dates falls outside midnight; otherwise a 6-hourly method's 00:00 value would compete for the
 * daily square of the same day. Daily leads match by day, sub-daily leads by instant. Methods
 * without a finite value at the lead are left out; ties go to `preferredMethodId` if it is
 * among them, then to the first in `methodOrder`, then to the first in the response.
 *
 * @param {Array<Object>} perMethodSynthesis - Entries `{method_id, target_dates, values_normalized}`
 * @param {Date} targetDate - Lead of the clicked square
 * @param {DominantMethodOptions} [options] - Resolution and tie-breaking
 * @returns {DominantMethod|null} The dominant method, or null when no method has a value there
 * @example
 * findDominantMethod(perMethod, new Date(2026, 9, 10), {methodOrder: ['4Zo-ARPEGE', '4Zo-GFS']});
 * // { methodId: '4Zo-ARPEGE', value: 0.27 }
 */
export function findDominantMethod(perMethodSynthesis, targetDate, options = {}) {
  const {subDaily = false, methodOrder = [], preferredMethodId = null} = options;
  const target = toDate(targetDate);
  if (!target || !Array.isArray(perMethodSynthesis)) return null;
  const matches = subDaily ? isSameInstant : isSameDay;

  const candidates = [];
  perMethodSynthesis.forEach((entry, position) => {
    const methodId = entry?.method_id;
    const dates = Array.isArray(entry?.target_dates) ? entry.target_dates.map(toDate) : [];
    const values = Array.isArray(entry?.values_normalized) ? entry.values_normalized : [];
    if (!methodId || !dates.length) return;
    const isSubDailyMethod = dates.some(d => d && (d.getHours() !== 0 || d.getMinutes() !== 0));
    if (isSubDailyMethod !== subDaily) return;
    const index = dates.findIndex(d => d && matches(d, target));
    const value = index >= 0 ? values[index] : undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    candidates.push({methodId, value, position});
  });
  if (!candidates.length) return null;

  const max = Math.max(...candidates.map(c => c.value));
  const tied = candidates.filter(c => max - c.value < TIE_EPSILON);
  const preferred = tied.find(c => c.methodId === preferredMethodId);
  if (preferred) return {methodId: preferred.methodId, value: preferred.value};

  const rank = (c) => {
    const i = methodOrder.indexOf(c.methodId);
    return i >= 0 ? i : methodOrder.length + c.position;
  };
  const best = tied.reduce((a, b) => (rank(b) < rank(a) ? b : a));
  return {methodId: best.methodId, value: best.value};
}
