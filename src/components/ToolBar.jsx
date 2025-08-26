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
    const [series, setSeries] = React.useState([]); // [{date: Date, valueNorm: number}]
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const requestIdRef = React.useRef(0);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!workspace || !workspaceData?.date?.last_forecast_date) { setSeries([]); return; }
            const currentId = ++requestIdRef.current;
            setLoading(true); setError(null);
            try {
                const resp = await getSynthesisTotal(workspace, workspaceData.date.last_forecast_date, percentile, normalizationRef);
                if (cancelled || currentId !== requestIdRef.current) return;
                const forecastDate = resp?.parameters?.forecast_date ? new Date(resp.parameters.forecast_date) : null;
                const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                const mapped = [];
                arr.forEach(sp => {
                    const dates = Array.isArray(sp.target_dates) ? sp.target_dates : [];
                    const valsNorm = Array.isArray(sp.values_normalized) ? sp.values_normalized : [];
                    const valsRaw = Array.isArray(sp.values) ? sp.values : [];
                    dates.forEach((dStr, idx) => {
                        const dt = dStr ? new Date(dStr) : null;
                        if (!dt) return;
                        const vNorm = (valsNorm[idx] !== undefined ? valsNorm[idx] : valsRaw[idx]);
                        let leadHours = null;
                        if (forecastDate && !isNaN(forecastDate)) {
                            leadHours = Math.round((dt - forecastDate) / 3600000);
                        }
                        mapped.push({
                            time_step: sp.time_step,
                            index: idx,
                            date: dt,
                            valueNorm: vNorm,
                            leadHours
                        });
                    });
                });
                // Sort by date/time then by index
                mapped.sort((a,b) => a.date - b.date || a.index - b.index);
                setSeries(mapped);
            } catch (e) {
                if (cancelled || currentId !== requestIdRef.current) return;
                setError(e);
                setSeries([]);
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
            {!loading && !error && series.map((s, i) => {
                const color = valueToColorCSS(s.valueNorm, maxVal);
                const label = s.date ? `${String(s.date.getDate()).padStart(2,'0')}.${String(s.date.getMonth()+1).padStart(2,'0')}` : '';
                return (
                    <div key={i} className="toolbar-square" style={{background: color}} title={`Lead ${s.leadHours!=null?s.leadHours+'h':s.time_step} Value ${(s.valueNorm??NaN).toFixed ? s.valueNorm.toFixed(3): s.valueNorm}`}>
                        <span>{label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function ToolbarCenter() {
    return (
        <div className="toolbar-center">
            <div className="toolbar-center-row">
                <span>Prévision du 15.06.2025 00h</span>
                <button className="toolbar-center-btn"><KeyboardDoubleArrowLeftIcon fontSize="small" /></button>
                <button className="toolbar-center-btn"><KeyboardArrowLeftIcon fontSize="small" /></button>
                <button className="toolbar-center-btn"><KeyboardArrowRightIcon fontSize="small" /></button>
                <button className="toolbar-center-btn"><KeyboardDoubleArrowRightIcon fontSize="small" /></button>
            </div>
            <div>Analogie circulation (4Zo) ARPEGE (4Zo-ARPGEPE)</div>
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