import {useEffect, useMemo} from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';
import {ANALOG_MARKER_COLOR, QUANTILE_COLORS, SELECTED_RPS, TEN_YEAR_COLOR} from '../common/plotConstants.js';
import {parseForecastDate} from '../../../utils/forecastDateUtils.js';

export default function TimeSeriesChart({
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
}) {
  const pctList = useMemo(() => (series?.pctList ?? []), [series]);
  const dates = useMemo(() => (series?.dates ?? []), [series]);
  const percentilesMap = series?.percentiles || {};

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    // DO NOT clear here; cleanup from previous render runs before this effect.
    if (!dates.length) return;

    // clear
    d3.select(container).selectAll('*').remove();

    let cw = container.clientWidth || 600;
    let ch = container.clientHeight || 420;
    cw = Math.max(420, cw);
    ch = Math.max(300, ch);

    const margin = {top: 25, right: 40, bottom: 20, left: 56};
    const legendReserve = 28; // approximate legend height + gap

    const containerH = container.clientHeight || ch + legendReserve + margin.top + margin.bottom;
    const svgHeight = Math.max(300, Math.min(ch + legendReserve, containerH));
    const innerH = Math.max(60, svgHeight - margin.top - margin.bottom - legendReserve);
    const innerW = Math.max(10, cw - margin.left - margin.right);

    const rightLabelReserve = 40;
    const containerW = container.clientWidth || cw + rightLabelReserve;
    const svgWidth = Math.max(420, Math.min(cw + rightLabelReserve, containerW));

    const svg = d3.select(container)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('role', 'img')
      .attr('aria-label', t('seriesModal.seriesAriaLabel'));

    svg.append('rect').attr('x', 0).attr('y', 0).attr('width', svgWidth).attr('height', svgHeight).attr('fill', '#fff');

    const maxX = d3.max(dates);
    // Use robust parser for active forecast date
    const parsedActive = activeForecastDate ? (parseForecastDate(activeForecastDate) || new Date(activeForecastDate)) : null;
    const activeDateObj = (parsedActive instanceof Date && !isNaN(parsedActive)) ? parsedActive : null;
    const twoDaysBefore = activeDateObj ? new Date(activeDateObj.getTime() - 2 * 24 * 3600 * 1000) : null;
    const minX = d3.min(dates);
    const startDomain = (twoDaysBefore && minX) ? (twoDaysBefore < minX ? twoDaysBefore : minX) : (twoDaysBefore || minX);

    let stepMs = 0;
    if (dates.length >= 2) {
      const diffs = [];
      for (let i = 1; i < dates.length; i++) {
        const d = +dates[i] - +dates[i - 1];
        if (d > 0) diffs.push(d);
      }
      if (diffs.length) {
        diffs.sort((a, b) => a - b);
        stepMs = diffs[Math.floor(diffs.length / 2)];
      }
    }
    if (!stepMs) stepMs = 12 * 3600 * 1000;
    const rightPadMs = Math.max(stepMs * 0.1, 3600 * 1000);
    const domainMax = new Date((maxX || d3.max(dates)).getTime() + rightPadMs);

    // y domain values
    const allValues = [];
    pctList.forEach(p => (percentilesMap[p] || []).forEach(v => { if (Number.isFinite(v)) allValues.push(v); }));
    let tenYearVal = null;
    let rpPairs = [];
    if (referenceValues?.axis?.length && referenceValues?.values?.length) {
      const idx = referenceValues.axis.findIndex(a => Number(a) === 10);
      if (idx >= 0) tenYearVal = referenceValues.values[idx];
      rpPairs = referenceValues.axis.map((a, i) => ({rp: Number(a), val: Number(referenceValues.values[i])}))
        .filter(p => Number.isFinite(p.val));
      if (options.allReturnPeriods) rpPairs.forEach(p => allValues.push(p.val));
    }
    if (options.tenYearReturn && Number.isFinite(tenYearVal)) allValues.push(tenYearVal);
    if (options.bestAnalogs && bestAnalogs?.items?.length) {
      bestAnalogs.items.forEach(it => it.values?.forEach(v => { if (Number.isFinite(v)) allValues.push(v); }));
    }
    const yMax = allValues.length ? Math.max(...allValues) * 1.08 : 1;

    const xScale = d3.scaleTime().domain([startDomain, domainMax]).range([0, innerW]);
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const clipId = `plot-clip-${Math.random().toString(36).slice(2, 9)}`;
    svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH);

    const yAxisGrid = d3.axisLeft(yScale).ticks(Math.min(10, Math.max(3, Math.floor(innerH / 55)))).tickSize(-innerW).tickFormat('').tickPadding(8);
    const yAxisGridG = g.append('g').attr('class', 'y-axis-grid').call(yAxisGrid);
    yAxisGridG.selectAll('line').attr('stroke', '#ccc').attr('stroke-opacity', 0.9);
    yAxisGridG.selectAll('path.domain').remove();

    const plotG = g.append('g').attr('class', 'plot-area').attr('clip-path', `url(#${clipId})`);

    if (options.previousForecasts && pastForecasts?.length) {
      const HIST_ALPHA = 0.35;
      const HIST_WIDTH = 1.25;
      const mainPcts = [20, 60, 90];
      const fmtRunDate = d3.timeFormat('%d.%m');
      pastForecasts.forEach(pf => {
        const pd = pf.dates || [];
        if (!pd.length) return;
        const runDateStr = pf.forecastDate && !isNaN(pf.forecastDate) ? fmtRunDate(pf.forecastDate) : '';
        mainPcts.forEach(pct => {
          const arr = pf.percentiles && pf.percentiles[pct];
          if (!arr || !Array.isArray(arr)) return;
          const lineFn = d3.line().defined((d, i) => Number.isFinite(arr[i])).x((d, i) => xScale(pd[i])).y((d, i) => yScale(arr[i]));
          const color = pct === 90 ? QUANTILE_COLORS.p90 : pct === 60 ? QUANTILE_COLORS.p60 : QUANTILE_COLORS.p20;
          const qLabel = pct === 90 ? t('seriesModal.quantile90') : pct === 60 ? t('seriesModal.quantile60') : pct === 20 ? t('seriesModal.quantile20') : `Q${pct}`;
          const titleText = runDateStr ? `Run ${runDateStr} — ${qLabel}` : qLabel;

          const showWithVirtual = function () {
            try {
              const rect = this.getBoundingClientRect();
              const virtualEl = { getBoundingClientRect: () => rect };
              onHoverShow?.(virtualEl, titleText);
            } catch { /* ignore */ }
          };

          plotG.append('path').datum(pd).attr('fill', 'none').attr('stroke', color).attr('stroke-width', HIST_WIDTH).attr('stroke-opacity', HIST_ALPHA).attr('d', lineFn)
            .style('pointer-events', 'stroke')
            .on('mouseenter', showWithVirtual)
            .on('mouseleave', () => onHoverHide?.());

          plotG.append('path').datum(pd).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 10).attr('d', lineFn)
            .style('pointer-events', 'stroke')
            .on('mouseenter', showWithVirtual)
            .on('mouseleave', () => onHoverHide?.());
        });
      });
    }

    if (pctList.length > 3) {
      const minP = pctList[0];
      const maxP = pctList[pctList.length - 1];
      const maxDist = Math.max(Math.abs(50 - minP), Math.abs(maxP - 50), 1);
      const bands = [];
      for (let i = 0; i < pctList.length - 1; i++) {
        const lowP = pctList[i];
        const highP = pctList[i + 1];
        const mid = (lowP + highP) / 2;
        const dist = Math.abs(mid - 50);
        bands.push({lowP, highP, dist, lowArr: percentilesMap[lowP] || [], highArr: percentilesMap[highP] || []});
      }
      bands.sort((a, b) => b.dist - a.dist);
      const minOpacity = 0.05;
      const maxOpacity = 0.70;
      bands.forEach(b => {
        const {lowArr, highArr, dist} = b;
        const area = d3.area().defined((d, i) => Number.isFinite(lowArr[i]) && Number.isFinite(highArr[i])).x((d, i) => xScale(dates[i])).y0((d, i) => yScale(lowArr[i])).y1((d, i) => yScale(highArr[i]));
        const normalized = Math.min(1, Math.max(0, dist / maxDist));
        const opacity = minOpacity + (1 - normalized) * (maxOpacity - minOpacity);
        plotG.append('path').datum(dates).attr('fill', '#777').attr('fill-opacity', Math.max(minOpacity, Math.min(maxOpacity, opacity))).attr('stroke', 'none').attr('d', area);
      });
    }

    if (pctList.includes(50)) {
      const arr = percentilesMap[50];
      plotG.append('path')
        .datum(arr.map((v, i) => ({date: dates[i], value: Number.isFinite(v) ? v : NaN})))
        .attr('fill', 'none')
        .attr('stroke', QUANTILE_COLORS.median)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4')
        .attr('stroke-linecap', 'round')
        .attr('d', d3.line().defined(d => Number.isFinite(d.value)).x(d => xScale(d.date)).y(d => yScale(d.value)));
    }

    const drawLineIf = (pct, color, widthPx = 3, dashed = false) => {
      const arr = percentilesMap[pct];
      if (!arr) return;
      const path = plotG.append('path')
        .datum(arr.map((v, i) => ({date: dates[i], value: Number.isFinite(v) ? v : NaN})))
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', widthPx)
        .attr('d', d3.line().defined(d => Number.isFinite(d.value)).x(d => xScale(d.date)).y(d => yScale(d.value)));
      if (dashed) path.attr('stroke-dasharray', '6 4');
    };
    if (options.mainQuantiles) {
      drawLineIf(90, QUANTILE_COLORS.p90, 3);
      drawLineIf(60, QUANTILE_COLORS.p60, 3);
      drawLineIf(20, QUANTILE_COLORS.p20, 3);
    }

    if (options.bestAnalogs && bestAnalogs?.items?.length) {
      const analogsArr = bestAnalogs.items;
      const analogDates = Array.isArray(bestAnalogs.dates) && bestAnalogs.dates.length ? bestAnalogs.dates : dates;
      const fmtDaily = d3.timeFormat('%d.%m.%Y');
      const fmtHourly = d3.timeFormat('%d.%m.%Y %Hh');
      const useHourlyFmt = !!bestAnalogs.hasAnalogHours;
      analogsArr.slice(0, Math.min(10, analogsArr.length)).forEach((a) => {
        const vals = a.values || [];
        if (vals.length === dates.length) {
          vals.forEach((v, i) => {
            if (!Number.isFinite(v)) return;
            const cx = xScale(analogDates[i]);
            const cy = yScale(v);
            const circle = plotG.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('stroke', ANALOG_MARKER_COLOR).attr('stroke-width', 1).attr('fill-opacity', 0);
            const dt = Array.isArray(a.datesByAnalog) ? a.datesByAnalog[i] : null;
            const dateText = (dt && !isNaN(dt)) ? (useHourlyFmt ? fmtHourly(dt) : fmtDaily(dt)) : '';
            const parts = [a.label || t('seriesModal.analog')];
            if (dateText) parts.push(dateText);
            const valText = Number.isFinite(v) ? String(v) : '';
            if (valText) parts.push(`${valText} mm`);
            const titleText = parts.join('\n');
            circle
              .on('mouseenter', function () {
                try {
                  const rect = this.getBoundingClientRect();
                  const virtualEl = { getBoundingClientRect: () => rect };
                  onHoverShow?.(virtualEl, titleText);
                } catch { /* ignore */ }
              })
              .on('mouseleave', () => onHoverHide?.());
          });
        }
      });
    }

    if (options.tenYearReturn && Number.isFinite(tenYearVal)) {
      plotG.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', yScale(tenYearVal)).attr('y2', yScale(tenYearVal)).attr('stroke', TEN_YEAR_COLOR).attr('stroke-width', 2);
      g.append('text').attr('x', innerW + 8).attr('y', yScale(tenYearVal)).attr('font-size', 11).attr('fill', TEN_YEAR_COLOR).attr('dominant-baseline', 'middle').attr('text-anchor', 'start').text('P10');
    }
    if (options.allReturnPeriods && rpPairs.length) {
      const rpMap = new Map();
      rpPairs.forEach(p => rpMap.set(Number(p.rp), p.val));
      const rpsToDraw = SELECTED_RPS.filter(rp => rpMap.has(rp));
      const rpsAsc = rpsToDraw.slice().sort((a, b) => a - b);
      const n = rpsAsc.length;
      rpsAsc.forEach((rp, idx) => {
        const val = rpMap.get(rp);
        const ratio = n > 1 ? (idx / (n - 1)) : 0;
        const gVal = Math.round(255 - ratio * 255);
        const clr = `rgb(255, ${gVal}, 0)`;
        plotG.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', yScale(val)).attr('y2', yScale(val)).attr('stroke', clr).attr('stroke-width', 2).attr('stroke-opacity', 0.95);
        g.append('text').attr('x', innerW + 8).attr('y', yScale(val)).attr('font-size', 11).attr('fill', clr).attr('dominant-baseline', 'middle').attr('text-anchor', 'start').text(`P${rp}`);
      });
    }

    if (activeDateObj) {
      const xPos = xScale(activeDateObj);
      if (Number.isFinite(xPos)) {
        plotG.append('line')
          .attr('class', 'forecast-date-line')
          .attr('x1', xPos)
          .attr('x2', xPos)
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', '#888')
          .attr('stroke-width', 5)
          .attr('stroke-opacity', 0.4)
          .append('title').text(activeDateObj.toISOString());
      }
    }

    const yAxisLabels = d3.axisLeft(yScale).ticks(Math.min(10, Math.max(3, Math.floor(innerH / 55)))).tickSize(0).tickPadding(8);
    const yAxisG = g.append('g').attr('class', 'y-axis').call(yAxisLabels);
    yAxisG.selectAll('path.domain').remove();
    g.selectAll('.y-axis text').attr('fill', '#555').attr('font-size', 11);
    if (innerH > 120) {
      g.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -margin.left + 14).attr('text-anchor', 'middle').attr('fill', '#444').attr('font-size', 12).text(t('seriesModal.precipitation'));
    }

    const domainStartDay = d3.timeDay.floor(startDomain);
    const domainEndDay = d3.timeDay.ceil(domainMax);
    const dayTicks = d3.timeDay.range(domainStartDay, d3.timeDay.offset(domainEndDay, 1));
    const tickValues = Array.from(new Set([...dates, ...dayTicks].map(d => +d))).sort((a, b) => a - b).map(ts => new Date(ts));
    const firstTimestamps = new Set(dayTicks.map(d => +d));
    const dateFmt = d3.timeFormat('%-d/%-m');
    const timeFmt = d3.timeFormat('');
    const xAxis = d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d => (firstTimestamps.has(+d) ? dateFmt(d) : timeFmt(d)));
    g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).selectAll('text').attr('fill', '#555').attr('font-size', 11).attr('text-anchor', 'middle');

    const legendItems = [];
    if (pctList.includes(50)) legendItems.push({label: t('seriesModal.median'), color: QUANTILE_COLORS.median, dashed: true});
    if (options.mainQuantiles) {
      legendItems.push({label: t('seriesModal.quantile90'), color: QUANTILE_COLORS.p90});
      legendItems.push({label: t('seriesModal.quantile60'), color: QUANTILE_COLORS.p60});
      legendItems.push({label: t('seriesModal.quantile20'), color: QUANTILE_COLORS.p20});
    }
    if (options.bestAnalogs) legendItems.push({label: t('seriesModal.bestAnalogs'), color: ANALOG_MARKER_COLOR, marker: true});

    const extraLegendGap = 40;
    const legendY = margin.top + innerH + extraLegendGap;
    const legendG = svg.append('g').attr('transform', `translate(${margin.left},${legendY})`);
    let curX = 0;
    const gapBetweenItems = 15;
    const approxCharWidth = 7;
    legendItems.forEach((item) => {
      const isMarker = !!item.marker;
      const color = item.color || '#000';
      const displayLabel = String(item.label || '');
      if (isMarker) {
        legendG.append('circle').attr('cx', curX + 8).attr('cy', 0).attr('r', 5).attr('fill', 'transparent').attr('stroke', color).attr('stroke-width', 1);
      } else {
        const strokeW = item.small ? 2 : 3;
        const lineEl = legendG.append('line').attr('x1', curX).attr('y1', 0).attr('x2', curX + 30).attr('y2', 0).attr('stroke', color).attr('stroke-width', strokeW).attr('stroke-linecap', 'round');
        if (item.dashed) lineEl.attr('stroke-dasharray', '6 4');
      }
      legendG.append('text').attr('x', curX + 36).attr('y', 0).attr('font-size', 12).attr('fill', '#333').attr('dominant-baseline', 'middle').text(displayLabel);
      const textWidth = Math.min(200, displayLabel.length * approxCharWidth);
      curX += 36 + textWidth + gapBetweenItems;
    });

    // Title: format run date only if valid
    const methodName = selectedMethodConfig?.method ? (selectedMethodConfig.method.name || selectedMethodConfig.method.id) : '';
    const runDateObjForTitle = activeForecastDate ? (parseForecastDate(activeForecastDate) || new Date(activeForecastDate)) : null;
    const hasValidRunDate = runDateObjForTitle instanceof Date && !isNaN(runDateObjForTitle);
    const runDateForTitle = hasValidRunDate ? d3.timeFormat('%Y-%m-%d')(runDateObjForTitle) : '';
    const titleParts = [];
    if (stationName) titleParts.push(stationName);
    if (methodName) titleParts.push(methodName);
    if (runDateForTitle) titleParts.push(runDateForTitle);
    const titleText = titleParts.join(' — ');
    const titleGap = 12;
    const titleY = Math.max(12, margin.top - titleGap);
    svg.append('text')
      .attr('x', margin.left + innerW / 2)
      .attr('y', titleY)
      .attr('text-anchor', 'middle')
      .attr('fill', '#222')
      .attr('font-size', 14)
      .attr('font-weight', 600)
      .text(titleText);

    return () => {
      // Only cleanup SVG; avoid calling parent state in cleanup to prevent update loops
      if (containerRef?.current) {
        d3.select(containerRef.current).selectAll('*').remove();
      }
    };
  }, [containerRef, t, dates, series, bestAnalogs, referenceValues, pastForecasts, options, activeForecastDate, selectedMethodConfig, stationName, onHoverShow, onHoverHide]);

  return null;
}

TimeSeriesChart.propTypes = {
  containerRef: PropTypes.shape({ current: PropTypes.any }),
  t: PropTypes.func.isRequired,
  series: PropTypes.object,
  bestAnalogs: PropTypes.object,
  referenceValues: PropTypes.object,
  pastForecasts: PropTypes.array,
  options: PropTypes.shape({
    mainQuantiles: PropTypes.bool,
    allQuantiles: PropTypes.bool,
    bestAnalogs: PropTypes.bool,
    tenYearReturn: PropTypes.bool,
    allReturnPeriods: PropTypes.bool,
    previousForecasts: PropTypes.bool,
  }).isRequired,
  activeForecastDate: PropTypes.any,
  selectedMethodConfig: PropTypes.object,
  stationName: PropTypes.string,
  onHoverShow: PropTypes.func,
  onHoverHide: PropTypes.func,
};
