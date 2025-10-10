import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import '../styles/map.css';

import React, {useRef, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import LayerSwitcher from 'ol-layerswitcher';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {Style, Fill, Stroke, Circle as CircleStyle} from 'ol/style';
import {useEntities, useForecastParameters, useForecastValues, useSynthesis, useForecastSession} from '../contexts/ForecastsContext.jsx';
import {useSelectedEntity} from '../contexts/ForecastsContext.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import config from '../config.js';
import {useWorkspace} from '../contexts/WorkspaceContext.jsx';
import {valueToColor} from '../utils/colors.js';
import {useConfig} from '../contexts/ConfigContext.jsx';

// Add projection imports
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {transform} from 'ol/proj';

// Define the Pseudo-Mercator (PM) tile grid manually
const MANUAL_PM = (() => {
    const worldExtent = 40075016.68557849;
    const tileSize = 256;
    const baseResolution = worldExtent / tileSize;
    const maxMatrix = 18;
    const resolutions = Array.from({length: maxMatrix + 1}, (_, z) => baseResolution / 2 ** z);
    const matrixIds = resolutions.map((_, z) => z.toString());
    return new WMTSTileGrid({
        origin: [-20037508, 20037508],
        resolutions,
        matrixIds
    });
})();

export default function MapViewer() {
    const {t} = useTranslation();
    const containerRef = useRef(null);
    const mapInstanceRef = useRef(null); // guard
    const forecastLayerRef = useRef(null);
    const lastFittedWorkspaceRef = useRef(null); // track which workspace we already fitted
    const [mapReady, setMapReady] = useState(false); // NEW: flag when map & forecast layer initialized

    const {entities, entitiesWorkspace, entitiesLoading, relevantEntities} = useEntities();
    const {forecastValues, forecastValuesNorm, forecastLoading, forecastUnavailable} = useForecastValues();
    const { percentile, normalizationRef } = useForecastParameters();
    const {selectedTargetDate} = useSynthesis();
    const {workspace} = useWorkspace();
    const {setSelectedEntityId} = useSelectedEntity();
    const { baseDateSearchFailed, clearBaseDateSearchFailed } = useForecastSession();
    const runtimeConfig = useConfig();
    const ENTITIES_SOURCE_EPSG = runtimeConfig?.ENTITIES_SOURCE_EPSG || 'EPSG:4326';
    const lastRegisteredProjRef = useRef(null);

    const [legendStops, setLegendStops] = useState([]); // array of {color, pct}
    const [legendMax, setLegendMax] = useState(1);
    const [tooltip, setTooltip] = useState(null); // {x, y, name, value}
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Clear features when projection changes so they reproject cleanly
    useEffect(() => {
        if (!mapReady) return;
        if (!forecastLayerRef.current) return;
        if (lastRegisteredProjRef.current && ENTITIES_SOURCE_EPSG !== lastRegisteredProjRef.current) {
            forecastLayerRef.current.getSource().clear();
            lastFittedWorkspaceRef.current = null;
        }
    }, [ENTITIES_SOURCE_EPSG, mapReady]);

    // Dynamically (re)register source projection if config changes
    useEffect(() => {
        if (!ENTITIES_SOURCE_EPSG) return;
        if (lastRegisteredProjRef.current === ENTITIES_SOURCE_EPSG) return;
        // Provide known proj4 definitions (extend as needed)
        if (ENTITIES_SOURCE_EPSG === 'EPSG:2154' && !proj4.defs[ENTITIES_SOURCE_EPSG]) {
            proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
        }
        if (ENTITIES_SOURCE_EPSG === 'EPSG:2056' && !proj4.defs[ENTITIES_SOURCE_EPSG]) {
            // Swiss LV95
            proj4.defs('EPSG:2056', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs');
        }
        try { register(proj4); } catch (_) {}
        lastRegisteredProjRef.current = ENTITIES_SOURCE_EPSG;
    }, [ENTITIES_SOURCE_EPSG]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        const handler = (e) => setIsDarkMode(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        if (mapInstanceRef.current) return; // already created

        // Safety: remove any leftover children (e.g. from hot reload)
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        (async () => {
            // Try capabilities
            let wmtsOptionsCache = {};
            try {
                const url = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetCapabilities';
                const text = await fetch(url).then(r => r.text());
                const caps = new WMTSCapabilities().read(text);
                const desired = [ // List: https://geoservices.ign.fr/services-geoplateforme-diffusion
                    'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
                    'ORTHOIMAGERY.ORTHOPHOTOS',
                    'ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW',
                    'ADMINEXPRESS-COG.LATEST',
                    'HYDROGRAPHY.BCAE.LATEST',
                    'HYDROGRAPHY.HYDROGRAPHY'
                ];
                desired.forEach(layerId => {
                    const opts = optionsFromCapabilities(caps, {
                        layer: layerId,
                        matrixSet: 'PM',
                        style: 'normal'
                    });
                    if (opts) wmtsOptionsCache[layerId] = opts;
                });
            } catch {
                // Fallback: manual grid + minimal options
                const makeManual = (layer, format) => ({
                    url: 'https://data.geopf.fr/wmts',
                    layer,
                    matrixSet: 'PM',
                    format,
                    style: 'normal',
                    projection: 'EPSG:3857',
                    tileGrid: MANUAL_PM,
                    attributions: '© IGN, Geoportail'
                });
                wmtsOptionsCache = {
                    'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2': makeManual('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png'),
                    'ORTHOIMAGERY.ORTHOPHOTOS': makeManual('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg'),
                    'ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW': makeManual('ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW', 'image/png'),
                    'ADMINEXPRESS-COG.LATEST': makeManual('ADMINEXPRESS-COG.LATEST', 'image/png'),
                    'HYDROGRAPHY.BCAE.LATEST': {
                        ...makeManual('HYDROGRAPHY.BCAE.LATEST', 'image/png'),
                        style: 'nolegend'
                    },
                    'HYDROGRAPHY.HYDROGRAPHY': {
                        ...makeManual('HYDROGRAPHY.HYDROGRAPHY', 'image/png'),
                        style: 'nolegend'
                    }
                };
            }

            const baseLayers = new LayerGroup({
                title: t('map.baseLayers'),
                fold: 'open',
                layers: [
                    new TileLayer({
                        title: t('map.layers.esri'),
                        type: 'base',
                        visible: false,
                        source: new XYZ({
                            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                            attributions: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                        })
                    }),
                    new TileLayer({
                        title: t('map.layers.osm'),
                        type: 'base',
                        visible: false,
                        source: new OSM()
                    }),
                    new TileLayer({
                        title: t('map.layers.shadow'),
                        type: 'base',
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW'])
                    }),
                    new TileLayer({
                        title: t('map.layers.ortho'),
                        type: 'base',
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['ORTHOIMAGERY.ORTHOPHOTOS'])
                    }),
                    new TileLayer({
                        title: t('map.layers.planIgn'),
                        type: 'base',
                        visible: true,
                        source: new WMTS(wmtsOptionsCache['GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'])
                    }),
                ]
            });

            const overlayLayers = new LayerGroup({
                title: t('map.overlays'),
                fold: 'open',
                layers: [
                    new TileLayer({
                        title: t('map.layers.adminIgn'),
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['ADMINEXPRESS-COG.LATEST'])
                    }),
                    new TileLayer({
                        title: t('map.layers.bcae'),
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['HYDROGRAPHY.BCAE.LATEST'])
                    }),
                    new TileLayer({
                        title: t('map.layers.hydro'),
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['HYDROGRAPHY.HYDROGRAPHY'])
                    })
                ]
            });

            // Forecast vector layer
            forecastLayerRef.current = new VectorLayer({
                displayInLayerSwitcher: false,
                source: new VectorSource(),
                style: feature => feature.get('style') // style stored per feature
            });

            mapInstanceRef.current = new Map({
                target: containerRef.current,
                layers: [baseLayers, overlayLayers, forecastLayerRef.current],
                view: new View({
                    center: [0, 0],
                    zoom: 2,
                    projection: 'EPSG:3857'
                }),
                controls: []
            });

            mapInstanceRef.current.addControl(
                new LayerSwitcher({
                    tipLabel: t('map.layerSwitcherTip'),
                    groupSelectStyle: 'children',
                    reverse: true
                })
            );

            // single-click handler: log clicked station id (attached at creation so handler is always registered)
            const clickHandler = (evt) => {
                if (!forecastLayerRef.current) return;
                const map = mapInstanceRef.current;
                const feature = map.forEachFeatureAtPixel(evt.pixel, f => f, { layerFilter: l => l === forecastLayerRef.current });
                if (feature) {
                    const fid = typeof feature.getId === 'function' ? feature.getId() : undefined;
                    const id = fid != null ? fid : (feature.get('id') ?? feature.get('entity_id') ?? feature.get('entityId'));
                    setSelectedEntityId(id === '' ? null : id);
                }
            };
            mapInstanceRef.current.__singleClickHandler = clickHandler;
            mapInstanceRef.current.on('singleclick', clickHandler);
            // Mark map ready so data effect can populate features
            setMapReady(true);
        })();

        return () => {
            if (mapInstanceRef.current) {
                // remove click handler if present
                try { if (mapInstanceRef.current.__singleClickHandler) mapInstanceRef.current.un('singleclick', mapInstanceRef.current.__singleClickHandler); } catch (_) {}
                mapInstanceRef.current.setTarget(null);
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Auto-dismiss the temporary overlay after 2 seconds when search failed
    useEffect(() => {
        if (!baseDateSearchFailed) return;
        const id = setTimeout(() => {
            try { clearBaseDateSearchFailed(); } catch (_) {}
        }, 2000);
        return () => clearTimeout(id);
    }, [baseDateSearchFailed, clearBaseDateSearchFailed]);

    // Add pointer move & out for tooltip after map created
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        function handleMove(evt) {
            if (!forecastLayerRef.current) return;
            const feature = map.forEachFeatureAtPixel(evt.pixel, f => f, {layerFilter: l => l === forecastLayerRef.current});
            if (feature) {
                const coord = evt.pixel; // screen pixel
                setTooltip({
                    x: coord[0],
                    y: coord[1],
                    name: feature.get('name'),
                    valueRaw: feature.get('valueRaw')
                });
            } else {
                setTooltip(null);
            }
        }

        function handleOut() {
            setTooltip(null);
        }

        map.on('pointermove', handleMove);
        map.on('pointerout', handleOut);

        return () => {
            map.un('pointermove', handleMove);
            map.un('pointerout', handleOut);
        };
    }, [mapInstanceRef.current]);

    // Update forecast points when entities or forecast values change
    useEffect(() => {
        // Removed projectionReadyRef check; instead wait until projection is defined if not EPSG:4326
        if (ENTITIES_SOURCE_EPSG !== 'EPSG:4326' && !proj4.defs[ENTITIES_SOURCE_EPSG]) return;
        if (!mapReady) return; // wait until map & layer exist
        if (!mapInstanceRef.current || !forecastLayerRef.current) return;
        if (forecastUnavailable) {
            forecastLayerRef.current.getSource().clear();
            setLegendStops([]);
        }
        // If data belongs to previous workspace, clear layer and reset legend, wait for new entities
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
        // Determine max value for scaling (exclude NaN)
        const maxVal = 1;
        setLegendMax(maxVal);
        // Build legend gradient stops (samples)
        const samples = 40;
        const stops = [];
        for (let i = 0; i <= samples; i++) {
            const v = (i / samples) * maxVal;
            const [r, g, b] = valueToColor(v, maxVal);
            const pct = (i / samples) * 100;
            stops.push({color: `rgb(${r},${g},${b})`, pct});
        }
        setLegendStops(stops);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        entities.forEach(ent => {
            const normVal = forecastValuesNorm[ent.id];
            const rawVal = forecastValues ? forecastValues[ent.id] : undefined;
            const [r, g, b] = valueToColor(normVal, maxVal);
            const isRelevant = !relevantEntities || relevantEntities.has(ent.id);
            const opacity = isRelevant ? 0.9 : 0.7;
            const radius = isRelevant ? 8 : 6;
            const strokeColor = isRelevant ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
            const style = new Style({
                image: new CircleStyle({
                    radius,
                    stroke: new Stroke({color: strokeColor, width: 2}),
                    fill: new Fill({color: `rgba(${r},${g},${b},${opacity})`})
                })
            });
            let coord = [ent.x, ent.y];
            try {
                coord = transform(coord, ENTITIES_SOURCE_EPSG, 'EPSG:3857');
            } catch (e) {
                if (config.API_DEBUG) console.warn(`Transform failed for entity ${ent.id} from ${ENTITIES_SOURCE_EPSG} -> EPSG:3857`, e);
            }
            if (coord[0] < minX) minX = coord[0];
            if (coord[0] > maxX) maxX = coord[0];
            if (coord[1] < minY) minY = coord[1];
            if (coord[1] > maxY) maxY = coord[1];
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
            try { feat.setId(ent.id); } catch (_) {}
            source.addFeature(feat);
        });

        // Fit view once per workspace after entities load
        if (workspace && lastFittedWorkspaceRef.current !== workspace && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) && minX < maxX && minY < maxY) {
            const view = mapInstanceRef.current.getView();
            view.fit([minX, minY, maxX, maxY], {padding: [60, 60, 60, 60], duration: 500, maxZoom: 11});
            lastFittedWorkspaceRef.current = workspace;
        }
    }, [mapReady, entities, forecastValuesNorm, forecastValues, workspace, entitiesWorkspace, relevantEntities, forecastUnavailable, ENTITIES_SOURCE_EPSG]);

    // Reset layer and fit flag when workspace changes so new workspace extent is used
    useEffect(() => {
        if (forecastLayerRef.current) {
            forecastLayerRef.current.getSource().clear();
        }
        lastFittedWorkspaceRef.current = null;
    }, [workspace]);

    // Build CSS gradient string
    const gradientCSS = legendStops.length ? `linear-gradient(to right, ${legendStops.map(s => `${s.color} ${s.pct}%`).join(', ')})` : 'none';

    return (
        <div style={{position: 'relative', width: '100%', height: '100%', background: '#fff'}}>
            <div ref={containerRef} style={{width: '100%', height: '100%'}}/>
            {/* Loading overlay */}
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
            {/* Show a temporary, non-clickable overlay when automated search failed; dismiss after 2s */}
            {baseDateSearchFailed && !(entitiesLoading || forecastLoading) && (
                <div className="map-loading-overlay" style={{backdropFilter: 'blur(2px)', fontSize: 18, color: '#222'}}>
                    <div>{t('map.loading.noForecastFoundSearch')}</div>
                </div>
            )}
            {/* Legend */}
            {legendStops.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    background: isDarkMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)',
                    color: isDarkMode ? '#fff' : '#000',
                    padding: '8px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}>
                    <div style={{fontSize: 14, marginBottom: 2}}>{t('map.legend.title')} (P/P{normalizationRef}, q{percentile})</div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <div style={{flex: 1, height: 14, background: gradientCSS, border: `1px solid ${isDarkMode ? '#fff' : '#333'}`}}/>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 2}}>
                        <span>0</span>
                        <span>{(legendMax * 0.5).toFixed(1)}</span>
                        <span>{legendMax.toFixed(1)}</span>
                    </div>
                </div>
            )}
            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    top: tooltip.y + 12,
                    left: tooltip.x + 12,
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    padding: '4px 6px',
                    borderRadius: 4,
                    fontSize: 12,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    <div>{tooltip.name}</div>
                    <div>{t('map.tooltip.value')}: {tooltip.valueRaw == null || isNaN(tooltip.valueRaw) ? 'NaN' : tooltip.valueRaw.toFixed(1)} mm</div>
                </div>
            )}
        </div>
    );
}