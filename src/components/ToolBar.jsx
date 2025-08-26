import React from 'react';

import FrameDistributionsIcon from '../assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '../assets/toolbar/frame_analogs.svg?react';

import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { useWorkspace } from '../WorkspaceContext.jsx';
import { useForecasts } from '../ForecastsContext.jsx';
import { valueToColorCSS } from '../utils/colors.js';

function ToolbarSquares() {
    const { dailyLeads, subDailyLeads, selectedTargetDate, selectTargetDate } = useForecasts();
    const maxVal = 1;

    // Build a map dayKey -> sub segments
    const subByDay = React.useMemo(() => {
        const m = new Map();
        subDailyLeads.forEach(s => {
            const k = `${s.date.getFullYear()}-${s.date.getMonth()}-${s.date.getDate()}`;
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(s);
        });
        // sort segments by date ascending
        m.forEach(arr => arr.sort((a,b)=>a.date-b.date));
        return m;
    }, [subDailyLeads]);

    return (
        <div className="toolbar-left" style={{display:'flex', gap:4}}>
            {dailyLeads.map((d,i) => {
                const label = `${String(d.date.getDate()).padStart(2,'0')}.${String(d.date.getMonth()+1).padStart(2,'0')}`;
                const color = valueToColorCSS(d.valueNorm, maxVal);
                const key = `${d.date.getFullYear()}-${d.date.getMonth()}-${d.date.getDate()}`;
                const subs = subByDay.get(key) || [];
                const isSelected = selectedTargetDate && d.date.getFullYear()===selectedTargetDate.getFullYear() && d.date.getMonth()===selectedTargetDate.getMonth() && d.date.getDate()===selectedTargetDate.getDate();
                return (
                    <div
                        key={i}
                        className={`toolbar-square${isSelected ? ' selected' : ''}`}
                        style={{background: color}}
                        title={`Daily Value ${(d.valueNorm??NaN).toFixed ? d.valueNorm.toFixed(3): d.valueNorm}`}
                        onClick={() => selectTargetDate(d.date, false)}
                    >
                        <span>{label}</span>
                        {subs.length > 0 && (
                            <div className="square-subdaily" onClick={e=>{e.stopPropagation();}}>
                                {subs.map((s,j)=> {
                                    const subColor = valueToColorCSS(s.valueNorm, maxVal);
                                    const subSelected = selectedTargetDate && s.date.getTime()===selectedTargetDate.getTime();
                                    return (
                                        <div
                                            key={j}
                                            className={`square-subdaily-seg${subSelected ? ' selected' : ''}`}
                                            style={{background: subColor}}
                                            title={`t${s.time_step} ${(s.valueNorm??NaN).toFixed ? s.valueNorm.toFixed(3): s.valueNorm}`}
                                            onClick={() => selectTargetDate(s.date, true)}
                                        />
                                    );
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
    const { workspace } = useWorkspace();
    const { percentile, normalizationRef, selectedMethodConfig, forecastBaseDate } = useForecasts();
    const forecastDateStr = React.useMemo(() => {
        if (!forecastBaseDate || isNaN(forecastBaseDate)) return '';
        const fd = forecastBaseDate;
        const dd = String(fd.getDate()).padStart(2,'0');
        const mm = String(fd.getMonth()+1).padStart(2,'0');
        const yyyy = fd.getFullYear();
        const HH = String(fd.getHours()).padStart(2,'0');
        return `${dd}.${mm}.${yyyy} ${HH}h`;
    }, [forecastBaseDate]);
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