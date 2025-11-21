/**
 * @module components/map/utils/buildLegendStops
 * @description Generates legend gradient stops for map visualization.
 */

import {LEGEND_SAMPLES} from '@/components/map/mapConstants.js';
import {valueToColor} from '@/utils/colorUtils.js';

/**
 * Builds an array of color stops for a continuous legend gradient.
 * Each stop represents a point in the gradient from 0 to maxVal.
 *
 * @param {number} [maxVal=1] - Maximum value for the legend scale
 * @param {number} [samples=LEGEND_SAMPLES] - Number of gradient samples to generate
 * @returns {Array<Object>} Array of legend stops with {color: string, pct: number}
 * @example
 * const stops = buildLegendStops(100, 10);
 * // Returns: [
 * //   {color: 'rgb(255,255,255)', pct: 0},
 * //   {color: 'rgb(200,255,200)', pct: 10},
 * //   ...
 * //   {color: 'rgb(255,0,0)', pct: 100}
 * // ]
 */
export function buildLegendStops(maxVal = 1, samples = LEGEND_SAMPLES) {
  const stops = [];
  const safeSamples = Math.max(1, samples);
  for (let i = 0; i <= safeSamples; i++) {
    const v = (i / safeSamples) * maxVal;
    const [r, g, b] = valueToColor(v, maxVal);
    stops.push({color: `rgb(${r},${g},${b})`, pct: (i / safeSamples) * 100});
  }
  return stops;
}

export default buildLegendStops;
