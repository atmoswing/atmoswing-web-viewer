/**
 * @module components/map/hooks/useWorkspaceView
 * @description React hook that points the map at the active workspace's area as soon as the
 * workspace is known, before its entities have loaded.
 */

import {useEffect} from 'react';
import {transformExtent} from 'ol/proj';
import {DEFAULT_PROJECTION, FIT_PADDING} from '@/components/map/mapConstants.js';

/** View used when the workspace has no configured extent. @constant {Object} */
export const WORLD_VIEW = {center: [0, 0], zoom: 2};

/**
 * Validates a workspace `extent` from the runtime config.
 *
 * @param {*} extent - Expected `[minLon, minLat, maxLon, maxLat]` in WGS84
 * @returns {Array<number>|null} The extent, or null when absent or malformed
 * @example
 * parseWorkspaceExtent([-5.2, 41.3, 9.6, 51.1]); // [-5.2, 41.3, 9.6, 51.1]
 * parseWorkspaceExtent([1, 2, 3]);              // null
 */
export function parseWorkspaceExtent(extent) {
  if (!Array.isArray(extent) || extent.length !== 4) return null;
  const [minLon, minLat, maxLon, maxLat] = extent.map(Number);
  if (![minLon, minLat, maxLon, maxLat].every(Number.isFinite)) return null;
  if (minLon >= maxLon || minLat >= maxLat) return null;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return null;
  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Hook that sets the map view for the active workspace.
 * The map is created with an empty view, which renders nothing and requests no tiles. Once the
 * workspace is resolved, the view is fitted to the workspace's configured `extent`, without
 * animation; without one, it falls back to a world view, only if the view is still empty. The
 * fit on the loaded entities (see useForecastPoints) then refines the view as before.
 *
 * @param {Object} params - Hook parameters
 * @param {React.RefObject} params.mapRef - Ref to the OpenLayers map
 * @param {boolean} params.mapReady - Whether the map has been created
 * @param {string} params.workspace - Active workspace key ('' while unresolved)
 * @param {Array<Object>} [params.workspaces] - Workspace definitions from the runtime config
 * @example
 * useWorkspaceView({mapRef, mapReady, workspace, workspaces: runtimeConfig.workspaces});
 */
export default function useWorkspaceView({mapRef, mapReady, workspace, workspaces}) {
  // Without workspaces, none will ever be resolved: fall back straight away.
  const resolved = !!workspace || !(workspaces || []).length;
  // A string, so the effect does not re-run on every config object identity change.
  const rawExtent = JSON.stringify((workspaces || []).find(w => w.key === workspace)?.extent ?? null);

  useEffect(() => {
    if (!mapReady || !resolved) return;
    const map = mapRef.current;
    const view = map?.getView?.();
    if (!view) return;
    const configured = JSON.parse(rawExtent);
    const extent = parseWorkspaceExtent(configured);
    if (configured != null && !extent) {
      console.warn(`Workspace ${workspace}: ignoring extent ${rawExtent}, `
        + 'expected [minLon, minLat, maxLon, maxLat] in WGS84');
    }
    if (extent) {
      const target = transformExtent(extent, 'EPSG:4326', DEFAULT_PROJECTION);
      view.fit(target, {padding: FIT_PADDING, size: map.getSize?.()});
    } else if (!view.isDef()) {
      view.setCenter(WORLD_VIEW.center);
      view.setZoom(WORLD_VIEW.zoom);
    }
  }, [mapRef, mapReady, resolved, workspace, rawExtent]);
}
