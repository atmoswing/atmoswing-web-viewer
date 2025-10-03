import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {Box, Checkbox, Divider, FormControlLabel, FormGroup, Typography} from '@mui/material';
import {useSelectedEntity, useMethods, useForecastSession, useEntities} from '../contexts/ForecastsContext.jsx';
import {getSeriesValuesPercentiles} from '../services/api.js';
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

    const resolvedConfigId = useMemo(() => {
        if (!selectedMethodConfig?.method) return null;
        if (selectedMethodConfig.config) return selectedMethodConfig.config.id;
        const m = methodConfigTree.find(m => m.id === selectedMethodConfig.method.id);
        return m?.children?.[0]?.id || null;
    }, [selectedMethodConfig, methodConfigTree]);

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

        const {dates, p20, p60, p90} = series;
        const allValues = [...p20, ...p60, ...p90].filter(v => typeof v === 'number');
        if (!allValues.length) return;

        const width = 620;
        const height = 260;
        const margin = {top: 12, right: 8, bottom: 28, left: 50};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('role', 'img')
            .attr('aria-label', 'Forecast percentiles time series');

        svg.append('rect').attr('x', 0).attr('y', 0).attr('width', width).attr('height', height).attr('fill', '#fff').attr('stroke', '#ddd');

        const xScale = d3.scaleTime().domain(d3.extent(dates)).range([0, innerW]);
        const yMax = Math.max(...allValues) * 1.08 || 1;
        const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickPadding(8);
        g.append('g').attr('class', 'y-axis').call(yAxis).selectAll('line').attr('stroke', '#eee');
        g.selectAll('.y-axis text').attr('fill', '#555').attr('font-size', 11);

        const xAxis = d3.axisBottom(xScale).ticks(Math.min(dates.length, 6)).tickFormat(d3.timeFormat('%-d/%-m'));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(xAxis).selectAll('text').attr('fill', '#555').attr('font-size', 11).attr('text-anchor', 'middle');

        const lineGen = d3.line().defined(d => typeof d.value === 'number').x(d => xScale(d.date)).y(d => yScale(d.value));
        const toPoints = arr => arr.map((v, i) => ({date: dates[i], value: typeof v === 'number' ? v : NaN}));

        // Color palette
        const COLORS = {
            p90: '#0b2e8a', // dark strong blue
            p60: '#1d53d2', // medium blue
            p20: '#04b4e6', // cyan-light blue
        };

        if (options.threeQuantiles) {
            g.append('path').datum(toPoints(p90)).attr('fill', 'none').attr('stroke', COLORS.p90).attr('stroke-width', 3).attr('d', lineGen);
            g.append('path').datum(toPoints(p60)).attr('fill', 'none').attr('stroke', COLORS.p60).attr('stroke-width', 3).attr('d', lineGen);
            g.append('path').datum(toPoints(p20)).attr('fill', 'none').attr('stroke', COLORS.p20).attr('stroke-width', 3).attr('d', lineGen);
        }

        // legend (reordered 90, 60, 20)
        const legend = svg.append('g').attr('transform', `translate(${margin.left + 4},${6})`);
        legend.append('rect').attr('width', 160).attr('height', 54).attr('fill', '#fafafa').attr('stroke', '#ddd');

        const legendItems = [
            {label: 'Quantile 90', color: COLORS.p90, y: 18},
            {label: 'Quantile 60', color: COLORS.p60, y: 32},
            {label: 'Quantile 20', color: COLORS.p20, y: 46},
        ];
        legendItems.forEach(item => {
            legend.append('line').attr('x1', 10).attr('x2', 50).attr('y1', item.y).attr('y2', item.y).attr('stroke', item.color).attr('stroke-width', 3);
            legend.append('text').attr('x', 56).attr('y', item.y + 4).attr('font-size', 12).attr('fill', item.color).text(item.label);
        });

    }, [series, options.threeQuantiles]);

    const handleClose = () => setSelectedEntityId(null);

    return (
        <Dialog open={selectedEntityId != null} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{pr: 5}}>
                Forecast percentiles{stationName ? ` - ${stationName}` : ''}
                <IconButton aria-label="close" onClick={handleClose} size="small"
                            sx={{position: 'absolute', right: 8, top: 8}}>
                    <CloseIcon fontSize="small"/>
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'stretch'}}>
                {selectedEntityId && (
                    <Box sx={{width: 220, flexShrink: 0, borderRight: '1px solid #e0e0e0', pr: 1}}>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox size="small" checked={options.threeQuantiles} onChange={handleOptionChange('threeQuantiles')} />} label={<Typography variant="body2">3 quantiles</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allQuantiles} disabled onChange={handleOptionChange('allQuantiles')} />} label={<Typography variant="body2">All quantiles</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allAnalogs} disabled onChange={handleOptionChange('allAnalogs')} />} label={<Typography variant="body2">All analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.tenBestAnalogs} disabled onChange={handleOptionChange('tenBestAnalogs')} />} label={<Typography variant="body2">10 best analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.fiveBestAnalogs} disabled onChange={handleOptionChange('fiveBestAnalogs')} />} label={<Typography variant="body2">5 best analogs</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.tenYearReturn} disabled onChange={handleOptionChange('tenYearReturn')} />} label={<Typography variant="body2">10 year return period</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.allReturnPeriods} disabled onChange={handleOptionChange('allReturnPeriods')} />} label={<Typography variant="body2">All return periods</Typography>} />
                            <Divider sx={{my: 1}} />
                            <FormControlLabel control={<Checkbox size="small" checked={options.previousForecasts} onChange={handleOptionChange('previousForecasts')} />} label={<Typography variant="body2">Previous forecasts</Typography>} />
                        </FormGroup>
                        {options.previousForecasts && (
                            <Box sx={{mt: 1, maxHeight: 160, overflowY: 'auto', border: '1px solid #eee', p: 1}}>
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
                <Box sx={{flex: 1, minWidth: 0}}>
                    {!selectedEntityId && <div style={{fontSize: 13}}>Select a station to view the forecast series.</div>}
                    {selectedEntityId && loading && <div style={{fontSize: 13}}>Loading series…</div>}
                    {selectedEntityId && error && <div style={{fontSize: 13, color: '#b00020'}}>Error loading series.</div>}
                    {selectedEntityId && !loading && !error && series &&
                        <div ref={chartRef} style={{position: 'relative'}}/>}
                    {selectedEntityId && !loading && !error && !series &&
                        <div style={{fontSize: 13}}>No data available for this station.</div>}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
