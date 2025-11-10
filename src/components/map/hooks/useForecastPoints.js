import {useEffect, useRef} from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {transform} from 'ol/proj';
import proj4 from 'proj4';
import {valueToColor} from '@/utils/colorUtils.js';
import config from '@/config.js';
import {buildLegendStops} from '@/components/map/utils/buildLegendStops.js';
import {
  FIT_PADDING,
  FORECAST_POINT_RADIUS_RELEVANT,
  FORECAST_POINT_RADIUS_NORMAL,
  FORECAST_POINT_STROKE_WIDTH,
  FORECAST_POINT_STROKE_COLOR_RELEVANT,
  FORECAST_POINT_STROKE_COLOR_DIM,
  FORECAST_POINT_OPACITY_RELEVANT,
  FORECAST_POINT_OPACITY_DIM
} from '@/components/map/mapConstants.js';

export default function useForecastPoints(
  {
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
  }
) {
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
    if (!entities || entities.length === 0) {
      setLegendStops([]);
      return;
    }
    const maxVal = 1; // simplified scaling placeholder
    setLegendMax(maxVal);
    const stops = buildLegendStops(maxVal);
    setLegendStops(stops);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(ent => {
      const normVal = forecastValuesNorm[ent.id];
      const rawVal = forecastValues ? forecastValues[ent.id] : undefined;
      const [r, g, b] = valueToColor(normVal, maxVal);
      const isRelevant = !relevantEntities || relevantEntities.has(ent.id);
      const opacity = isRelevant ? FORECAST_POINT_OPACITY_RELEVANT : FORECAST_POINT_OPACITY_DIM;
      const radius = isRelevant ? FORECAST_POINT_RADIUS_RELEVANT : FORECAST_POINT_RADIUS_NORMAL;
      const strokeColor = isRelevant ? FORECAST_POINT_STROKE_COLOR_RELEVANT : FORECAST_POINT_STROKE_COLOR_DIM;
      const style = new Style({
        image: new CircleStyle({
          radius,
          stroke: new Stroke({color: strokeColor, width: FORECAST_POINT_STROKE_WIDTH}),
          fill: new Fill({color: `rgba(${r},${g},${b},${opacity})`})
        })
      });
      let coord = [ent.x, ent.y];
      try {
        coord = transform(coord, ENTITIES_SOURCE_EPSG, 'EPSG:3857');
      } catch (e) {
        if (config.API_DEBUG) console.warn('Transform failed', ent.id, e);
      }
      minX = Math.min(minX, coord[0]);
      maxX = Math.max(maxX, coord[0]);
      minY = Math.min(minY, coord[1]);
      maxY = Math.max(maxY, coord[1]);
      const feat = new Feature({
        geometry: new Point(coord),
        id: ent.id,
        valueNorm: normVal,
        valueRaw: rawVal,
        name: ent.name,
        relevant: isRelevant,
        style
      });
      feat.setStyle(style);
      try {
        feat.setId(ent.id);
      } catch {
      }
      source.addFeature(feat);
    });

    if (workspace && lastFittedWorkspaceRef.current !== workspace && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) && minX < maxX && minY < maxY) {
      const view = mapRef?.current?.getView?.();
      if (view) {
        view.fit([minX, minY, maxX, maxY], {padding: FIT_PADDING, duration: 500, maxZoom: 11});
        lastFittedWorkspaceRef.current = workspace;
      }
    }
  }, [ENTITIES_SOURCE_EPSG, mapReady, entities, entitiesWorkspace, relevantEntities, workspace, forecastValuesNorm, forecastValues, forecastUnavailable, forecastLayerRef, mapRef, setLegendStops, setLegendMax]);
}
