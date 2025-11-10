// Constants and shared color palettes for the Forecast Series modal & chart.
// Keeping them in a separate module avoids reallocation and keeps Modal code lean.
export const DEFAULT_PCTS = Object.freeze([20, 60, 90]);
export const FULL_PCTS = Object.freeze([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
export const SELECTED_RPS = Object.freeze([100, 50, 20, 10, 5, 2]);

export const QUANTILE_COLORS = Object.freeze({
  p90: '#0b2e8a',
  p60: '#1d53d2',
  p20: '#04b4e6',
  median: '#222'
});
export const TEN_YEAR_COLOR = '#d00000';
export const ANALOG_MARKER_COLOR = '#ff6600';

