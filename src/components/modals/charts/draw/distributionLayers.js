/**
 * @module components/modals/charts/draw/distributionLayers
 * @description Geometry, data preparation and D3 layers shared by the two distribution charts
 * (precipitation CDF and analogy criteria).
 *
 * The pure helpers (geometry, plotting positions, x-extent, return-period markers) carry the
 * chart's arithmetic, so they are testable without rendering; the `draw*` functions only append
 * SVG.
 */

import * as d3 from 'd3';
import {SELECTED_RPS, TEN_YEAR_COLOR} from '../plotConstants.js';

/** Colour of the background grid lines. */
const GRID_COLOR = '#eaeaea';

/** Percentiles marked on the precipitation CDF. */
export const MARKED_PERCENTILES = Object.freeze([20, 60, 90]);

/**
 * Gringorten plotting-position constants: p = (i - a) / (N + 1 - 2a) with a = 0.44, i.e.
 * (i - 0.44) / (N + 0.12) for a 1-based rank i.
 */
const PLOTTING_A = 0.44;
const PLOTTING_B = 0.12;

/**
 * Computes the SVG and plot-area size of a distribution chart from its container.
 *
 * Falls back to fixed sizes when the container has not been laid out (as in jsdom), so the
 * chart still renders at a sensible size.
 *
 * @param {HTMLElement} container - Element the chart is drawn into
 * @param {Object} opts
 * @param {Object} opts.margin - Plot margins `{top, right, bottom, left}`
 * @param {number} opts.minHeight - Smallest SVG height
 * @param {number} opts.fallbackHeight - Height used when the container reports none
 * @param {number} [opts.fallbackWidth=700] - Width used when the container reports none
 * @returns {{width: number, height: number, innerW: number, innerH: number, margin: Object}}
 *   SVG size, plot-area size, and the margin used
 * @example
 * const {width, height, innerW, innerH} = computeDistributionGeometry(el, {
 *   margin: {top: 28, right: 40, bottom: 40, left: 56}, minHeight: 240, fallbackHeight: 320
 * });
 */
export function computeDistributionGeometry(container, {margin, minHeight, fallbackHeight, fallbackWidth = 700}) {
  const width = container?.clientWidth || fallbackWidth;
  const height = Math.max(minHeight, container?.clientHeight || fallbackHeight);
  return {
    width,
    height,
    innerW: Math.max(10, width - margin.left - margin.right),
    innerH: Math.max(40, height - margin.top - margin.bottom),
    margin
  };
}

/**
 * Turns a sample into empirical CDF points using the Gringorten plotting position.
 *
 * Non-finite values are dropped and the rest sorted, so callers may pass raw values.
 *
 * @param {Array<number>} values - Sample values
 * @returns {Array<{x: number, y: number}>} One point per value, ascending, with `y` in [0, 1]
 * @example
 * empiricalCdf([3, 1, 2]) // [{x: 1, y: 0.1795}, {x: 2, y: 0.5}, {x: 3, y: 0.8205}]
 */
export function empiricalCdf(values) {
  const sorted = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const divisor = 1.0 / (sorted.length + PLOTTING_B);
  return sorted.map((v, i) => ({x: v, y: Math.max(0, Math.min(1, (i + 1.0 - PLOTTING_A) * divisor))}));
}

/**
 * Collects the x-values of every overlay the precipitation chart will draw, so its x-scale can
 * include them and no marker lands outside the plot.
 *
 * @param {Object} params
 * @param {Object|null} params.percentileMarkers - Percentile -> value
 * @param {Object|null} params.referenceValues - `{axis, values}` return periods
 * @param {Object} [params.options] - Display toggles
 * @param {Array|null} params.bestAnalogsData - Best analogs `{rank, value}`
 * @returns {Array<number>} Overlay x-values
 */
export function collectOverlayValues({percentileMarkers, referenceValues, options, bestAnalogsData}) {
  const xs = [];
  if (percentileMarkers) {
    MARKED_PERCENTILES.forEach(p => {
      const v = percentileMarkers[p];
      if (Number.isFinite(Number(v))) xs.push(Number(v));
    });
  }
  if (referenceValues && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
    const allowed = new Set();
    if (options?.tenYearReturn) allowed.add(10);
    if (options?.allReturnPeriods) SELECTED_RPS.forEach(rp => allowed.add(rp));
    referenceValues.axis.forEach((rp, i) => {
      const val = Number(referenceValues.values[i]);
      if (allowed.has(Number(rp)) && Number.isFinite(val)) xs.push(val);
    });
  }
  if (Array.isArray(bestAnalogsData)) {
    bestAnalogsData.forEach(b => {
      if (Number.isFinite(Number(b?.value))) xs.push(Number(b.value));
    });
  }
  return xs;
}

/**
 * Upper bound of the precipitation x-axis: the largest value or overlay plus 5% headroom.
 *
 * @param {Array<number>} values - Sample values
 * @param {Array<number>} overlayValues - Overlay x-values
 * @returns {number} Axis maximum, or 1 when everything is zero
 */
export function computeDistributionXMax(values, overlayValues) {
  const rawMax = Math.max(...values, ...(overlayValues.length ? overlayValues : [0]));
  return (rawMax != null && rawMax > 0) ? rawMax * 1.05 : 1;
}

/**
 * Colour of the i-th of n return periods: a ramp from yellow (smallest) to red (largest).
 *
 * @param {number} index - Position in ascending order
 * @param {number} count - Number of return periods drawn
 * @returns {string} CSS colour
 */
export function returnPeriodColor(index, count) {
  const ratio = count > 1 ? (index / (count - 1)) : 0;
  return `rgb(255, ${Math.round(255 - ratio * 255)}, 0)`;
}

/**
 * Works out which vertical return-period lines to draw, and how.
 *
 * The ten-year line and the full set are independent toggles; with both on, the ten-year
 * period is drawn by each.
 *
 * @param {Object|null} referenceValues - `{axis, values}` return periods
 * @param {Object} [options] - Display toggles
 * @returns {Array<{value: number, color: string, label: string, opacity: (number|undefined)}>}
 *   Lines in drawing order
 */
export function returnPeriodMarkers(referenceValues, options) {
  if (!referenceValues || !Array.isArray(referenceValues.axis) || !Array.isArray(referenceValues.values)) {
    return [];
  }
  const markers = [];
  if (options?.tenYearReturn) {
    const idx10 = referenceValues.axis.findIndex(a => Number(a) === 10);
    const val10 = idx10 >= 0 ? referenceValues.values[idx10] : undefined;
    if (Number.isFinite(val10)) {
      markers.push({value: Number(val10), color: TEN_YEAR_COLOR, label: 'P10', opacity: undefined});
    }
  }
  if (options?.allReturnPeriods) {
    const byPeriod = new Map();
    referenceValues.axis.forEach((rp, i) => {
      const v = referenceValues.values[i];
      if (Number.isFinite(Number(v))) byPeriod.set(Number(rp), Number(v));
    });
    const ascending = SELECTED_RPS.filter(rp => byPeriod.has(rp)).sort((a, b) => a - b);
    ascending.forEach((rp, idx) => {
      markers.push({
        value: byPeriod.get(rp),
        color: returnPeriodColor(idx, ascending.length),
        label: `P${rp}`,
        opacity: 0.95
      });
    });
  }
  return markers;
}

/**
 * Draws the light background grid.
 *
 * @param {Object} g - Plot group selection
 * @param {Object} params
 * @param {Function} params.x - X scale
 * @param {Function} params.y - Y scale
 * @param {number} params.innerW - Plot width
 * @param {number} params.innerH - Plot height
 * @param {number} params.xTicks - Vertical grid line count hint
 * @param {number} params.yTicks - Horizontal grid line count hint
 * @returns {void}
 */
export function drawDistributionGrid(g, {x, y, innerW, innerH, xTicks, yTicks}) {
  const xGrid = d3.axisBottom(x).ticks(xTicks).tickSize(-innerH).tickFormat('');
  g.append('g').attr('class', 'grid grid-x').attr('transform', `translate(0,${innerH})`)
    .call(xGrid).selectAll('line').attr('stroke', GRID_COLOR).attr('stroke-width', 1);
  g.select('.grid.grid-x').selectAll('.domain').remove();

  const yGrid = d3.axisLeft(y).ticks(yTicks).tickSize(-innerW).tickFormat('');
  g.append('g').attr('class', 'grid grid-y')
    .call(yGrid).selectAll('line').attr('stroke', GRID_COLOR).attr('stroke-width', 1);
  g.select('.grid.grid-y').selectAll('.domain').remove();
}

/**
 * Draws a smoothed curve with a dot on every point.
 *
 * @param {Object} g - Plot group selection
 * @param {Object} params
 * @param {Array} params.points - Data points
 * @param {Function} params.xOf - `(d, i) => pixel x`
 * @param {Function} params.yOf - `(d, i) => pixel y`
 * @param {string} params.color - Line and dot colour
 * @param {string} [params.pointClass] - Class for the dots; when omitted they are plain circles
 * @returns {void}
 */
export function drawCurve(g, {points, xOf, yOf, color, pointClass}) {
  const line = d3.line().x(xOf).y(yOf).curve(d3.curveMonotoneX);
  g.append('path').datum(points).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('d', line);

  const dots = g.selectAll(pointClass ? `.${pointClass}` : 'circle').data(points).enter().append('circle');
  if (pointClass) dots.attr('class', pointClass);
  dots.attr('cx', xOf).attr('cy', yOf).attr('r', 3).attr('fill', color);
}

/**
 * Rings and labels the marked percentiles on the CDF.
 *
 * @param {Object} g - Plot group selection
 * @param {Object} params
 * @param {Object|null} params.percentileMarkers - Percentile -> value
 * @param {Function} params.x - X scale
 * @param {Function} params.y - Y scale (cumulative frequency)
 * @returns {void}
 */
export function drawPercentileMarkers(g, {percentileMarkers, x, y}) {
  if (!percentileMarkers) return;
  MARKED_PERCENTILES.forEach(p => {
    const xv = percentileMarkers[p];
    if (!Number.isFinite(Number(xv))) return;
    const cx = x(Number(xv));
    const cy = y(p / 100);
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 7)
      .attr('fill', '#0000').attr('stroke', '#444').attr('stroke-width', 1);
    g.append('text').attr('x', cx + 8).attr('y', cy + 8).attr('fill', '#333')
      .attr('font-size', 12).attr('font-weight', 600).text(`q${p}`);
  });
}

/**
 * Draws vertical return-period lines with their labels.
 *
 * @param {Object} g - Plot group selection
 * @param {Object} params
 * @param {Array} params.markers - From {@link returnPeriodMarkers}
 * @param {Function} params.x - X scale
 * @param {number} params.innerH - Plot height
 * @returns {void}
 */
export function drawReturnPeriodMarkers(g, {markers, x, innerH}) {
  markers.forEach(({value, color, label, opacity}) => {
    const xPos = x(value);
    const line = g.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', 0).attr('y2', innerH)
      .attr('stroke', color).attr('stroke-width', 2);
    if (opacity != null) line.attr('stroke-opacity', opacity);
    g.append('text').attr('x', xPos + 2).attr('y', innerH - 2).attr('font-size', 11).attr('fill', color)
      .attr('dominant-baseline', 'text-after-edge').text(label);
  });
}

/**
 * Draws both axes and their titles, then strips the axis domain lines.
 *
 * @param {Object} svg - SVG selection, which holds the axis titles
 * @param {Object} g - Plot group selection, which holds the axes
 * @param {Object} params
 * @param {Function} params.x - X scale
 * @param {Function} params.y - Y scale
 * @param {number} params.xTicks - X tick count hint
 * @param {number} params.yTicks - Y tick count hint
 * @param {Function} [params.yTickFormat] - Y tick formatter
 * @param {Object} params.geometry - From {@link computeDistributionGeometry}
 * @param {string} params.xLabel - X axis title
 * @param {string} params.yLabel - Y axis title
 * @param {number} params.yLabelOffset - Distance of the rotated y title from the left edge
 * @returns {void}
 */
export function drawDistributionAxes(svg, g, {x, y, xTicks, yTicks, yTickFormat, geometry, xLabel, yLabel, yLabelOffset}) {
  const {innerW, innerH, height, margin} = geometry;

  g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(xTicks));
  const yAxis = d3.axisLeft(y).ticks(yTicks);
  if (yTickFormat) yAxis.tickFormat(yTickFormat);
  g.append('g').call(yAxis);
  g.selectAll('path.domain').remove();

  svg.append('text').attr('x', (margin.left + innerW / 2)).attr('y', height - 6)
    .attr('text-anchor', 'middle').text(xLabel);
  svg.append('text').attr('transform', 'rotate(-90)').attr('x', -(margin.top + innerH / 2))
    .attr('y', yLabelOffset).attr('text-anchor', 'middle').text(yLabel);
}
