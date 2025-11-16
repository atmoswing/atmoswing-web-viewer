// Utility helpers for building API query strings and composing endpoint paths.
// Keep this lean; no external dependencies.

// Build repeated key query like percentiles=10&percentiles=50
export function buildRepeatedParamQuery(key, values) {
  if (!values || !Array.isArray(values) || values.length === 0) return '';
  const parts = values.map(v => `${key}=${encodeURIComponent(v)}`);
  return `?${parts.join('&')}`;
}

export function buildPercentilesQuery(percentiles) {
  return buildRepeatedParamQuery('percentiles', percentiles);
}

export function buildNormalizeQuery(normalize) {
  if (normalize == null || normalize === '') return '';
  return `?normalize=${encodeURIComponent(normalize)}`;
}

// Append query fragment to path that may already contain a query.
// Accepts either full string with leading '?' or raw 'a=1&b=2'.
export function appendQuery(path, query) {
  if (!query) return path;
  const q = query.startsWith('?') ? query.slice(1) : query;
  return path.includes('?') ? `${path}&${q}` : `${path}?${q}`;
}

// Simple key composer for caches (avoid reimplementing across contexts)
export function composeKey(...parts) {
  return parts.map(p => (p == null ? '' : String(p))).join('|');
}

