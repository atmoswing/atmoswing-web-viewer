import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import '@/styles/map.css';

import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  useEntities,
  useForecastParameters,
  useForecastSession,
  useForecastValues,
  useSelectedEntity,
  useSynthesis
} from '@/contexts/ForecastsContext.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import {useWorkspace} from '@/contexts/WorkspaceContext.jsx';
import {useConfig} from '@/contexts/ConfigContext.jsx';
import {useSnackbar} from '@/contexts/SnackbarContext.jsx';
import MapLegend from './MapLegend.jsx';
import MapTooltip from './MapTooltip.jsx';
import useDarkMode from './hooks/useDarkMode.js';
import useMapInit from './hooks/useMapInit.js';
import useOverlayConfigLayers from './hooks/useOverlayConfigLayers.js';
import useForecastPoints from './hooks/useForecastPoints.js';
import useMapInteractions from './hooks/useMapInteractions.js';
import useProjectionRegistration from './hooks/useProjectionRegistration.js';

export default function MapViewer() {
  const {t} = useTranslation();
  const {entities, entitiesWorkspace, entitiesLoading, relevantEntities} = useEntities();
  const {forecastValues, forecastValuesNorm, forecastLoading, forecastUnavailable} = useForecastValues();
  const {percentile, normalizationRef} = useForecastParameters();
  const {selectedTargetDate} = useSynthesis();
  const {workspace} = useWorkspace();
  const {setSelectedEntityId} = useSelectedEntity();
  const {baseDateSearchFailed, clearBaseDateSearchFailed} = useForecastSession();
  const runtimeConfig = useConfig();
  const {enqueueSnackbar} = useSnackbar();
  const ENTITIES_SOURCE_EPSG = runtimeConfig?.ENTITIES_SOURCE_EPSG || 'EPSG:4326';

  const {containerRef, mapRef, forecastLayerRef, overlayGroupRef, layerSwitcherRef, mapReady} = useMapInit({
    t,
    runtimeConfig,
    enqueueSnackbar
  });

  // Projection registration & clearing when changed
  const lastRegisteredProjRef = useProjectionRegistration(ENTITIES_SOURCE_EPSG);
  useEffect(() => {
    if (!mapReady) return;
    if (!forecastLayerRef.current) return;
    if (lastRegisteredProjRef.current && ENTITIES_SOURCE_EPSG !== lastRegisteredProjRef.current) {
      forecastLayerRef.current.getSource().clear();
    }
  }, [ENTITIES_SOURCE_EPSG, mapReady, forecastLayerRef, lastRegisteredProjRef]);

  // Overlay layers from workspace config
  useOverlayConfigLayers({mapReady, runtimeConfig, workspace, overlayGroupRef, layerSwitcherRef});

  const [legendStops, setLegendStops] = useState([]);
  const [legendMax, setLegendMax] = useState(1);
  const [tooltip, setTooltip] = useState(null);

  // Forecast points
  useForecastPoints({
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
    mapRef,
    setLegendStops,
    setLegendMax
  });

  // Interactions (click & tooltip)
  useMapInteractions({mapRef, forecastLayerRef, setSelectedEntityId, setTooltip});

  // Auto-dismiss search failed overlay
  useEffect(() => {
    if (!baseDateSearchFailed) return;
    const id = setTimeout(() => {
      try {
        clearBaseDateSearchFailed();
      } catch {
      }
    }, 2000);
    return () => clearTimeout(id);
  }, [baseDateSearchFailed, clearBaseDateSearchFailed]);

  const isDarkMode = useDarkMode();

  return (
    <div style={{position: 'relative', width: '100%', height: '100%', background: '#fff'}}>
      <div ref={containerRef} style={{width: '100%', height: '100%'}}/>
      {(entitiesLoading || forecastLoading) && (
        <div className="map-loading-overlay">
          <CircularProgress size={48} thickness={4}/>
        </div>
      )}
      {forecastUnavailable && selectedTargetDate && !(entitiesLoading || forecastLoading) && (
        <div className="map-loading-overlay" style={{backdropFilter: 'blur(2px)', fontSize: 18, color: '#222'}}>
          <div>{t('map.loading.noForecastAvailable')}</div>
        </div>
      )}
      {baseDateSearchFailed && !(entitiesLoading || forecastLoading) && (
        <div className="map-loading-overlay" style={{backdropFilter: 'blur(2px)', fontSize: 18, color: '#222'}}>
          <div>{t('map.loading.noForecastFoundSearch')}</div>
        </div>
      )}
      <MapLegend legendStops={legendStops} legendMax={legendMax} dark={isDarkMode}
                 title={t('map.legend.title') + ` (P/P${normalizationRef}, q${percentile})`}/>
      <MapTooltip tooltip={tooltip} label={t('map.tooltip.value')}/>
    </div>
  );
}
