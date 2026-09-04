/**
 * @module components/modals/charts/TimeSeriesChart
 * @description D3-based time series chart rendering percentile envelopes, best analog markers, return periods and forecast history overlays.
 */

import {useEffect, useMemo} from 'react';
import * as d3 from 'd3';
import {parseForecastDate} from '@/utils/forecastDateUtils.js';
import {
  computeChartGeometry,
  computeTimeDomain,
  computeYMax,
  extractReferencePairs
} from './draw/chartGeometry.js';
import {buildTimeSeriesTitle, drawChartTitle, drawLegend} from './draw/chartChrome.js';
import {
  buildLegendItems,
  drawAxes,
  drawBestAnalogMarkers,
  drawForecastDateMarker,
  drawPastForecasts,
  drawPercentileBands,
  drawPercentileLines,
  drawReturnPeriodLines,
  drawYGrid
} from './draw/timeSeriesLayers.js';

/**
 * TimeSeriesChart component.
 * @param {Object} props
 * @param {React.RefObject} props.containerRef - Container div ref for mounting SVG
 * @param {Function} props.t - Translation function
 * @param {Object|null} props.series - Normalized time series data ({dates:Date[], percentiles: {pct: values[]}})
 * @param {Object|null} props.bestAnalogs - Best analogs data ({items:[], dates:[]})
 * @param {Object|null} props.referenceValues - Return period reference ({axis:number[], values:number[]})
 * @param {Array|null} props.pastForecasts - Previous forecast runs history array
 * @param {Object} props.options - Display toggles
 * @param {string} props.activeForecastDate - Raw active forecast date string
 * @param {Object|null} props.selectedMethodConfig - Current method/config selection
 * @param {string} props.stationName - Display station name
 * @param {Function} props.onHoverShow - Show hover popper handler (anchor, title)
 * @param {Function} props.onHoverHide - Hide hover popper handler
 */
export default function TimeSeriesChart(
  {
    containerRef,
    t,
    series,
    bestAnalogs,
    referenceValues,
    pastForecasts,
    options,
    activeForecastDate,
    selectedMethodConfig,
    stationName,
    onHoverShow,
    onHoverHide,
  }
) {
  const pctList = useMemo(() => (series?.pctList ?? []), [series]);
  const dates = useMemo(() => (series?.dates ?? []), [series]);
  // Memoized so it can go in the effect's dependencies: a bare `series?.percentiles || {}`
  // yields a fresh object on every render whenever the series carries no percentiles,
  // which would redraw the chart on each render.
  const percentilesMap = useMemo(() => series?.percentiles || {}, [series]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || !dates.length) return;

    // Cleanup from the previous render has already run; clear anything else left behind.
    d3.select(container).selectAll('*').remove();

    const {svgWidth, svgHeight, innerW, innerH, margin} = computeChartGeometry(container);

    const svg = d3.select(container)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('role', 'img')
      .attr('aria-label', t('seriesModal.seriesAriaLabel'));
    svg.append('rect')
      .attr('x', 0).attr('y', 0).attr('width', svgWidth).attr('height', svgHeight)
      .attr('fill', '#fff');

    // --- domains and scales ---
    const parsedActive = activeForecastDate
      ? (parseForecastDate(activeForecastDate) || new Date(activeForecastDate))
      : null;
    const activeDateObj = (parsedActive instanceof Date && !isNaN(parsedActive)) ? parsedActive : null;
    const domain = computeTimeDomain(dates, activeDateObj);

    const {tenYearVal, rpPairs} = extractReferencePairs(referenceValues);
    const yValueGroups = pctList.map(p => percentilesMap[p] || []);
    if (options.allReturnPeriods) yValueGroups.push(rpPairs.map(p => p.val));
    if (options.tenYearReturn) yValueGroups.push([tenYearVal]);
    if (options.bestAnalogs) {
      (bestAnalogs?.items || []).forEach(it => yValueGroups.push(it.values || []));
    }

    const xScale = d3.scaleTime().domain(domain).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, computeYMax(yValueGroups)]).nice().range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const clipId = `plot-clip-${Math.random().toString(36).slice(2, 9)}`;
    svg.append('defs').append('clipPath').attr('id', clipId)
      .append('rect').attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH);

    drawYGrid(g, {yScale, innerW, innerH});
    const plotG = g.append('g').attr('class', 'plot-area').attr('clip-path', `url(#${clipId})`);

    // --- layers, back to front ---
    if (options.previousForecasts) {
      drawPastForecasts(plotG, {pastForecasts, xScale, yScale, t, onHoverShow, onHoverHide});
    }
    drawPercentileBands(plotG, {pctList, percentilesMap, dates, xScale, yScale});
    drawPercentileLines(plotG, {
      pctList, percentilesMap, dates, xScale, yScale, mainQuantiles: options.mainQuantiles
    });
    if (options.bestAnalogs) {
      drawBestAnalogMarkers(plotG, {bestAnalogs, dates, xScale, yScale, t, onHoverShow, onHoverHide});
    }
    drawReturnPeriodLines({plotG, g, tenYearVal, rpPairs, options, innerW, yScale});
    drawForecastDateMarker(plotG, {activeDateObj, xScale, innerH});

    // --- chrome ---
    drawAxes(g, {xScale, yScale, innerH, margin, dates, domain, t});
    drawLegend(svg, {
      items: buildLegendItems({pctList, options, t}),
      x: margin.left,
      y: margin.top + innerH + 40
    });
    drawChartTitle(svg, {
      text: buildTimeSeriesTitle({stationName, selectedMethodConfig, runDate: activeDateObj}),
      centerX: margin.left + innerW / 2,
      y: Math.max(12, margin.top - 12)
    });

    return () => {
      // Clears the node this run drew into, rather than whatever the ref points at by the
      // time cleanup fires. Only the SVG is touched: calling back into parent state here
      // would risk an update loop.
      d3.select(container).selectAll('*').remove();
    };
  }, [containerRef, t, dates, series, pctList, percentilesMap, bestAnalogs, referenceValues, pastForecasts, options, activeForecastDate, selectedMethodConfig, stationName, onHoverShow, onHoverHide]);

  return null;
}
