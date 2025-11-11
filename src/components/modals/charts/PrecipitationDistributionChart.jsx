import React, { forwardRef, useEffect } from 'react';
import * as d3 from 'd3';
import { SELECTED_RPS, TEN_YEAR_COLOR } from '../common/plotConstants.js';

// Precipitation (predictand) cumulative distribution chart
const PrecipitationDistributionChart = forwardRef(function PrecipitationDistributionChart({
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
}, ref) {
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

    const width = container.clientWidth || 700;
    const height = Math.max(240, container.clientHeight || 320);
    const margin = {top: 28, right: 40, bottom: 40, left: 56};
    const innerW = Math.max(10, width - margin.left - margin.right);
    const innerH = Math.max(40, height - margin.top - margin.bottom);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

    // Title (centered, export-friendly)
    try {
      const methodIdStr = selectedMethodId ? String(selectedMethodId) : '';
      const cfgStr = selectedConfigId ? String(selectedConfigId) : '';
      const leadMatch = Array.isArray(leads) ? leads.find(l => l.lead === selectedLead) : null;
      const tgt = leadMatch?.date && !isNaN(leadMatch.date) ? leadMatch.date : null;
      const fmt = d3.timeFormat('%Y-%m-%d');
      const tgtStr = tgt ? fmt(tgt) : (selectedLead != null ? `L${selectedLead}` : '');
      let fcDate = null;
      try { fcDate = activeForecastDate ? new Date(activeForecastDate) : null; if (fcDate && isNaN(fcDate)) fcDate = null; } catch { fcDate = null; }
      const fcStr = fcDate ? fmt(fcDate) : '';
      const foText = fcStr ? t('toolbar.forecastOf', {date: fcStr}) : '';
      const parts = [(stationName || ''), methodIdStr, cfgStr].filter(Boolean);
      const rightPart = [tgtStr, foText ? `(${foText})` : ''].filter(Boolean).join(' ');
      if (rightPart) parts.push(rightPart);
      const titleText = parts.join(' — ');
      svg.append('text')
        .attr('x', margin.left + innerW / 2)
        .attr('y', Math.max(12, margin.top - 12))
        .attr('text-anchor', 'middle')
        .attr('fill', '#222')
        .attr('font-size', 14)
        .attr('font-weight', 600)
        .text(titleText);
    } catch {}

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Build overlay values so scale includes them
    const overlayXs = [];
    if (percentileMarkers) [20, 60, 90].forEach(p => {
      const v = percentileMarkers[p];
      if (Number.isFinite(Number(v))) overlayXs.push(Number(v));
    });
    if (referenceValues && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
      const allowed = new Set();
      if (options?.tenYearReturn) allowed.add(10);
      if (options?.allReturnPeriods) SELECTED_RPS.forEach(rp => allowed.add(rp));
      if (allowed.size > 0) {
        referenceValues.axis.forEach((rp, i) => {
          const rpn = Number(rp);
          const val = Number(referenceValues.values[i]);
          if (allowed.has(rpn) && Number.isFinite(val)) overlayXs.push(val);
        });
      }
    }
    if (bestAnalogsData && Array.isArray(bestAnalogsData)) {
      bestAnalogsData.forEach(b => { if (Number.isFinite(Number(b?.value))) overlayXs.push(Number(b.value)); });
    }

    const rawMax = Math.max(...values, ...(overlayXs.length ? overlayXs : [0]));
    const xMax = (rawMax != null && rawMax > 0) ? rawMax * 1.05 : 1;
    const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]).nice();

    // Beneveniste empirical CDF
    const N = values.length;
    const irep = 0.44, nrep = 0.12;
    const divisor = 1.0 / (N + nrep);
    const cum = values.map((v, i) => ({x: v, y: Math.max(0, Math.min(1, (i + 1.0 - irep) * divisor))}));
    const yCum = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

    // Grids
    const xGrid = d3.axisBottom(x).ticks(8).tickSize(-innerH).tickFormat('');
    g.append('g').attr('class', 'grid grid-x').attr('transform', `translate(0,${innerH})`).call(xGrid).selectAll('line').attr('stroke', '#eaeaea').attr('stroke-width', 1);
    g.select('.grid.grid-x').selectAll('.domain').remove();
    const yGrid = d3.axisLeft(yCum).ticks(5).tickSize(-innerW).tickFormat('');
    g.append('g').attr('class', 'grid grid-y').call(yGrid).selectAll('line').attr('stroke', '#eaeaea').attr('stroke-width', 1);
    g.select('.grid.grid-y').selectAll('.domain').remove();

    // CDF curve + points
    const line = d3.line().x(d => x(d.x)).y(d => yCum(d.y)).curve(d3.curveMonotoneX);
    g.append('path').datum(cum).attr('fill', 'none').attr('stroke', '#1f77b4').attr('stroke-width', 2).attr('d', line);
    g.selectAll('.cum-point').data(cum).enter().append('circle').attr('class', 'cum-point').attr('cx', d => x(d.x)).attr('cy', d => yCum(d.y)).attr('r', 3).attr('fill', '#1f77b4');

    // Percentile markers
    if (percentileMarkers) {
      const labelColor = '#333';
      [20, 60, 90].forEach(p => {
        const xv = percentileMarkers[p];
        if (!Number.isFinite(Number(xv))) return;
        const cx = x(Number(xv)); const cy = yCum(p / 100);
        g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 7).attr('fill', '#0000').attr('stroke', '#444').attr('stroke-width', 1);
        g.append('text').attr('x', cx + 8).attr('y', cy + 8).attr('fill', labelColor).attr('font-size', 12).attr('font-weight', 600).text(`q${p}`);
      });
    }

    // Reference values (return periods)
    if (referenceValues && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
      if (options?.tenYearReturn) {
        const idx10 = referenceValues.axis.findIndex(a => Number(a) === 10);
        if (idx10 >= 0) {
          const val10 = referenceValues.values[idx10];
          if (Number.isFinite(val10)) {
            const xPos = x(Number(val10));
            g.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', 0).attr('y2', innerH).attr('stroke', TEN_YEAR_COLOR).attr('stroke-width', 2);
            g.append('text').attr('x', xPos + 2).attr('y', innerH - 2).attr('font-size', 11).attr('fill', TEN_YEAR_COLOR).attr('dominant-baseline', 'text-after-edge').text('P10');
          }
        }
      }
      if (options?.allReturnPeriods) {
        const rpMap = new Map();
        referenceValues.axis.forEach((rp, i) => {
          const v = referenceValues.values[i];
          if (Number.isFinite(Number(v))) rpMap.set(Number(rp), Number(v));
        });
        const toDraw = SELECTED_RPS.filter(rp => rpMap.has(rp));
        const asc = toDraw.slice().sort((a, b) => a - b); const n = asc.length;
        asc.forEach((rp, idx) => {
          const val = rpMap.get(rp);
          const xPos = x(val);
          const ratio = n > 1 ? (idx / (n - 1)) : 0;
          const gVal = Math.round(255 - ratio * 255);
          const clr = `rgb(255, ${gVal}, 0)`;
          g.append('line').attr('x1', xPos).attr('x2', xPos).attr('y1', 0).attr('y2', innerH).attr('stroke', clr).attr('stroke-width', 2).attr('stroke-opacity', 0.95);
          g.append('text').attr('x', xPos + 2).attr('y', innerH - 2).attr('font-size', 11).attr('fill', clr).attr('dominant-baseline', 'text-after-edge').text(`P${rp}`);
        });
      }
    }

    // Optional overlay: 10 best analogs’ CDF
    if (options?.bestAnalogs && bestAnalogsData && bestAnalogsData.length) {
      const violet = '#7b2cbf';
      const avals = bestAnalogsData.map(b => Number(b.value)).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
      if (avals.length) {
        const M = avals.length; const irepB = 0.44; const nrepB = 0.12; const divB = 1.0 / (M + nrepB);
        const curve = avals.map((v, i) => ({x: v, y: Math.max(0, Math.min(1, (i + 1.0 - irepB) * divB))}));
        const lineB = d3.line().x(d => x(d.x)).y(d => yCum(d.y)).curve(d3.curveMonotoneX);
        g.append('path').datum(curve).attr('fill', 'none').attr('stroke', violet).attr('stroke-width', 2).attr('d', lineB);
        g.selectAll('.best-point').data(curve).enter().append('circle').attr('class', 'best-point').attr('cx', d => x(d.x)).attr('cy', d => yCum(d.y)).attr('r', 3).attr('fill', violet);
      }
    }

    // Axes and labels
    const xAxis = d3.axisBottom(x).ticks(8);
    g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
    svg.append('text').attr('x', (margin.left + innerW / 2)).attr('y', height - 6).attr('text-anchor', 'middle').text(t('seriesModal.precipitation') || 'Precipitation [mm]');
    const yAxisLeft = d3.axisLeft(yCum).ticks(5).tickFormat(d3.format('.2f'));
    g.append('g').call(yAxisLeft);
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -(margin.top + innerH / 2)).attr('y', 12).attr('text-anchor', 'middle').text(t('distributionPlots.cumulativeFrequency') || 'Cumulative frequency');
    g.selectAll('path.domain').remove();
  }, [analogValues, bestAnalogsData, percentileMarkers, referenceValues, options, selectedMethodId, selectedConfigId, selectedLead, leads, activeForecastDate, stationName, t, renderTick]);

  // Cleanup on unmount: clear container content
  useEffect(() => {
    return () => {
      if (ref?.current) d3.select(ref.current).selectAll('*').remove();
    };
  }, [ref]);

  return <div ref={ref} style={{width: '100%', height: 360, minHeight: 240}} />;
});

export default PrecipitationDistributionChart;

