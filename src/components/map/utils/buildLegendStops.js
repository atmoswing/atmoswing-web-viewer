import {LEGEND_SAMPLES} from '@/components/map/mapConstants.js';
import {valueToColor} from '@/utils/colorUtils.js';

// Build continuous legend gradient stops based on maxVal
// Returns array of { color: 'rgb(r,g,b)', pct: number }
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
