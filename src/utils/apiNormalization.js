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
    const arr = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.analogs) ? resp.analogs : []);
    return arr.map((it, i) => ({
        rank: it.rank ?? it.analog ?? (i + 1),
        date: it.date ?? it.analog_date ?? it.analog_date_str ?? it.dt ?? it.date_str ?? null,
        value: (it.value != null) ? it.value : (it.precip_value != null ? it.precip_value : it.value_mm ?? null),
        criteria: it.criteria ?? it.score ?? it.criterion ?? null
    }));
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

