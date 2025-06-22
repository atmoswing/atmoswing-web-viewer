import React, { useRef, useEffect } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

export default function MapViewer() {
    const mapRef = useRef(null);

    useEffect(() => {
        const map = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            view: new View({
                center: [0, 0],
                zoom: 2,
                projection: 'EPSG:3857'
            })
        });

        return () => map.setTarget(null);
    }, []);

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
        />
    );
}