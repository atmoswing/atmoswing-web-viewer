// filepath: d:\Development\atmoswing-web-viewer\src\utils\apiNormalization.js
// Helpers to normalize varied API response shapes into predictable structures.

// Entities list: return an array of {id, name?}
export function normalizeEntitiesResponse(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.entities)) return resp.entities;
  return [];
}

// Relevant entity ids: return a Set of ids (string|number)
export function normalizeRelevantEntityIds(resp) {
  let ids = [];
  if (!resp) return new Set();
  if (Array.isArray(resp)) {
    if (resp.length && typeof resp[0] === 'object') {
      ids = resp.map(r => r?.id ?? r?.entity_id).filter(v => v != null);
    } else {
      ids = resp;
    }
  } else if (typeof resp === 'object') {
    ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
  }
  return new Set(ids);
}

// Analogs list: return array of { rank, date, value, criteria }
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
      return { rank: i + 1, date: null, value: it, criteria: null };
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
        if (it[k] != null && typeof it[k] !== 'object') { v = it[k]; break; }
      }
    }
    const value = (typeof v === 'number') ? v : (v == null ? null : Number(v));
    const criteria = it?.criteria ?? it?.score ?? it?.criterion ?? it?.crit ?? null;
    return { rank, date, value, criteria };
  });
}

// Extracts an array of date strings representing target dates from various response shapes
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

// Add forecast values and methods/synthesis normalization helpers
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

export function normalizeMethodsAndConfigs(resp) {
  const methods = Array.isArray(resp?.methods) ? resp.methods : [];
  return methods.map(m => ({
    id: m.id,
    name: m.name,
    children: Array.isArray(m.configurations) ? m.configurations.map(c => ({id: c.id, name: c.name})) : []
  }));
}

export function normalizePerMethodSynthesis(resp) {
  return Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
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

// Normalize hasForecastDate response -> boolean
export function normalizeHasForecastDate(resp) {
  if (!resp || typeof resp !== 'object') return false;
  return !!(resp.has_forecasts || resp.hasForecasts);
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

// Normalize series values percentiles -> { dates: Date[], percentiles: Record<number, number[]>, pctList: number[] }
export function normalizeSeriesValuesPercentiles(resp, parseDateFn) {
  if (!resp || typeof resp !== 'object') return {dates: [], percentiles: {}, pctList: []};
  const rawDates = resp?.series_values?.target_dates || [];
  const dates = Array.isArray(rawDates)
    ? rawDates.map(d => (parseDateFn ? (parseDateFn(d) || new Date(d)) : new Date(d))).filter(dt => dt && !isNaN(dt))
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
    const forecastDate = parseDateFn ? (parseDateFn(item.forecast_date) || new Date(item.forecast_date)) : new Date(item.forecast_date);
    const dates = (Array.isArray(item.target_dates) ? item.target_dates.map(d => (parseDateFn ? (parseDateFn(d) || new Date(d)) : new Date(d))).filter(dt => dt && !isNaN(dt)) : []);
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
    ? resp.target_dates.map(d => (parseDateFn ? (parseDateFn(d) || new Date(d)) : new Date(d)))
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
        const dt = rawDate ? (parseDateFn ? (parseDateFn(rawDate) || new Date(rawDate)) : new Date(rawDate)) : null;
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
