/**
 * @module components/map/hooks/useOverlayGlobalLayers
 * @description Hook for loading and managing global (non-workspace-specific) overlay layers.
 * Supports WMTS and GeoJSON sources with optional periodic refresh.
 */

import {useEffect} from 'react';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Stroke, Style} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import {createWmtsTileLayer, loadWmtsCapabilities} from '@/components/map/utils/loadWmtsCapabilities.js';
import config from '@/config.js';

// Build a simple style function for line features based on categorical attribute -> color map
function makeCategoricalLineStyle(valueAttr, colors = {}, width = 2) {
  const cache = new Map();
  const makeStyle = (color) => new Style({stroke: new Stroke({color, width})});
  return (feature) => {
    try {
      const v = feature.get(valueAttr);
      const key = v != null ? String(v) : 'default';
      if (!cache.has(key)) cache.set(key, makeStyle(colors[key] || colors.default || '#0077cc'));
      return cache.get(key);
    } catch {
      return makeStyle('#0077cc');
    }
  };
}

/**
 * Hook that loads global overlay layers defined in runtime configuration.
 * Handles WMTS capabilities adoption, dynamic GeoJSON fetching, refresh timers,
 * abort controllers, and layer switcher panel updates.
 *
 * @param {Object} params - Hook parameters
 * @param {boolean} params.mapReady - Whether map is initialized
 * @param {Object} params.runtimeConfig - Runtime configuration object
 * @param {React.RefObject} params.overlayGroupRef - Ref to overlay layer group
 * @param {React.RefObject} params.layerSwitcherRef - Ref to layer switcher control
 * @param {Function} [params.enqueueSnackbar] - Optional notification callback
 * @example
 * useOverlayGlobalLayers({
 *   mapReady: true,
 *   runtimeConfig,
 *   overlayGroupRef,
 *   layerSwitcherRef,
 *   enqueueSnackbar: (msg) => console.warn(msg)
 * });
 */
export default function useOverlayGlobalLayers(
  {
    mapReady,
    runtimeConfig,
    overlayGroupRef,
    layerSwitcherRef,
    enqueueSnackbar
  }
) {
  useEffect(() => {
    if (!mapReady) return;
    const group = overlayGroupRef.current;
    if (!group) return;

    const layersCollection = group.getLayers();
    const createdLayers = [];
    let cancelled = false;

    // Remove previously created global overlays
    try {
      layersCollection.getArray()
        .filter(l => l && l.get && l.get('__fromGlobalOverlayConfig'))
        .forEach(l => {
          try {
            const t = l.get('__refreshTimer');
            if (t) clearInterval(t);
          } catch { /* ignore */
          }
          layersCollection.remove(l);
        });
    } catch { /* ignore */
    }

    const items = runtimeConfig?.overlayLayers || [];
    if (!items.length) return () => {
    };

    (async () => {
      // Preload WMTS capabilities for all configured providers/items (base+overlay)
      const wmtsOptionsCache = await loadWmtsCapabilities(
        runtimeConfig,
        (msg) => enqueueSnackbar && enqueueSnackbar(msg, {variant: 'warning'})
      );

      for (const item of items) {
        if (cancelled) break;
        const title = item.title || 'Overlay';
        try {
          if (item.source === 'wmts' && item.wmtsLayer) {
            const source = createWmtsTileLayer(item, wmtsOptionsCache);
            if (source) {
              const layer = new TileLayer({title, visible: !!item.visible, source});
              layer.set('__fromGlobalOverlayConfig', true);
              createdLayers.push(layer);
              layersCollection.push(layer);
            }
          } else if (item.source === 'geojson' && item.url) {
            const src = new VectorSource();
            const styleFn = makeCategoricalLineStyle(item.valueAttr || 'value', item.colors || {}, Number(item.lineWidth || 2));
            const layer = new VectorLayer({title, visible: !!item.visible, source: src, style: styleFn});
            layer.set('__fromGlobalOverlayConfig', true);
            createdLayers.push(layer);
            layersCollection.push(layer);

            const loadOnce = async (signal) => {
              try {
                const res = await fetch(item.url, {cache: 'no-store', signal});
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const fmt = new GeoJSON();
                const feats = fmt.readFeatures(json, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
                src.clear();
                src.addFeatures(feats);
              } catch (e) {
                if (e && e.name === 'AbortError') return;
                if (config.API_DEBUG) console.warn('Failed to load GeoJSON overlay', title, e);
              }
            };

            const controller = new AbortController();
            try {
              layer.set('__abortController', controller);
            } catch { /* ignore */
            }
            loadOnce(controller.signal);

            // Optional refresh
            const minutes = Number(item.refreshMinutes || 0);
            if (minutes > 0) {
              const timer = setInterval(() => {
                if (cancelled) return; // best-effort guard
                const c = new AbortController();
                try {
                  const prev = layer.get('__abortController');
                  if (prev) prev.abort();
                } catch { /* ignore */
                }
                try {
                  layer.set('__abortController', c);
                } catch { /* ignore */
                }
                loadOnce(c.signal);
              }, minutes * 60 * 1000);
              try {
                layer.set('__refreshTimer', timer);
              } catch { /* ignore */
              }
            }
          } else {
            if (config.API_DEBUG) console.warn('Unsupported overlay config item', item);
          }
        } catch (e) {
          if (config.API_DEBUG) console.warn('Failed to create overlay layer', title, e);
        }
      }

      if (!cancelled && layerSwitcherRef?.current) {
        try {
          layerSwitcherRef.current.renderPanel();
        } catch { /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        createdLayers.forEach(l => {
          try {
            const t = l.get && l.get('__refreshTimer');
            if (t) clearInterval(t);
          } catch { /* ignore */
          }
          try {
            const ctrl = l.get && l.get('__abortController');
            if (ctrl && ctrl.abort) ctrl.abort();
          } catch { /* ignore */
          }
          layersCollection.remove(l);
        });
      } catch { /* ignore */
      }
    };
  }, [mapReady, runtimeConfig, overlayGroupRef, layerSwitcherRef, enqueueSnackbar]);
}
