import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {Box, Checkbox, CircularProgress, Divider, FormControlLabel, FormGroup, Typography} from '@mui/material';
import {useSelectedEntity, useMethods, useForecastSession, useEntities} from '../contexts/ForecastsContext.jsx';
import {getSeriesValuesPercentiles, getRelevantEntities} from '../services/api.js';
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

    // Sidebar state
    const [options, setOptions] = useState({
        threeQuantiles: true,
        allQuantiles: false,
        allAnalogs: false,
        tenBestAnalogs: false,
        fiveBestAnalogs: false,
        tenYearReturn: false,
        allReturnPeriods: false,
        previousForecasts: false,
    });
    const handleOptionChange = (key) => (e) => setOptions(o => ({...o, [key]: e.target.checked}));

    // Placeholder previous forecast selections
    const previousForecastCandidates = useMemo(() => {
        if (!activeForecastDate) return [];
        try {
            const base = parseForecastDate(activeForecastDate) || new Date(activeForecastDate);
            if (!base || isNaN(base)) return [];
            const arr = [];
            for (let i = 1; i <= 10; i++) { // last 10 issuance cycles (12h steps assumed)
                const d = new Date(base.getTime() - i * 12 * 3600 * 1000);
                arr.push(d);
            }
            return arr;
        } catch {return []}
    }, [activeForecastDate]);
    const [selectedPreviousForecasts, setSelectedPreviousForecasts] = useState([]); // no effect yet

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
                } catch (_) {
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
        return `${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
    }, [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);

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
                const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
                if (cancelled || reqId !== reqIdRef.current) return;
                console.log(resp);
                const targetDates = (resp?.series_values?.target_dates || []).map(d => parseForecastDate(d) || new Date(d)).filter(d => d && !isNaN(d));
                const percentilesArr = resp?.series_values?.series_percentiles || [];
                const pList = {20: [], 60: [], 90: []};
                percentilesArr.forEach(sp => {
                    if (pList[sp.percentile] !== undefined) pList[sp.percentile] = sp.series_values || [];
                });
                const normLen = targetDates.length;
                const norm = arr => arr.length === normLen ? arr : targetDates.map((_, i) => (typeof arr[i] === 'number' ? arr[i] : null));
                const data = {dates: targetDates, p20: norm(pList[20]), p60: norm(pList[60]), p90: norm(pList[90])};
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
        return () => {
            cancelled = true;
        };
    }, [cacheKey, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);

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
        if (!series || !series.dates?.length) return;

        let {width, height} = chartSize;
        // Fallbacks in case ResizeObserver reports 0 (initial layout) or element not sized yet
        if (!width || width < 10) width = container.clientWidth || 600;
        if (!height || height < 50) {
            // Try parent height first; if still small use default 420
            const parentH = container.parentElement?.clientHeight;
            height = (parentH && parentH > 200) ? parentH : 420;
        }

        const {dates, p20, p60, p90} = series;
        const allValues = [...p20, ...p60, ...p90].filter(v => typeof v === 'number' && isFinite(v));
        if (!allValues.length) return;

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

        const xScale = d3.scaleTime().domain(d3.extent(dates)).range([0, innerW]);
        const yMax = Math.max(...allValues) * 1.08 || 1;
        const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

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

        const xTicksTarget = Math.min(dates.length, Math.max(3, Math.floor(innerW / 120)));
        const xAxis = d3.axisBottom(xScale).ticks(xTicksTarget).tickFormat(d3.timeFormat('%-d/%-m'));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).selectAll('text').attr('fill', '#555').attr('font-size', 11).attr('text-anchor', 'middle');

        const lineGen = d3.line().defined(d => typeof d.value === 'number').x(d => xScale(d.date)).y(d => yScale(d.value));
        const toPoints = arr => arr.map((v, i) => ({date: dates[i], value: typeof v === 'number' ? v : NaN}));

        const COLORS = {p90: '#0b2e8a', p60: '#1d53d2', p20: '#04b4e6'};
        if (options.threeQuantiles) {
            g.append('path').datum(toPoints(p90)).attr('fill', 'none').attr('stroke', COLORS.p90).attr('stroke-width', 3).attr('d', lineGen);
            g.append('path').datum(toPoints(p60)).attr('fill', 'none').attr('stroke', COLORS.p60).attr('stroke-width', 3).attr('d', lineGen);
            g.append('path').datum(toPoints(p20)).attr('fill', 'none').attr('stroke', COLORS.p20).attr('stroke-width', 3).attr('d', lineGen);
        }

        const legendWidth = 150;
        // Position legend at upper-right inside plotting area (with 4px padding)
        const legendX = margin.left + innerW - legendWidth - 4;
        const legendY = margin.top + 4;
        const legend = svg.append('g').attr('transform', `translate(${legendX},${legendY})`);
        legend.append('rect').attr('width', legendWidth).attr('height', 62).attr('fill', '#fafafa').attr('stroke', '#ddd');
        const legendItems = [
            {label: 'Quantile 90', color: COLORS.p90, y: 18},
            {label: 'Quantile 60', color: COLORS.p60, y: 32},
            {label: 'Quantile 20', color: COLORS.p20, y: 46},
        ];
        legendItems.forEach(item => {
            legend.append('line').attr('x1', 10).attr('x2', 50).attr('y1', item.y).attr('y2', item.y).attr('stroke', item.color).attr('stroke-width', 3);
            legend.append('text').attr('x', 56).attr('y', item.y + 4).attr('font-size', 12).attr('fill', item.color).text(item.label);
        });

    }, [series, options.threeQuantiles, chartSize.width, chartSize.height]);

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

    return (
        <Dialog open={selectedEntityId != null} onClose={handleClose} maxWidth={false} fullWidth
                PaperProps={{sx:{width:'90vw', maxWidth:'1000px', height:'50vh', display:'flex', flexDirection:'column'}}}>
            <DialogTitle sx={{pr: 5}}>
                Forecast percentiles{stationName ? ` - ${stationName}` : ''}
                <IconButton aria-label="close" onClick={handleClose} size="small"
                            sx={{position: 'absolute', right: 8, top: 8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{display:'flex', flexDirection:'row', gap:2, alignItems:'stretch', flex:1, minHeight:0}}>
                {selectedEntityId && (
                    <Box sx={{width: 220, flexShrink:0, borderRight:'1px solid #e0e0e0', pr:1, overflowY:'auto'}}>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox size="small" checked={options.threeQuantiles} onChange={handleOptionChange('threeQuantiles')} />} label={<Typography variant="body2">3 quantiles</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allQuantiles} disabled onChange={handleOptionChange('allQuantiles')} />} label={<Typography variant="body2">All quantiles</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allAnalogs} disabled onChange={handleOptionChange('allAnalogs')} />} label={<Typography variant="body2">All analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.tenBestAnalogs} disabled onChange={handleOptionChange('tenBestAnalogs')} />} label={<Typography variant="body2">10 best analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.fiveBestAnalogs} disabled onChange={handleOptionChange('fiveBestAnalogs')} />} label={<Typography variant="body2">5 best analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.tenYearReturn} disabled onChange={handleOptionChange('tenYearReturn')} />} label={<Typography variant="body2">10 year return period</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allReturnPeriods} disabled onChange={handleOptionChange('allReturnPeriods')} />} label={<Typography variant="body2">All return periods</Typography>} />
                            <Divider sx={{my:1}} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.previousForecasts} onChange={handleOptionChange('previousForecasts')} />} label={<Typography variant="body2">Previous forecasts</Typography>} />
                        </FormGroup>
                        {options.previousForecasts && (
                            <Box sx={{mt: 1, maxHeight: 180, overflowY: 'auto', border: '1px solid #eee', p: 1}}>
                                <Typography variant="caption" sx={{display: 'block', mb: 0.5}}>Forecast cycles (placeholder)</Typography>
                                {previousForecastCandidates.map(d => {
                                    const key = d.toISOString();
                                    const label = d.toLocaleString(undefined, {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}).replace(',', '');
                                    const checked = selectedPreviousForecasts.includes(key);
                                    return (
                                        <FormControlLabel key={key} sx={{m: 0}} control={<Checkbox size="small" checked={checked} onChange={(e) => {
                                            setSelectedPreviousForecasts(prev => e.target.checked ? [...prev, key] : prev.filter(k => k !== key));
                                        }} disabled />} label={<Typography variant="caption">{label}</Typography>} />
                                    );
                                })}
                                <Typography variant="caption" sx={{color: '#888'}}>Selection disabled (not implemented yet)</Typography>
                            </Box>
                        )}
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
                    {selectedEntityId && !loading && !resolvingConfig && !error && series && (
                        <div ref={chartRef} style={{position:'relative', width:'100%', height:'100%', flex:1, minHeight:300}} />
                    )}
                    {selectedEntityId && !loading && !resolvingConfig && !error && !series && resolvedConfigId && <div style={{fontSize:13}}>No data available for this station.</div>}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
