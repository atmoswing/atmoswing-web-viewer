import { useEffect, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { transform } from 'ol/proj';
import proj4 from 'proj4';
import { valueToColor } from '@/utils/colorUtils.js';
import config from '@/config.js';

export default function useForecastPoints({
  ENTITIES_SOURCE_EPSG,
  mapReady,
  entities,
  entitiesWorkspace,
  relevantEntities,
  workspace,
  forecastValuesNorm,
  forecastValues,
  forecastUnavailable,
  forecastLayerRef,
  mapRef, // added mapRef
  setLegendStops,
  setLegendMax
}) {
  const lastFittedWorkspaceRef = useRef(null);

  useEffect(() => {
    if (ENTITIES_SOURCE_EPSG !== 'EPSG:4326' && !proj4.defs[ENTITIES_SOURCE_EPSG]) return;
    if (!mapReady) return;
    if (!forecastLayerRef.current) return;
    if (forecastUnavailable) {
      forecastLayerRef.current.getSource().clear();
      setLegendStops([]);
    }
    if (entitiesWorkspace && entitiesWorkspace !== workspace) {
      forecastLayerRef.current.getSource().clear();
      setLegendStops([]);
      lastFittedWorkspaceRef.current = null;
      return;
    }
    const layer = forecastLayerRef.current;
    const source = layer.getSource();
    source.clear();
    if (!entities || entities.length === 0) { setLegendStops([]); return; }
    const maxVal = 1; // simplified scaling placeholder
    setLegendMax(maxVal);
    const samples = 40;
    const stops = [];
    for (let i = 0; i <= samples; i++) {
      const v = (i / samples) * maxVal;
      const [r,g,b] = valueToColor(v, maxVal);
      stops.push({ color: `rgb(${r},${g},${b})`, pct: (i / samples) * 100 });
    }
    setLegendStops(stops);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(ent => {
      const normVal = forecastValuesNorm[ent.id];
      const rawVal = forecastValues ? forecastValues[ent.id] : undefined;
      const [r,g,b] = valueToColor(normVal, maxVal);
      const isRelevant = !relevantEntities || relevantEntities.has(ent.id);
      const opacity = isRelevant ? 0.9 : 0.7;
      const radius = isRelevant ? 8 : 6;
      const strokeColor = isRelevant ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
      const style = new Style({ image: new CircleStyle({ radius, stroke: new Stroke({ color: strokeColor, width: 2 }), fill: new Fill({ color: `rgba(${r},${g},${b},${opacity})` }) }) });
      let coord = [ent.x, ent.y];
      try { coord = transform(coord, ENTITIES_SOURCE_EPSG, 'EPSG:3857'); } catch (e) { if (config.API_DEBUG) console.warn('Transform failed', ent.id, e); }
      minX = Math.min(minX, coord[0]); maxX = Math.max(maxX, coord[0]);
      minY = Math.min(minY, coord[1]); maxY = Math.max(maxY, coord[1]);
      const feat = new Feature({ geometry: new Point(coord), id: ent.id, valueNorm: normVal, valueRaw: rawVal, name: ent.name, relevant: isRelevant, style });
      feat.setStyle(style);
      try { feat.setId(ent.id); } catch {}
      source.addFeature(feat);
    });

    if (workspace && lastFittedWorkspaceRef.current !== workspace && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) && minX < maxX && minY < maxY) {
      const view = mapRef?.current?.getView?.();
      if (view) {
        view.fit([minX, minY, maxX, maxY], { padding: [60,60,60,60], duration: 500, maxZoom: 11 });
        lastFittedWorkspaceRef.current = workspace;
      }
    }
  }, [ENTITIES_SOURCE_EPSG, mapReady, entities, entitiesWorkspace, relevantEntities, workspace, forecastValuesNorm, forecastValues, forecastUnavailable, forecastLayerRef, mapRef, setLegendStops, setLegendMax]);
}
