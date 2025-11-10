import {useEffect} from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import shp from 'shpjs';
import {ensureProjDefined} from '@/components/map/utils/olProjectionUtils.js';
import {resolveOverlayStyle} from '@/components/map/utils/olStyleUtils.js';
import config from '@/config.js';

export default function useOverlayConfigLayers(
  {
    mapReady,
    runtimeConfig,
    workspace,
    overlayGroupRef,
    layerSwitcherRef
  }
) {
  useEffect(() => {
    if (!mapReady) return;
    const group = overlayGroupRef.current;
    if (!group) return;
    const layersCollection = group.getLayers();
    const createdLayers = [];
    let cancelled = false;

    try {
      layersCollection.getArray()
        .filter(l => l && l.get && l.get('__fromWorkspaceConfig'))
        .forEach(l => layersCollection.remove(l));
    } catch {
    }

    const ws = runtimeConfig?.workspaces?.find(w => w.key === workspace);
    const items = (ws && Array.isArray(ws.shapefiles)) ? ws.shapefiles : [];
    if (!items.length) return () => {};

    const lineStyle = new Style({stroke: new Stroke({color: 'rgba(0, 102, 255, 0.9)', width: 2})});
    const polygonStyle = new Style({
      stroke: new Stroke({color: 'rgba(0, 102, 255, 0.9)', width: 2}),
      fill: new Fill({color: 'rgba(0, 102, 255, 0.15)'})
    });
    const pointStyle = new Style({
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({color: '#003b8e', width: 1.5}),
        fill: new Fill({color: 'rgba(0, 102, 255, 0.7)'})
      })
    });
    const styleFn = feature => {
      const geomType = feature.getGeometry()?.getType?.() || '';
      if (geomType.includes('Polygon')) return polygonStyle;
      if (geomType.includes('LineString')) return lineStyle;
      return pointStyle;
    };

    const addLayerForItem = (item) => {
      const title = item.name || 'Layer';
      const url = item.url;
      const dataProj = item.projection || item.epsg || 'EPSG:4326';
      ensureProjDefined(dataProj);
      const src = new VectorSource();
      const layer = new VectorLayer({title, visible: !!item.display, source: src, style: styleFn});
      layer.set('__fromWorkspaceConfig', true);
      createdLayers.push(layer);
      layersCollection.push(layer);

      resolveOverlayStyle(item, styleFn).then(sfn => {
        if (cancelled) return;
        try { layer.setStyle(sfn); } catch {}
      });

      const lower = String(url).toLowerCase();
      if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
        const controller = new AbortController();
        fetch(url, {cache: 'no-store', signal: controller.signal})
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
          .then(json => {
            if (cancelled) return;
            const fmt = new GeoJSON();
            try {
              ensureProjDefined(dataProj);
              const feats = fmt.readFeatures(json, {dataProjection: dataProj, featureProjection: 'EPSG:3857'});
              src.addFeatures(feats);
            } catch (e) {
              if (config.API_DEBUG) console.warn('Failed to parse GeoJSON for overlay', title, e);
            }
          })
          .catch(e => {
            if (cancelled) return;
            if (e && e.name === 'AbortError') return;
            if (config.API_DEBUG) console.warn('Failed to load GeoJSON overlay', title, e);
          });
        // Attach controller to layer for potential manual abort later
        try { layer.set('__abortController', controller); } catch {}
      } else if (lower.endsWith('.zip') || lower.endsWith('.shp')) {
        // shpjs doesn't support AbortController; use cancelled flag
        shp(url)
          .then(geojson => {
            if (cancelled) return;
            const fmt = new GeoJSON();
            try {
              const feats = fmt.readFeatures(geojson, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
              src.addFeatures(feats);
            } catch (e) {
              if (config.API_DEBUG) console.warn('Failed to parse Shapefile (as GeoJSON) for overlay', title, e);
            }
          })
          .catch(e => {
            if (cancelled) return;
            if (config.API_DEBUG) console.warn('Failed to load Shapefile overlay', title, e);
          });
      } else {
        if (config.API_DEBUG) console.warn('Unsupported overlay URL (expect .geojson/.json/.shp/.zip):', url);
      }
    };

    items.forEach(addLayerForItem);
    if (layerSwitcherRef.current) layerSwitcherRef.current.renderPanel();

    return () => {
      cancelled = true;
      try {
        createdLayers.forEach(l => {
          const ctrl = l && l.get && l.get('__abortController');
          if (ctrl && typeof ctrl.abort === 'function') ctrl.abort();
          layersCollection.remove(l);
        });
      } catch {}
    };
  }, [mapReady, runtimeConfig, workspace, overlayGroupRef, layerSwitcherRef]);
}
