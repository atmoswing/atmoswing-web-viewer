/**
 * @module components/map/hooks/useForecastPoints
 * @description Hook for rendering forecast points on the map with color-coded values.
 * Handles entity visualization, relevance highlighting, legend updates, and map extent fitting.
 */

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
  FORECAST_POINT_OPACITY_DIM,
  FORECAST_POINT_OPACITY_RELEVANT,
  FORECAST_POINT_RADIUS_NORMAL,
  FORECAST_POINT_RADIUS_RELEVANT,
  FORECAST_POINT_STROKE_COLOR_DIM,
  FORECAST_POINT_STROKE_COLOR_RELEVANT,
  FORECAST_POINT_STROKE_WIDTH
} from '@/components/map/mapConstants.js';

/**
 * Hook that renders forecast entities as colored points on the OpenLayers map.
 * Updates point colors based on forecast values, highlights relevant entities,
 * manages legend stops, and fits map extent to data.
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.ENTITIES_SOURCE_EPSG - EPSG code for entity coordinates
 * @param {boolean} params.mapReady - Whether map is initialized
 * @param {Array} params.entities - Array of entity objects with coordinates
 * @param {string} params.entitiesWorkspace - Workspace key for entities
 * @param {string} params.entitiesKey - Cache key for current entities
 * @param {Set} params.relevantEntities - Set of relevant entity IDs
 * @param {string} params.workspace - Current workspace
 * @param {Object} params.forecastValuesNorm - Normalized forecast values by entity ID
 * @param {Object} params.forecastValues - Raw forecast values by entity ID
 * @param {boolean} params.forecastUnavailable - Whether forecast data is unavailable
 * @param {React.RefObject} params.forecastLayerRef - Ref to forecast vector layer
 * @param {React.RefObject} params.mapRef - Ref to OpenLayers map instance
 * @param {Function} params.setLegendStops - Setter for legend gradient stops
 * @param {Function} params.setLegendMax - Setter for legend maximum value
 * @example
 * useForecastPoints({
 *   ENTITIES_SOURCE_EPSG: 'EPSG:4326',
 *   mapReady: true,
 *   entities: [...],
 *   forecastValuesNorm: { 1: 0.5, 2: 0.8 },
 *   forecastLayerRef,
 *   mapRef,
 *   setLegendStops,
 *   setLegendMax
 * });
 */
export default function useForecastPoints(
  {
    ENTITIES_SOURCE_EPSG,
    mapReady,
    entities,
    entitiesWorkspace,
    entitiesKey,
    relevantEntities,
    workspace,
    forecastValuesNorm,
    forecastValues,
    forecastUnavailable,
    forecastLayerRef,
    mapRef,
    setLegendStops,
    setLegendMax
  }
) {
  const lastFittedWorkspaceRef = useRef(null);
  const lastRenderedKeyRef = useRef(null);

  useEffect(() => {
    if (ENTITIES_SOURCE_EPSG !== 'EPSG:4326' && !proj4.defs[ENTITIES_SOURCE_EPSG]) return;
    if (!mapReady) return;
    if (!forecastLayerRef.current) return;

    // Clear layer when forecast is unavailable
    if (forecastUnavailable) {
      forecastLayerRef.current.getSource().clear();
      setLegendStops([]);
      lastRenderedKeyRef.current = null;
      return;
    }

    // Clear layer when entities key changes (workspace/date/method/config changed)
    if (entitiesKey && lastRenderedKeyRef.current && lastRenderedKeyRef.current !== entitiesKey) {
      forecastLayerRef.current.getSource().clear();
      setLegendStops([]);
      lastFittedWorkspaceRef.current = null;
      lastRenderedKeyRef.current = null;
    }

    // Only proceed if we have entities and a valid key
    if (!entitiesKey || !entities || entities.length === 0) {
      return;
    }
    const layer = forecastLayerRef.current;
    const source = layer.getSource();
    source.clear();
    const maxVal = 1; // simplified scaling placeholder
    setLegendMax(maxVal);
    const stops = buildLegendStops(maxVal);
    setLegendStops(stops);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(ent => {
      const normVal = forecastValuesNorm[ent.id];
      const rawVal = forecastValues ? forecastValues[ent.id] : undefined;
      const [r, g, b] = valueToColor(normVal, maxVal);
      const isRelevant = !relevantEntities || !(relevantEntities instanceof Set) || relevantEntities.has(ent.id);
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
      } catch { /* setting feature id may fail for some sources */
      }
      source.addFeature(feat);
    });

    // Mark this entities key as successfully rendered
    lastRenderedKeyRef.current = entitiesKey;

    // Fit map extent only once per workspace when we have valid bounds
    if (workspace && lastFittedWorkspaceRef.current !== workspace && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) && minX < maxX && minY < maxY) {
      const view = mapRef?.current?.getView?.();
      if (view) {
        view.fit([minX, minY, maxX, maxY], {padding: FIT_PADDING, duration: 500, maxZoom: 11});
        lastFittedWorkspaceRef.current = workspace;
      }
    }
  }, [ENTITIES_SOURCE_EPSG, mapReady, entities, entitiesWorkspace, entitiesKey, relevantEntities, workspace, forecastValuesNorm, forecastValues, forecastUnavailable, forecastLayerRef, mapRef, setLegendStops, setLegendMax]);
}
