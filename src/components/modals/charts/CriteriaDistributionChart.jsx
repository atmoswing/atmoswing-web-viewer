/**
 * @module components/modals/charts/CriteriaDistributionChart
 * @description D3-based ordered criteria distribution chart with optional analog criteria fallback.
 */

import React, {forwardRef, useEffect} from 'react';
import * as d3 from 'd3';
import {buildDistributionTitle, drawChartTitle} from './draw/chartChrome.js';
import {
  computeDistributionGeometry,
  drawCurve,
  drawDistributionAxes,
  drawDistributionGrid
} from './draw/distributionLayers.js';

const MARGIN = {top: 28, right: 20, bottom: 40, left: 56};
const CRITERIA_COLOR = '#17becf';

// Criteria distribution chart component (cumulative / ordered criteria values)
/**
 * CriteriaDistributionChart component.
 * @param {Object} props
 * @param {Array|null} props.criteriaValues - Array of {index, value} criteria pairs
 * @param {Array|null} props.analogValues - Raw analog array (used as fallback for criteria extraction)
 * @param {string|number} props.selectedMethodId - Method identifier
 * @param {string|number} props.selectedConfigId - Configuration identifier
 * @param {number|null} props.selectedLead - Lead time in hours
 * @param {Array} props.leads - Available leads metadata
 * @param {string} props.activeForecastDate - Active forecast date string
 * @param {string} props.stationName - Display station name
 * @param {Function} props.t - Translation function
 * @param {number} props.renderTick - Redraw trigger counter
 */
const CriteriaDistributionChart = forwardRef(function CriteriaDistributionChart(
  {
    criteriaValues,
    analogValues,
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

    const raw = (criteriaValues && criteriaValues.length)
      ? criteriaValues.map(d => (d && d.value != null) ? d.value : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v))
      : (analogValues ? analogValues.map(a => (a && a.criteria != null) ? a.criteria : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v)) : []);
    if (!raw.length) return;
    const values = [...raw].sort((a, b) => a - b);

    const geometry = computeDistributionGeometry(container, {
      margin: MARGIN, minHeight: 220, fallbackHeight: 300
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

    // Sorted criteria against their rank: 1 is the best analog.
    const x = d3.scaleLinear().domain([1, values.length]).range([0, innerW]);
    const y = d3.scaleLinear().domain([d3.min(values), d3.max(values)]).nice().range([innerH, 0]);
    const xTicks = Math.min(10, values.length);

    drawDistributionGrid(g, {x, y, innerW, innerH, xTicks, yTicks: 6});
    drawCurve(g, {points: values, xOf: (d, i) => x(i + 1), yOf: d => y(d), color: CRITERIA_COLOR});
    drawDistributionAxes(svg, g, {
      x, y, xTicks, yTicks: 6, geometry,
      xLabel: t('detailsAnalogsModal.analogsList') || 'Analogues',
      yLabel: t('detailsAnalogsModal.colCriteria') || 'Criteria',
      yLabelOffset: 14
    });
  }, [ref, criteriaValues, analogValues, selectedMethodId, selectedConfigId, selectedLead, leads, activeForecastDate, stationName, t, renderTick]);

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

export default CriteriaDistributionChart;
