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
import {useSnackbar} from '../contexts/SnackbarContext.jsx';
// NEW: formats and shapefile loader
import GeoJSON from 'ol/format/GeoJSON';
import shp from 'shpjs';

// Add projection imports
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {transform} from 'ol/proj';

function ensureProjDefined(epsg) {
    if (!epsg || !String(epsg).startsWith('EPSG:')) return;
    if (proj4.defs[epsg]) return;
    if (epsg === 'EPSG:2154') {
        proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
    } else if (epsg === 'EPSG:2056') {
        proj4.defs('EPSG:2056', '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs');
    }
    try { register(proj4); } catch (_) {}
}

// Style helpers
function toRGBA(input, alphaFallback = 1) {
    if (!input) return `rgba(0,0,0,${alphaFallback})`;
    if (typeof input === 'string') {
        const s = input.trim();
        if (s.startsWith('#')) {
            const hex = s.slice(1);
            const bigint = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r},${g},${b},${alphaFallback})`;
        }
        if (s.startsWith('rgb')) return s; // already rgb/rgba
        // QGIS style color like "r,g,b,a"
        const parts = s.split(',').map(x => Number(x.trim())).filter(n => !Number.isNaN(n));
        if (parts.length >= 3) {
            const [r,g,b,a] = parts;
            const alpha = (a != null ? (a > 1 ? a/255 : a) : alphaFallback);
            return `rgba(${r},${g},${b},${alpha})`;
        }
    }
    if (Array.isArray(input)) {
        const [r,g,b,a] = input;
        const alpha = (a != null ? (a > 1 ? a/255 : a) : alphaFallback);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(0,0,0,${alphaFallback})`;
}

function styleFromConfigObj(obj = {}) {
    // Accept compact or nested definition
    const line = obj.line || {};
    const polygon = obj.polygon || {};
    const point = obj.point || obj.circle || {};

    const lineStroke = line.stroke || {};
    const polygonStroke = polygon.stroke || {};
    const polygonFill = polygon.fill || {};
    const pointCircle = point.circle || point;
    const pointStroke = pointCircle.stroke || {};
    const pointFill = pointCircle.fill || {};

    const lineStyle = new Style({ stroke: new Stroke({ color: toRGBA(lineStroke.color || obj.strokeColor || '#0066ff'), width: Number(lineStroke.width || obj.strokeWidth || 2) }) });
    const polygonStyle = new Style({
        stroke: new Stroke({ color: toRGBA(polygonStroke.color || obj.strokeColor || '#0066ff'), width: Number(polygonStroke.width || obj.strokeWidth || 2) }),
        fill: new Fill({ color: toRGBA(polygonFill.color || obj.fillColor || 'rgba(0,102,255,0.15)') })
    });
    const pointStyle = new Style({
        image: new CircleStyle({
            radius: Number(pointCircle.radius || obj.radius || 5),
            stroke: new Stroke({ color: toRGBA(pointStroke.color || obj.strokeColor || '#003b8e'), width: Number(pointStroke.width || obj.strokeWidth || 1.5) }),
            fill: new Fill({ color: toRGBA(pointFill.color || obj.fillColor || 'rgba(0,102,255,0.7)') })
        })
    });
    return (feature) => {
        const geomType = feature.getGeometry()?.getType?.() || '';
        if (geomType.includes('Polygon')) return polygonStyle;
        if (geomType.includes('LineString')) return lineStyle;
        return pointStyle;
    };
}

async function tryLoadQmlStyle(styleUrl) {
    try {
        const res = await fetch(styleUrl, { cache: 'no-store' });
        if (!res.ok) return null;
        const text = await res.text();
        const dom = new DOMParser().parseFromString(text, 'application/xml');
        // Try to read simple symbol layer properties
        const props = {};
        dom.querySelectorAll('prop').forEach(p => {
            const k = p.getAttribute('k');
            const v = p.getAttribute('v');
            if (k && v) props[k] = v;
        });
        // Derive simple styles
        const line = {
            stroke: {
                color: props.line_color || props.outline_color || '#0066ff',
                width: Number(props.line_width || props.outline_width || 2)
            }
        };
        const polygon = {
            stroke: {
                color: props.outline_color || props.border_color || props.stroke_color || '#0066ff',
                width: Number(props.outline_width || props.stroke_width || 2)
            },
            fill: {
                color: props.color || props.fill_color || '0,102,255,64'
            }
        };
        const point = {
            circle: {
                radius: Number(props.size || 5),
                stroke: { color: props.outline_color || '#003b8e', width: Number(props.outline_width || 1.5) },
                fill: { color: props.color || '0,102,255,180' }
            }
        };
        return styleFromConfigObj({ line, polygon, point });
    } catch (_) {
        return null;
    }
}

function candidateStyleUrlsForDataUrl(dataUrl) {
    try {
        const u = new URL(dataUrl, window.location.origin);
        const path = u.pathname;
        const base = path.replace(/\.(zip|shp|geojson|json)$/i, '');
        const qml = `${u.origin}${base}.qml`;
        const qmd = `${u.origin}${base}.qmd`;
        return [qml, qmd];
    } catch {
        // Fallback for relative URLs
        const base = dataUrl.replace(/\.(zip|shp|geojson|json)$/i, '');
        return [`${base}.qml`, `${base}.qmd`];
    }
}

async function resolveOverlayStyle(item, defaultsStyleFn) {
    // 1) style from config
    if (item && item.style) {
        try { return styleFromConfigObj(item.style); } catch (_) {}
    }
    // 2) look for style definition file (.qml / .qmd)
    const candidates = candidateStyleUrlsForDataUrl(item?.url || '');
    for (const url of candidates) {
        const s = await tryLoadQmlStyle(url);
        if (s) return s;
    }
    // 3) fallback
    return defaultsStyleFn;
}

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
    const overlayGroupRef = useRef(null); // NEW: keep a ref to overlays group to add config-driven layers
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
    const {enqueueSnackbar} = useSnackbar();
    const ENTITIES_SOURCE_EPSG = runtimeConfig?.ENTITIES_SOURCE_EPSG || 'EPSG:4326';
    const lastRegisteredProjRef = useRef(null);

    const layerSwitcherRef = useRef(null);

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
        if (!runtimeConfig || !runtimeConfig.__workspacesLoaded) return; // wait for config to be fully loaded

        // Safety: remove any leftover children (e.g. from hot reload)
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        (async () => {
            // Collect WMTS layers by URL
            const wmtsRequests = {};
            const providerMap = {};
            if (runtimeConfig.providers) {
                runtimeConfig.providers.forEach(p => providerMap[p.name] = p);
            }
            if (runtimeConfig.baseLayers) {
                runtimeConfig.baseLayers.forEach(item => {
                    if (item.source === 'wmts' && item.wmtsLayer && item.provider) {
                        const provider = providerMap[item.provider];
                        if (provider) {
                            const url = provider.wmtsUrl;
                            if (!wmtsRequests[url]) wmtsRequests[url] = [];
                            wmtsRequests[url].push(item);
                        }
                    }
                });
            }
            if (runtimeConfig.overlayLayers) {
                runtimeConfig.overlayLayers.forEach(item => {
                    if (item.source === 'wmts' && item.wmtsLayer && item.provider) {
                        const provider = providerMap[item.provider];
                        if (provider) {
                            const url = provider.wmtsUrl;
                            if (!wmtsRequests[url]) wmtsRequests[url] = [];
                            wmtsRequests[url].push(item);
                        }
                    }
                });
            }

            // Fetch capabilities for each URL
            let wmtsOptionsCache = {};
            for (const [url, items] of Object.entries(wmtsRequests)) {
                try {
                    const text = await fetch(url).then(r => r.text());
                    const caps = new WMTSCapabilities().read(text);
                    items.forEach(item => {
                        // Try with specified style first, then fallback to default
                        let opts = null;
                        if (item.style) {
                            try {
                                opts = optionsFromCapabilities(caps, {
                                    layer: item.wmtsLayer,
                                    matrixSet: 'PM',
                                    style: item.style
                                });
                            } catch (e) {
                                if (config.API_DEBUG) console.warn(`Style "${item.style}" not found for layer ${item.wmtsLayer}, trying default`, e);
                            }
                        }
                        // Fallback to no style parameter (uses default)
                        if (!opts) {
                            try {
                                opts = optionsFromCapabilities(caps, {
                                    layer: item.wmtsLayer,
                                    matrixSet: 'PM'
                                });
                            } catch (e) {
                                if (config.API_DEBUG) console.warn(`Failed to get options for layer ${item.wmtsLayer}`, e);
                            }
                        }
                        if (opts) {
                            wmtsOptionsCache[item.wmtsLayer] = opts;
                        } else {
                            enqueueSnackbar(`Failed to load layer ${item.title}: layer not found in capabilities`, { variant: 'warning' });
                        }
                    });
                } catch (error) {
                    items.forEach(item => {
                        enqueueSnackbar(`Failed to load layer ${item.title}: ${error.message}`, { variant: 'warning' });
                    });
                }
            }

            // Create base layers: hard-coded Esri and OSM, plus config-driven
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
                new TileLayer({
                    title: t('map.layers.osm'),
                    type: 'base',
                    visible: false,
                    source: new OSM()
                })
            ];
            if (runtimeConfig.baseLayers) {
                runtimeConfig.baseLayers.forEach(item => {
                    let source;
                    if (item.source === 'wmts') {
                        const wmtsOptions = wmtsOptionsCache[item.wmtsLayer];
                        if (wmtsOptions) {
                            source = new WMTS(wmtsOptions);
                        }
                    }
                    if (source) {
                        baseLayersArray.push(new TileLayer({
                            title: item.title,
                            type: item.type || 'base',
                            visible: !!item.visible,
                            source
                        }));
                    }
                });
            }
            const baseLayers = new LayerGroup({
                title: t('map.baseLayers'),
                fold: 'open',
                layers: baseLayersArray
            });

            // Create overlay layers from config
            const overlayLayersArray = [];
            if (runtimeConfig.overlayLayers) {
                runtimeConfig.overlayLayers.forEach(item => {
                    let source;
                    if (item.source === 'wmts') {
                        const wmtsOptions = wmtsOptionsCache[item.wmtsLayer];
                        if (wmtsOptions) {
                            source = new WMTS(wmtsOptions);
                        }
                    }
                    if (source) {
                        overlayLayersArray.push(new TileLayer({
                            title: item.title,
                            visible: !!item.visible,
                            source
                        }));
                    }
                });
            }
            const overlayLayers = new LayerGroup({
                title: t('map.overlays'),
                fold: 'open',
                layers: overlayLayersArray
            });
            overlayGroupRef.current = overlayLayers; // keep ref for dynamic layers

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

            const layerSwitcher = new LayerSwitcher({
                tipLabel: t('map.layerSwitcherTip'),
                groupSelectStyle: 'children',
                reverse: true
            });
            layerSwitcherRef.current = layerSwitcher; // NEW: store ref to layer switcher instance

            mapInstanceRef.current.addControl(layerSwitcher);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runtimeConfig]);

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

    // NEW: Manage overlay layers coming from workspace config
    useEffect(() => {
        if (!mapReady) return;
        const group = overlayGroupRef.current;
        if (!group) return;
        const layersCollection = group.getLayers();
        // Remove previous config-driven layers
        try {
            layersCollection.getArray()
                .filter(l => l && l.get && l.get('__fromWorkspaceConfig'))
                .forEach(l => layersCollection.remove(l));
        } catch (_) {}
        // Resolve selected workspace config
        const ws = runtimeConfig?.workspaces?.find(w => w.key === workspace);
        const items = (ws && Array.isArray(ws.shapefiles)) ? ws.shapefiles : [];
        if (!items.length) return;

        // Basic style helpers
        const lineStyle = new Style({ stroke: new Stroke({ color: 'rgba(0, 102, 255, 0.9)', width: 2 }) });
        const polygonStyle = new Style({
            stroke: new Stroke({ color: 'rgba(0, 102, 255, 0.9)', width: 2 }),
            fill: new Fill({ color: 'rgba(0, 102, 255, 0.15)' })
        });
        const pointStyle = new Style({
            image: new CircleStyle({ radius: 5, stroke: new Stroke({ color: '#003b8e', width: 1.5 }), fill: new Fill({ color: 'rgba(0, 102, 255, 0.7)' }) })
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
            const layer = new VectorLayer({
                title,
                visible: !!item.display,
                source: src,
                style: styleFn
            });
            layer.set('__fromWorkspaceConfig', true);

            // Resolve style asynchronously (config style > .qml > default)
            resolveOverlayStyle(item, styleFn).then(sfn => {
                try { layer.setStyle(sfn); } catch (_) {}
            });

            const lower = String(url).toLowerCase();
            if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
                // Load as GeoJSON
                fetch(url, { cache: 'no-store' })
                    .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
                    .then(json => {
                        const fmt = new GeoJSON();
                        try {
                            ensureProjDefined(dataProj);
                            const feats = fmt.readFeatures(json, { dataProjection: dataProj, featureProjection: 'EPSG:3857' });
                            src.addFeatures(feats);
                        } catch (e) {
                            if (config.API_DEBUG) console.warn('Failed to parse GeoJSON for overlay', title, e);
                        }
                    })
                    .catch(e => { if (config.API_DEBUG) console.warn('Failed to load GeoJSON overlay', title, e); });
            } else if (lower.endsWith('.zip') || lower.endsWith('.shp')) {
                // Load as Shapefile via shpjs; if .shp, it will attempt to fetch sidecars (.dbf/.shx/.prj)
                shp(url)
                    .then(geojson => {
                        const fmt = new GeoJSON();
                        try {
                            // shpjs typically outputs GeoJSON in WGS84 (EPSG:4326) when .prj is present.
                            const feats = fmt.readFeatures(geojson, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                            src.addFeatures(feats);
                            if (config.API_DEBUG) console.log(`[overlay] Loaded ${feats.length} features for`, title);
                        } catch (e) {
                            if (config.API_DEBUG) console.warn('Failed to parse Shapefile (as GeoJSON) for overlay', title, e);
                        }
                    })
                    .catch(e => { if (config.API_DEBUG) console.warn('Failed to load Shapefile overlay', title, e); });
            } else {
                if (config.API_DEBUG) console.warn('Unsupported overlay URL (expect .geojson/.json/.shp/.zip):', url);
            }

            layersCollection.push(layer);
        };

        items.forEach(addLayerForItem);

        // Refresh the layer switcher panel to reflect newly added layers
        if (layerSwitcherRef.current) {
            layerSwitcherRef.current.renderPanel();
        }
    }, [mapReady, workspace, runtimeConfig]);

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
