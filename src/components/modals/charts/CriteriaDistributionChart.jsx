import React, { forwardRef, useEffect } from 'react';
import * as d3 from 'd3';

// Criteria distribution chart component (cumulative / ordered criteria values)
const CriteriaDistributionChart = forwardRef(function CriteriaDistributionChart({
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
}, ref) {
  useEffect(() => {
    const container = ref?.current;
    if (!container) return;
    d3.select(container).selectAll('*').remove();

    const raw = (criteriaValues && criteriaValues.length)
      ? criteriaValues.map(d => (d && d.value != null) ? d.value : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v))
      : (analogValues ? analogValues.map(a => (a && a.criteria != null) ? a.criteria : null).filter(v => v != null && isFinite(Number(v))).map(v => Number(v)) : []);
    if (!raw.length) return;
    const values = [...raw].sort((a, b) => a - b);

    const width = container.clientWidth || 700;
    const height = Math.max(220, container.clientHeight || 300);
    const margin = {top: 28, right: 20, bottom: 40, left: 56};
    const innerW = Math.max(10, width - margin.left - margin.right);
    const innerH = Math.max(40, height - margin.top - margin.bottom);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    try {
      const methodIdStr = selectedMethodId ? String(selectedMethodId) : '';
      const cfgStr = selectedConfigId ? String(selectedConfigId) : '';
      const leadMatch = Array.isArray(leads) ? leads.find(l => l.lead === selectedLead) : null;
      const tgt = leadMatch?.date && !isNaN(leadMatch.date) ? leadMatch.date : null;
      const fmt = d3.timeFormat('%Y-%m-%d');
      const tgtStr = tgt ? fmt(tgt) : (selectedLead != null ? `L${selectedLead}` : '');
      let fcDate = null; try { fcDate = activeForecastDate ? new Date(activeForecastDate) : null; if (fcDate && isNaN(fcDate)) fcDate = null; } catch { fcDate = null; }
      const fcStr = fcDate ? fmt(fcDate) : '';
      const foText = fcStr ? t('toolbar.forecastOf', {date: fcStr}) : '';
      const parts = [(stationName || ''), methodIdStr, cfgStr].filter(Boolean);
      const rightPart = [tgtStr, foText ? `(${foText})` : ''].filter(Boolean).join(' ');
      if (rightPart) parts.push(rightPart);
      const titleText = parts.join(' — ');
      svg.append('text').attr('x', margin.left + innerW / 2).attr('y', Math.max(12, margin.top - 12)).attr('text-anchor', 'middle').attr('fill', '#222').attr('font-size', 14).attr('font-weight', 600).text(titleText);
    } catch {}

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, values.length]).range([0, innerW]);
    const y = d3.scaleLinear().domain([d3.min(values), d3.max(values)]).nice().range([innerH, 0]);

    const xGrid2 = d3.axisBottom(x).ticks(Math.min(10, values.length)).tickSize(-innerH).tickFormat('');
    g.append('g').attr('class', 'grid grid-x').attr('transform', `translate(0,${innerH})`).call(xGrid2).selectAll('line').attr('stroke', '#eaeaea').attr('stroke-width', 1);
    g.select('.grid.grid-x').selectAll('.domain').remove();
    const yGrid2 = d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat('');
    g.append('g').attr('class', 'grid grid-y').call(yGrid2).selectAll('line').attr('stroke', '#eaeaea').attr('stroke-width', 1);
    g.select('.grid.grid-y').selectAll('path.domain').remove();

    const line = d3.line().x((d, i) => x(i + 1)).y(d => y(d)).curve(d3.curveMonotoneX);
    g.append('path').datum(values).attr('fill', 'none').attr('stroke', '#17becf').attr('stroke-width', 2).attr('d', line);
    g.selectAll('circle').data(values).enter().append('circle').attr('cx', (d, i) => x(i + 1)).attr('cy', d => y(d)).attr('r', 3).attr('fill', '#17becf');

    const xAxis = d3.axisBottom(x).ticks(Math.min(10, values.length));
    g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis);
    const yAxis = d3.axisLeft(y).ticks(6);
    g.append('g').call(yAxis);
    g.selectAll('path.domain').remove();

    svg.append('text').attr('x', (margin.left + innerW / 2)).attr('y', height - 6).attr('text-anchor', 'middle').text(t('modalAnalogs.analogsList') || 'Analogues');
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -(margin.top + innerH / 2)).attr('y', 14).attr('text-anchor', 'middle').text(t('modalAnalogs.colCriteria') || 'Criteria');
  }, [criteriaValues, analogValues, selectedMethodId, selectedConfigId, selectedLead, leads, activeForecastDate, stationName, t, renderTick]);

  // Cleanup on unmount: clear container content
  useEffect(() => {
    return () => {
      if (ref?.current) d3.select(ref.current).selectAll('*').remove();
    };
  }, [ref]);

  return <div ref={ref} style={{width: '100%', height: 360, minHeight: 240}} />;
});

export default CriteriaDistributionChart;
