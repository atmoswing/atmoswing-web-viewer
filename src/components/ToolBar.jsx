import React from 'react';

import FrameDistributionsIcon from '../assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '../assets/toolbar/frame_analogs.svg?react';

import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { useWorkspace } from '../WorkspaceContext.jsx';
import { useForecasts } from '../ForecastsContext.jsx';
import { getSynthesisTotal } from '../services/api.js';
import { valueToColorCSS } from '../utils/colors.js';

function ToolbarSquares() {
    const { workspace, workspaceData } = useWorkspace();
    const { percentile, normalizationRef } = useForecasts();
    const [dailySeries, setDailySeries] = React.useState([]); // [{date, valueNorm, subs:[{date,valueNorm}]}]
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const requestIdRef = React.useRef(0);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!workspace || !workspaceData?.date?.last_forecast_date) { setDailySeries([]); return; }
            const currentId = ++requestIdRef.current;
            setLoading(true); setError(null);
            try {
                const resp = await getSynthesisTotal(workspace, workspaceData.date.last_forecast_date, percentile, normalizationRef);
                if (cancelled || currentId !== requestIdRef.current) return;
                const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                const dailyEntries = [];
                const subDailyEntries = [];
                arr.forEach(sp => {
                    const dates = Array.isArray(sp.target_dates) ? sp.target_dates : [];
                    const valsNorm = Array.isArray(sp.values_normalized) ? sp.values_normalized : [];
                    const valsRaw = Array.isArray(sp.values) ? sp.values : [];
                    dates.forEach((dStr, idx) => {
                        const dt = dStr ? new Date(dStr) : null;
                        if (!dt) return;
                        const vNorm = (valsNorm[idx] !== undefined ? valsNorm[idx] : valsRaw[idx]);
                        const item = { time_step: sp.time_step, date: dt, valueNorm: vNorm };
                        if (sp.time_step === 24) dailyEntries.push(item); else subDailyEntries.push(item);
                    });
                });
                // Group daily by day key (YYYY-MM-DD) and associate sub-daily segments sharing same day
                const subMap = subDailyEntries.reduce((acc, it) => {
                    const key = `${it.date.getFullYear()}-${it.date.getMonth()}-${it.date.getDate()}`;
                    (acc[key] ||= []).push(it);
                    return acc;
                }, {});
                const daily = dailyEntries.sort((a,b)=>a.date-b.date).map(d => {
                    const key = `${d.date.getFullYear()}-${d.date.getMonth()}-${d.date.getDate()}`;
                    const subs = (subMap[key]||[]).sort((a,b)=>a.time_step-b.time_step);
                    return { ...d, subs };
                });
                setDailySeries(daily);
            } catch (e) {
                if (cancelled || currentId !== requestIdRef.current) return;
                setError(e); setDailySeries([]);
            } finally {
                if (cancelled || currentId !== requestIdRef.current) return;
                setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, percentile, normalizationRef]);

    const maxVal = 1; // normalized expected 0..1
    return (
        <div className="toolbar-left" style={{display:'flex', gap:4}}>
            {loading && <div style={{padding:'4px 8px', fontSize:12}}>Loading…</div>}
            {!loading && error && <div style={{padding:'4px 8px', fontSize:12, color:'#b00'}}>Err</div>}
            {!loading && !error && dailySeries.map((d, i) => {
                const color = valueToColorCSS(d.valueNorm, maxVal);
                const label = d.date ? `${String(d.date.getDate()).padStart(2,'0')}.${String(d.date.getMonth()+1).padStart(2,'0')}` : '';
                return (
                    <div key={i} className="toolbar-square" style={{background: color}} title={`Daily Value ${(d.valueNorm??NaN).toFixed ? d.valueNorm.toFixed(3): d.valueNorm}`}>
                        <span>{label}</span>
                        {d.subs.length > 0 && (
                            <div className="square-subdaily">
                                {d.subs.map((s, j) => {
                                    const subColor = valueToColorCSS(s.valueNorm, maxVal);
                                    return <div key={j} className="square-subdaily-seg" style={{background: subColor}} title={`t${s.time_step} ${(s.valueNorm??NaN).toFixed ? s.valueNorm.toFixed(3): s.valueNorm}`} />;
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ToolbarCenter() {
    const { workspace, workspaceData } = useWorkspace();
    const { percentile, normalizationRef, selectedMethodConfig } = useForecasts();
    const [forecastDateStr, setForecastDateStr] = React.useState('');
    const reqIdRef = React.useRef(0);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!workspace || !workspaceData?.date?.last_forecast_date) { setForecastDateStr(''); return; }
            const id = ++reqIdRef.current;
            try {
                const resp = await getSynthesisTotal(workspace, workspaceData.date.last_forecast_date, percentile, normalizationRef);
                if (cancelled || id !== reqIdRef.current) return;
                const fdStr = resp?.parameters?.forecast_date;
                if (fdStr) {
                    const fd = new Date(fdStr);
                    if (!isNaN(fd)) {
                        const dd = String(fd.getDate()).padStart(2,'0');
                        const mm = String(fd.getMonth()+1).padStart(2,'0');
                        const yyyy = fd.getFullYear();
                        const HH = String(fd.getHours()).padStart(2,'0');
                        setForecastDateStr(`${dd}.${mm}.${yyyy} ${HH}h`);
                        return;
                    }
                }
                setForecastDateStr('');
            } catch {
                if (cancelled || id !== reqIdRef.current) return;
                setForecastDateStr('');
            }
        }
        load();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, percentile, normalizationRef]);

    return (
        <div className="toolbar-center">
            <div className="toolbar-center-row">
                <span>Prévision du {forecastDateStr || '...'}</span>
                <button className="toolbar-center-btn"><KeyboardDoubleArrowLeftIcon fontSize="small" /></button>
                <button className="toolbar-center-btn"><KeyboardArrowLeftIcon fontSize="small" /></button>
                <button className="toolbar-center-btn"><KeyboardArrowRightIcon fontSize="small" /></button>
                <button className="toolbar-center-btn"><KeyboardDoubleArrowRightIcon fontSize="small" /></button>
            </div>
            <div>{selectedMethodConfig?.method ? `${selectedMethodConfig.method.name} (${selectedMethodConfig.method.id})` : ''}</div>
        </div>
    );
}

export default function ToolBar() {
    return (
        <header className="toolbar">
            <ToolbarSquares/>
            <ToolbarCenter/>
            <div className="toolbar-right">
                <button className="toolbar-icon-btn"><FrameDistributionsIcon/></button>
                <button className="toolbar-icon-btn"><FrameAnalogsIcon/></button>
            </div>
        </header>
    );
}