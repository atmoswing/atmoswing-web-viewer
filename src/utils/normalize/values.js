/**
 * @module utils/normalize/values
 * @description Forecast values and reference (return period) responses.
 *
 * Normalizers turn the API's varying response shapes into one predictable structure, so
 * nothing downstream has to branch on which form arrived.
 */

/**
 * Normalizes forecast values response into separate normalized and raw value maps.
 *
 * @param {Object} resp - Raw API response with entity_ids, values_normalized, and values arrays
 * @returns {Object} Object with {norm: Object, raw: Object, unavailable: boolean}
 * @returns {Object} returns.norm - Map of entity ID to normalized value
 * @returns {Object} returns.raw - Map of entity ID to raw value
 * @returns {boolean} returns.unavailable - True if data is missing or malformed
 * @example
 * normalizeForecastValuesResponse({
 *   entity_ids: [1, 2],
 *   values_normalized: [0.5, 0.8],
 *   values: [25.5, 40.2]
 * })
 * // Returns: {
 * //   norm: {1: 0.5, 2: 0.8},
 * //   raw: {1: 25.5, 2: 40.2},
 * //   unavailable: false
 * // }
 */
export function normalizeForecastValuesResponse(resp) {
  if (!resp || typeof resp !== 'object') return {norm: {}, raw: {}, unavailable: true};
  const ids = Array.isArray(resp.entity_ids) ? resp.entity_ids : [];
  const valsNorm = Array.isArray(resp.values_normalized) ? resp.values_normalized : [];
  const valsRaw = Array.isArray(resp.values) ? resp.values : [];
  const allEmpty = ids.length > 0 && valsNorm.length === 0 && valsRaw.length === 0;
  const mismatch = ids.length > 0 && ((valsNorm.length > 0 && valsNorm.length !== ids.length) && (valsRaw.length > 0 && valsRaw.length !== ids.length));
  if (allEmpty || mismatch) return {norm: {}, raw: {}, unavailable: true};
  const normMap = {}, rawMap = {};
  ids.forEach((id, i) => {
    normMap[id] = valsNorm[i];
    rawMap[id] = valsRaw[i];
  });
  return {norm: normMap, raw: rawMap, unavailable: false};
}

/**
 * Converts an API number to a finite number, treating a missing entry as absent rather than 0.
 *
 * @private
 * @param {*} value - Raw value
 * @returns {number|null} The number, or null for null, undefined, blank strings and non-numbers
 */
function toFiniteNumber(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizes reference (return period) values into aligned `axis`/`values` arrays.
 *
 * Accepts `{reference_axis, reference_values}`, `{axis, values}` or `{items: [{rp, value}]}`.
 * Only complete pairs are kept: a missing entry must not survive as 0, since `Number(null)` and
 * `Number('')` are both 0 and every chart would draw that as a real 0 mm return period.
 *
 * @param {Object|null} resp - Raw API response
 * @returns {{axis: Array<number>, values: Array<number>}|null} Aligned pairs, or null when none
 *   are usable or the arrays disagree in length
 * @example
 * normalizeReferenceValues({reference_axis: [2, 10], reference_values: [null, 26]})
 * // Returns: {axis: [10], values: [26]}
 */
export function normalizeReferenceValues(resp) {
  if (!resp) return null;
  let rawAxis = [], rawValues = [];
  if (Array.isArray(resp.reference_axis) && Array.isArray(resp.reference_values)) {
    rawAxis = resp.reference_axis;
    rawValues = resp.reference_values;
  } else if (Array.isArray(resp.axis) && Array.isArray(resp.values)) {
    rawAxis = resp.axis;
    rawValues = resp.values;
  } else if (Array.isArray(resp.items)) {
    rawAxis = resp.items.map(it => it?.rp ?? it?.return_period ?? it?.x);
    rawValues = resp.items.map(it => it?.value ?? it?.y);
  }
  if (!rawAxis.length || rawAxis.length !== rawValues.length) return null;

  const axis = [];
  const values = [];
  rawAxis.forEach((rp, i) => {
    const period = toFiniteNumber(rp);
    const value = toFiniteNumber(rawValues[i]);
    if (period != null && value != null) {
      axis.push(period);
      values.push(value);
    }
  });
  return axis.length ? {axis, values} : null;
}
