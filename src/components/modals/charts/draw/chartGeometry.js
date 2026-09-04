/**
 * @module components/modals/charts/draw/chartGeometry
 * @description Pure geometry and domain helpers shared by the D3 charts. No DOM, no D3 selections,
 * so each of these can be reasoned about and tested on its own.
 */

/** Default margins for the time series chart. */
export const TIME_SERIES_MARGIN = {top: 25, right: 40, bottom: 20, left: 56};

/**
 * Computes the SVG and plot-area dimensions for a chart container.
 *
 * @param {HTMLElement} container - Element the SVG is mounted into
 * @param {Object} [opts]
 * @param {Object} [opts.margin=TIME_SERIES_MARGIN] - Plot margins
 * @param {number} [opts.legendReserve=28] - Vertical space kept free for the legend
 * @param {number} [opts.rightLabelReserve=40] - Horizontal space kept free for right-hand labels
 * @param {number} [opts.minWidth=420] - Lower bound on the SVG width
 * @param {number} [opts.minHeight=300] - Lower bound on the SVG height
 * @returns {{svgWidth: number, svgHeight: number, innerW: number, innerH: number, margin: Object}}
 * @example
 * const {innerW, innerH} = computeChartGeometry(containerEl);
 */
export function computeChartGeometry(container, opts = {}) {
  const {
    margin = TIME_SERIES_MARGIN,
    legendReserve = 28,
    rightLabelReserve = 40,
    minWidth = 420,
    minHeight = 300
  } = opts;

  const cw = Math.max(minWidth, container?.clientWidth || 600);
  const ch = Math.max(minHeight, container?.clientHeight || 420);

  const containerH = container?.clientHeight || ch + legendReserve + margin.top + margin.bottom;
  const svgHeight = Math.max(minHeight, Math.min(ch + legendReserve, containerH));
  const innerH = Math.max(60, svgHeight - margin.top - margin.bottom - legendReserve);
  const innerW = Math.max(10, cw - margin.left - margin.right);

  const containerW = container?.clientWidth || cw + rightLabelReserve;
  const svgWidth = Math.max(minWidth, Math.min(cw + rightLabelReserve, containerW));

  return {svgWidth, svgHeight, innerW, innerH, margin};
}

/**
 * Median spacing between consecutive dates, used to pad the right edge of the x domain.
 *
 * @param {Array<Date>} dates - Ordered dates
 * @param {number} [fallbackMs=43200000] - Value returned when no positive gap is found (12h)
 * @returns {number} Step in milliseconds
 * @example
 * computeMedianStepMs([d0, d1, d2]) // Returns: median gap in ms
 */
export function computeMedianStepMs(dates, fallbackMs = 12 * 3600 * 1000) {
  if (!Array.isArray(dates) || dates.length < 2) return fallbackMs;
  const diffs = [];
  for (let i = 1; i < dates.length; i++) {
    const d = +dates[i] - +dates[i - 1];
    if (d > 0) diffs.push(d);
  }
  if (!diffs.length) return fallbackMs;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

/**
 * Builds the chart's time domain.
 *
 * The domain starts a couple of days before the forecast run so the run marker is visible, and
 * ends slightly past the last target date so the final point is not clipped.
 *
 * @param {Array<Date>} dates - Target dates of the series
 * @param {Date|null} activeDateObj - Parsed forecast run date, when valid
 * @param {Object} [opts]
 * @param {number} [opts.daysBefore=2] - How far before the run date the domain starts
 * @returns {Array<Date|null>} Domain as `[start, end]`; both null when there are no dates
 * @example
 * const [start, end] = computeTimeDomain(dates, runDate);
 */
export function computeTimeDomain(dates, activeDateObj, opts = {}) {
  const {daysBefore = 2} = opts;
  if (!Array.isArray(dates) || !dates.length) return [null, null];

  const minX = dates.reduce((a, b) => (a < b ? a : b));
  const maxX = dates.reduce((a, b) => (a > b ? a : b));
  const before = activeDateObj ? new Date(activeDateObj.getTime() - daysBefore * 24 * 3600 * 1000) : null;
  const start = (before && minX) ? (before < minX ? before : minX) : (before || minX);

  const rightPadMs = Math.max(computeMedianStepMs(dates) * 0.1, 3600 * 1000);
  const end = new Date(maxX.getTime() + rightPadMs);
  return [start, end];
}

/**
 * Upper bound of the y axis, with headroom above the largest plotted value.
 *
 * @param {Array<Array<number>>} valueArrays - Groups of values that must fit on the axis
 * @param {Object} [opts]
 * @param {number} [opts.padding=1.08] - Multiplier applied to the maximum
 * @param {number} [opts.fallback=1] - Used when no finite value is supplied
 * @returns {number} Axis maximum
 * @example
 * computeYMax([[1, 2], [5]]) // Returns: 5.4
 */
export function computeYMax(valueArrays, opts = {}) {
  const {padding = 1.08, fallback = 1} = opts;
  let max = null;
  (valueArrays || []).forEach(arr => {
    (arr || []).forEach(v => {
      if (Number.isFinite(v) && (max === null || v > max)) max = v;
    });
  });
  return max === null ? fallback : max * padding;
}

/**
 * Splits reference values into the ten-year value and the full set of return-period pairs.
 *
 * @param {Object|null} referenceValues - `{ axis: number[], values: number[] }`
 * @returns {{tenYearVal: number|null, rpPairs: Array<{rp: number, val: number}>}}
 * @example
 * const {tenYearVal, rpPairs} = extractReferencePairs({axis: [10], values: [42]});
 */
export function extractReferencePairs(referenceValues) {
  if (!referenceValues?.axis?.length || !referenceValues?.values?.length) {
    return {tenYearVal: null, rpPairs: []};
  }
  const idx = referenceValues.axis.findIndex(a => Number(a) === 10);
  const tenYearVal = idx >= 0 ? referenceValues.values[idx] : null;
  const rpPairs = referenceValues.axis
    .map((a, i) => ({rp: Number(a), val: Number(referenceValues.values[i])}))
    .filter(p => Number.isFinite(p.val));
  return {tenYearVal, rpPairs};
}
