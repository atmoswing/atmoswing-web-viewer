import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
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
        const margin = {top: 12, right: 8, bottom: 28, left: 40};
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

        g.append('path').datum(toPoints(p20)).attr('fill', 'none').attr('stroke', '#1976d2').attr('stroke-width', 2).attr('d', lineGen);
        g.append('path').datum(toPoints(p60)).attr('fill', 'none').attr('stroke', '#ef6c00').attr('stroke-width', 2).attr('stroke-dasharray', '5 4').attr('d', lineGen);
        g.append('path').datum(toPoints(p90)).attr('fill', 'none').attr('stroke', '#2e7d32').attr('stroke-width', 2).attr('stroke-dasharray', '3 3').attr('d', lineGen);

        // legend
        const legend = svg.append('g').attr('transform', `translate(${margin.left + 4},${6})`);
        legend.append('rect').attr('width', 140).attr('height', 46).attr('fill', '#fafafa').attr('stroke', '#ddd');
        legend.append('line').attr('x1', 10).attr('x2', 40).attr('y1', 18).attr('y2', 18).attr('stroke', '#1976d2').attr('stroke-width', 3);
        legend.append('text').attr('x', 48).attr('y', 22).attr('font-size', 12).attr('fill', '#1976d2').text('P20');
        legend.append('line').attr('x1', 10).attr('x2', 40).attr('y1', 32).attr('y2', 32).attr('stroke', '#ef6c00').attr('stroke-width', 3).attr('stroke-dasharray', '5 4');
        legend.append('text').attr('x', 48).attr('y', 36).attr('font-size', 12).attr('fill', '#ef6c00').text('P60');
        legend.append('line').attr('x1', 10).attr('x2', 40).attr('y1', 46).attr('y2', 46).attr('stroke', '#2e7d32').attr('stroke-width', 3).attr('stroke-dasharray', '3 3');
        legend.append('text').attr('x', 48).attr('y', 50).attr('font-size', 12).attr('fill', '#2e7d32').text('P90');

        // simple tooltips on hover
        const tooltip = d3.select(container).append('div').style('position', 'absolute').style('pointer-events', 'none').style('background', '#fff').style('border', '1px solid #ddd').style('padding', '6px').style('font-size', '12px').style('display', 'none');

        g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'transparent').on('mousemove', (event) => {
            const [mx] = d3.pointer(event);
            const x0 = xScale.invert(mx);
            let idx = d3.bisector(d => d).left(dates, x0);
            if (idx > 0) idx -= 1;
            const dt = dates[idx];
            const p20v = p20[idx];
            const p60v = p60[idx];
            const p90v = p90[idx];
            tooltip.style('display', 'block').style('left', (event.pageX + 8) + 'px').style('top', (event.pageY + 8) + 'px').html(`${dt.getDate()}/${dt.getMonth() + 1}<br/>P20: ${p20v ?? '-'}<br/>P60: ${p60v ?? '-'}<br/>P90: ${p90v ?? '-'}`);
        }).on('mouseout', () => {
            tooltip.style('display', 'none');
        });

    }, [series]);

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
            <DialogContent dividers>
                {!selectedEntityId && <div style={{fontSize: 13}}>Select a station to view the forecast series.</div>}
                {selectedEntityId && loading && <div style={{fontSize: 13}}>Loading series…</div>}
                {selectedEntityId && error && <div style={{fontSize: 13, color: '#b00020'}}>Error loading series.</div>}
                {selectedEntityId && !loading && !error && series &&
                    <div ref={chartRef} style={{position: 'relative'}}/>}
                {selectedEntityId && !loading && !error && !series &&
                    <div style={{fontSize: 13}}>No data available for this station.</div>}
            </DialogContent>
        </Dialog>
    );
}
