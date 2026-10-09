/**
 * @module components/map/hooks/useMapInit
 * @description React hook for initializing OpenLayers map with configured layers and controls.
 */

import {useEffect, useRef, useState} from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import LayerSwitcher from 'ol-layerswitcher';
import {applyWmtsSource, createWmtsTileLayer, loadWmtsCapabilities} from '@/components/map/utils/loadWmtsCapabilities.js';
import {DEFAULT_PROJECTION} from '@/components/map/mapConstants.js';

/**
 * Hook that initializes an OpenLayers map with base layers, overlays, and controls.
 * The map is created at once; WMTS base layers are created empty and receive their source when
 * the provider's capabilities arrive, so a slow provider delays only those layers.
 *
 * @param {Object} params - Hook parameters
 * @param {Function} params.t - Translation function
 * @param {Object} params.runtimeConfig - Runtime config with layer definitions
 * @param {Function} params.reportLayerError - Called as `(title, reason)` for a layer that cannot be loaded
 * @returns {Object} Map refs and ready state
 * @example
 * const { containerRef, mapRef, mapReady } = useMapInit({ t, runtimeConfig, reportLayerError });
 */
export default function useMapInit({t, runtimeConfig, reportLayerError}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const forecastLayerRef = useRef(null);
  const overlayGroupRef = useRef(null);
  const layerSwitcherRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    if (!runtimeConfig || !runtimeConfig.__workspacesLoaded) return;

    while (containerRef.current.firstChild) containerRef.current.removeChild(containerRef.current.firstChild);

    let cancelled = false;

    const osmLayer = new TileLayer({title: t('map.layers.osm'), type: 'base', visible: false, source: new OSM()});
    const baseLayersArray = [
      new TileLayer({
        title: t('map.layers.esri'),
        type: 'base',
        visible: false,
        source: new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attributions: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        })
      }),
      osmLayer
    ];
    // Created without a source, which they get once the capabilities arrive: the layers keep their
    // order and switcher entry, and the map (with everything waiting on mapReady) shows at once.
    const wmtsBaseItems = (runtimeConfig.baseLayers || []).filter(item => item.source === 'wmts');
    const pendingWmtsLayers = wmtsBaseItems.map(item => {
      const layer = new TileLayer({title: item.title, type: item.type || 'base', visible: !!item.visible});
      baseLayersArray.push(layer);
      return {item, layer};
    });

    const baseLayers = new LayerGroup({title: t('map.baseLayers'), fold: 'open', layers: baseLayersArray});
    const overlayLayers = new LayerGroup({title: t('map.overlays'), fold: 'open', layers: []});
    overlayGroupRef.current = overlayLayers;

    forecastLayerRef.current = new VectorLayer({
      displayInLayerSwitcher: false,
      source: new VectorSource(),
      style: f => f.get('style')
    });

    mapRef.current = new Map({
      target: containerRef.current,
      layers: [baseLayers, overlayLayers, forecastLayerRef.current],
      // No center yet: an undefined view draws nothing and requests no tiles until
      // useWorkspaceView points it at the workspace.
      view: new View({projection: DEFAULT_PROJECTION}),
      controls: []
    });

    const layerSwitcher = new LayerSwitcher({
      tipLabel: t('map.layerSwitcherTip'),
      groupSelectStyle: 'children',
      reverse: true
    });
    layerSwitcherRef.current = layerSwitcher;
    mapRef.current.addControl(layerSwitcher);
    setMapReady(true);

    if (pendingWmtsLayers.length) {
      loadWmtsCapabilities(runtimeConfig, reportLayerError, {items: wmtsBaseItems}).then(wmtsOptionsCache => {
        if (cancelled) return;
        pendingWmtsLayers.forEach(({item, layer}) => {
          const source = createWmtsTileLayer(item, wmtsOptionsCache);
          if (source) applyWmtsSource(layer, source);
          else baseLayers.getLayers().remove(layer);
        });
        // A visible base layer that could not be built would leave the map without a background.
        const anyVisible = baseLayers.getLayers().getArray().some(l => l.getVisible());
        if (!anyVisible && wmtsBaseItems.some(item => item.visible)) osmLayer.setVisible(true);
        try {
          layerSwitcher.renderPanel();
        } catch { /* panel may not be rendered yet */
        }
      });
    }

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          const group = overlayGroupRef.current;
          if (group) group.getLayers().getArray().forEach(l => {
            const timer = l && l.get && l.get('__refreshTimer');
            if (timer) clearInterval(timer);
          });
        } catch { /* clean-up best-effort */
        }
        try {
          if (mapRef.current.__singleClickHandler) mapRef.current.un('singleclick', mapRef.current.__singleClickHandler);
        } catch { /* handler may already be removed */
        }
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }
    };
  }, [runtimeConfig, t, reportLayerError]);

  return {containerRef, mapRef, forecastLayerRef, overlayGroupRef, layerSwitcherRef, mapReady};
}
