/**
 * @module components/modals/charts/draw/chartChrome
 * @description Title and legend drawing shared by the chart modals' D3 charts.
 */

import * as d3 from 'd3';

const TITLE_FONT_SIZE = 14;
const TITLE_COLOR = '#222';

/**
 * One entry of the chart legend.
 *
 * @typedef {Object} LegendItem
 * @property {string} label - Text shown next to the swatch
 * @property {string} color - Swatch colour
 * @property {boolean} [dashed] - Draw the swatch as a dashed line
 * @property {boolean} [marker] - Draw the swatch as a marker instead of a line
 * @property {boolean} [small] - Render the swatch at the smaller size
 */

/**
 * Composes the title line used by the distribution charts.
 *
 * @param {Object} params
 * @param {string} params.stationName - Entity display name
 * @param {string|number|null} params.selectedMethodId - Method identifier
 * @param {string|number|null} params.selectedConfigId - Configuration identifier
 * @param {number|null} params.selectedLead - Selected lead time
 * @param {Array|null} params.leads - Lead options, used to resolve the target date
 * @param {string|null} params.activeForecastDate - Raw forecast run date
 * @param {Function} params.t - Translation function
 * @returns {string} Title text, possibly empty
 * @example
 * buildDistributionTitle({stationName: 'Sion', selectedMethodId: 'm1', ...})
 */
export function buildDistributionTitle({stationName, selectedMethodId, selectedConfigId, selectedLead, leads, activeForecastDate, t}) {
  const fmt = d3.timeFormat('%Y-%m-%d');
  const methodIdStr = selectedMethodId ? String(selectedMethodId) : '';
  const cfgStr = selectedConfigId ? String(selectedConfigId) : '';

  const leadMatch = Array.isArray(leads) ? leads.find(l => l.lead === selectedLead) : null;
  const tgt = leadMatch?.date && !isNaN(leadMatch.date) ? leadMatch.date : null;
  const tgtStr = tgt ? fmt(tgt) : (selectedLead != null ? `L${selectedLead}` : '');

  let fcDate = null;
  try {
    fcDate = activeForecastDate ? new Date(activeForecastDate) : null;
    if (fcDate && isNaN(fcDate)) fcDate = null;
  } catch {
    fcDate = null;
  }
  const fcStr = fcDate ? fmt(fcDate) : '';
  const foText = fcStr ? t('toolbar.forecastOf', {date: fcStr}) : '';

  const parts = [stationName || '', methodIdStr, cfgStr].filter(Boolean);
  const rightPart = [tgtStr, foText ? `(${foText})` : ''].filter(Boolean).join(' ');
  if (rightPart) parts.push(rightPart);
  return parts.join(' — ');
}

/**
 * Composes the title line used by the time series chart.
 *
 * @param {Object} params
 * @param {string} params.stationName - Entity display name
 * @param {Object|null} params.selectedMethodConfig - Current method/config selection
 * @param {Date|null} params.runDate - Parsed forecast run date, when valid
 * @returns {string} Title text, possibly empty
 * @example
 * buildTimeSeriesTitle({stationName: 'Sion', selectedMethodConfig, runDate})
 */
export function buildTimeSeriesTitle({stationName, selectedMethodConfig, runDate}) {
  const methodName = selectedMethodConfig?.method
    ? (selectedMethodConfig.method.name || selectedMethodConfig.method.id)
    : '';
  const runDateStr = (runDate instanceof Date && !isNaN(runDate)) ? d3.timeFormat('%Y-%m-%d')(runDate) : '';
  return [stationName, methodName, runDateStr].filter(Boolean).join(' — ');
}

/**
 * Draws a centred chart title.
 *
 * @param {Object} svg - D3 selection of the SVG element
 * @param {Object} params
 * @param {string} params.text - Title text; nothing is drawn when empty
 * @param {number} params.centerX - Horizontal centre of the plot area
 * @param {number} params.y - Baseline for the title
 * @returns {void}
 * @example
 * drawChartTitle(svg, {text: 'Sion', centerX: 300, y: 14});
 */
export function drawChartTitle(svg, {text, centerX, y}) {
  if (!text) return;
  svg.append('text')
    .attr('x', centerX)
    .attr('y', y)
    .attr('text-anchor', 'middle')
    .attr('fill', TITLE_COLOR)
    .attr('font-size', TITLE_FONT_SIZE)
    .attr('font-weight', 600)
    .text(text);
}

/**
 * Draws a horizontal legend of line and marker entries.
 *
 * @param {Object} svg - D3 selection of the SVG element
 * @param {Object} params
 * @param {Array<LegendItem>} params.items - Legend entries
 * @param {number} params.x - Left edge of the legend
 * @param {number} params.y - Vertical centre of the legend row
 * @returns {void}
 * @example
 * drawLegend(svg, {items: [{label: 'Median', color: '#333', dashed: true}], x: 56, y: 400});
 */
export function drawLegend(svg, {items, x, y}) {
  if (!items?.length) return;
  const gapBetweenItems = 15;
  const approxCharWidth = 7;
  const legendG = svg.append('g').attr('transform', `translate(${x},${y})`);
  let curX = 0;

  items.forEach(item => {
    const color = item.color || '#000';
    const displayLabel = String(item.label || '');
    if (item.marker) {
      legendG.append('circle')
        .attr('cx', curX + 8).attr('cy', 0).attr('r', 5)
        .attr('fill', 'transparent').attr('stroke', color).attr('stroke-width', 1);
    } else {
      const lineEl = legendG.append('line')
        .attr('x1', curX).attr('y1', 0).attr('x2', curX + 30).attr('y2', 0)
        .attr('stroke', color).attr('stroke-width', item.small ? 2 : 3).attr('stroke-linecap', 'round');
      if (item.dashed) lineEl.attr('stroke-dasharray', '6 4');
    }
    legendG.append('text')
      .attr('x', curX + 36).attr('y', 0)
      .attr('font-size', 12).attr('fill', '#333').attr('dominant-baseline', 'middle')
      .text(displayLabel);
    curX += 36 + Math.min(200, displayLabel.length * approxCharWidth) + gapBetweenItems;
  });
}
