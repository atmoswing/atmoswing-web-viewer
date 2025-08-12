import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';

import React, { useRef, useEffect } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import LayerGroup from 'ol/layer/Group';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import LayerSwitcher from 'ol-layerswitcher';

export default function MapViewer() {
    const mapRef = useRef(null);

    useEffect(() => {
        const baseLayers = new LayerGroup({
            title: 'Base maps',
            fold: 'open',
            layers: [
                new TileLayer({
                    title: 'OpenStreetMap',
                    type: 'base',
                    visible: true,
                    source: new OSM()
                }),
                new TileLayer({
                    title: 'Esri World Imagery',
                    type: 'base',
                    visible: false,
                    source: new XYZ({
                        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        attributions: 'Tiles © Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    })
                })
            ]
        });

        const map = new Map({
            target: mapRef.current,
            layers: [baseLayers],
            view: new View({
                center: [0, 0],
                zoom: 2,
                projection: 'EPSG:3857'
            })
        });

        const layerSwitcher = new LayerSwitcher({
            tipLabel: 'Layers',
            groupSelectStyle: 'children'
        });
        map.addControl(layerSwitcher);

        return () => map.setTarget(null);
    }, []);

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
        />
    );
}