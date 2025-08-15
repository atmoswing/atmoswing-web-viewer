import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import '../styles/map.css';

import React, { useRef, useEffect } from 'react';
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

            mapInstanceRef.current = new Map({
                target: containerRef.current,
                layers: [baseLayers, overlayLayers],
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

    return <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#fff' }} />;
}