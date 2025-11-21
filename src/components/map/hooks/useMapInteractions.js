/**
 * @module components/map/hooks/useMapInteractions
 * @description Hook for handling map click and pointer interactions with forecast points.
 * Manages entity selection on click and tooltip display on hover.
 */

import {useEffect} from 'react';

/**
 * Hook that sets up map interaction handlers for forecast point selection and tooltips.
 * Handles single click for entity selection and pointer move/out for tooltip display.
 *
 * @param {Object} params - Hook parameters
 * @param {React.RefObject} params.mapRef - Ref to OpenLayers map instance
 * @param {React.RefObject} params.forecastLayerRef - Ref to forecast vector layer
 * @param {Function} params.setSelectedEntityId - Function to set selected entity ID
 * @param {Function} params.setTooltip - Function to set tooltip state (x, y, name, valueRaw)
 * @param {boolean} params.mapReady - Whether map is initialized
 * @example
 * useMapInteractions({
 *   mapRef,
 *   forecastLayerRef,
 *   setSelectedEntityId: (id) => console.log('Selected:', id),
 *   setTooltip: (tooltip) => console.log('Tooltip:', tooltip),
 *   mapReady: true
 * });
 */
export default function useMapInteractions({mapRef, forecastLayerRef, setSelectedEntityId, setTooltip, mapReady}) {
  // Click handler
  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;
    const map = mapRef.current;
    const clickHandler = (evt) => {
      if (!forecastLayerRef.current) return;
      const feature = map.forEachFeatureAtPixel(evt.pixel, f => f, {layerFilter: l => l === forecastLayerRef.current});
      if (feature) {
        const fid = typeof feature.getId === 'function' ? feature.getId() : undefined;
        const id = fid != null ? fid : (feature.get('id') ?? feature.get('entity_id') ?? feature.get('entityId'));
        setSelectedEntityId(id === '' ? null : id);
      }
    };
    map.__singleClickHandler = clickHandler;
    map.on('singleclick', clickHandler);
    return () => {
      try {
        map.un('singleclick', clickHandler);
      } catch { /* listener already detached */
      }
    };
  }, [mapRef, forecastLayerRef, setSelectedEntityId, mapReady]);

  // Tooltip pointer handlers
  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current) return;
    const map = mapRef.current;

    function handleMove(evt) {
      if (!forecastLayerRef.current) return;
      const feature = map.forEachFeatureAtPixel(evt.pixel, f => f, {layerFilter: l => l === forecastLayerRef.current});
      if (feature) {
        const coord = evt.pixel;
        setTooltip({x: coord[0], y: coord[1], name: feature.get('name'), valueRaw: feature.get('valueRaw')});
      } else setTooltip(null);
    }

    function handleOut() {
      setTooltip(null);
    }

    map.on('pointermove', handleMove);
    map.on('pointerout', handleOut);
    return () => {
      try {
        map.un('pointermove', handleMove);
        map.un('pointerout', handleOut);
      } catch { /* handlers might be already removed */
      }
    };
  }, [mapRef, forecastLayerRef, setTooltip, mapReady]);
}
