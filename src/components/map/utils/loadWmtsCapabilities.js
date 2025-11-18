import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import {WMTS_MATRIX_SET_DEFAULT} from '@/components/map/mapConstants.js';

// Fetch WMTS capabilities and build cache: layerName -> options
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

export function createWmtsTileLayer(item, wmtsOptionsCache) {
  const opts = wmtsOptionsCache[item.wmtsLayer];
  if (!opts) return null;
  return new WMTS(opts);
}

export default loadWmtsCapabilities;
