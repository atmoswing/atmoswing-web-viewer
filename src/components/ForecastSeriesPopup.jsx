import React, {useEffect, useMemo, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {useSelectedEntity, useMethods, useForecastSession, useSynthesis, useEntities} from '../contexts/ForecastsContext.jsx';
import {getSeriesValuesPercentiles} from '../services/api.js';
import {parseForecastDate} from '../utils/forecastDateUtils.js';

// Local cache to avoid refetching same series repeatedly during session
const seriesCache = new Map();

export default function ForecastSeriesPopup() {
    const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
    const {selectedMethodConfig, methodConfigTree} = useMethods();
    const {workspace, activeForecastDate} = useForecastSession();
    const {dailyLeads} = useSynthesis(); // not essential but could be used to order / reference
    const {entities} = useEntities();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [series, setSeries] = useState(null);

    const reqIdRef = useRef(0);

    // Determine effective configuration id (fallback to first if none selected)
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

    // Fetch series when popup opens / dependencies change
    useEffect(() => {
        let cancelled = false;
        const reqId = ++reqIdRef.current;
        async function run() {
            if (!cacheKey || !selectedEntityId) { setSeries(null); setError(null); setLoading(false); return; }
            const cached = seriesCache.get(cacheKey);
            if (cached) { setSeries(cached); return; }
            setLoading(true); setError(null); setSeries(null);
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
                const norm = arr => arr.length === normLen ? arr : targetDates.map((_,i)=> (typeof arr[i] === 'number'? arr[i] : null));
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
        return () => { cancelled = true; };
    }, [cacheKey, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);

    const stationName = useMemo(() => {
        if (selectedEntityId == null) return '';
        const match = entities?.find(e => e.id === selectedEntityId);
        return match?.name || match?.id || selectedEntityId;
    }, [selectedEntityId, entities]);

    // Build SVG chart
    const chart = useMemo(() => {
        if (!series || !series.dates.length) return null;
        const {dates, p20, p60, p90} = series;
        const allValues = [...p20, ...p60, ...p90].filter(v => typeof v === 'number');
        if (!allValues.length) return null;
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const pad = (max - min) * 0.08 || 1;
        const yMin = min - pad;
        const yMax = max + pad;
        const width = 620;
        const height = 260;
        const leftPad = 40;
        const bottomPad = 26;
        const usableW = width - leftPad - 8;
        const usableH = height - bottomPad - 8;
        const x = i => leftPad + (dates.length <=1 ? usableW/2 : (i/(dates.length-1))*usableW);
        const y = v => 4 + (yMax===yMin ? usableH/2 : (1 - (v - yMin)/(yMax - yMin))*usableH);
        const fmtDate = d => `${d.getDate()}/${d.getMonth()+1}`;
        const buildPath = arr => arr.map((v,i)=> (typeof v === 'number' ? `${i===0?'M':'L'}${x(i)},${y(v)}` : '')).join(' ');
        const path20 = buildPath(p20);
        const path60 = buildPath(p60);
        const path90 = buildPath(p90);
        const ticksY = 5;
        const yVals = Array.from({length: ticksY+1}, (_,i)=> yMin + (i/ticksY)*(yMax-yMin));
        return (
            <svg width={width} height={height} role="img" aria-label="Forecast percentiles time series">
                <rect x={0} y={0} width={width} height={height} fill="#fff" stroke="#ddd" />
                {yVals.map(val => {
                    const yy = y(val);
                    return <g key={val}>
                        <line x1={leftPad} x2={width-4} y1={yy} y2={yy} stroke="#eee" />
                        <text x={leftPad-6} y={yy+4} fontSize={11} textAnchor="end" fill="#555">{val.toFixed(1)}</text>
                    </g>;
                })}
                {dates.map((d,i)=> (
                    <text key={i} x={x(i)} y={height-6} fontSize={11} textAnchor="middle" fill="#555">{fmtDate(d)}</text>
                ))}
                <path d={path20} fill="none" stroke="#1976d2" strokeWidth={2} />
                <path d={path60} fill="none" stroke="#ef6c00" strokeWidth={2} strokeDasharray="5 4" />
                <path d={path90} fill="none" stroke="#2e7d32" strokeWidth={2} strokeDasharray="3 3" />
                {/* Legend */}
                <g>
                    <rect x={leftPad+4} y={6} width={140} height={46} fill="#fafafa" stroke="#ddd" />
                    <line x1={leftPad+14} x2={leftPad+44} y1={18} y2={18} stroke="#1976d2" strokeWidth={3} />
                    <text x={leftPad+52} y={22} fontSize={12} fill="#1976d2">P20</text>
                    <line x1={leftPad+14} x2={leftPad+44} y1={32} y2={32} stroke="#ef6c00" strokeWidth={3} strokeDasharray="5 4" />
                    <text x={leftPad+52} y={36} fontSize={12} fill="#ef6c00">P60</text>
                    <line x1={leftPad+14} x2={leftPad+44} y1={46} y2={46} stroke="#2e7d32" strokeWidth={3} strokeDasharray="3 3" />
                    <text x={leftPad+52} y={50} fontSize={12} fill="#2e7d32">P90</text>
                </g>
            </svg>
        );
    }, [series]);

    const handleClose = () => setSelectedEntityId(null);

    return (
        <Dialog open={selectedEntityId != null} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{pr:5}}>
                Forecast percentiles{stationName ? ` - ${stationName}` : ''}
                <IconButton aria-label="close" onClick={handleClose} size="small" sx={{position:'absolute', right:8, top:8}}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {!selectedEntityId && <div style={{fontSize:13}}>Select a station to view the forecast series.</div>}
                {selectedEntityId && loading && <div style={{fontSize:13}}>Loading series…</div>}
                {selectedEntityId && error && <div style={{fontSize:13, color:'#b00020'}}>Error loading series.</div>}
                {selectedEntityId && !loading && !error && series && chart}
                {selectedEntityId && !loading && !error && !series && <div style={{fontSize:13}}>No data available for this station.</div>}
            </DialogContent>
        </Dialog>
    );
}

