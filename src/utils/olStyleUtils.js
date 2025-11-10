// Reusable utilities for OpenLayers style creation and simple QGIS style parsing
import {Style, Fill, Stroke, Circle as CircleStyle} from 'ol/style';

// Convert various color formats to CSS rgba()
export function toRGBA(input, alphaFallback = 1) {
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

// Build a style function from a flexible config object
export function styleFromConfigObj(obj = {}) {
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

// Attempt to parse a minimal subset of QGIS .qml/.qmd styles
export async function tryLoadQmlStyle(styleUrl) {
    try {
        const res = await fetch(styleUrl, { cache: 'no-store' });
        if (!res.ok) return null;
        const text = await res.text();
        const dom = new DOMParser().parseFromString(text, 'application/xml');
        const props = {};
        const nodes = dom.getElementsByTagName('prop');
        for (let i = 0; i < nodes.length; i++) {
            const p = nodes[i];
            const k = p.getAttribute('k');
            const v = p.getAttribute('v');
            if (k && v) props[k] = v;
        }
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
    } catch (e) {
        void e; // ignore parse errors and return null
        return null;
    }
}

export function candidateStyleUrlsForDataUrl(dataUrl) {
    try {
        const u = new URL(dataUrl, window.location.origin);
        const path = u.pathname;
        const base = path.replace(/\.(zip|shp|geojson|json)$/i, '');
        const qml = `${u.origin}${base}.qml`;
        const qmd = `${u.origin}${base}.qmd`;
        return [qml, qmd];
    } catch {
        const base = (dataUrl || '').replace(/\.(zip|shp|geojson|json)$/i, '');
        return [`${base}.qml`, `${base}.qmd`];
    }
}

export async function resolveOverlayStyle(item, defaultsStyleFn) {
    if (item && item.style) {
        try { return styleFromConfigObj(item.style); } catch (e) { void e; }
    }
    const candidates = candidateStyleUrlsForDataUrl(item?.url || '');
    for (const url of candidates) {
        const s = await tryLoadQmlStyle(url);
        if (s) return s;
    }
    return defaultsStyleFn;
}
