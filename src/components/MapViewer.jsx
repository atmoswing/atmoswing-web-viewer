import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import '../styles/map.css';

import React, { useRef, useEffect, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import LayerSwitcher from 'ol-layerswitcher';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {Style, Fill, Stroke, Circle as CircleStyle} from 'ol/style';
import {useEntities, useForecastValues, useSynthesis} from '../contexts/ForecastsContext.jsx';
import CircularProgress from '@mui/material/CircularProgress';
import config from '../config.js';
import {useWorkspace} from '../contexts/WorkspaceContext.jsx';
import { valueToColor } from '../utils/colors.js';

// Add projection imports
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';
import {transform} from 'ol/proj';

// Register source projection from env
const SOURCE_EPSG = config.ENTITIES_SOURCE_EPSG;
if (SOURCE_EPSG === 'EPSG:2154' && !proj4.defs[SOURCE_EPSG]) {
    proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
}
register(proj4);

// Define the Pseudo-Mercator (PM) tile grid manually
const MANUAL_PM = (() => {
    const worldExtent = 40075016.68557849;
    const tileSize = 256;
    const baseResolution = worldExtent / tileSize;
    const maxMatrix = 18;
    const resolutions = Array.from({ length: maxMatrix + 1 }, (_, z) => baseResolution / 2 ** z);
    const matrixIds = resolutions.map((_, z) => z.toString());
    return new WMTSTileGrid({
        origin: [-20037508, 20037508],
        resolutions,
        matrixIds
    });
})();

export default function MapViewer() {
    const containerRef = useRef(null);
    const mapInstanceRef = useRef(null); // guard
    const forecastLayerRef = useRef(null);
    const lastFittedWorkspaceRef = useRef(null); // track which workspace we already fitted

    const {entities, entitiesWorkspace, entitiesLoading, relevantEntities} = useEntities();
    const {forecastValues, forecastValuesNorm, forecastLoading, forecastUnavailable} = useForecastValues();
    const {selectedTargetDate} = useSynthesis();
    const {workspace} = useWorkspace();

    const [legendStops, setLegendStops] = useState([]); // array of {color, pct}
    const [legendMax, setLegendMax] = useState(1);
    const [tooltip, setTooltip] = useState(null); // {x, y, name, value}

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
                    'HYDROGRAPHY.BCAE.LATEST': { ...makeManual('HYDROGRAPHY.BCAE.LATEST', 'image/png'), style: 'nolegend' },
                    'HYDROGRAPHY.HYDROGRAPHY': { ...makeManual('HYDROGRAPHY.HYDROGRAPHY', 'image/png'), style: 'nolegend' }
                };
            }

            const baseLayers = new LayerGroup({
                title: 'Base maps',
                fold: 'open',
                layers: [
                    new TileLayer({
                        title: 'Esri World Imagery',
                        type: 'base',
                        visible: false,
                        source: new XYZ({
                            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                            attributions: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                        })
                    }),
                    new TileLayer({
                        title: 'Plan OpenStreetMap',
                        type: 'base',
                        visible: false,
                        source: new OSM()
                    }),
                    new TileLayer({
                        title: 'Ombrage (IGN)',
                        type: 'base',
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW'])
                    }),
                    new TileLayer({
                        title: 'Orthophotos (IGN)',
                        type: 'base',
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['ORTHOIMAGERY.ORTHOPHOTOS'])
                    }),
                    new TileLayer({
                        title: 'Plan IGN',
                        type: 'base',
                        visible: true,
                        source: new WMTS(wmtsOptionsCache['GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'])
                    }),
                ]
            });

            const overlayLayers = new LayerGroup({
                title: 'Overlays',
                fold: 'open',
                layers: [
                    new TileLayer({
                        title: 'Admin (IGN)',
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['ADMINEXPRESS-COG.LATEST'])
                    }),
                    new TileLayer({
                        title: 'Cours d\'eau BCAE (IGN)',
                        visible: false,
                        source: new WMTS(wmtsOptionsCache['HYDROGRAPHY.BCAE.LATEST'])
                    }),
                    new TileLayer({
                        title: 'Hydrographie (IGN)',
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
                    tipLabel: 'Layers',
                    groupSelectStyle: 'children',
                    reverse: true
                })
            );
        })();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setTarget(null);
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Add pointer move & out for tooltip after map created
    useEffect(() => {
        // Add pointer move & out for tooltip after map created
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
        function handleOut() { setTooltip(null); }
        map.on('pointermove', handleMove);
        map.getViewport().addEventListener('mouseout', handleOut);
        return () => {
            map.un('pointermove', handleMove);
            map.getViewport().removeEventListener('mouseout', handleOut);
        };
    }, [mapInstanceRef.current]);

    // Update forecast points when entities or forecast values change
    useEffect(() => {
        if (!mapInstanceRef.current || !forecastLayerRef.current) return;
        // If forecast unavailable: clear layer and return
        if (forecastUnavailable) {
            forecastLayerRef.current.getSource().clear();
            setLegendStops([]);
            return;
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
            const [r,g,b] = valueToColor(v, maxVal);
            const pct = (i / samples) * 100;
            stops.push({color: `rgb(${r},${g},${b})`, pct});
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
            const style = new Style({
                image: new CircleStyle({
                    radius,
                    stroke: new Stroke({color: strokeColor, width: 2}),
                    fill: new Fill({color: `rgba(${r},${g},${b},${opacity})`})
                })
            });
            // Transform from source projection to map projection
            let coord = [ent.x, ent.y];
            try {
                coord = transform(coord, SOURCE_EPSG, 'EPSG:3857');
            } catch (_) {}
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
            source.addFeature(feat);
        });

        // Fit view once per workspace after entities load
        if (workspace && lastFittedWorkspaceRef.current !== workspace && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) && minX < maxX && minY < maxY) {
            const view = mapInstanceRef.current.getView();
            view.fit([minX, minY, maxX, maxY], { padding: [60, 60, 60, 60], duration: 500, maxZoom: 11 });
            lastFittedWorkspaceRef.current = workspace;
        }
    }, [entities, forecastValuesNorm, workspace, entitiesWorkspace, relevantEntities, forecastUnavailable]);

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
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#fff' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            {/* Loading overlay */}
            {(entitiesLoading || forecastLoading) && (
                <div className="map-loading-overlay">
                    <CircularProgress size={48} thickness={4} />
                </div>
            )}
            {forecastUnavailable && selectedTargetDate && !(entitiesLoading || forecastLoading) && (
                <div className="map-loading-overlay" style={{backdropFilter:'blur(2px)', fontSize:18, color:'#222'}}>
                    <div>No forecast available for the selected method and lead time</div>
                </div>
            )}
            {/* Legend */}
            {legendStops.length > 0 && (
                <div style={{position:'absolute', bottom:10, left:10, background:'rgba(255,255,255,0.9)', padding:'8px 10px', borderRadius:4, fontSize:12, boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}>
                    <div style={{fontSize:14, marginBottom:2}}>Forecast values</div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{flex:1, height:14, background: gradientCSS, border:'1px solid #333'}} />
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:2}}>
                        <span>0</span>
                        <span>{(legendMax*0.5).toFixed(1)}</span>
                        <span>{legendMax.toFixed(1)}</span>
                    </div>
                </div>
            )}
            {/* Tooltip */}
            {tooltip && (
                <div style={{position:'absolute', top: tooltip.y + 12, left: tooltip.x + 12, background:'rgba(0,0,0,0.75)', color:'#fff', padding:'4px 6px', borderRadius:4, fontSize:12, pointerEvents:'none', whiteSpace:'nowrap'}}>
                    <div>{tooltip.name}</div>
                    <div>Value: {tooltip.valueRaw == null || isNaN(tooltip.valueRaw) ? 'NaN' : tooltip.valueRaw.toFixed(1)} mm</div>
                </div>
            )}
        </div>
    );
}