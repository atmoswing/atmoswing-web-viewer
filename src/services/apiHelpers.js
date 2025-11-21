/**
 * @module services/apiHelpers
 * @description Utility helpers for building API query strings and composing endpoint paths.
 * Provides functions to construct URL query parameters and cache keys.
 */

/**
 * Builds a query string with repeated parameters for the same key.
 * Useful for APIs that accept multiple values like: ?key=val1&key=val2&key=val3
 *
 * @param {string} key - The query parameter key
 * @param {Array<*>} values - Array of values to include
 * @returns {string} Query string with leading '?', or empty string if no values
 * @example
 * buildRepeatedParamQuery('percentiles', [10, 50, 90])
 * // Returns: "?percentiles=10&percentiles=50&percentiles=90"
 */
export function buildRepeatedParamQuery(key, values) {
  if (!values || !Array.isArray(values) || values.length === 0) return '';
  const parts = values.map(v => `${key}=${encodeURIComponent(v)}`);
  return `?${parts.join('&')}`;
}

/**
 * Builds a query string for percentile values.
 * Convenience wrapper around buildRepeatedParamQuery for percentiles.
 *
 * @param {Array<number>} percentiles - Array of percentile values (e.g., [10, 50, 90])
 * @returns {string} Query string like "?percentiles=10&percentiles=50&percentiles=90"
 * @example
 * buildPercentilesQuery([10, 50, 90])
 * // Returns: "?percentiles=10&percentiles=50&percentiles=90"
 */
export function buildPercentilesQuery(percentiles) {
  return buildRepeatedParamQuery('percentiles', percentiles);
}

/**
 * Builds a query string for the normalize parameter.
 *
 * @param {boolean|string|null} normalize - Normalize flag value
 * @returns {string} Query string like "?normalize=true", or empty string
 * @example
 * buildNormalizeQuery(true) // Returns: "?normalize=true"
 * buildNormalizeQuery(null) // Returns: ""
 */
export function buildNormalizeQuery(normalize) {
  if (normalize == null || normalize === '') return '';
  return `?normalize=${encodeURIComponent(normalize)}`;
}

/**
 * Appends a query string fragment to a path that may already contain a query.
 * Intelligently handles existing query parameters by using '&' instead of '?'.
 *
 * @param {string} path - The base URL path
 * @param {string} query - Query string to append (with or without leading '?')
 * @returns {string} Combined path with query parameters
 * @example
 * appendQuery('/api/data', 'sort=asc') // Returns: "/api/data?sort=asc"
 * appendQuery('/api/data?page=1', 'sort=asc') // Returns: "/api/data?page=1&sort=asc"
 * appendQuery('/api/data', '?sort=asc') // Returns: "/api/data?sort=asc"
 */
export function appendQuery(path, query) {
  if (!query) return path;
  const q = query.startsWith('?') ? query.slice(1) : query;
  return path.includes('?') ? `${path}&${q}` : `${path}?${q}`;
}

/**
 * Composes a cache key from multiple parts by joining with '|' separator.
 * Handles null/undefined values by converting to empty strings.
 *
 * @param {...*} parts - Variable number of key parts to combine
 * @returns {string} Composed cache key
 * @example
 * composeKey('region', 'date', 123) // Returns: "region|date|123"
 * composeKey('user', null, 'action') // Returns: "user||action"
 */
export function composeKey(...parts) {
  return parts.map(p => (p == null ? '' : String(p))).join('|');
}

