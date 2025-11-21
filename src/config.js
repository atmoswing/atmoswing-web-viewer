/**
 * @module config
 * @description Runtime configuration management for AtmoSwing Web Viewer.
 *
 * This module provides a mutable configuration object that is populated at runtime
 * from `/config.json`. It replaces the previous app-config.js + window.__APP_CONFIG__ approach
 * with a cleaner fetch-based system.
 */

/**
 * Normalizes a base URL by removing trailing slashes.
 * @private
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL without trailing slashes
 */
function normalizeBase(url) {
  return (url || '').replace(/\/+$/, '');
}

/**
 * Converts various value types to boolean.
 * @private
 * @param {*} v - Value to convert
 * @param {boolean} def - Default value if conversion fails
 * @returns {boolean} Converted boolean value
 */
function toBool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(s);
}

/**
 * Base configuration object with default values.
 * This object is mutated by updateConfig() when runtime config is loaded.
 * @type {Object}
 * @property {string} API_BASE_URL - Base URL for API requests
 * @property {string} ENTITIES_SOURCE_EPSG - EPSG code for entity coordinates
 * @property {boolean} API_DEBUG - Debug mode flag
 */
const config = {
  API_BASE_URL: '',
  ENTITIES_SOURCE_EPSG: 'EPSG:4326',
  API_DEBUG: false
};

/**
 * Normalizes raw configuration from config.json into a consistent format.
 *
 * @param {Object} raw - Raw configuration object from config.json
 * @returns {Object} Normalized configuration object
 */
export function normalizeRuntimeConfig(raw = {}) {
  return {
    API_BASE_URL: normalizeBase(raw.API_BASE_URL || ''),
    ENTITIES_SOURCE_EPSG: raw.ENTITIES_SOURCE_EPSG || 'EPSG:4326',
    API_DEBUG: toBool(raw.API_DEBUG, false),
    workspaces: raw.workspaces || [],
    providers: raw.providers || [],
    baseLayers: raw.baseLayers || [],
    overlayLayers: raw.overlayLayers || []
  };
}

/**
 * Updates the mutable config object with new values.
 * Used by ConfigContext after loading config.json.
 *
 * @param {Object} partial - Partial configuration object to merge
 */
export function updateConfig(partial) {
  Object.assign(config, partial);
}

export default config;
