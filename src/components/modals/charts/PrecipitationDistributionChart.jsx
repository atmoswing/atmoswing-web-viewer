/**
 * @module components/modals/charts/PrecipitationDistributionChart
 * @description D3-based empirical cumulative distribution chart for precipitation analog values with optional overlays.
 */

import React, {forwardRef, useEffect} from 'react';
import * as d3 from 'd3';
import {buildDistributionTitle, drawChartTitle} from './draw/chartChrome.js';
import {
  collectOverlayValues,
  computeDistributionGeometry,
  computeDistributionXMax,
  drawCurve,
  drawDistributionAxes,
  drawDistributionGrid,
  drawPercentileMarkers,
  drawReturnPeriodMarkers,
  empiricalCdf,
  returnPeriodMarkers
} from './draw/distributionLayers.js';

const MARGIN = {top: 28, right: 40, bottom: 40, left: 56};
const CDF_COLOR = '#1f77b4';
const BEST_ANALOGS_COLOR = '#7b2cbf';

/**
 * PrecipitationDistributionChart component.
 * @param {Object} props
 * @param {Array|null} props.analogValues - Array of analog objects (value, criteria, rank...)
 * @param {Array|null} props.bestAnalogsData - Array of top analogs for overlay
 * @param {Object|null} props.percentileMarkers - Map percentile->value for markers (e.g. {20: num})
 * @param {Object|null} props.referenceValues - Return period reference {axis:number[], values:number[]}
 * @param {Object} props.options - Display toggles (tenYearReturn, allReturnPeriods, bestAnalogs)
 * @param {string|number} props.selectedMethodId - Method ID
 * @param {string|number} props.selectedConfigId - Config ID
 * @param {number|null} props.selectedLead - Selected lead time in hours
 * @param {Array} props.leads - Leads metadata array
 * @param {string} props.activeForecastDate - Active forecast date string
 * @param {string} props.stationName - Station name for title
 * @param {Function} props.t - Translation function
 * @param {number} props.renderTick - Increment to force redraw
 */
const PrecipitationDistributionChart = forwardRef(function PrecipitationDistributionChart(
  {
    analogValues,
    bestAnalogsData,
    percentileMarkers,
    referenceValues,
    options,
    selectedMethodId,
    selectedConfigId,
    selectedLead,
    leads,
    activeForecastDate,
    stationName,
    t,
    renderTick
  },
  ref) {
  useEffect(() => {
    const container = ref?.current;
    if (!container) return;
    d3.select(container).selectAll('*').remove();

    const data = Array.isArray(analogValues) ? analogValues : [];
    if (!data.length) return;

    const values = data.map(d => (d && d.value != null) ? Number(d.value) : null)
      .filter(v => v != null && Number.isFinite(v))
      .sort((a, b) => a - b);
    if (!values.length) return;

    const geometry = computeDistributionGeometry(container, {
      margin: MARGIN, minHeight: 240, fallbackHeight: 320
    });
    const {width, height, innerW, innerH, margin} = geometry;

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    drawChartTitle(svg, {
      text: buildDistributionTitle({
        stationName, selectedMethodId, selectedConfigId, selectedLead, leads, activeForecastDate, t
      }),
      centerX: margin.left + innerW / 2,
      y: Math.max(12, margin.top - 12)
    });
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // The x-scale spans the overlays too, so no marker falls outside the plot.
    const overlays = collectOverlayValues({percentileMarkers, referenceValues, options, bestAnalogsData});
    const x = d3.scaleLinear().domain([0, computeDistributionXMax(values, overlays)]).range([0, innerW]).nice();
    const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);
    const xOf = d => x(d.x);
    const yOf = d => y(d.y);

    drawDistributionGrid(g, {x, y, innerW, innerH, xTicks: 8, yTicks: 5});
    drawCurve(g, {points: empiricalCdf(values), xOf, yOf, color: CDF_COLOR, pointClass: 'cum-point'});
    drawPercentileMarkers(g, {percentileMarkers, x, y});
    drawReturnPeriodMarkers(g, {markers: returnPeriodMarkers(referenceValues, options), x, innerH});

    if (options?.bestAnalogs && bestAnalogsData && bestAnalogsData.length) {
      const bestCdf = empiricalCdf(bestAnalogsData.map(b => b.value));
      if (bestCdf.length) {
        drawCurve(g, {points: bestCdf, xOf, yOf, color: BEST_ANALOGS_COLOR, pointClass: 'best-point'});
      }
    }

    drawDistributionAxes(svg, g, {
      x, y, xTicks: 8, yTicks: 5, yTickFormat: d3.format('.2f'), geometry,
      xLabel: t('seriesModal.precipitation') || 'Precipitation [mm]',
      yLabel: t('distributionPlots.cumulativeFrequency') || 'Cumulative frequency',
      yLabelOffset: 12
    });
  }, [ref, analogValues, bestAnalogsData, percentileMarkers, referenceValues, options, selectedMethodId, selectedConfigId, selectedLead, leads, activeForecastDate, stationName, t, renderTick]);

  // Cleanup on unmount: clear container content. The node is captured here rather than read
  // in the cleanup, so it is the element this effect ran against that gets cleared.
  useEffect(() => {
    const node = ref?.current;
    return () => {
      if (node) d3.select(node).selectAll('*').remove();
    };
  }, [ref]);

  return <div ref={ref} style={{width: '100%', height: 360, minHeight: 240}}/>;
});

export default PrecipitationDistributionChart;
