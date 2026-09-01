/**
 * @module components/modals/charts/draw/timeSeriesLayers
 * @description Individual drawing layers of the time series chart. Each takes a D3 selection plus
 * the data and scales it needs, draws one thing, and returns nothing.
 */

import * as d3 from 'd3';
import {ANALOG_MARKER_COLOR, QUANTILE_COLORS, SELECTED_RPS, TEN_YEAR_COLOR} from '../../common/plotConstants.js';

/** Percentiles drawn for each previous forecast run. */
const HISTORY_PCTS = [20, 60, 90];
const HISTORY_ALPHA = 0.35;
const HISTORY_WIDTH = 1.25;

/** Widest and narrowest fill opacity of the percentile envelope. */
const BAND_MIN_OPACITY = 0.05;
const BAND_MAX_OPACITY = 0.70;

/** How many best analogs are marked. */
const MAX_BEST_ANALOGS = 10;

/**
 * Colour used for one of the three main percentiles.
 * @private
 * @param {number} pct - Percentile
 * @returns {string} Colour
 */
function quantileColor(pct) {
  if (pct === 90) return QUANTILE_COLORS.p90;
  if (pct === 60) return QUANTILE_COLORS.p60;
  return QUANTILE_COLORS.p20;
}

/**
 * Attaches hover handlers that anchor the popper to the hovered element's own box.
 * @private
 * @param {Object} selection - D3 selection
 * @param {string} title - Tooltip text
 * @param {Function} onHoverShow - Show handler
 * @param {Function} onHoverHide - Hide handler
 * @returns {Object} The selection, for chaining
 */
function withHover(selection, title, onHoverShow, onHoverHide) {
  return selection
    .on('mouseenter', function () {
      try {
        const rect = this.getBoundingClientRect();
        onHoverShow?.({getBoundingClientRect: () => rect}, title);
      } catch { /* element detached mid-hover; no tooltip */
      }
    })
    .on('mouseleave', () => onHoverHide?.());
}

/**
 * Draws the faded percentile lines of previous forecast runs.
 *
 * @param {Object} plotG - Clipped plot-area selection
 * @param {Object} params
 * @param {Array} params.pastForecasts - Previous runs, each `{ dates, percentiles, forecastDate }`
 * @param {Function} params.xScale - Time scale
 * @param {Function} params.yScale - Value scale
 * @param {Function} params.t - Translation function
 * @param {Function} params.onHoverShow - Show tooltip handler
 * @param {Function} params.onHoverHide - Hide tooltip handler
 * @returns {void}
 */
export function drawPastForecasts(plotG, {pastForecasts, xScale, yScale, t, onHoverShow, onHoverHide}) {
  if (!pastForecasts?.length) return;
  const fmtRunDate = d3.timeFormat('%d.%m');

  pastForecasts.forEach(pf => {
    const pd = pf.dates || [];
    if (!pd.length) return;
    const runDateStr = pf.forecastDate && !isNaN(pf.forecastDate) ? fmtRunDate(pf.forecastDate) : '';

    HISTORY_PCTS.forEach(pct => {
      const arr = pf.percentiles && pf.percentiles[pct];
      if (!Array.isArray(arr)) return;
      const lineFn = d3.line()
        .defined((d, i) => Number.isFinite(arr[i]))
        .x((d, i) => xScale(pd[i]))
        .y((d, i) => yScale(arr[i]));
      const qLabel = pct === 90 ? t('seriesModal.quantile90')
        : pct === 60 ? t('seriesModal.quantile60')
          : t('seriesModal.quantile20');
      const titleText = runDateStr ? `Run ${runDateStr} — ${qLabel}` : qLabel;

      const visible = plotG.append('path').datum(pd)
        .attr('fill', 'none').attr('stroke', quantileColor(pct))
        .attr('stroke-width', HISTORY_WIDTH).attr('stroke-opacity', HISTORY_ALPHA)
        .attr('d', lineFn).style('pointer-events', 'stroke');
      withHover(visible, titleText, onHoverShow, onHoverHide);

      // Invisible wider path so the thin line is still easy to hover.
      const hitArea = plotG.append('path').datum(pd)
        .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 10)
        .attr('d', lineFn).style('pointer-events', 'stroke');
      withHover(hitArea, titleText, onHoverShow, onHoverHide);
    });
  });
}

/**
 * Draws the nested percentile envelope, darkest around the median.
 *
 * @param {Object} plotG - Clipped plot-area selection
 * @param {Object} params
 * @param {Array<number>} params.pctList - Percentiles present, ascending
 * @param {Object} params.percentilesMap - Percentile -> values
 * @param {Array<Date>} params.dates - Target dates
 * @param {Function} params.xScale - Time scale
 * @param {Function} params.yScale - Value scale
 * @returns {void}
 */
export function drawPercentileBands(plotG, {pctList, percentilesMap, dates, xScale, yScale}) {
  if (!pctList || pctList.length <= 3) return;

  const minP = pctList[0];
  const maxP = pctList[pctList.length - 1];
  const maxDist = Math.max(Math.abs(50 - minP), Math.abs(maxP - 50), 1);

  const bands = [];
  for (let i = 0; i < pctList.length - 1; i++) {
    const lowP = pctList[i];
    const highP = pctList[i + 1];
    bands.push({
      dist: Math.abs((lowP + highP) / 2 - 50),
      lowArr: percentilesMap[lowP] || [],
      highArr: percentilesMap[highP] || []
    });
  }
  // Outermost first, so the central bands end up on top.
  bands.sort((a, b) => b.dist - a.dist);

  bands.forEach(({lowArr, highArr, dist}) => {
    const area = d3.area()
      .defined((d, i) => Number.isFinite(lowArr[i]) && Number.isFinite(highArr[i]))
      .x((d, i) => xScale(dates[i]))
      .y0((d, i) => yScale(lowArr[i]))
      .y1((d, i) => yScale(highArr[i]));
    const normalized = Math.min(1, Math.max(0, dist / maxDist));
    const opacity = BAND_MIN_OPACITY + (1 - normalized) * (BAND_MAX_OPACITY - BAND_MIN_OPACITY);
    plotG.append('path').datum(dates)
      .attr('fill', '#777')
      .attr('fill-opacity', Math.max(BAND_MIN_OPACITY, Math.min(BAND_MAX_OPACITY, opacity)))
      .attr('stroke', 'none')
      .attr('d', area);
  });
}

/**
 * Draws one percentile as a line.
 *
 * @param {Object} plotG - Clipped plot-area selection
 * @param {Object} params
 * @param {Array<number>} params.values - Values aligned with `dates`
 * @param {Array<Date>} params.dates - Target dates
 * @param {Function} params.xScale - Time scale
 * @param {Function} params.yScale - Value scale
 * @param {string} params.color - Stroke colour
 * @param {number} [params.width=3] - Stroke width
 * @param {boolean} [params.dashed=false] - Whether the line is dashed
 * @returns {void}
 */
export function drawPercentileLine(plotG, {values, dates, xScale, yScale, color, width = 3, dashed = false}) {
  if (!Array.isArray(values)) return;
  const path = plotG.append('path')
    .datum(values.map((v, i) => ({date: dates[i], value: Number.isFinite(v) ? v : NaN})))
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', width)
    .attr('d', d3.line().defined(d => Number.isFinite(d.value)).x(d => xScale(d.date)).y(d => yScale(d.value)));
  if (dashed) path.attr('stroke-dasharray', '6 4').attr('stroke-linecap', 'round');
}

/**
 * Draws the median and, when enabled, the three main percentile lines.
 *
 * @param {Object} plotG - Clipped plot-area selection
 * @param {Object} params
 * @param {Array<number>} params.pctList - Percentiles present
 * @param {Object} params.percentilesMap - Percentile -> values
 * @param {Array<Date>} params.dates - Target dates
 * @param {Function} params.xScale - Time scale
 * @param {Function} params.yScale - Value scale
 * @param {boolean} params.mainQuantiles - Whether the main percentile lines are shown
 * @returns {void}
 */
export function drawPercentileLines(plotG, {pctList, percentilesMap, dates, xScale, yScale, mainQuantiles}) {
  const base = {dates, xScale, yScale};
  if (pctList.includes(50)) {
    drawPercentileLine(plotG, {...base, values: percentilesMap[50], color: QUANTILE_COLORS.median, width: 2, dashed: true});
  }
  if (!mainQuantiles) return;
  drawPercentileLine(plotG, {...base, values: percentilesMap[90], color: QUANTILE_COLORS.p90});
  drawPercentileLine(plotG, {...base, values: percentilesMap[60], color: QUANTILE_COLORS.p60});
  drawPercentileLine(plotG, {...base, values: percentilesMap[20], color: QUANTILE_COLORS.p20});
}

/**
 * Marks the values of the best analogs with hoverable circles.
 *
 * @param {Object} plotG - Clipped plot-area selection
 * @param {Object} params
 * @param {Object} params.bestAnalogs - `{ items, dates, hasAnalogHours }`
 * @param {Array<Date>} params.dates - Target dates of the main series
 * @param {Function} params.xScale - Time scale
 * @param {Function} params.yScale - Value scale
 * @param {Function} params.t - Translation function
 * @param {Function} params.onHoverShow - Show tooltip handler
 * @param {Function} params.onHoverHide - Hide tooltip handler
 * @returns {void}
 */
export function drawBestAnalogMarkers(plotG, {bestAnalogs, dates, xScale, yScale, t, onHoverShow, onHoverHide}) {
  if (!bestAnalogs?.items?.length) return;
  const analogDates = Array.isArray(bestAnalogs.dates) && bestAnalogs.dates.length ? bestAnalogs.dates : dates;
  const fmtDaily = d3.timeFormat('%d.%m.%Y');
  const fmtHourly = d3.timeFormat('%d.%m.%Y %Hh');
  const useHourlyFmt = !!bestAnalogs.hasAnalogHours;

  bestAnalogs.items.slice(0, MAX_BEST_ANALOGS).forEach(a => {
    const vals = a.values || [];
    if (vals.length !== dates.length) return;
    vals.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      const circle = plotG.append('circle')
        .attr('cx', xScale(analogDates[i])).attr('cy', yScale(v)).attr('r', 5)
        .attr('stroke', ANALOG_MARKER_COLOR).attr('stroke-width', 1).attr('fill-opacity', 0);

      const dt = Array.isArray(a.datesByAnalog) ? a.datesByAnalog[i] : null;
      const dateText = (dt && !isNaN(dt)) ? (useHourlyFmt ? fmtHourly(dt) : fmtDaily(dt)) : '';
      const parts = [a.label || t('seriesModal.analog')];
      if (dateText) parts.push(dateText);
      parts.push(`${v} mm`);
      withHover(circle, parts.join('\n'), onHoverShow, onHoverHide);
    });
  });
}

/**
 * Draws horizontal return-period lines with their labels in the right margin.
 *
 * @param {Object} params
 * @param {Object} params.plotG - Clipped plot-area selection, for the lines
 * @param {Object} params.g - Unclipped plot group, for the labels
 * @param {number|null} params.tenYearVal - Ten-year return value
 * @param {Array<{rp: number, val: number}>} params.rpPairs - All return-period pairs
 * @param {Object} params.options - Display toggles
 * @param {number} params.innerW - Plot width
 * @param {Function} params.yScale - Value scale
 * @returns {void}
 */
export function drawReturnPeriodLines({plotG, g, tenYearVal, rpPairs, options, innerW, yScale}) {
  const label = (y, color, text) => g.append('text')
    .attr('x', innerW + 8).attr('y', y)
    .attr('font-size', 11).attr('fill', color)
    .attr('dominant-baseline', 'middle').attr('text-anchor', 'start')
    .text(text);

  if (options.tenYearReturn && Number.isFinite(tenYearVal)) {
    plotG.append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', yScale(tenYearVal)).attr('y2', yScale(tenYearVal))
      .attr('stroke', TEN_YEAR_COLOR).attr('stroke-width', 2);
    label(yScale(tenYearVal), TEN_YEAR_COLOR, 'P10');
  }

  if (!options.allReturnPeriods || !rpPairs.length) return;

  const rpMap = new Map(rpPairs.map(p => [Number(p.rp), p.val]));
  const rpsAsc = SELECTED_RPS.filter(rp => rpMap.has(rp)).slice().sort((a, b) => a - b);
  rpsAsc.forEach((rp, idx) => {
    const val = rpMap.get(rp);
    // Ramp from yellow at the shortest return period to red at the longest.
    const ratio = rpsAsc.length > 1 ? (idx / (rpsAsc.length - 1)) : 0;
    const clr = `rgb(255, ${Math.round(255 - ratio * 255)}, 0)`;
    plotG.append('line')
      .attr('x1', 0).attr('x2', innerW).attr('y1', yScale(val)).attr('y2', yScale(val))
      .attr('stroke', clr).attr('stroke-width', 2).attr('stroke-opacity', 0.95);
    label(yScale(val), clr, `P${rp}`);
  });
}

/**
 * Draws the vertical marker at the forecast run date.
 *
 * @param {Object} plotG - Clipped plot-area selection
 * @param {Object} params
 * @param {Date|null} params.activeDateObj - Parsed run date
 * @param {Function} params.xScale - Time scale
 * @param {number} params.innerH - Plot height
 * @returns {void}
 */
export function drawForecastDateMarker(plotG, {activeDateObj, xScale, innerH}) {
  if (!activeDateObj) return;
  const xPos = xScale(activeDateObj);
  if (!Number.isFinite(xPos)) return;
  plotG.append('line')
    .attr('class', 'forecast-date-line')
    .attr('x1', xPos).attr('x2', xPos).attr('y1', 0).attr('y2', innerH)
    .attr('stroke', '#888').attr('stroke-width', 5).attr('stroke-opacity', 0.4)
    .append('title').text(activeDateObj.toISOString());
}

/**
 * Draws the horizontal gridlines behind the plot.
 *
 * @param {Object} g - Plot group selection
 * @param {Object} params
 * @param {Function} params.yScale - Value scale
 * @param {number} params.innerW - Plot width
 * @param {number} params.innerH - Plot height
 * @returns {void}
 */
export function drawYGrid(g, {yScale, innerW, innerH}) {
  const ticks = Math.min(10, Math.max(3, Math.floor(innerH / 55)));
  const grid = g.append('g').attr('class', 'y-axis-grid')
    .call(d3.axisLeft(yScale).ticks(ticks).tickSize(-innerW).tickFormat('').tickPadding(8));
  grid.selectAll('line').attr('stroke', '#ccc').attr('stroke-opacity', 0.9);
  grid.selectAll('path.domain').remove();
}

/**
 * Draws both axes and the y axis label.
 *
 * @param {Object} g - Plot group selection
 * @param {Object} params
 * @param {Function} params.xScale - Time scale
 * @param {Function} params.yScale - Value scale
 * @param {number} params.innerH - Plot height
 * @param {Object} params.margin - Plot margins
 * @param {Array<Date>} params.dates - Target dates, which always get a tick
 * @param {[Date, Date]} params.domain - Time domain
 * @param {Function} params.t - Translation function
 * @returns {void}
 */
export function drawAxes(g, {xScale, yScale, innerH, margin, dates, domain, t}) {
  const ticks = Math.min(10, Math.max(3, Math.floor(innerH / 55)));
  const yAxisG = g.append('g').attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).ticks(ticks).tickSize(0).tickPadding(8));
  yAxisG.selectAll('path.domain').remove();
  g.selectAll('.y-axis text').attr('fill', '#555').attr('font-size', 11);

  if (innerH > 120) {
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2).attr('y', -margin.left + 14)
      .attr('text-anchor', 'middle').attr('fill', '#444').attr('font-size', 12)
      .text(t('seriesModal.precipitation'));
  }

  // Every target date gets a tick; only day boundaries get a label.
  const [start, end] = domain;
  const dayTicks = d3.timeDay.range(d3.timeDay.floor(start), d3.timeDay.offset(d3.timeDay.ceil(end), 1));
  const tickValues = Array.from(new Set([...dates, ...dayTicks].map(d => +d)))
    .sort((a, b) => a - b)
    .map(ts => new Date(ts));
  const dayStarts = new Set(dayTicks.map(d => +d));
  const dateFmt = d3.timeFormat('%-d/%-m');

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d => (dayStarts.has(+d) ? dateFmt(d) : '')))
    .selectAll('text')
    .attr('fill', '#555').attr('font-size', 11).attr('text-anchor', 'middle');
}

/**
 * Builds the legend entries matching the enabled display options.
 *
 * @param {Object} params
 * @param {Array<number>} params.pctList - Percentiles present
 * @param {Object} params.options - Display toggles
 * @param {Function} params.t - Translation function
 * @returns {Array<Object>} Legend items for `drawLegend`
 */
export function buildLegendItems({pctList, options, t}) {
  const items = [];
  if (pctList.includes(50)) {
    items.push({label: t('seriesModal.median'), color: QUANTILE_COLORS.median, dashed: true});
  }
  if (options.mainQuantiles) {
    items.push({label: t('seriesModal.quantile90'), color: QUANTILE_COLORS.p90});
    items.push({label: t('seriesModal.quantile60'), color: QUANTILE_COLORS.p60});
    items.push({label: t('seriesModal.quantile20'), color: QUANTILE_COLORS.p20});
  }
  if (options.bestAnalogs) {
    items.push({label: t('seriesModal.bestAnalogs'), color: ANALOG_MARKER_COLOR, marker: true});
  }
  return items;
}
