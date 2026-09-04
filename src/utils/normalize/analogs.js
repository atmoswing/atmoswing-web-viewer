/**
 * @module utils/normalize/analogs
 * @description Analog value, date, criteria and percentile responses.
 *
 * Normalizers turn the API's varying response shapes into one predictable structure, so
 * nothing downstream has to branch on which form arrived.
 */

/**
 * Normalizes analog data from various response formats.
 * @param {*} resp - Raw API response containing analog data
 * @returns {Array<Object>} Array of analog objects with {rank, date, value, criteria}
 * @example
 * normalizeAnalogsResponse({analogs: [{rank: 1, date: "2020-01-15", value: 25.3}]})
 */
export function normalizeAnalogsResponse(resp) {
  // Gather candidate arrays from various shapes
  let arr = [];
  if (Array.isArray(resp)) arr = resp;
  else if (resp && Array.isArray(resp.analogs)) arr = resp.analogs;
  else if (resp && Array.isArray(resp.analog_values)) arr = resp.analog_values;
  else if (resp && Array.isArray(resp.values)) arr = resp.values;
  else if (resp && Array.isArray(resp.data)) arr = resp.data;
  else if (resp && Array.isArray(resp.items)) arr = resp.items;
  else arr = [];

  return arr.map((it, i) => {
    if (typeof it === 'number') {
      return {rank: i + 1, date: null, value: it, criteria: null};
    }
    const rank = it?.rank ?? it?.analog ?? (i + 1);
    const date = it?.date ?? it?.analog_date ?? it?.analog_date_str ?? it?.dt ?? it?.date_str ?? it?.target_date ?? null;
    // Prefer explicit numeric keys but fall back to common aliases
    let v = (it && it.value != null) ? it.value
      : (it && it.precip_value != null ? it.precip_value
        : (it && it.value_mm != null ? it.value_mm
          : (it && it.amount != null ? it.amount : null)));
    if (v == null && it && typeof it === 'object') {
      const aliases = ['val', 'value_mm', 'precip', 'precipitation'];
      for (const k of aliases) {
        if (it[k] != null && typeof it[k] !== 'object') {
          v = it[k];
          break;
        }
      }
    }
    const value = (typeof v === 'number') ? v : (v == null ? null : Number(v));
    const criteria = it?.criteria ?? it?.score ?? it?.criterion ?? it?.crit ?? null;
    return {rank, date, value, criteria};
  });
}

// Analog dates: return array of date strings
export function normalizeAnalogDatesArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.analog_dates)) return resp.analog_dates;
  if (Array.isArray(resp.series_values?.target_dates)) return resp.series_values.target_dates;
  return [];
}

// Analog criteria: return array of numbers in same order as dates
export function normalizeAnalogCriteriaArray(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.criteria)) return resp.criteria;
  if (Array.isArray(resp.analog_criteria)) return resp.analog_criteria;
  if (Array.isArray(resp.analogs) && resp.analogs.length && resp.analogs[0] && resp.analogs[0].criteria != null) return resp.analogs.map(a => a.criteria);
  return [];
}

// Normalize analog values percentiles into a map, e.g. {20: value, 60: value, 90: value}
export function normalizeAnalogPercentiles(resp) {
  if (!resp) return null;
  let pcts = [], vals = [];
  if (Array.isArray(resp.percentiles) && Array.isArray(resp.values)) {
    pcts = resp.percentiles;
    vals = resp.values;
  } else if (Array.isArray(resp.items)) {
    pcts = resp.items.map(it => it.percentile ?? it.p);
    vals = resp.items.map(it => it.value);
  }
  const out = {};
  if (Array.isArray(pcts) && Array.isArray(vals)) {
    for (let i = 0; i < pcts.length; i++) {
      const p = Number(pcts[i]);
      const v = Number(vals[i]);
      if (Number.isFinite(p) && Number.isFinite(v)) out[p] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}
