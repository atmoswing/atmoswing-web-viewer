/**
 * @module components/modals/common/plotConstants
 * @description Shared constants and color palettes used by modal charts (time series & distributions).
 */

/** Default percentile set (main quantiles). */
export const DEFAULT_PCTS = Object.freeze([20, 60, 90]);
/** Full percentile set for detailed view. */
export const FULL_PCTS = Object.freeze([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
/** Selected return periods displayed when overlays enabled. */
export const SELECTED_RPS = Object.freeze([100, 50, 20, 10, 5, 2]);

/** Quantile line colors mapping. */
export const QUANTILE_COLORS = Object.freeze({
  p90: '#0b2e8a',
  p60: '#1d53d2',
  p20: '#04b4e6',
  median: '#222'
});
/** Stroke color for ten-year return period overlay. */
export const TEN_YEAR_COLOR = '#d00000';
/** Marker stroke color for best analog points. */
export const ANALOG_MARKER_COLOR = '#ff6600';
