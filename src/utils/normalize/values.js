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

// Normalize reference values ({reference_axis, reference_values}) -> { axis:number[], values:number[] }
export function normalizeReferenceValues(resp) {
  if (!resp) return null;
  let axis = [], values = [];
  if (Array.isArray(resp.reference_axis) && Array.isArray(resp.reference_values)) {
    axis = resp.reference_axis.map(Number);
    values = resp.reference_values.map(Number);
  } else if (Array.isArray(resp.axis) && Array.isArray(resp.values)) {
    axis = resp.axis.map(Number);
    values = resp.values.map(Number);
  } else if (Array.isArray(resp.items)) {
    axis = resp.items.map(it => Number(it?.rp ?? it?.return_period ?? it?.x));
    values = resp.items.map(it => Number(it?.value ?? it?.y));
  }
  if (!axis.length || axis.length !== values.length) return null;
  return {axis, values};
}
