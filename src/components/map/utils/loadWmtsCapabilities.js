/**
 * @module components/map/utils/loadWmtsCapabilities
 * @description Utilities for loading WMTS (Web Map Tile Service) capabilities and creating tile layers.
 * Fetches each provider's capabilities document once per page (with a timeout), parses layer
 * options from it, and builds sources whose tiles are retried after transient failures.
 */

import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileState from 'ol/TileState';
import {
  WMTS_CAPABILITIES_TIMEOUT_MS,
  WMTS_MATRIX_SET_DEFAULT,
  WMTS_TILE_MAX_RETRIES,
  WMTS_TILE_RETRY_DELAY_MS
} from '@/components/map/mapConstants.js';

// Parsed capabilities per URL, as promises so concurrent callers share one request. The map's
// base layers and its overlays both ask for the same (multi-megabyte) document.
const capabilitiesCache = new Map();

// Statuses worth another try. 404 is included because the IGN Géoplateforme answers it
// intermittently for tiles it serves fine a moment later.
const RETRY_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);

/**
 * Fetches and parses a WMTS capabilities document, once per URL.
 * Concurrent and later calls for the same URL share the result; a failed request is not cached,
 * so a later call tries again.
 *
 * @param {string} url - GetCapabilities URL
 * @param {number} [timeoutMs] - Time allowed before the request is aborted
 * @returns {Promise<Object>} Parsed capabilities
 * @throws {Error} On timeout, network failure or a non-2xx response
 */
export function fetchWmtsCapabilities(url, timeoutMs = WMTS_CAPABILITIES_TIMEOUT_MS) {
  let pending = capabilitiesCache.get(url);
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {signal: controller.signal});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return new WMTSCapabilities().read(await res.text());
      } catch (error) {
        if (controller.signal.aborted) throw new Error(`no response after ${Math.round(timeoutMs / 1000)} s`);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })();
    capabilitiesCache.set(url, pending);
    pending.catch(() => capabilitiesCache.delete(url));
  }
  return pending;
}

/**
 * Forgets every fetched capabilities document (mainly for tests).
 */
export function clearWmtsCapabilitiesCache() {
  capabilitiesCache.clear();
}

/**
 * @typedef {Object} LoadWmtsOptions
 * @property {Array<Object>} [items] - Layer items to resolve; defaults to the WMTS items of
 *   `baseLayers` and `overlayLayers`
 * @property {Function} [preferStyleForItem] - Returns the style to request for an item
 */

/**
 * Fetches WMTS capabilities from configured providers and builds options cache.
 * Providers are fetched in parallel; a provider that fails or times out only loses its own
 * layers, each reported through `enqueueWarning`.
 *
 * @param {Object} runtimeConfig - Runtime configuration with providers and layers
 * @param {Function} [enqueueWarning] - Optional callback to display warning messages
 * @param {LoadWmtsOptions} [options] - Which items to resolve, and style preference
 * @returns {Promise<Object>} Cache object mapping wmtsLayer name to OpenLayers WMTS options
 * @example
 * const cache = await loadWmtsCapabilities(config, (msg) => console.warn(msg));
 * // Returns: { 'layerName': { ...wmtsOptions } }
 */
export async function loadWmtsCapabilities(runtimeConfig, enqueueWarning, options = {}) {
  const {preferStyleForItem} = options;
  const items = options.items
    || [...(runtimeConfig?.baseLayers || []), ...(runtimeConfig?.overlayLayers || [])];
  const wmtsRequests = {};
  const providerMap = {};
  (runtimeConfig?.providers || []).forEach(p => providerMap[p.name] = p);
  items.forEach(item => {
    if (item.source === 'wmts' && item.wmtsLayer && item.provider) {
      const provider = providerMap[item.provider];
      if (!provider) return;
      const url = provider.wmtsUrl;
      if (!wmtsRequests[url]) wmtsRequests[url] = [];
      wmtsRequests[url].push(item);
    }
  });

  const wmtsOptionsCache = {};
  await Promise.all(Object.entries(wmtsRequests).map(async ([url, urlItems]) => {
    try {
      const caps = await fetchWmtsCapabilities(url);
      urlItems.forEach(item => {
        let opts = null;
        const preferredStyle = preferStyleForItem ? preferStyleForItem(item) : item.style;
        if (preferredStyle) {
          try {
            opts = optionsFromCapabilities(caps, {
              layer: item.wmtsLayer,
              matrixSet: WMTS_MATRIX_SET_DEFAULT,
              style: preferredStyle
            });
          } catch { /* try without explicit style below */
          }
        }
        if (!opts) {
          try {
            opts = optionsFromCapabilities(caps, {layer: item.wmtsLayer, matrixSet: WMTS_MATRIX_SET_DEFAULT});
          } catch { /* capabilities may not include layer */
          }
        }
        if (opts) wmtsOptionsCache[item.wmtsLayer] = opts; else if (enqueueWarning) enqueueWarning(`Failed to load layer ${item.title}: layer not found in capabilities`);
      });
    } catch (error) {
      urlItems.forEach(item => {
        if (enqueueWarning) enqueueWarning(`Failed to load layer ${item.title}: ${error.message}`);
      });
    }
  }));
  return wmtsOptionsCache;
}

/**
 * Builds an OpenLayers tile load function that retries transient failures.
 * The tile is fetched as a blob; a network error or a status in `RETRY_STATUSES` marks the tile
 * as failed and reloads it after a growing delay, up to `maxRetries` times. Without this, a tile
 * whose single request failed stays blank until the view moves far enough to request it again.
 *
 * @param {Object} [options] - Retry settings
 * @param {number} [options.maxRetries] - Extra attempts per tile
 * @param {number} [options.delayMs] - Delay before the first retry; later ones wait longer
 * @returns {Function} `(tile, src) => void`, for a tile source's `tileLoadFunction`
 */
export function makeRetryingTileLoadFunction(
  {maxRetries = WMTS_TILE_MAX_RETRIES, delayMs = WMTS_TILE_RETRY_DELAY_MS} = {}
) {
  const attempts = new WeakMap();
  return (tile, src) => {
    fetch(src)
      .then(res => {
        if (res.ok) return res.blob();
        const error = new Error(`HTTP ${res.status}`);
        error.retryable = RETRY_STATUSES.has(res.status);
        throw error;
      })
      .then(blob => {
        attempts.delete(tile);
        const image = tile.getImage();
        const objectUrl = URL.createObjectURL(blob);
        const revoke = () => URL.revokeObjectURL(objectUrl);
        image.addEventListener('load', revoke, {once: true});
        image.addEventListener('error', revoke, {once: true});
        image.src = objectUrl;
      })
      .catch(error => {
        // A tile dropped meanwhile (view moved on) must not be pushed back to an error state.
        if (tile.getState() !== TileState.LOADING) return;
        tile.setState(TileState.ERROR);
        const done = attempts.get(tile) || 0;
        // fetch rejects with a TypeError on network failure: retryable too.
        if (error.retryable !== false && done < maxRetries) {
          attempts.set(tile, done + 1);
          setTimeout(() => tile.load(), delayMs * (done + 1));
        } else {
          attempts.delete(tile);
        }
      });
  };
}

/**
 * Creates an OpenLayers WMTS source from cached layer options.
 * Its tiles are loaded through {@link makeRetryingTileLoadFunction}.
 *
 * @param {Object} item - Layer configuration item with wmtsLayer property
 * @param {Object} wmtsOptionsCache - Cache of WMTS options from loadWmtsCapabilities
 * @returns {WMTS|null} OpenLayers WMTS source instance, or null if not found in cache
 * @example
 * const source = createWmtsTileLayer({ wmtsLayer: 'myLayer' }, cache);
 * if (source) {
 *   const layer = new TileLayer({ source });
 * }
 */
export function createWmtsTileLayer(item, wmtsOptionsCache) {
  const opts = wmtsOptionsCache[item.wmtsLayer];
  if (!opts) return null;
  return new WMTS({...opts, tileLoadFunction: makeRetryingTileLoadFunction()});
}

export default loadWmtsCapabilities;
