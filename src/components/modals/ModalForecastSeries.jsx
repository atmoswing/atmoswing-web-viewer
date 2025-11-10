import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {Box, Checkbox, CircularProgress, FormControlLabel, FormGroup, Typography, Button, Menu, MenuItem} from '@mui/material';
import Popper from '@mui/material/Popper';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {useSelectedEntity, useMethods, useForecastSession, useEntities} from '../../contexts/ForecastsContext.jsx';
import {getSeriesValuesPercentiles, getRelevantEntities, getReferenceValues, getSeriesBestAnalogs, getSeriesValuesPercentilesHistory} from '../../services/api.js';
import {parseForecastDate} from '../../utils/forecastDateUtils.js';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { useCachedRequest } from '../../hooks/useCachedRequest.js';
import { SHORT_TTL, DEFAULT_TTL } from '../../utils/cacheTTLs.js';
import { normalizeReferenceValues, normalizeSeriesValuesPercentiles, normalizeSeriesBestAnalogs, normalizeSeriesValuesPercentilesHistory } from '../../utils/apiNormalization.js';

export default function ModalForecastSeries() {
     const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
     const {selectedMethodConfig, methodConfigTree} = useMethods();
     const {workspace, activeForecastDate} = useForecastSession();
     const {entities} = useEntities();
     const { t } = useTranslation();

    const [series, setSeries] = useState(null);
    // referenceValues stores { axis: number[], values: number[] } or null
    const [referenceValues, setReferenceValues] = useState(null);
    // bestAnalogs: { items: Array<{label, values: number[]}>, dates?: Date[] }
    const [bestAnalogs, setBestAnalogs] = useState(null);
    // previous forecasts history
    const [pastForecasts, setPastForecasts] = useState(null);

    // Sidebar state
    const [options, setOptions] = useState({
        mainQuantiles: true,
        allQuantiles: false,
        bestAnalogs: false,
        tenYearReturn: true,
        allReturnPeriods: false,
        previousForecasts: false,
    });

    // Percentile sets used for requests
    const DEFAULT_PCTS = [20, 60, 90];
    const FULL_PCTS = [0,10,20,30,40,50,60,70,80,90,100];
    const requestedPercentiles = useMemo(() => (options.allQuantiles ? FULL_PCTS : DEFAULT_PCTS), [options.allQuantiles]);

    const handleOptionChange = (key) => (e) => {
        const checked = e.target.checked;
        setOptions(o => {
            if (key === 'tenYearReturn') {
                // if enabling tenYearReturn, disable allReturnPeriods
                return {...o, tenYearReturn: checked, allReturnPeriods: checked ? false : o.allReturnPeriods};
            }
            if (key === 'allReturnPeriods') {
                // if enabling allReturnPeriods, disable tenYearReturn
                return {...o, allReturnPeriods: checked, tenYearReturn: checked ? false : o.tenYearReturn};
            }
            return {...o, [key]: checked};
        });
    };

    const chartRef = useRef(null);
    // Replace previous width-only state with width+height
    const [chartSize, setChartSize] = useState({width: 0, height: 0});
    // Tooltip state for best analogs (MUI Popper anchored to hovered D3 circle)
    const [analogTooltip, setAnalogTooltip] = useState({ open: false, anchorEl: null, title: '' });

    const [autoConfigId, setAutoConfigId] = useState(null);
    const [resolvingConfig, setResolvingConfig] = useState(false);
    const autoConfigCache = useRef(new Map()); // key: workspace|date|methodId|entityId -> configId

    // Effect to auto-determine config for selected entity if none chosen explicitly
    useEffect(() => {
        let cancelled = false;
        async function resolve() {
            // Reset previous auto config when dependencies change
            setAutoConfigId(null);
            setResolvingConfig(false);
            if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || selectedMethodConfig?.config || selectedEntityId == null) {
                // Explicit config selected or insufficient info; nothing to resolve
                return;
            }
            const methodNode = methodConfigTree.find(m => m.id === selectedMethodConfig.method.id);
            if (!methodNode || !methodNode.children?.length) { return; }
            const cacheKey = `${workspace}|${selectedMethodConfig.method.id}|${selectedEntityId}`;
            if (autoConfigCache.current.has(cacheKey)) {
                setAutoConfigId(autoConfigCache.current.get(cacheKey));
                return;
            }
            setResolvingConfig(true);
            // Try each config until entity is relevant
            for (const cfg of methodNode.children) {
                try {
                    const rel = await getRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, cfg.id);
                    if (cancelled) return;
                    if (Array.isArray(rel?.entities) && rel.entities.find(e => e.id === selectedEntityId)) {
                        autoConfigCache.current.set(cacheKey, cfg.id);
                        setAutoConfigId(cfg.id);
                        setResolvingConfig(false);
                        return;
                    }
                } catch {
                    if (cancelled) return; // ignore individual errors and continue
                }
            }
            // Fallback to first config if none matched
            const fallback = methodNode.children[0].id;
            autoConfigCache.current.set(cacheKey, fallback);
            if (!cancelled) {
                setAutoConfigId(fallback);
                setResolvingConfig(false);
            }
        }
        resolve();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate, selectedMethodConfig, selectedEntityId, methodConfigTree]);

    const resolvedConfigId = useMemo(() => {
        if (!selectedMethodConfig?.method) return null;
        if (selectedMethodConfig.config) return selectedMethodConfig.config.id; // user selection overrides
        if (resolvingConfig) return null; // delay until auto config determined
        if (autoConfigId) return autoConfigId;
        return null; // no config yet
    }, [selectedMethodConfig, autoConfigId, resolvingConfig]);

    // Clear series while waiting for config resolution to avoid flashing stale data
    useEffect(() => { setSeries(null); }, [resolvedConfigId, selectedEntityId, selectedMethodConfig, workspace, activeForecastDate]);

    // Series via useCachedRequest with normalization
    const seriesKey = useMemo(() => {
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
        const pctsKey = requestedPercentiles && requestedPercentiles.length ? requestedPercentiles.join(',') : '';
        return `series|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}|${pctsKey}`;
    }, [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, requestedPercentiles]);
    const { data: seriesData, loading, error } = useCachedRequest(
        seriesKey,
        async () => {
            const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId, requestedPercentiles);
            return normalizeSeriesValuesPercentiles(resp, parseForecastDate);
        },
        [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, requestedPercentiles],
        { enabled: !!seriesKey, initialData: null, ttlMs: SHORT_TTL }
    );
    useEffect(() => { setSeries(seriesData || null); }, [seriesData]);

    const stationName = useMemo(() => {
        if (selectedEntityId == null) return '';
        const match = entities?.find(e => e.id === selectedEntityId);
        return match?.name || match?.id || selectedEntityId;
    }, [selectedEntityId, entities]);

    useEffect(() => {
        const container = chartRef.current;
        if (!container) return;
        // hide tooltip when redrawing chart to avoid stale anchors
        setAnalogTooltip(prev => (prev.open ? { open: false, anchorEl: null, title: '' } : prev));
        d3.select(container).selectAll('*').remove();

        // Determine dates from series
        let dates = null;
        if (series && Array.isArray(series.dates) && series.dates.length) {
            dates = series.dates;
        }
        if (!dates || !dates.length) return; // nothing to plot along x-axis

        let {width, height} = chartSize;
        if (!width || width < 10) width = container.clientWidth || 600;
        if (!height || height < 50) {
            const parentH = container.parentElement?.clientHeight;
            height = (parentH && parentH > 200) ? parentH : 420;
        }

        // Build array of percentile series (sorted) from series if available
        const pctList = (series && Array.isArray(series.pctList)) ? series.pctList : [];
        const percentilesMap = (series && series.percentiles) ? series.percentiles : {};

        // build list of all numeric values for y-scaling
        const allValues = [];
        pctList.forEach(p => {
            const arr = percentilesMap[p] || [];
            arr.forEach(v => { if (typeof v === 'number' && isFinite(v)) allValues.push(v); });
        });
        // also include best-analogs values so markers are within y-scale
        if (options.bestAnalogs && bestAnalogs && Array.isArray(bestAnalogs.items)) {
            bestAnalogs.items.forEach(it => {
                if (Array.isArray(it.values)) {
                    it.values.forEach(v => { if (typeof v === 'number' && isFinite(v)) allValues.push(v); });
                }
            });
        }
        // Derive tenYearVal and include if requested
        let tenYearVal = null;
        if (referenceValues) {
            if (referenceValues.axis && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
                const idx = referenceValues.axis.findIndex(a => Number(a) === 10);
                if (idx >= 0) tenYearVal = referenceValues.values[idx];
            }
        }
        if (options.tenYearReturn && typeof tenYearVal === 'number' && isFinite(tenYearVal)) allValues.push(tenYearVal);
        // Include all return periods values if requested
        let rpPairs = [];
        if (referenceValues && Array.isArray(referenceValues.axis) && Array.isArray(referenceValues.values)) {
            rpPairs = referenceValues.axis.map((a, i) => ({ rp: Number(a), val: Number(referenceValues.values[i]) }))
                .filter(p => typeof p.val === 'number' && isFinite(p.val));
            if (options.allReturnPeriods) {
                rpPairs.forEach(p => allValues.push(p.val));
            }
        }
        // Ensure y-scale has at least one value; fallback to 1
        const yMax = allValues.length ? Math.max(...allValues) * 1.08 : 1;

        const dynamicWidth = Math.max(420, width);
        const dynamicHeight = Math.max(300, height);

        const margin = {top: 25, right: 40, bottom: 20, left: 56};
        // Reserve space for horizontal legend that will be drawn below the axis
        const legendReserve = 20 + 8; // legend height + gap
        // Prefer to fit SVG into the chart container's clientHeight to avoid scrollbars
        const containerH = container.clientHeight || dynamicHeight + legendReserve + margin.top + margin.bottom;
        // Compute svgHeight so it does not exceed container height; allow minimal plot area when container is small
        const svgHeight = Math.max(300, Math.min(dynamicHeight + legendReserve, containerH));
        // Compute inner plot height available after reserving margins and legend area
        const innerH = Math.max(60, svgHeight - margin.top - margin.bottom - legendReserve);
        const innerW = Math.max(10, dynamicWidth - margin.left - margin.right);

        // Reserve a small area on the right so RP labels (e.g. P10) can be drawn without being clipped.
        const rightLabelReserve = 40;
        const containerW = container.clientWidth || dynamicWidth + rightLabelReserve;
        const svgWidth = Math.max(420, Math.min(dynamicWidth + rightLabelReserve, containerW));

        const svg = d3.select(container)
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .attr('role', 'img')
            .attr('aria-label', t('seriesModal.seriesAriaLabel'));

        svg.append('rect').attr('x',0).attr('y',0).attr('width',svgWidth).attr('height',svgHeight).attr('fill','#fff');

        // Compute x-domain from the primary dates only (series or bestAnalogs). Do NOT include pastForecasts
        const maxX = d3.max(dates);
        // Limit the start of the plot to 2 days before the active forecast date, but do NOT expand domain for past forecasts
        const activeDateObj = (activeForecastDate ? (parseForecastDate(activeForecastDate) || new Date(activeForecastDate)) : null);
        const twoDaysBefore = activeDateObj ? new Date(activeDateObj.getTime() - 2 * 24 * 3600 * 1000) : null;
        const minX = d3.min(dates);
        const startDomain = (twoDaysBefore && minX) ? (twoDaysBefore < minX ? twoDaysBefore : minX) : (twoDaysBefore || minX);

        // Add a small right-side margin so last markers/points are not clipped by the plot edge
        let stepMs = 0;
        if (dates && dates.length >= 2) {
            const diffs = [];
            for (let i = 1; i < dates.length; i++) {
                const a = dates[i - 1];
                const b = dates[i];
                if (a && b && !isNaN(a) && !isNaN(b)) {
                    const d = +b - +a;
                    if (d > 0) diffs.push(d);
                }
            }
            if (diffs.length) {
                diffs.sort((a,b) => a - b);
                stepMs = diffs[Math.floor(diffs.length / 2)]; // median step
            }
        }
        if (!stepMs) {
            // Default to 6h if sub-daily likely; otherwise 24h. Use conservative 12h as a safe small margin.
            stepMs = 12 * 3600 * 1000;
        }
        const rightPadMs = Math.max(stepMs * 0.1, 3600 * 1000);
        const domainMax = (maxX || d3.max(dates)) ? new Date((maxX || d3.max(dates)).getTime() + rightPadMs) : maxX;

        const xScale = d3.scaleTime().domain([startDomain, domainMax]).range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        // Quantile colors used for main and historical traces
        const COLORS = {p90: '#0b2e8a', p60: '#1d53d2', p20: '#04b4e6'};
        const TENYR_COLOR = '#d00000';

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Create a clip path so anything outside the plotting area (e.g. prior forecasts before the x-domain start) is hidden
        const clipId = `plot-clip-${Math.random().toString(36).slice(2,9)}`;
        svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH);

        // Create y-axis grid (lines only) BEFORE the clipped plot group so horizontal grid lines render underneath plotted content
        const yAxisGrid = d3.axisLeft(yScale)
            .ticks(Math.min(10, Math.max(3, Math.floor(innerH / 55))))
            .tickSize(-innerW)
            .tickFormat('')
            .tickPadding(8);
        const yAxisGridG = g.append('g').attr('class', 'y-axis-grid').call(yAxisGrid);
        yAxisGridG.selectAll('line').attr('stroke', '#ccc').attr('stroke-opacity', 0.9);
        yAxisGridG.selectAll('path.domain').remove(); // remove domain line if present

        // Create the clipped plot group; drawables inside here will appear above the grid lines
        const plotG = g.append('g').attr('class', 'plot-area').attr('clip-path', `url(#${clipId})`);

        // Draw previous forecasts into the clipped plot group (they will be clipped at the left/right of the x domain)
        if (options.previousForecasts && pastForecasts && Array.isArray(pastForecasts) && pastForecasts.length) {
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
                    const lineFn = d3.line()
                        .defined((d,i) => typeof arr[i] === 'number')
                        .x((d,i) => xScale(pd[i]))
                        .y((d,i) => yScale(arr[i]));
                    const color = pct === 90 ? COLORS.p90 : (pct === 60 ? COLORS.p60 : COLORS.p20);
                    const qLabel = (pct === 90) ? t('seriesModal.quantile90') : (pct === 60) ? t('seriesModal.quantile60') : (pct === 20) ? t('seriesModal.quantile20') : `Q${pct}`;
                    const titleText = runDateStr ? `Run ${runDateStr} — ${qLabel}` : qLabel;

                    // Visible historical line
                    plotG.append('path')
                        .datum(pd)
                        .attr('fill', 'none')
                        .attr('stroke', color)
                        .attr('stroke-width', HIST_WIDTH)
                        .attr('stroke-opacity', HIST_ALPHA)
                        .attr('d', lineFn)
                        .style('pointer-events', 'stroke')
                        .on('mouseenter', function() {
                            setAnalogTooltip({ open: true, anchorEl: this, title: titleText });
                        })
                        .on('mouseleave', () => setAnalogTooltip(prev => ({ ...prev, open: false })));

                    // Invisible, thicker hit area for better hover target
                    plotG.append('path')
                        .datum(pd)
                        .attr('fill', 'none')
                        .attr('stroke', 'transparent')
                        .attr('stroke-width', 10)
                        .attr('d', lineFn)
                        .style('pointer-events', 'stroke')
                        .on('mouseenter', function() {
                            setAnalogTooltip({ open: true, anchorEl: this, title: titleText });
                        })
                        .on('mouseleave', () => setAnalogTooltip(prev => ({ ...prev, open: false })));
                });
            });
        }

        // Draw shaded bands between adjacent percentiles (light to darker towards center) into clipped plot area
        if (pctList.length > 3) {
            const minP = pctList[0];
            const maxP = pctList[pctList.length - 1];
            const maxDist = Math.max(Math.abs(50 - minP), Math.abs(maxP - 50), 1);
            const bands = [];
            for (let i = 0; i < pctList.length - 1; i++) {
                const lowP = pctList[i];
                const highP = pctList[i+1];
                const mid = (lowP + highP) / 2;
                const dist = Math.abs(mid - 50);
                bands.push({lowP, highP, dist, lowArr: percentilesMap[lowP] || [], highArr: percentilesMap[highP] || []});
            }
            bands.sort((a,b) => b.dist - a.dist);
            const minOpacity = 0.05;
            const maxOpacity = 0.70;
            bands.forEach(b => {
                const {lowArr, highArr, dist} = b;
                const area = d3.area()
                    .defined((d,i) => typeof lowArr[i] === 'number' && typeof highArr[i] === 'number')
                    .x((d,i) => xScale(dates[i]))
                    .y0((d,i) => yScale(lowArr[i]))
                    .y1((d,i) => yScale(highArr[i]));
                const normalized = Math.min(1, Math.max(0, dist / maxDist));
                const opacity = minOpacity + (1 - normalized) * (maxOpacity - minOpacity);
                plotG.append('path')
                    .datum(dates)
                    .attr('fill', '#777')
                    .attr('fill-opacity', Math.max(minOpacity, Math.min(maxOpacity, opacity)))
                    .attr('stroke', 'none')
                    .attr('d', area);
            });
        }

        // Draw median (50%) as a dark dashed line when present
        const MEDIAN_COLOR = '#222';
        if (pctList.includes(50)) {
            const arr = percentilesMap[50];
            plotG.append('path').datum(arr.map((v,i) => ({date: dates[i], value: typeof v === 'number' ? v : NaN})))
                .attr('fill', 'none')
                .attr('stroke', MEDIAN_COLOR)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6 4')
                .attr('stroke-linecap', 'round')
                .attr('d', d3.line().defined(d => typeof d.value === 'number').x(d => xScale(d.date)).y(d => yScale(d.value)));
        }

        // Draw colored quantile lines if present (90/60/20) and if the option is enabled
        const drawLineIf = (pct, color, widthPx=3, opts = {}) => {
            const arr = percentilesMap[pct];
            if (!arr) return;
            const path = plotG.append('path').datum(arr.map((v,i) => ({date: dates[i], value: typeof v === 'number' ? v : NaN})))
                .attr('fill', 'none').attr('stroke', color).attr('stroke-width', widthPx)
                .attr('d', d3.line().defined(d => typeof d.value === 'number').x(d => xScale(d.date)).y(d => yScale(d.value)));
            if (opts.dashed) path.attr('stroke-dasharray', opts.dashPattern || '6 4');
        };
        if (options.mainQuantiles) {
            drawLineIf(90, COLORS.p90, 3);
            drawLineIf(60, COLORS.p60, 3);
            drawLineIf(20, COLORS.p20, 3);
        }

        // Draw markers for best analogs (if present)
        if (options.bestAnalogs && bestAnalogs && Array.isArray(bestAnalogs.items) && bestAnalogs.items.length) {
            const analogsArr = bestAnalogs.items;
            const analogDates = Array.isArray(bestAnalogs.dates) && bestAnalogs.dates.length ? bestAnalogs.dates : dates;
            if (!Array.isArray(analogDates) || !analogDates.length) {
                // nothing to align to
            } else {
                const MARKER_COLOR = '#ff6600';
                const maxToShow = Math.min(10, analogsArr.length);
                const fmtDaily = d3.timeFormat('%d.%m.%Y');
                const fmtHourly = d3.timeFormat('%d.%m.%Y %Hh');
                const useHourlyFmt = !!bestAnalogs.hasAnalogHours;
                analogsArr.slice(0, maxToShow).forEach((a) => {
                     const vals = a.values || [];
                    if (vals.length === dates.length) {
                        vals.forEach((v, i) => {
                            if (typeof v !== 'number' || !isFinite(v)) return;
                            const cx = xScale(analogDates[i]);
                            const cy = yScale(v);
                            const circle = plotG.append('circle')
                                .attr('cx', cx)
                                .attr('cy', cy)
                                .attr('r', 5)
                                .attr('stroke', MARKER_COLOR)
                                .attr('stroke-width', 1)
                                .attr('fill-opacity', 0);
                            const dt = Array.isArray(a.datesByAnalog) ? a.datesByAnalog[i] : null;
                            const dateText = (dt && !isNaN(dt)) ? (useHourlyFmt ? fmtHourly(dt) : fmtDaily(dt)) : '';
                            // Use MUI Popper tooltip instead of native <title>
                            circle
                                .on('mouseenter', function() {
                                    const valText = (typeof v === 'number' && isFinite(v)) ? String(v) : '';
                                    const parts = [a.label || t('seriesModal.analog')];
                                    if (dateText) parts.push(dateText);
                                    if (valText) parts.push(`${valText} mm`);
                                    setAnalogTooltip({open: true, anchorEl: this, title: parts.join('\n')});
                                })
                                .on('mouseleave', () => setAnalogTooltip(prev => ({...prev, open: false})));
                        });
                    }
                });
            }
         }

        // Draw reference lines: 10-year (prominent) and optionally all return periods (subtle)
        // Draw return-period lines and label them on the right edge (outside the clipped plot) so labels are always visible
        if (options.tenYearReturn && typeof tenYearVal === 'number' && isFinite(tenYearVal)) {
            plotG.append('line')
                .attr('x1', 0)
                .attr('x2', innerW)
                .attr('y1', yScale(tenYearVal))
                .attr('y2', yScale(tenYearVal))
                .attr('stroke', TENYR_COLOR)
                .attr('stroke-width', 2);
            // label P10 on the right of the plot (use non-clipped group so text isn't clipped)
            g.append('text')
                .attr('x', innerW + 8)
                .attr('y', yScale(tenYearVal))
                .attr('font-size', 11)
                .attr('fill', TENYR_COLOR)
                .attr('dominant-baseline', 'middle')
                .attr('text-anchor', 'start')
                .text('P10');
        }
        const SELECTED_RPS = [100, 50, 20, 10, 5, 2];
        if (options.allReturnPeriods && rpPairs.length) {
            const rpMap = new Map();
            rpPairs.forEach(p => rpMap.set(Number(p.rp), p.val));
            const rpsToDraw = SELECTED_RPS.filter(rp => rpMap.has(rp)).slice();
            const rpsAsc = rpsToDraw.slice().sort((a,b) => a - b);
            const n = rpsAsc.length;
            rpsAsc.forEach((rp, idx) => {
                const val = rpMap.has(rp) ? rpMap.get(rp) : null;
                if (val == null || !isFinite(val)) return;
                const ratio = n > 1 ? (idx / (n - 1)) : 0;
                const gVal = Math.round(255 - ratio * 255);
                const clr = `rgb(255, ${gVal}, 0)`;
                plotG.append('line')
                    .attr('x1', 0)
                    .attr('x2', innerW)
                    .attr('y1', yScale(val))
                    .attr('y2', yScale(val))
                    .attr('stroke', clr)
                    .attr('stroke-width', 2)
                    .attr('stroke-opacity', 0.95);
                // label RP at the right edge (outside clipped plot)
                g.append('text')
                    .attr('x', innerW + 8)
                    .attr('y', yScale(val))
                    .attr('font-size', 11)
                    .attr('fill', clr)
                    .attr('dominant-baseline', 'middle')
                    .attr('text-anchor', 'start')
                    .text(`P${rp}`);
            });
        }

        // Draw vertical line at the active forecast date (prominent gray line) in the clipped plot area
        if (activeDateObj) {
            try {
                const xPos = xScale(activeDateObj);
                if (typeof xPos === 'number' && isFinite(xPos)) {
                    plotG.append('line')
                        .attr('class', 'forecast-date-line')
                        .attr('x1', xPos)
                        .attr('x2', xPos)
                        .attr('y1', 0)
                        .attr('y2', innerH)
                        .attr('stroke', '#888')
                        .attr('stroke-width', 5)
                        .attr('stroke-opacity', 0.4)
                        .append('title').text((activeDateObj && typeof activeDateObj.toISOString === 'function') ? activeDateObj.toISOString() : String(activeDateObj));
                }
            } catch {
                // ignore
            }
        }

        // Create and render y/x axes (labels only) so tick text remains visible above the plot
        // Render y-axis labels (no grid lines) after the plot so text is not occluded
        const yAxisLabels = d3.axisLeft(yScale).ticks(Math.min(10, Math.max(3, Math.floor(innerH / 55)))).tickSize(0).tickPadding(8);
        const yAxisG = g.append('g').attr('class', 'y-axis').call(yAxisLabels);
        yAxisG.selectAll('path.domain').remove(); // remove domain line
        g.selectAll('.y-axis text').attr('fill', '#555').attr('font-size', 11);
        if (innerH > 120) {
            g.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -innerH / 2)
                .attr('y', -margin.left + 14)
                .attr('text-anchor', 'middle')
                .attr('fill', '#444')
                .attr('font-size', 12)
                .text(t('seriesModal.precipitation'));
        }

        // Force ticks at every lead time (use tickValues) and format so the first tick per day shows the date and subsequent ticks show the time
        // Build daily ticks spanning from the (possibly extended) domain start to the end, to include days before the run date
        const domainStartDay = d3.timeDay.floor(startDomain);
        const domainEndDay = d3.timeDay.ceil(domainMax);
        const dayTicks = d3.timeDay.range(domainStartDay, d3.timeDay.offset(domainEndDay, 1));

        // Keep ticks for each forecast lead time too
        const tickValues = Array.from(new Set([...dates, ...dayTicks].map(d => +d))).sort((a,b) => a - b).map(ts => new Date(ts));

        // Mark the first tick of each day for labeling with the date
        const firstTimestamps = new Set(dayTicks.map(d => +d));
        const dateFmt = d3.timeFormat('%-d/%-m');
        const timeFmt = d3.timeFormat(''); // keep time labels hidden for intermediate ticks
        const xAxis = d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d => (firstTimestamps.has(+d) ? dateFmt(d) : timeFmt(d)));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).selectAll('text').attr('fill', '#555').attr('font-size', 11).attr('text-anchor', 'middle');

        // Horizontal, boxless legend rendered inside the SVG below the axis (no RP entries here).
        // Move it further down so it doesn't overlap the x-axis tick labels (dates).
        const legendItems = [];
        if (pctList.includes(50)) legendItems.push({label: t('seriesModal.median'), color: MEDIAN_COLOR, dashed: true});
        if (options.mainQuantiles) {
            legendItems.push({label: t('seriesModal.quantile90'), color: COLORS.p90});
            legendItems.push({label: t('seriesModal.quantile60'), color: COLORS.p60});
            legendItems.push({label: t('seriesModal.quantile20'), color: COLORS.p20});
        }
        if (options.bestAnalogs) legendItems.push({label: t('seriesModal.bestAnalogs'), color: '#ff6600', marker: true});

        // Layout parameters
        const extraLegendGap = 40; // vertical offset from axis to legend to avoid overlapping dates
        const legendY = margin.top + innerH + extraLegendGap;
        const legendG = svg.append('g').attr('transform', `translate(${margin.left},${legendY})`);
        let curX = 0;
        const gapBetweenItems = 15;
        const approxCharWidth = 7; // crude estimate for label width in px
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

        // place title centered above the plot area
        // Build title text from entity name, method name and run date
        const methodName = (selectedMethodConfig && selectedMethodConfig.method && (selectedMethodConfig.method.name || selectedMethodConfig.method.id)) ? (selectedMethodConfig.method.name || selectedMethodConfig.method.id) : '';
        const runDateObjForTitle = activeForecastDate ? (parseForecastDate(activeForecastDate) || new Date(activeForecastDate)) : null;
        const runDateForTitle = runDateObjForTitle ? d3.timeFormat('%Y-%m-%d')(runDateObjForTitle) : '';
        const titleParts = [];
        if (stationName) titleParts.push(stationName);
        if (methodName) titleParts.push(methodName);
        if (runDateForTitle) titleParts.push(runDateForTitle);
        const titleText = titleParts.join(' — ');
        const titleGap = 12; // pixels between title baseline and top of plot area
        const titleY = Math.max(12, margin.top - titleGap);
        svg.append('text')
            .attr('x', margin.left + innerW / 2)
            .attr('y', titleY)
            .attr('text-anchor', 'middle')
            .attr('fill', '#222')
            .attr('font-size', 14)
            .attr('font-weight', 600)
            .text(titleText);
    }, [t, series, options.mainQuantiles, options.tenYearReturn, referenceValues, chartSize.width, chartSize.height, options.allReturnPeriods, options.allQuantiles, options.bestAnalogs, bestAnalogs, pastForecasts, options.previousForecasts, activeForecastDate]);

    const handleClose = () => setSelectedEntityId(null);

    // Observe size changes of chart container for responsive width
    useEffect(() => {
        const el = chartRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const {width, height} = entry.contentRect;
                setChartSize(prev => (prev.width !== width || prev.height !== height ? {width, height} : prev));
            }
        });
        ro.observe(el);
        // initialize once
        const rect = el.getBoundingClientRect();
        setChartSize(prev => (prev.width !== rect.width || prev.height !== rect.height ? {width: rect.width, height: rect.height} : prev));
        return () => ro.disconnect();
    }, [selectedEntityId]);

    // Also re-evaluate on window resize (helps when container layout changes without direct element resize events)
    useEffect(() => {
        let timer = null;
        const onResize = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const el = chartRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                setChartSize(prev => (prev.width !== rect.width || prev.height !== rect.height) ? {width: rect.width, height: rect.height} : prev);
            }, 120);
        };
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); if (timer) clearTimeout(timer); };
    }, []);

    // Reference values via cached request
    const referenceKey = useMemo(() => {
        if (!(options.tenYearReturn || options.allReturnPeriods)) return null;
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
        return `series_ref|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
    }, [options.tenYearReturn, options.allReturnPeriods, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);
    const { data: refData } = useCachedRequest(
        referenceKey,
        async () => {
            const resp = await getReferenceValues(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
            return normalizeReferenceValues(resp);
        },
        [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, options.tenYearReturn, options.allReturnPeriods],
        { enabled: !!referenceKey, initialData: null, ttlMs: DEFAULT_TTL }
    );
    useEffect(() => { setReferenceValues(refData || null); }, [refData]);

    // Best analogs via cached request (still local cache unnecessary, but keep for session reuse if needed)
    const bestAnalogsKey = useMemo(() => {
        if (!options.bestAnalogs) return null;
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
        return `series_bestanalogs|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
    }, [options.bestAnalogs, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);
    const { data: bestAnalogsData } = useCachedRequest(
        bestAnalogsKey,
        async () => {
            const resp = await getSeriesBestAnalogs(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
            const parsed = normalizeSeriesBestAnalogs(resp, parseForecastDate);
            if (parsed && Array.isArray(parsed.items)) {
                // add labels for display consistency
                parsed.items = parsed.items.map((it, idx) => ({ label: t('seriesModal.analogWithIndex', {index: idx+1}), ...it }));
            }
            return parsed;
        },
        [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, t],
        { enabled: !!bestAnalogsKey, initialData: null, ttlMs: SHORT_TTL }
    );
    useEffect(() => { setBestAnalogs(bestAnalogsData || null); }, [bestAnalogsData]);

    // Previous forecasts history via cached request
    const pastKey = useMemo(() => {
        if (!options.previousForecasts) return null;
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
        return `series_history|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
    }, [options.previousForecasts, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);
    const { data: pastData } = useCachedRequest(
        pastKey,
        async () => {
            const resp = await getSeriesValuesPercentilesHistory(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
            return normalizeSeriesValuesPercentilesHistory(resp, parseForecastDate);
        },
        [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId],
        { enabled: !!pastKey, initialData: null, ttlMs: DEFAULT_TTL }
    );
    useEffect(() => { setPastForecasts(pastData || null); }, [pastData]);

    // Export menu state
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const openExportMenu = (e) => setExportAnchorEl(e.currentTarget);
    const closeExportMenu = () => setExportAnchorEl(null);

    // Helper: find first SVG node inside chartRef
    const findChartSVG = () => {
        const el = chartRef.current;
        if (!el) return null;
        return el.querySelector('svg');
    };

    // Make a string safe for use as a filename: remove/replace characters disallowed in filenames
    const safeForFilename = (s) => {
        if (!s) return 'unknown';
        let out = String(s)
            .normalize('NFKD')
            .replace(' - ', '_')
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_');
        // Replace control characters (char codes < 32) without using control-char regex
        out = Array.from(out).map(ch => (ch.charCodeAt(0) < 32 ? '_' : ch)).join('');
        return out.replace(/^_+|_+$/g, '');
    };

    // Build export filename prefix like YYYY-MM-DD_Entity_MethodId
    const buildExportFilenamePrefix = () => {
        let datePart = '';
        if (activeForecastDate) {
            try {
                const d = parseForecastDate(activeForecastDate) || new Date(activeForecastDate);
                if (d && !isNaN(d)) datePart = d3.timeFormat('%Y-%m-%d')(d);
            } catch { /* ignore */ }
        }
        const entityPart = safeForFilename(stationName || selectedEntityId || 'entity');
        const methodIdPart = selectedMethodConfig && selectedMethodConfig.method ? String(selectedMethodConfig.method.id || selectedMethodConfig.method.name || 'method') : 'method';
        const safeMethod = safeForFilename(methodIdPart);
        return [datePart, entityPart, safeMethod].filter(p => p).join('_');
    };

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // Inline computed styles into a cloned SVG so exported SVG/PDF matches on-screen appearance
    const inlineAllStyles = (svg) => {
        const recurse = (el) => {
            if (!(el instanceof Element)) return;
            try {
                const cs = getComputedStyle(el);
                const styleProps = ['fill','stroke','stroke-width','stroke-opacity','fill-opacity','font-size','font-family','font-weight','opacity','text-anchor','stroke-linecap','stroke-linejoin','stroke-dasharray','background','background-color'];
                let inline = '';
                styleProps.forEach(p => {
                    const v = cs.getPropertyValue(p);
                    if (v) inline += `${p}:${v};`;
                });
                if (inline) {
                    const prev = el.getAttribute('style') || '';
                    el.setAttribute('style', prev + inline);
                }
            } catch {
                // ignore
            }
            for (let i = 0; i < el.children.length; i++) recurse(el.children[i]);
        };
        recurse(svg);
    };

    // Helper to compute intrinsic SVG width/height in pixels
    const getSVGSize = (svg) => {
        const widthAttr = svg.getAttribute('width');
        const heightAttr = svg.getAttribute('height');
        const viewBoxAttr = svg.getAttribute('viewBox');
        if (widthAttr && heightAttr) {
            const w = parseFloat(widthAttr);
            const h = parseFloat(heightAttr);
            if (Number.isFinite(w) && Number.isFinite(h)) return {width: w, height: h};
        }
        if (viewBoxAttr) {
            const parts = viewBoxAttr.split(/[\s,]+/).map(Number);
            if (parts.length === 4 && parts.every(Number.isFinite)) return {width: parts[2], height: parts[3]};
        }
        // fallback to bounding client rect
        return {width: svg.clientWidth || 800, height: svg.clientHeight || 600};
    };

    // Utility: append clone to offscreen container, inline styles, and optionally return serialized string
    const withTemporaryContainer = (clone, cb) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '0';
        container.style.height = '0';
        container.appendChild(clone);
        document.body.appendChild(container);
        try {
            try { inlineAllStyles(clone); } catch { /* ignore */ }
            return cb && cb();
        } finally {
            document.body.removeChild(container);
        }
    };

    // Export SVG as .svg file (append clone to DOM so computed styles are captured)
    const exportSVG = () => {
        const svg = findChartSVG();
        if (!svg) return;
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const serializer = new XMLSerializer();
        withTemporaryContainer(clone, () => {
            const svgStr = serializer.serializeToString(clone);
            const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
            const prefix = buildExportFilenamePrefix() || 'series';
            const filename = `${prefix}.svg`;
            downloadBlob(blob, filename);
        });
        closeExportMenu();
    };

    // Export PNG (render SVG into canvas then to blob) with higher resolution
    const exportPNG = async () => {
        const svg = findChartSVG();
        if (!svg) return;
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const {width, height} = getSVGSize(clone);
        const serializer = new XMLSerializer();
        let svgStr;
        withTemporaryContainer(clone, () => {
            svgStr = serializer.serializeToString(clone);
        });
        const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
            const scale = 3;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const prefix = buildExportFilenamePrefix() || 'series';
            const filename = `${prefix}.png`;
            downloadBlob(blob, filename);
        } catch (e) {
            console.error('Export PNG failed', e);
        } finally {
            URL.revokeObjectURL(url);
            closeExportMenu();
        }
    };

    // Export PDF as vector using svg2pdf.js + jsPDF; append clone to DOM and inline styles
    const exportPDF = async () => {
        const svg = findChartSVG();
        if (!svg) return;
        let jsPDFLib, svg2pdfModule;
        try {
            jsPDFLib = await import('jspdf');
            svg2pdfModule = await import('svg2pdf.js');
        } catch (e) {
            console.error('Failed to load PDF libraries', e);
            closeExportMenu();
            return;
        }
        const jsPDF = jsPDFLib.jsPDF || jsPDFLib.default || jsPDFLib;
        const svg2pdf = svg2pdfModule.svg2pdf || svg2pdfModule.default || svg2pdfModule;
        if (!jsPDF || !svg2pdf) {
            console.error('PDF libraries did not provide expected exports', {jsPDF, svg2pdf});
            closeExportMenu();
            return;
        }
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.appendChild(clone);
        document.body.appendChild(container);
        try {
            try { inlineAllStyles(clone); } catch { /* ignore */ }
            let {width: svgW, height: svgH} = getSVGSize(clone);
            try {
                const bbox = clone.getBBox();
                if (bbox && Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
                    const pad = 2;
                    svgW = bbox.width + pad * 2;
                    svgH = bbox.height + pad * 2;
                    clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${svgW} ${svgH}`);
                } else {
                    clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
                }
            } catch {
                clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
            }
            clone.setAttribute('width', String(Math.round(svgW)));
            clone.setAttribute('height', String(Math.round(svgH)));
            const pdfWidth = Math.round(svgW);
            const pdfHeight = Math.round(svgH);
            const pdf = new jsPDF({unit: 'px', format: [pdfWidth, pdfHeight], orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait'});
            await svg2pdf(clone, pdf, {x:0, y:0, width: pdfWidth, height: pdfHeight});
            const prefix = buildExportFilenamePrefix() || 'series';
            const filename = `${prefix}.pdf`;
            pdf.save(filename);
        } catch (e) {
            console.error('Export PDF (vector) failed', e);
        } finally {
            document.body.removeChild(container);
            closeExportMenu();
        }
    };

    return (
        <Dialog open={selectedEntityId != null} onClose={handleClose} maxWidth={false} fullWidth
                sx={{'& .MuiPaper-root': {width:'90vw', maxWidth:'1000px', height:'50vh', minHeight:'460px', maxHeight:'90vh', display:'flex', flexDirection:'column'}}}>
            <DialogTitle sx={{pr: 5}}>
                {stationName ? `${stationName}` : ''}
                <IconButton aria-label={t('seriesModal.close')} onClick={handleClose} size="small"
                            sx={{position: 'absolute', right: 8, top: 8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{display:'flex', flexDirection:'row', gap:2, alignItems:'stretch', flex:1, minHeight:0}}>
                {selectedEntityId && (
                    <Box sx={{width: 220, flexShrink:0, borderRight:'1px solid #e0e0e0', pr:1, overflowY:'auto'}}>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox size="small" checked={options.mainQuantiles} onChange={handleOptionChange('mainQuantiles')} />} label={<Typography variant="body2">{t('seriesModal.mainQuantiles')}</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allQuantiles} onChange={handleOptionChange('allQuantiles')} />} label={<Typography variant="body2">{t('seriesModal.allQuantiles')}</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.bestAnalogs} onChange={handleOptionChange('bestAnalogs')} />} label={<Typography variant="body2">{t('seriesModal.bestAnalogs')}</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.tenYearReturn} onChange={handleOptionChange('tenYearReturn')} />} label={<Typography variant="body2">{t('seriesModal.tenYearReturn')}</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allReturnPeriods} onChange={handleOptionChange('allReturnPeriods')} />} label={<Typography variant="body2">{t('seriesModal.allReturnPeriods')}</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.previousForecasts} onChange={handleOptionChange('previousForecasts')} />} label={<Typography variant="body2">{t('seriesModal.previousForecasts')}</Typography>} />
                        </FormGroup>
                       {/* Export button under the menu */}
                       <Box sx={{display:'flex', justifyContent:'center', mt:1}}>
                           <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={openExportMenu} aria-controls={exportAnchorEl ? 'export-menu' : undefined} aria-haspopup="true">
                               {t('seriesModal.export')}
                           </Button>
                           <Menu id="export-menu" anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={closeExportMenu} anchorOrigin={{vertical:'bottom', horizontal:'left'}}>
                               <MenuItem onClick={exportPNG}>PNG</MenuItem>
                               <MenuItem onClick={exportSVG}>SVG</MenuItem>
                               <MenuItem onClick={exportPDF}>PDF</MenuItem>
                           </Menu>
                       </Box>
                     </Box>
                 )}
                <Box sx={{flex:1, minWidth:0, display:'flex', position:'relative', alignItems:'center', justifyContent:'center'}}>
                    {!selectedEntityId && <div style={{fontSize:13}}>{t('seriesModal.selectStation')}</div>}
                    {selectedEntityId && (loading || resolvingConfig) && (
                        <Box sx={{display:'flex', flexDirection:'column', alignItems:'center', gap:1}}>
                            <CircularProgress size={28} />
                            <Typography variant="caption" sx={{color:'#555'}}>{resolvingConfig ? t('seriesModal.resolvingConfig') : t('seriesModal.loadingSeries')}</Typography>
                        </Box>
                    )}
                    {selectedEntityId && error && !loading && !resolvingConfig && <div style={{fontSize:13, color:'#b00020'}}>{t('seriesModal.errorLoadingSeries')}</div>}
                    {selectedEntityId && !loading && !resolvingConfig && !error && (series || (options.bestAnalogs && bestAnalogs)) && (
                        <div ref={chartRef} style={{position:'relative', width:'100%', height:'100%', flex:1, minHeight:360}} />
                    )}
                    {selectedEntityId && !loading && !resolvingConfig && !error && !series && !(options.bestAnalogs && bestAnalogs) && resolvedConfigId && <div style={{fontSize:13}}>{t('seriesModal.noDataForStation')}</div>}
                </Box>
            </DialogContent>
            {/* MUI Popper tooltip for best analogs */}
            <Popper
                open={analogTooltip.open}
                anchorEl={analogTooltip.anchorEl}
                placement="top"
                modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
                sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
            >
                <Box sx={{
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    boxShadow: 3,
                    fontSize: 12,
                    maxWidth: 320,
                    whiteSpace: 'pre-line'
                }}>
                    {analogTooltip.title}
                </Box>
            </Popper>
        </Dialog>
    );
}

