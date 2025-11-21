/**
 * @module utils/cacheTTLs
 * @description Central TTL (Time-To-Live) presets for cached API requests.
 * All values are in milliseconds. Adjust these if backend freshness requirements change.
 */

/**
 * Short TTL for frequently changing data (2 minutes).
 * Use for exploratory data with high churn rate like analog dates and lead times.
 * @constant {number}
 */
export const SHORT_TTL = 120000;

/**
 * Default TTL for typical API data (5 minutes).
 * Use for methods, entities, and synthesis data that changes moderately.
 * @constant {number}
 */
export const DEFAULT_TTL = 300000;

/**
 * Long TTL for very static data (15 minutes).
 * Use for configuration and rarely-changing reference data.
 * @constant {number}
 */
export const LONG_TTL = 900000;

