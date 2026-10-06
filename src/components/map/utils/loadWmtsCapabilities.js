/**
 * @module components/map/utils/loadWmtsCapabilities
 * @description Utilities for loading WMTS (Web Map Tile Service) capabilities and creating tile layers.
 * Fetches each provider's capabilities document once per page (with a timeout), parses layer
 * options from it, and builds sources whose tiles are retried after transient failures.
 * The part of each document the configured layers need is kept in `localStorage`, so later
 * visits show those layers without downloading and parsing the whole (multi-megabyte) document.
 */

import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import TileState from 'ol/TileState';
import {
  WMTS_CAPABILITIES_TIMEOUT_MS,
  WMTS_MATRIX_SET_DEFAULT,
  WMTS_STORED_CAPABILITIES_FRESH_MS,
  WMTS_STORED_CAPABILITIES_MAX_AGE_MS,
  WMTS_TILE_MAX_RETRIES,
  WMTS_TILE_RETRY_DELAY_MS
} from '@/components/map/mapConstants.js';

const STORAGE_PREFIX = 'atmoswing.wmtsCapabilities:';
// URLs whose stored copy is being refreshed in this page, so it happens once per page.
const backgroundRefreshes = new Set();

// Parsed capabilities per URL, as promises so concurrent callers share one request. The map's
// base layers and its overlays both ask for the same (multi-megabyte) document.
const capabilitiesCache = new Map();

// Statuses worth another try. 404 is included because the IGN Géoplateforme answers it
// intermittently for tiles it serves fine a moment later; a 404 carrying an OWS exception report
// ("No data found") is the server saying the tile is empty, and is not retried.
const RETRY_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);
const isNoDataReport = (body) => /ExceptionReport/.test(body || '');

// How many zoom levels coarser than its grid's first level a WMTS layer stays visible.
const WMTS_OVERZOOM_OUT_LEVELS = 1;

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
 * Forgets every fetched capabilities document held in memory (mainly for tests).
 * Copies stored in `localStorage` are kept.
 */
export function clearWmtsCapabilitiesCache() {
  capabilitiesCache.clear();
  backgroundRefreshes.clear();
}

/**
 * Reduces parsed capabilities to the given layers and the tile matrix sets they use, which is
 * all `optionsFromCapabilities` reads for them (with the service metadata, kept as is).
 *
 * @param {Object} caps - Capabilities parsed by OpenLayers
 * @param {Array<string>} layerIds - Layer identifiers to keep
 * @returns {Object|null} The reduced capabilities, or null if the document has no contents
 */
export function trimWmtsCapabilities(caps, layerIds) {
  const contents = caps?.Contents;
  if (!Array.isArray(contents?.Layer) || !Array.isArray(contents?.TileMatrixSet)) return null;
  const layers = contents.Layer.filter(l => layerIds.includes(l.Identifier));
  const sets = new Set(layers.flatMap(l => (l.TileMatrixSetLink || []).map(link => link.TileMatrixSet)));
  return {
    ...caps,
    Contents: {...contents, Layer: layers, TileMatrixSet: contents.TileMatrixSet.filter(s => sets.has(s.Identifier))}
  };
}

// Storage may be unavailable (private mode, quota, blocked site data): every access is guarded,
// and failing to read or write only means fetching the document as if nothing was stored.
function readStoredCapabilities(url) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_PREFIX + url));
    if (!stored || typeof stored.savedAt !== 'number' || !stored.caps) return null;
    if (Date.now() - stored.savedAt > WMTS_STORED_CAPABILITIES_MAX_AGE_MS) return null;
    return stored;
  } catch {
    return null;
  }
}

function storeCapabilities(url, caps, layerIds) {
  const trimmed = trimWmtsCapabilities(caps, layerIds);
  if (!trimmed) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + url, JSON.stringify({savedAt: Date.now(), caps: trimmed}));
  } catch { /* storage unavailable or full: the next visit fetches again */
  }
}

/**
 * Capabilities for one provider URL: the stored copy when it holds every wanted layer, refreshed
 * in the background once older than a day, otherwise the full document, stored for next time.
 *
 * @param {string} url - GetCapabilities URL
 * @param {Array<string>} layerIds - Every configured layer of this provider
 * @returns {Promise<Object>} Parsed (possibly reduced) capabilities
 */
async function capabilitiesFor(url, layerIds) {
  const stored = readStoredCapabilities(url);
  const storedIds = new Set((stored?.caps?.Contents?.Layer || []).map(l => l.Identifier));
  if (stored && layerIds.every(id => storedIds.has(id))) {
    if (Date.now() - stored.savedAt > WMTS_STORED_CAPABILITIES_FRESH_MS && !backgroundRefreshes.has(url)) {
      backgroundRefreshes.add(url);
      fetchWmtsCapabilities(url).then(caps => storeCapabilities(url, caps, layerIds), () => {
      });
    }
    return stored.caps;
  }
  const caps = await fetchWmtsCapabilities(url);
  storeCapabilities(url, caps, layerIds);
  return caps;
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
 * layers, each reported through `onLayerError`. The settings of every configured layer of a
 * provider are stored, whichever `items` were asked for, so the base layers and the overlays,
 * which ask separately, write the same copy.
 *
 * @param {Object} runtimeConfig - Runtime configuration with providers and layers
 * @param {Function} [onLayerError] - Called as `(title, reason)` for each layer that cannot be built
 * @param {LoadWmtsOptions} [options] - Which items to resolve, and style preference
 * @returns {Promise<Object>} Cache object mapping wmtsLayer name to OpenLayers WMTS options
 * @example
 * const cache = await loadWmtsCapabilities(config, (title, reason) => console.warn(title, reason));
 * // Returns: { 'layerName': { ...wmtsOptions } }
 */
export async function loadWmtsCapabilities(runtimeConfig, onLayerError, options = {}) {
  const {preferStyleForItem} = options;
  const items = options.items
    || [...(runtimeConfig?.baseLayers || []), ...(runtimeConfig?.overlayLayers || [])];
  const providerMap = {};
  (runtimeConfig?.providers || []).forEach(p => providerMap[p.name] = p);
  const groupByUrl = (list) => {
    const byUrl = {};
    list.forEach(item => {
      if (item.source === 'wmts' && item.wmtsLayer && item.provider) {
        const provider = providerMap[item.provider];
        if (!provider) return;
        const url = provider.wmtsUrl;
        if (!byUrl[url]) byUrl[url] = [];
        byUrl[url].push(item);
      }
    });
    return byUrl;
  };
  const wmtsRequests = groupByUrl(items);
  const configured = groupByUrl([...(runtimeConfig?.baseLayers || []), ...(runtimeConfig?.overlayLayers || []), ...items]);

  const wmtsOptionsCache = {};
  await Promise.all(Object.entries(wmtsRequests).map(async ([url, urlItems]) => {
    try {
      const caps = await capabilitiesFor(url, [...new Set(configured[url].map(item => item.wmtsLayer))]);
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
        if (opts) wmtsOptionsCache[item.wmtsLayer] = opts; else if (onLayerError) onLayerError(item.title, 'layer not found in capabilities');
      });
    } catch (error) {
      urlItems.forEach(item => {
        if (onLayerError) onLayerError(item.title, error.message);
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
 * A 404 with an OWS exception report means the server has no data there: the tile is marked
 * empty, silently. A tile still failing after its retries is reported with `console.warn`.
 *
 * @param {Object} [options] - Retry settings
 * @param {number} [options.maxRetries] - Extra attempts per tile
 * @param {number} [options.delayMs] - Delay before the first retry; later ones wait longer
 * @param {string} [options.label] - Layer name used in the failure warning
 * @returns {Function} `(tile, src) => void`, for a tile source's `tileLoadFunction`
 */
export function makeRetryingTileLoadFunction(
  {maxRetries = WMTS_TILE_MAX_RETRIES, delayMs = WMTS_TILE_RETRY_DELAY_MS, label = 'WMTS layer'} = {}
) {
  const attempts = new WeakMap();
  return (tile, src) => {
    fetch(src)
      .then(async res => {
        if (res.ok) return res.blob();
        const error = new Error(`HTTP ${res.status}`);
        if (res.status === 404) error.noData = isNoDataReport(await res.text().catch(() => ''));
        error.retryable = !error.noData && RETRY_STATUSES.has(res.status);
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
        if (error.noData) {
          attempts.delete(tile);
          tile.setState(TileState.EMPTY);
          return;
        }
        tile.setState(TileState.ERROR);
        const done = attempts.get(tile) || 0;
        // fetch rejects with a TypeError on network failure: retryable too.
        if (error.retryable !== false && done < maxRetries) {
          attempts.set(tile, done + 1);
          setTimeout(() => tile.load(), delayMs * (done + 1));
        } else {
          attempts.delete(tile);
          console.warn(`${label}: tile failed after ${done + 1} attempt(s) (${error.message})`, src);
        }
      });
  };
}

/**
 * Gives a tile layer its WMTS source, and hides the layer at zoom levels coarser than the
 * source's tile grid allows (one level of zooming out past it is kept). Without that limit, a
 * view zoomed out further than the grid's first level still requests that level's tiles,
 * across the whole view: hundreds of requests, mostly for areas the layer does not cover.
 *
 * @param {Object} layer - OpenLayers tile layer
 * @param {WMTS} source - Source built by {@link createWmtsTileLayer}
 */
export function applyWmtsSource(layer, source) {
  layer.setSource(source);
  const coarsest = source.getTileGrid?.()?.getResolution(0);
  if (coarsest) layer.setMaxResolution(coarsest * 2 ** WMTS_OVERZOOM_OUT_LEVELS);
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
  return new WMTS({...opts, tileLoadFunction: makeRetryingTileLoadFunction({label: item.title})});
}

export default loadWmtsCapabilities;
