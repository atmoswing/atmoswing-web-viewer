import React from 'react';

import FrameDistributionsIcon from '../assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '../assets/toolbar/frame_analogs.svg?react';

import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { useSynthesis, useMethods, useForecastSession } from '../contexts/ForecastsContext.jsx';
import { valueToColorCSS } from '../utils/colors.js';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';

function ToolbarSquares() {
    const { dailyLeads, subDailyLeads, selectedTargetDate, selectTargetDate } = useSynthesis();
    const maxVal = 1;

    // Canonical 4 sub-daily hours (00,06,12,18)
    const subHours = React.useMemo(() => [0,6,12,18], []);

    // Map dayKey -> sub segments (original grouping)
    const subByDay = React.useMemo(() => {
        const m = new Map();
        subDailyLeads.forEach(s => {
            const k = `${s.date.getFullYear()}-${s.date.getMonth()}-${s.date.getDate()}`;
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(s);
        });
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
                const subsByHour = new Map(subs.map(s => [s.date.getHours(), s]));
                const hasAnySub = subHours.some(hr => subsByHour.has(hr));
                const isSelected = selectedTargetDate && d.date.getFullYear()===selectedTargetDate.getFullYear() && d.date.getMonth()===selectedTargetDate.getMonth() && d.date.getDate()===selectedTargetDate.getDate() && (!selectedTargetDate.getHours() || subs.length===0);
                return (
                    <div
                        key={i}
                        className={`toolbar-square${isSelected ? ' selected' : ''}`}
                        style={{background: color}}
                        onClick={() => selectTargetDate(d.date, false)}
                    >
                        <span>{label}</span>
                        {subHours.length > 0 && (
                            <div
                                className={`square-subdaily${hasAnySub ? ' has-subs' : ''}`}
                                style={!hasAnySub ? {display:'none'} : undefined}
                                onClick={e=>{e.stopPropagation();}}
                            >
                                {subHours.map((hr, j) => {
                                    const s = subsByHour.get(hr);
                                    if (!s) return <div key={j} className="square-subdaily-seg placeholder"/>;
                                    const subColor = valueToColorCSS(s.valueNorm, maxVal);
                                    const subSelected = selectedTargetDate && s.date.getTime()===selectedTargetDate.getTime();
                                    return (
                                        <div
                                            key={j}
                                            className={`square-subdaily-seg${subSelected ? ' selected' : ''}`}
                                            style={{background: subColor}}
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
    const { t } = useTranslation();
    const { selectedMethodConfig } = useMethods();
    const { forecastBaseDate, shiftForecastBaseDate, activeForecastDate, baseDateSearching } = useForecastSession();
    const forecastDateStr = React.useMemo(() => {
        if (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) {
            const fd = forecastBaseDate;
            const dd = String(fd.getDate()).padStart(2,'0');
            const mm = String(fd.getMonth()+1).padStart(2,'0');
            const yyyy = fd.getFullYear();
            const HH = String(fd.getHours()).padStart(2,'0');
            return `${dd}.${mm}.${yyyy} ${HH}h`;
        }
        return '';
    }, [forecastBaseDate]);
    const buttonsDisabled = !activeForecastDate || baseDateSearching; // disable while searching
    const statusLabel = baseDateSearching ? t('toolbar.searching') : (forecastDateStr ? t('toolbar.forecastOf', { date: forecastDateStr }) : t('toolbar.loading'));
    return (
        <div className="toolbar-center">
            <div className="toolbar-center-row">
                <span>{statusLabel}</span>
                <Tooltip title="-24h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(-24)}><KeyboardDoubleArrowLeftIcon fontSize="small" /></button></span></Tooltip>
                <Tooltip title="-6h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(-6)}><KeyboardArrowLeftIcon fontSize="small" /></button></span></Tooltip>
                <Tooltip title="+6h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(6)}><KeyboardArrowRightIcon fontSize="small" /></button></span></Tooltip>
                <Tooltip title="+24h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(24)}><KeyboardDoubleArrowRightIcon fontSize="small" /></button></span></Tooltip>
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