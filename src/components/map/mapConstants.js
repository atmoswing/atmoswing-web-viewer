/**
 * @module components/map/mapConstants
 * @description Centralized map-related constants for OpenLayers configuration.
 * Avoids magic numbers scattered throughout map components.
 */

/** Default map projection (Web Mercator). @constant {string} */
export const DEFAULT_PROJECTION = 'EPSG:3857';

/** Default WMTS matrix set identifier. @constant {string} */
export const WMTS_MATRIX_SET_DEFAULT = 'PM';

/** Time allowed for a WMTS GetCapabilities request before its layers are given up (ms). @constant {number} */
export const WMTS_CAPABILITIES_TIMEOUT_MS = 15000;

/** Age after which stored WMTS layer settings are used once more but refreshed in the background (ms). @constant {number} */
export const WMTS_STORED_CAPABILITIES_FRESH_MS = 24 * 60 * 60 * 1000;

/** Age after which stored WMTS layer settings are ignored and fetched again first (ms). @constant {number} */
export const WMTS_STORED_CAPABILITIES_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Extra attempts for a WMTS tile whose request failed transiently. @constant {number} */
export const WMTS_TILE_MAX_RETRIES = 2;

/** Delay before the first tile retry; each further retry waits this much longer (ms). @constant {number} */
export const WMTS_TILE_RETRY_DELAY_MS = 1000;

/** Padding for map extent fitting [top, right, bottom, left] in pixels. @constant {Array<number>} */
export const FIT_PADDING = [60, 60, 60, 60];

/** Number of color gradient samples for legend generation. @constant {number} */
export const LEGEND_SAMPLES = 40;

/** Radius for relevant/highlighted forecast points (pixels). @constant {number} */
export const FORECAST_POINT_RADIUS_RELEVANT = 8;

/** Radius for normal forecast points (pixels). @constant {number} */
export const FORECAST_POINT_RADIUS_NORMAL = 6;

/** Stroke width for forecast point borders (pixels). @constant {number} */
export const FORECAST_POINT_STROKE_WIDTH = 2;

/** Stroke color for relevant forecast points. @constant {string} */
export const FORECAST_POINT_STROKE_COLOR_RELEVANT = 'rgba(0,0,0,0.6)';

/** Stroke color for dimmed forecast points. @constant {string} */
export const FORECAST_POINT_STROKE_COLOR_DIM = 'rgba(0,0,0,0.3)';

/** Opacity for relevant forecast points. @constant {number} */
export const FORECAST_POINT_OPACITY_RELEVANT = 0.9;

/** Opacity for dimmed forecast points. @constant {number} */
export const FORECAST_POINT_OPACITY_DIM = 0.7;

/** Default line color for overlay layers. @constant {string} */
export const OVERLAY_LINE_COLOR = 'rgba(0, 102, 255, 0.9)';

/** Default stroke width for overlay features (pixels). @constant {number} */
export const OVERLAY_STROKE_WIDTH = 2;

/** Default fill color for overlay polygons. @constant {string} */
export const OVERLAY_POLYGON_FILL = 'rgba(0, 102, 255, 0.15)';

/** Default radius for overlay points (pixels). @constant {number} */
export const OVERLAY_POINT_RADIUS = 5;

/** Default stroke color for overlay points. @constant {string} */
export const OVERLAY_POINT_STROKE_COLOR = '#003b8e';

/** Default stroke width for overlay points (pixels). @constant {number} */
export const OVERLAY_POINT_STROKE_WIDTH = 1.5;

/** Default fill color for overlay points. @constant {string} */
export const OVERLAY_POINT_FILL = 'rgba(0, 102, 255, 0.7)';

