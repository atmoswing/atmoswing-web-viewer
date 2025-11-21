/**
 * @module components/map/utils/loadWmtsCapabilities
 * @description Utilities for loading WMTS (Web Map Tile Service) capabilities and creating tile layers.
 * Handles fetching capabilities XML, parsing layer options, and caching for reuse.
 */

import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import {WMTS_MATRIX_SET_DEFAULT} from '@/components/map/mapConstants.js';

/**
 * Fetches WMTS capabilities from configured providers and builds options cache.
 * Processes base layers and overlay layers from runtime config, attempts to load
 * capabilities with preferred styles, and returns a cache of layer options.
 *
 * @param {Object} runtimeConfig - Runtime configuration with providers and layers
 * @param {Function} [enqueueWarning] - Optional callback to display warning messages
 * @param {Function} [preferStyleForItem] - Optional function to determine preferred style for an item
 * @returns {Promise<Object>} Cache object mapping wmtsLayer name to OpenLayers WMTS options
 * @example
 * const cache = await loadWmtsCapabilities(config, (msg) => console.warn(msg));
 * // Returns: { 'layerName': { ...wmtsOptions } }
 */
export async function loadWmtsCapabilities(runtimeConfig, enqueueWarning, preferStyleForItem) {
  const wmtsRequests = {};
  const providerMap = {};
  (runtimeConfig?.providers || []).forEach(p => providerMap[p.name] = p);
  const collect = (arr) => (arr || []).forEach(item => {
    if (item.source === 'wmts' && item.wmtsLayer && item.provider) {
      const provider = providerMap[item.provider];
      if (!provider) return;
      const url = provider.wmtsUrl;
      if (!wmtsRequests[url]) wmtsRequests[url] = [];
      wmtsRequests[url].push(item);
    }
  });
  collect(runtimeConfig?.baseLayers);
  collect(runtimeConfig?.overlayLayers);

  const wmtsOptionsCache = {};
  for (const [url, items] of Object.entries(wmtsRequests)) {
    try {
      const text = await fetch(url).then(r => r.text());
      const caps = new WMTSCapabilities().read(text);
      items.forEach(item => {
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
      items.forEach(item => {
        if (enqueueWarning) enqueueWarning(`Failed to load layer ${item.title}: ${error.message}`);
      });
    }
  }
  return wmtsOptionsCache;
}

/**
 * Creates an OpenLayers WMTS source from cached layer options.
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
  return new WMTS(opts);
}

export default loadWmtsCapabilities;
