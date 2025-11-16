import {useEffect} from 'react';

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
      } catch { /* listener already detached */ }
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
      } catch { /* handlers might be already removed */ }
    };
  }, [mapRef, forecastLayerRef, setTooltip, mapReady]);
}
