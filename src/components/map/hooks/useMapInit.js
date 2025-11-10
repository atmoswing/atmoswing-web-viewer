import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import LayerSwitcher from 'ol-layerswitcher';

export default function useMapInit({ t, runtimeConfig, enqueueSnackbar }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const forecastLayerRef = useRef(null);
    const overlayGroupRef = useRef(null);
    const layerSwitcherRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        if (mapRef.current) return;
        if (!runtimeConfig || !runtimeConfig.__workspacesLoaded) return;

        while (containerRef.current.firstChild) containerRef.current.removeChild(containerRef.current.firstChild);

        (async () => {
            // Collect WMTS by provider
            const wmtsRequests = {};
            const providerMap = {};
            (runtimeConfig.providers || []).forEach(p => providerMap[p.name] = p);
            const collect = (arr) => (arr || []).forEach(item => {
                if (item.source === 'wmts' && item.wmtsLayer && item.provider) {
                    const provider = providerMap[item.provider];
                    if (!provider) return;
                    const url = provider.wmtsUrl;
                    if (!wmtsRequests[url]) wmtsRequests[url] = [];
                    wmtsRequests[url].push(item);
                }
            });
            collect(runtimeConfig.baseLayers);
            collect(runtimeConfig.overlayLayers);

            const wmtsOptionsCache = {};
            for (const [url, items] of Object.entries(wmtsRequests)) {
                try {
                    const text = await fetch(url).then(r => r.text());
                    const caps = new WMTSCapabilities().read(text);
                    items.forEach(item => {
                        let opts = null;
                        if (item.style) {
                            try { opts = optionsFromCapabilities(caps, { layer: item.wmtsLayer, matrixSet: 'PM', style: item.style }); } catch {}
                        }
                        if (!opts) {
                            try { opts = optionsFromCapabilities(caps, { layer: item.wmtsLayer, matrixSet: 'PM' }); } catch {}
                        }
                        if (opts) wmtsOptionsCache[item.wmtsLayer] = opts; else enqueueSnackbar(`Failed to load layer ${item.title}: layer not found in capabilities`, { variant: 'warning' });
                    });
                } catch (error) {
                    items.forEach(item => enqueueSnackbar(`Failed to load layer ${item.title}: ${error.message}`, { variant: 'warning' }));
                }
            }

            const baseLayersArray = [
                new TileLayer({ title: t('map.layers.esri'), type: 'base', visible: false, source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attributions: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community' }) }),
                new TileLayer({ title: t('map.layers.osm'), type: 'base', visible: false, source: new OSM() })
            ];
            (runtimeConfig.baseLayers || []).forEach(item => {
                let source;
                if (item.source === 'wmts') {
                    const opts = wmtsOptionsCache[item.wmtsLayer];
                    if (opts) source = new WMTS(opts);
                }
                if (source) baseLayersArray.push(new TileLayer({ title: item.title, type: item.type || 'base', visible: !!item.visible, source }));
            });

            const baseLayers = new LayerGroup({ title: t('map.baseLayers'), fold: 'open', layers: baseLayersArray });
            const overlayLayers = new LayerGroup({ title: t('map.overlays'), fold: 'open', layers: [] });
            overlayGroupRef.current = overlayLayers;

            forecastLayerRef.current = new VectorLayer({ displayInLayerSwitcher: false, source: new VectorSource(), style: f => f.get('style') });

            mapRef.current = new Map({
                target: containerRef.current,
                layers: [baseLayers, overlayLayers, forecastLayerRef.current],
                view: new View({ center: [0,0], zoom: 2, projection: 'EPSG:3857' }),
                controls: []
            });

            const layerSwitcher = new LayerSwitcher({ tipLabel: t('map.layerSwitcherTip'), groupSelectStyle: 'children', reverse: true });
            layerSwitcherRef.current = layerSwitcher;
            mapRef.current.addControl(layerSwitcher);
            setMapReady(true);
        })();

        return () => {
            if (mapRef.current) {
                try {
                    const group = overlayGroupRef.current;
                    if (group) group.getLayers().getArray().forEach(l => { const timer = l && l.get && l.get('__refreshTimer'); if (timer) clearInterval(timer); });
                } catch {}
                try { if (mapRef.current.__singleClickHandler) mapRef.current.un('singleclick', mapRef.current.__singleClickHandler); } catch {}
                mapRef.current.setTarget(null);
                mapRef.current = null;
            }
        };
    }, [runtimeConfig, t, enqueueSnackbar]);

    return { containerRef, mapRef, forecastLayerRef, overlayGroupRef, layerSwitcherRef, mapReady };
}
