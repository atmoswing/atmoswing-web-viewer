import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {Box, Checkbox, CircularProgress, FormControlLabel, FormGroup, Typography} from '@mui/material';
import {useSelectedEntity, useMethods, useForecastSession, useEntities} from '../contexts/ForecastsContext.jsx';
import {getSeriesValuesPercentiles, getRelevantEntities, getReferenceValues, getSeriesBestAnalogs, getSeriesValuesPercentilesHistory} from '../services/api.js';
import {parseForecastDate} from '../utils/forecastDateUtils.js';
import * as d3 from 'd3';

// Local cache to avoid refetching same series repeatedly during session
const seriesCache = new Map();

export default function ForecastSeriesModal() {
    const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
    const {selectedMethodConfig, methodConfigTree} = useMethods();
    const {workspace, activeForecastDate} = useForecastSession();
    const {entities} = useEntities();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [series, setSeries] = useState(null);
    // referenceValues stores { axis: number[], values: number[] } or null
    const [referenceValues, setReferenceValues] = useState(null);
    // bestAnalogs: { items: Array<{label, values: number[]}>, dates?: Date[] }
    const [bestAnalogs, setBestAnalogs] = useState(null);
    const bestAnalogsCache = useRef(new Map());
    // previous forecasts history
    const [pastForecasts, setPastForecasts] = useState(null);
    const pastForecastsCache = useRef(new Map());
    const [_pastLoading, setPastLoading] = useState(false);
    const [_pastError, setPastError] = useState(null);
    const referenceCache = useRef(new Map()); // key: workspace|methodId|configId|entity -> value
    const [_refLoading, setRefLoading] = useState(false);
    const [_refError, setRefError] = useState(null);
    const [_analogsLoading, setAnalogsLoading] = useState(false);
    const [_analogsError, setAnalogsError] = useState(null);
    // Ensure these refs are referenced for static analysis (used in JSX below)
    // (no-op uses to avoid unused-variable warnings from static checker)
    void _refLoading;
    void _refError;

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

    const reqIdRef = useRef(0);
    const chartRef = useRef(null);
    // Replace previous width-only state with width+height
    const [chartSize, setChartSize] = useState({width: 0, height: 0});
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
    useEffect(() => {
        setSeries(null);
    }, [resolvedConfigId, selectedEntityId, selectedMethodConfig, workspace, activeForecastDate]);

    const cacheKey = useMemo(() => {
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
        // include requested percentiles in cache key so different percentile requests don't collide
        const pctsKey = (requestedPercentiles && requestedPercentiles.length) ? `|pcts=${requestedPercentiles.join(',')}` : '';
        return `${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}${pctsKey}`;
    }, [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, requestedPercentiles]);

    useEffect(() => {
        let cancelled = false;
        const reqId = ++reqIdRef.current;

        async function run() {
            if (!cacheKey || selectedEntityId == null) {
                setSeries(null);
                setError(null);
                setLoading(false);
                return;
            }
            const cached = seriesCache.get(cacheKey);
            if (cached) {
                setSeries(cached);
                return;
            }
            setLoading(true);
            setError(null);
            setSeries(null);
            try {
                const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId, requestedPercentiles);
                if (cancelled || reqId !== reqIdRef.current) return;
                // Parse response
                const targetDates = (resp?.series_values?.target_dates || []).map(d => parseForecastDate(d) || new Date(d)).filter(d => d && !isNaN(d));
                const percentilesArr = resp?.series_values?.series_percentiles || [];
                // Build map of percentile -> series values
                const pctMap = {};
                percentilesArr.forEach(sp => {
                    const p = Number(sp.percentile);
                    pctMap[p] = sp.series_values || [];
                });
                const pctList = Object.keys(pctMap).map(Number).sort((a,b) => a - b);

                // Normalize series lengths to targetDates
                const normLen = targetDates.length;
                const normArr = arr => (Array.isArray(arr) && arr.length === normLen) ? arr : targetDates.map((_, i) => (Array.isArray(arr) && typeof arr[i] === 'number' ? arr[i] : null));
                const normalizedMap = {};
                pctList.forEach(p => { normalizedMap[p] = normArr(pctMap[p]); });

                const data = {dates: targetDates, percentiles: normalizedMap, pctList};
                seriesCache.set(cacheKey, data);
                setSeries(data);
            } catch (e) {
                if (!cancelled && reqId === reqIdRef.current) {
                    setError(e);
                    setSeries(null);
                }
            } finally {
                if (!cancelled && reqId === reqIdRef.current) setLoading(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [cacheKey, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, requestedPercentiles]);

    const stationName = useMemo(() => {
        if (selectedEntityId == null) return '';
        const match = entities?.find(e => e.id === selectedEntityId);
        return match?.name || match?.id || selectedEntityId;
    }, [selectedEntityId, entities]);

    // D3 drawing effect (clean implementation)
    useEffect(() => {
        const container = chartRef.current;
        if (!container) return;
        d3.select(container).selectAll('*').remove();

        // Determine dates from series (preferred), then bestAnalogs, then fall back to union of pastForecasts dates
        let dates = null;
        if (series && Array.isArray(series.dates) && series.dates.length) {
            dates = series.dates;
        } else if (bestAnalogs && Array.isArray(bestAnalogs.dates) && bestAnalogs.dates.length) {
            dates = bestAnalogs.dates;
        } else if (pastForecasts && Array.isArray(pastForecasts) && pastForecasts.length) {
            // union all past forecast dates and sort
            const all = [];
            pastForecasts.forEach(pf => {
                if (Array.isArray(pf.dates)) all.push(...pf.dates);
            });
            if (all.length) {
                dates = Array.from(new Set(all.map(d => (+d)))).map(t => new Date(t)).sort((a,b)=>a-b);
            }
        }
        if (!dates || !dates.length) return; // nothing to plot along x-axis

        let {width, height} = chartSize;
        // Fallbacks in case ResizeObserver reports 0 (initial layout) or element not sized yet
        if (!width || width < 10) width = container.clientWidth || 600;
        if (!height || height < 50) {
            // Try parent height first; if still small use default 420
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

        const margin = {top: 12, right: 12, bottom: 34, left: 56};
        const innerW = Math.max(10, dynamicWidth - margin.left - margin.right);
        const innerH = Math.max(10, dynamicHeight - margin.top - margin.bottom);

        const svg = d3.select(container)
            .append('svg')
            .attr('width', dynamicWidth)
            .attr('height', dynamicHeight)
            .attr('role', 'img')
            .attr('aria-label', 'Forecast percentiles time series');

        svg.append('rect').attr('x',0).attr('y',0).attr('width',dynamicWidth).attr('height',dynamicHeight).attr('fill','#fff');

        // Compute x-domain from the primary dates only (series or bestAnalogs). Do NOT include pastForecasts
        const maxX = d3.max(dates);
        // Limit the start of the plot to 2 days before the active forecast date, but do NOT expand domain for past forecasts
        const activeDateObj = (activeForecastDate ? (parseForecastDate(activeForecastDate) || new Date(activeForecastDate)) : null);
        const twoDaysBefore = activeDateObj ? new Date(activeDateObj.getTime() - 2 * 24 * 3600 * 1000) : null;
        const minX = d3.min(dates);
        const startDomain = (twoDaysBefore && minX) ? (twoDaysBefore < minX ? twoDaysBefore : minX) : (twoDaysBefore || minX);

        const xScale = d3.scaleTime().domain([startDomain, maxX || d3.max(dates)]).range([0, innerW]);
        const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        // Quantile colors used for main and historical traces
        const COLORS = {p90: '#0b2e8a', p60: '#1d53d2', p20: '#04b4e6'};
        const TENYR_COLOR = '#d00000';

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Create a clip path so anything outside the plotting area (e.g. prior forecasts before the x-domain start) is hidden
        const clipId = `plot-clip-${Math.random().toString(36).slice(2,9)}`;
        svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH);
        const plotG = g.append('g').attr('class', 'plot-area').attr('clip-path', `url(#${clipId})`);

        // Draw previous forecasts into the clipped plot group (they will be clipped at the left/right of the x domain)
        if (options.previousForecasts && pastForecasts && Array.isArray(pastForecasts) && pastForecasts.length) {
            const HIST_ALPHA = 0.35;
            const HIST_WIDTH = 1.25;
            const mainPcts = [20, 60, 90];
            pastForecasts.forEach(pf => {
                const pd = pf.dates || [];
                if (!pd.length) return;
                mainPcts.forEach(pct => {
                    const arr = pf.percentiles && pf.percentiles[pct];
                    if (!arr || !Array.isArray(arr)) return;
                    const lineFn = d3.line()
                        .defined((d,i) => typeof arr[i] === 'number')
                        .x((d,i) => xScale(pd[i]))
                        .y((d,i) => yScale(arr[i]));
                    const color = pct === 90 ? COLORS.p90 : (pct === 60 ? COLORS.p60 : COLORS.p20);
                    plotG.append('path').datum(pd).attr('fill', 'none')
                        .attr('stroke', color)
                        .attr('stroke-width', HIST_WIDTH)
                        .attr('stroke-opacity', HIST_ALPHA)
                        .attr('d', lineFn);
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
                analogsArr.slice(0, maxToShow).forEach((a) => {
                     const vals = a.values || [];
                    if (vals.length === dates.length) {
                        vals.forEach((v, i) => {
                            if (typeof v !== 'number' || !isFinite(v)) return;
                            const cx = xScale(analogDates[i]);
                            const cy = yScale(v);
                            plotG.append('circle')
                                .attr('cx', cx)
                                .attr('cy', cy)
                                .attr('r', 5)
                                .attr('stroke', MARKER_COLOR)
                                .attr('stroke-width', 1)
                                .attr('fill-opacity', 0)
                                .append('title').text(`${a.label || 'A'}: ${v}`);
                        });
                    } else if (vals.length) {
                        let maxV = -Infinity, maxIdx = -1;
                        vals.forEach((v, i) => { if (typeof v === 'number' && isFinite(v) && v > maxV) { maxV = v; maxIdx = i; } });
                        if (maxIdx >= 0 && analogDates[maxIdx]) {
                            const cx = xScale(analogDates[maxIdx]);
                            const cy = yScale(maxV);
                            plotG.append('circle')
                                .attr('cx', cx)
                                .attr('cy', cy)
                                .attr('r', 4)
                                .attr('fill', MARKER_COLOR)
                                .attr('stroke', '#fff')
                                .attr('stroke-width', 0.6)
                                .append('title').text(`${a.label || 'A'}: ${maxV}`);
                        }
                    }
                });
            }
         }

        // Draw reference lines: 10-year (prominent) and optionally all return periods (subtle)
        if (options.tenYearReturn && typeof tenYearVal === 'number' && isFinite(tenYearVal)) {
            plotG.append('line')
                .attr('x1', 0)
                .attr('x2', innerW)
                .attr('y1', yScale(tenYearVal))
                .attr('y2', yScale(tenYearVal))
                .attr('stroke', TENYR_COLOR)
                .attr('stroke-width', 2);
        }
        if (options.allReturnPeriods && rpPairs.length) {
            const rpPairsAsc = rpPairs.slice().sort((a, b) => a.rp - b.rp);
            rpPairsAsc.forEach((p, i) => {
                const n = rpPairsAsc.length;
                const ratio = n > 1 ? (i / (n - 1)) : 0;
                const gVal = Math.round(255 - ratio * 255);
                const clr = `rgb(255, ${gVal}, 0)`;
                plotG.append('line')
                    .attr('x1', 0)
                    .attr('x2', innerW)
                    .attr('y1', yScale(p.val))
                    .attr('y2', yScale(p.val))
                    .attr('stroke', clr)
                    .attr('stroke-width', 2)
                    .attr('stroke-opacity', 0.95);
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
            } catch (e) {
                // defensively ignore if xScale or activeDateObj cause issues
            }
        }

        // Create and render y/x axes (outside the clipped plot group so labels/gridlines remain visible)
        const yAxis = d3.axisLeft(yScale).ticks(Math.min(10, Math.max(3, Math.floor(innerH / 55)))).tickSize(-innerW).tickPadding(8);
        const yAxisG = g.append('g').attr('class', 'y-axis').call(yAxis);
        yAxisG.selectAll('line').attr('stroke', '#ccc').attr('stroke-opacity', 0.9); // grid lines
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
                .text('Precipitation [mm]');
        }

        // Force ticks at every lead time (use tickValues) and format so the first tick per day shows the date and subsequent ticks show the time
        const tickValues = dates.slice(); // tick at every lead time
        // Compute first tick of each day
        const firstOfDaySet = new Set();
        const firstTimestamps = new Set();
        for (let i = 0; i < tickValues.length; i++) {
            const d = tickValues[i];
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!firstOfDaySet.has(key)) {
                firstOfDaySet.add(key);
                firstTimestamps.add(+d);
            }
        }
        const dateFmt = d3.timeFormat('%-d/%-m');
        const timeFmt = d3.timeFormat('%H:%M');
        const xAxis = d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d => (firstTimestamps.has(+d) ? dateFmt(d) : timeFmt(d)));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).selectAll('text').attr('fill', '#555').attr('font-size', 11).attr('text-anchor', 'middle');

        // Build legend after knowing rpPairs size so it rescales correctly
        const legendWidth = 150;
        const rpCount = rpPairs.length || 0;
        // If allReturnPeriods is on, show all RP entries; otherwise, if tenYearReturn is on and a tenYearVal exists, reserve one slot for P10
        const showAllRPs = options.allReturnPeriods && rpCount > 0;
        const showP10Only = !showAllRPs && options.tenYearReturn && (typeof tenYearVal === 'number' && isFinite(tenYearVal));
        // Build legend items first so we can calculate height including the median entry when present
        const quantileLegendItems = [];
        if (options.mainQuantiles) {
            quantileLegendItems.push({label: 'Quantile 90', color: COLORS.p90});
            quantileLegendItems.push({label: 'Quantile 60', color: COLORS.p60});
            quantileLegendItems.push({label: 'Quantile 20', color: COLORS.p20});
        }
        // add median legend entry when 50% was returned
        const legendItems = [];
        if (pctList.includes(50)) {
            legendItems.push({label: 'Median', color: MEDIAN_COLOR, dashed: true});
        }
        // follow with quantile legend entries if enabled
        legendItems.push(...quantileLegendItems);
        // add best-analogs legend entries (one per returned analog) when enabled
        const ANALOG_COLOR = '#ff6600';
        if (options.bestAnalogs) {
            legendItems.push({label: 'Best analogs', color: ANALOG_COLOR, marker: true});
        }

        // now compute total legend item count including RP entries that will be listed below
        const legendItemCount = legendItems.length + (showAllRPs ? rpCount : (showP10Only ? 1 : 0));
        const legendHeight = 14 * legendItemCount + 16;
        const legendX = margin.left + innerW - legendWidth - 4;
        const legendY = margin.top + 4;
        const legend = svg.append('g').attr('transform', `translate(${legendX},${legendY})`);
        legend.append('rect').attr('width', legendWidth).attr('height', legendHeight).attr('fill', '#fafafa').attr('stroke', '#ddd');
        legendItems.forEach((item, idx) => {
            const y = 18 + idx * 14;
            if (item.marker) {
                // draw a hollow stroked circle to match analog markers in the plot
                legend.append('circle')
                    .attr('cx', 30)
                    .attr('cy', y)
                    .attr('r', 5)
                    .attr('fill-opacity', 0)
                    .attr('stroke', item.color)
                    .attr('stroke-width', 1);
            } else {
                const lineEl = legend.append('line').attr('x1', 10).attr('x2', 50).attr('y1', y).attr('y2', y).attr('stroke', item.color).attr('stroke-width', 3);
                if (item.dashed) lineEl.attr('stroke-dasharray', '6 4');
            }
            legend.append('text').attr('x', 56).attr('y', y + 4).attr('font-size', 12).attr('fill', item.color).text(item.label);
        });
        // RP legend entries
        const baseY = 18 + 14 * legendItems.length;
        if (showAllRPs) {
            const rpPairsAsc = rpPairs.slice().sort((a, b) => a.rp - b.rp);
            const rpPairsDesc = rpPairsAsc.slice().reverse();
            rpPairsDesc.forEach((p, i) => {
                const y = baseY + i * 14;
                const idxAsc = rpPairsAsc.findIndex(r => r.rp === p.rp);
                const n = rpPairsAsc.length;
                const ratio = n > 1 ? (idxAsc / (n - 1)) : 0;
                const gVal = Math.round(255 - ratio * 255);
                const clr = `rgb(255, ${gVal}, 0)`;
                legend.append('line').attr('x1', 10).attr('x2', 50).attr('y1', y).attr('y2', y).attr('stroke', clr).attr('stroke-width', 2);
                const label = `P${Number.isInteger(p.rp) ? p.rp : p.rp}`;
                legend.append('text').attr('x', 56).attr('y', y + 4).attr('font-size', 12).attr('fill', '#555').text(label);
            });
        } else if (showP10Only) {
            let clr = TENYR_COLOR;
            const y = baseY;
            legend.append('line').attr('x1', 10).attr('x2', 50).attr('y1', y).attr('y2', y).attr('stroke', clr).attr('stroke-width', 2);
            legend.append('text').attr('x', 56).attr('y', y + 4).attr('font-size', 12).attr('fill', '#555').text('P10');
        }

    }, [series, options.mainQuantiles, options.tenYearReturn, referenceValues, chartSize.width, chartSize.height, options.allReturnPeriods, options.allQuantiles, options.bestAnalogs, bestAnalogs, pastForecasts, options.previousForecasts, activeForecastDate]);

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

    // Fetch reference values when requested (either 10yr or all return periods)
    useEffect(() => {
        if (!options.tenYearReturn && !options.allReturnPeriods) return; // only fetch when user requests any RP data
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return;
        const key = `${workspace}|${selectedMethodConfig.method.id}|${selectedEntityId}`;
        if (referenceCache.current.has(key)) {
            setReferenceValues(referenceCache.current.get(key));
            return;
        }
        let cancelled = false;
        setRefLoading(true);
        setRefError(null);
        setReferenceValues(null);
        (async () => {
            try {
                const resp = await getReferenceValues(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
                if (cancelled) return;
                // Attempt to parse response into {axis: number[], values: number[]}
                let parsed;
                if (resp && Array.isArray(resp.reference_axis) && Array.isArray(resp.reference_values) && resp.reference_axis.length === resp.reference_values.length) {
                    parsed = {axis: resp.reference_axis.map(a => Number(a)), values: resp.reference_values.map(v => Number(v))};
                } else if (resp && Array.isArray(resp.reference_values) && resp.reference_values.length && typeof resp.reference_values[0] === 'object') {
                    // array of objects with return_period and value
                    const axis = [];
                    const values = [];
                    resp.reference_values.forEach(o => {
                        const rp = o.return_period ?? o.returnPeriod ?? o.period ?? o.p;
                        const v = o.value ?? o.val ?? o.v;
                        if (rp != null && v != null) { axis.push(Number(rp)); values.push(Number(v)); }
                    });
                    if (axis.length) parsed = {axis, values};
                } else if (resp && typeof resp === 'object' && resp.reference_values && typeof resp.reference_values === 'object') {
                    // object mapping like { '10': val, '20': val }
                    const axis = Object.keys(resp.reference_values).map(k => Number(k)).sort((a,b)=>a-b);
                    const values = axis.map(k => Number(resp.reference_values[String(k)]));
                    if (axis.length) parsed = {axis, values};
                } else {
                    // No longer accept single numeric fallback – require axis+values or structured mapping
                    parsed = null;
                }

                if (parsed && parsed.axis && parsed.values && parsed.axis.length === parsed.values.length) {
                    referenceCache.current.set(key, parsed);
                    setReferenceValues(parsed);
                } else {
                    setRefError(new Error('reference values not found'));
                }
            } catch (e) {
                if (!cancelled) setRefError(e);
            } finally {
                if (!cancelled) setRefLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [options.tenYearReturn, options.allReturnPeriods, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);

    // Fetch best analogs when option enabled
    useEffect(() => {
        if (!options.bestAnalogs) {
            setBestAnalogs(null);
            setAnalogsLoading(false);
            setAnalogsError(null);
            return;
        }
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return;
        const key = `${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
        if (bestAnalogsCache.current.has(key)) {
            setBestAnalogs(bestAnalogsCache.current.get(key));
            return;
        }
        let cancelled = false;
        setAnalogsLoading(true);
        setAnalogsError(null);
        setBestAnalogs(null);
        (async () => {
            try {
                const resp = await getSeriesBestAnalogs(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
                if (cancelled) return;
                // Normalize response into { items: [{label, values: number[]}, ...], dates?: Date[] }
                let parsed;
                if (!resp) parsed = null;
                else if (Array.isArray(resp.series_values) && Array.isArray(resp.target_dates) && resp.series_values.length) {
                    // Server returned a matrix: series_values[row=date][col=analog]
                    // transpose matrix into per-analog items
                    const rows = resp.series_values;
                    const parsedDates = resp.target_dates.map(d => parseForecastDate(d) || new Date(d)).filter(d => d && !isNaN(d));
                    // determine number of analogs (max columns)
                    const nAnalogs = rows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
                    const items = [];
                    for (let c = 0; c < nAnalogs; c++) {
                        const values = [];
                        for (let r = 0; r < rows.length; r++) {
                            const row = rows[r];
                            const v = (Array.isArray(row) && row.length > c) ? row[c] : null;
                            values.push(typeof v === 'number' ? v : (v == null ? null : Number(v)));
                        }
                        items.push({label: `Analog ${c+1}`, values});
                    }
                    parsed = {items, dates: parsedDates};
                } else {
                    parsed = null;
                }

                if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
                    bestAnalogsCache.current.set(key, parsed);
                    setBestAnalogs(parsed);
                } else {
                    setAnalogsError(new Error('no best analogs'));
                }
            } catch (e) {
                if (!cancelled) setAnalogsError(e);
            } finally {
                if (!cancelled) setAnalogsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [options.bestAnalogs, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);

    // Fetch previous forecasts history when option enabled
    useEffect(() => {
        if (!options.previousForecasts) {
            setPastForecasts(null);
            setPastLoading(false);
            setPastError(null);
            return;
        }
        if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return;
        const key = `${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
        if (pastForecastsCache.current.has(key)) {
            setPastForecasts(pastForecastsCache.current.get(key));
            return;
        }
        let cancelled = false;
        setPastLoading(true);
        setPastError(null);
        setPastForecasts(null);
        (async () => {
            try {
                const resp = await getSeriesValuesPercentilesHistory(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
                if (cancelled) return;
                console.debug('[History] raw response:', resp);
                // resp.past_forecasts is an array; normalize each element to {forecastDate, dates: Date[], percentiles: {p: values}}
                const raw = resp?.past_forecasts;
                if (!Array.isArray(raw)) {
                    if (!cancelled) setPastError(new Error('unexpected history response'));
                    return;
                }
                const parsedList = raw.map(item => {
                    const forecastDate = parseForecastDate(item.forecast_date) || new Date(item.forecast_date);
                    const dates = (Array.isArray(item.target_dates) ? item.target_dates.map(d => parseForecastDate(d) || new Date(d)).filter(d => d && !isNaN(d)) : []);
                    const pctMap = {};
                    // Support two common shapes: array of {percentile, series_values} or object mapping '20'|'p20'->array
                    if (Array.isArray(item.series_percentiles)) {
                        item.series_percentiles.forEach(sp => {
                            // percentile may be number or string like 'p20'
                            let rawP = sp.percentile ?? sp.p ?? sp.name ?? '';
                            let pNum = (typeof rawP === 'number') ? rawP : (typeof rawP === 'string' ? (rawP.match(/-?\d+/)?.[0] ? Number(rawP.match(/-?\d+/)[0]) : NaN) : NaN);
                            if (!Number.isFinite(pNum)) return; // skip unparseable
                            pctMap[pNum] = Array.isArray(sp.series_values) ? sp.series_values.map(v => (typeof v === 'number' ? v : (v == null ? null : Number(v)))) : [];
                        });
                    } else if (item.series_percentiles && typeof item.series_percentiles === 'object') {
                        Object.keys(item.series_percentiles).forEach(k => {
                            const kNum = (typeof k === 'string' && k.match(/-?\d+/)) ? Number(k.match(/-?\d+/)[0]) : (Number(k) || NaN);
                            if (!Number.isFinite(kNum)) return;
                            const arr = item.series_percentiles[k];
                            pctMap[kNum] = Array.isArray(arr) ? arr.map(v => (typeof v === 'number' ? v : (v == null ? null : Number(v)))) : [];
                        });
                    }
                    return {forecastDate, dates, percentiles: pctMap};
                }).filter(p => p.dates && p.dates.length);
                console.debug('[History] parsedList:', parsedList);
                pastForecastsCache.current.set(key, parsedList);
                setPastForecasts(parsedList);
            } catch (e) {
                if (!cancelled) setPastError(e);
            } finally {
                if (!cancelled) setPastLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [options.previousForecasts, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);

    return (
        <Dialog open={selectedEntityId != null} onClose={handleClose} maxWidth={false} fullWidth
                sx={{'& .MuiPaper-root': {width:'90vw', maxWidth:'1000px', height:'50vh', display:'flex', flexDirection:'column'}}}>
            <DialogTitle sx={{pr: 5}}>
                {stationName ? `${stationName}` : ''}
                <IconButton aria-label="close" onClick={handleClose} size="small"
                            sx={{position: 'absolute', right: 8, top: 8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{display:'flex', flexDirection:'row', gap:2, alignItems:'stretch', flex:1, minHeight:0}}>
                {selectedEntityId && (
                    <Box sx={{width: 220, flexShrink:0, borderRight:'1px solid #e0e0e0', pr:1, overflowY:'auto'}}>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox size="small" checked={options.mainQuantiles} onChange={handleOptionChange('mainQuantiles')} />} label={<Typography variant="body2">Main quantiles</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allQuantiles} onChange={handleOptionChange('allQuantiles')} />} label={<Typography variant="body2">All quantiles</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.bestAnalogs} onChange={handleOptionChange('bestAnalogs')} />} label={<Typography variant="body2">Best analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.tenYearReturn} onChange={handleOptionChange('tenYearReturn')} />} label={<Typography variant="body2">10 year return period</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allReturnPeriods} onChange={handleOptionChange('allReturnPeriods')} />} label={<Typography variant="body2">All return periods</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.previousForecasts} onChange={handleOptionChange('previousForecasts')} />} label={<Typography variant="body2">Previous forecasts</Typography>} />
                        </FormGroup>
                    </Box>
                )}
                <Box sx={{flex:1, minWidth:0, display:'flex', position:'relative', alignItems:'center', justifyContent:'center'}}>
                    {!selectedEntityId && <div style={{fontSize:13}}>Select a station to view the forecast series.</div>}
                    {selectedEntityId && (loading || resolvingConfig) && (
                        <Box sx={{display:'flex', flexDirection:'column', alignItems:'center', gap:1}}>
                            <CircularProgress size={28} />
                            <Typography variant="caption" sx={{color:'#555'}}>{resolvingConfig ? 'Resolving configuration…' : 'Loading series…'}</Typography>
                        </Box>
                    )}
                    {selectedEntityId && error && !loading && !resolvingConfig && <div style={{fontSize:13, color:'#b00020'}}>Error loading series.</div>}
                    {selectedEntityId && !loading && !resolvingConfig && !error && (series || (options.bestAnalogs && bestAnalogs)) && (
                        <div ref={chartRef} style={{position:'relative', width:'100%', height:'100%', flex:1, minHeight:300}} />
                    )}
                    {selectedEntityId && !loading && !resolvingConfig && !error && !series && !(options.bestAnalogs && bestAnalogs) && resolvedConfigId && <div style={{fontSize:13}}>No data available for this station.</div>}
                    {/* Reference values status messages (used to show refLoading/refError) */}
                    {selectedEntityId && (options.tenYearReturn || options.allReturnPeriods) && _refLoading && (
                        <div style={{position:'absolute', top: 8, right: 12, fontSize:11, color:'#d00000'}}>Loading reference values…</div>
                    )}
                    {selectedEntityId && (options.tenYearReturn || options.allReturnPeriods) && !_refLoading && _refError && (
                        <div style={{position:'absolute', top: 8, right: 12, fontSize:11, color:'#d00000'}}>No reference values</div>
                    )}
                    {/* Best analogs status messages */}
                    {selectedEntityId && options.bestAnalogs && _analogsLoading && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#ff6600'}}>Loading best analogs…</div>
                    )}
                    {selectedEntityId && options.bestAnalogs && !_analogsLoading && _analogsError && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#ff6600'}}>No best analogs</div>
                    )}
                    {/* Previous forecasts status messages */}
                    {selectedEntityId && options.previousForecasts && !resolvedConfigId && resolvingConfig && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#d00000'}}>Resolving configuration for history…</div>
                    )}
                    {selectedEntityId && options.previousForecasts && !resolvedConfigId && !resolvingConfig && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#d00000'}}>Configuration not resolved — cannot fetch previous forecasts</div>
                    )}
                    {selectedEntityId && options.previousForecasts && _pastLoading && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#d00000'}}>Loading previous forecasts…</div>
                    )}
                    {selectedEntityId && options.previousForecasts && !_pastLoading && _pastError && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#d00000'}}>Error loading previous forecasts</div>
                    )}
                    {selectedEntityId && options.previousForecasts && !_pastLoading && !_pastError && (!pastForecasts || (Array.isArray(pastForecasts) && pastForecasts.length === 0)) && resolvedConfigId && (
                        <div style={{position:'absolute', top: 8, left: 12, fontSize:11, color:'#666'}}>No previous forecasts available</div>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
