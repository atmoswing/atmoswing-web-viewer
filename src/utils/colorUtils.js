/**
 * @module utils/colorUtils
 * @description Color utilities for visualizing forecast values on maps and charts.
 * Provides a color gradient from white -> cyan -> green -> yellow -> red based on normalized values.
 */

/**
 * Converts a numeric value to an RGB color array based on a gradient scale.
 *
 * Color scale:
 * - 0: White [255, 255, 255]
 * - 0-50%: White -> Cyan -> Green
 * - 50-100%: Green -> Yellow -> Red
 * - null/NaN: Gray [150, 150, 150]
 *
 * @param {number|null} value - The value to convert to color
 * @param {number} maxValue - The maximum value for normalization
 * @returns {Array<number>} RGB color array [r, g, b] with values 0-255
 * @example
 * valueToColor(50, 100) // Returns [255, 255, 0] (yellow)
 * valueToColor(0, 100)  // Returns [255, 255, 255] (white)
 */
export function valueToColor(value, maxValue) {
  if (value == null || isNaN(value)) return [150, 150, 150];
  if (value === 0) return [255, 255, 255];
  const m = maxValue > 0 ? maxValue : 1;
  if (value / m <= 0.5) {
    const baseVal = 200;
    const ratio = value / (0.5 * m); // 0..1
    let valColour = Math.round(ratio * baseVal);
    let valColourCompl = Math.round(ratio * (255 - baseVal));
    if (valColour > baseVal) valColour = baseVal;
    if (valColourCompl + baseVal > 255) valColourCompl = 255 - baseVal;
    return [baseVal + valColourCompl, 255, baseVal - valColour];
  } else {
    let valColour = Math.round(((value - 0.5 * m) / (0.5 * m)) * 255);
    if (valColour > 255) valColour = 255;
    return [255, 255 - valColour, 0];
  }
}

/**
 * Converts a numeric value to a CSS rgb() color string.
 * Convenience wrapper around valueToColor() that returns a CSS-ready string.
 *
 * @param {number|null} value - The value to convert to color
 * @param {number} maxValue - The maximum value for normalization
 * @returns {string} CSS rgb() color string, e.g., "rgb(255,128,0)"
 * @example
 * valueToColorCSS(75, 100) // Returns "rgb(255,191,0)"
 */
export function valueToColorCSS(value, maxValue) {
  const [r, g, b] = valueToColor(value, maxValue);
  return `rgb(${r},${g},${b})`;
}

