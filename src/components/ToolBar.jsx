import React from 'react';

import FrameDistributionsIcon from '../assets/toolbar/frame_distributions.svg?react';
import FrameAnalogsIcon from '../assets/toolbar/frame_analogs.svg?react';

import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import UpdateIcon from '@mui/icons-material/Update';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useSynthesis, useMethods, useForecastSession } from '../contexts/ForecastsContext.jsx';
import { useWorkspace } from '../contexts/WorkspaceContext.jsx';
import { valueToColorCSS } from '../utils/colors.js';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { formatForecastDateForApi } from '../utils/forecastDateUtils.js';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ModalAnalogs from './ModalAnalogs.jsx';
import ModalDistributions from './ModalDistributions.jsx';

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
    const { forecastBaseDate, shiftForecastBaseDate, activeForecastDate, activeForecastDatePattern, setActiveForecastDate, baseDateSearching, restoreLastAvailableForecast, fullReset } = useForecastSession();
    const { workspaceData } = useWorkspace();
    const isShowingLastForecast = !!(activeForecastDate && workspaceData?.date?.last_forecast_date && activeForecastDate === workspaceData.date.last_forecast_date);
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

    const [dateDialogOpen, setDateDialogOpen] = React.useState(false);
    // dialogDate is YYYY-MM-DD (date input), selectedHour is string like '00'|'06'|'12'|'18'
    const [dialogDate, setDialogDate] = React.useState('');
    const [selectedHour, setSelectedHour] = React.useState('00');

    const allowedHours = React.useMemo(() => [0,6,12,18], []);

    // initialize dialog fields from forecastBaseDate
    React.useEffect(() => {
        if (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) {
            const d = forecastBaseDate;
            const pad = n => String(n).padStart(2, '0');
            const yyyy = d.getFullYear();
            const MM = pad(d.getMonth()+1);
            const dd = pad(d.getDate());
            setDialogDate(`${yyyy}-${MM}-${dd}`);
            // snap to nearest allowed hour
            const h = d.getHours();
            let nearest = allowedHours[0];
            for (const ah of allowedHours) {
                if (Math.abs(ah - h) < Math.abs(nearest - h)) nearest = ah;
            }
            setSelectedHour(pad(nearest));
        } else {
            setDialogDate('');
            setSelectedHour('00');
        }
    }, [forecastBaseDate, allowedHours]);

    const closeDateDialog = React.useCallback(() => setDateDialogOpen(false), []);
    const saveDateDialog = React.useCallback(() => {
        if (!dialogDate) { setDateDialogOpen(false); return; }
        // combine date + selectedHour into local Date, minutes always 00
        const hour = selectedHour || '00';
        const iso = `${dialogDate}T${hour}:00`;
        const dt = new Date(iso);
        if (isNaN(dt.getTime())) { setDateDialogOpen(false); return; }
        const raw = formatForecastDateForApi(dt, activeForecastDatePattern || activeForecastDate);
        if (raw) {
            setActiveForecastDate(raw);
            fullReset(dt);
        }
        setDateDialogOpen(false);
    }, [dialogDate, selectedHour, activeForecastDatePattern, activeForecastDate, setActiveForecastDate, fullReset]);

    // Click handler for the calendar button — opens the single dialog picker
    const handleCalendarClick = React.useCallback(() => {
        setDateDialogOpen(true);
    }, [forecastBaseDate]);

    return (
        <div className="toolbar-center">
            <div className="toolbar-center-row">
                <Tooltip title={t('toolbar.pickDateTime')} arrow>
                    <button
                        className="toolbar-center-btn"
                        onClick={handleCalendarClick}
                        aria-label={t('toolbar.pickDateTime')}
                        type="button"
                    >
                        <CalendarMonthIcon fontSize="small" />
                    </button>
                </Tooltip>
                {!isShowingLastForecast && (
                    <Tooltip title={t('toolbar.restoreLastForecast')} arrow>
                        <span>
                            <button
                                className="toolbar-center-btn"
                                disabled={baseDateSearching}
                                onClick={() => restoreLastAvailableForecast && restoreLastAvailableForecast()}
                                aria-label={t('toolbar.restoreLastForecast')}
                            >
                                <UpdateIcon fontSize="small" />
                            </button>
                        </span>
                    </Tooltip>
                )}
                <span>{statusLabel}</span>
                <Tooltip title="-24h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(-24)}><KeyboardDoubleArrowLeftIcon fontSize="small" /></button></span></Tooltip>
                <Tooltip title="-6h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(-6)}><KeyboardArrowLeftIcon fontSize="small" /></button></span></Tooltip>
                <Tooltip title="+6h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(6)}><KeyboardArrowRightIcon fontSize="small" /></button></span></Tooltip>
                <Tooltip title="+24h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled} onClick={()=>shiftForecastBaseDate(24)}><KeyboardDoubleArrowRightIcon fontSize="small" /></button></span></Tooltip>
            </div>
            <div>{selectedMethodConfig?.method ? `${selectedMethodConfig.method.name} (${selectedMethodConfig.method.id})` : ''}</div>

            {/* Dialog picker (single method) */}
            <Dialog open={dateDialogOpen} onClose={closeDateDialog} fullWidth maxWidth="xs">
                <DialogTitle>{t('toolbar.pickDateTime')}</DialogTitle>
                <DialogContent>
                    <div style={{display:'flex', gap:8, alignItems:'center', minWidth:240, marginTop:10}}>
                        <TextField
                            label={t('toolbar.date') || 'Date'}
                            type="date"
                            value={dialogDate}
                            onChange={e => setDialogDate(e.target.value)}
                        />
                        <FormControl variant="outlined" style={{minWidth:120}}>
                            <InputLabel id="toolbar-hour-label">{t('toolbar.hour') || 'Hour'}</InputLabel>
                            <Select
                                labelId="toolbar-hour-label"
                                id="toolbar-hour-select"
                                value={selectedHour}
                                label={t('toolbar.hour') || 'Hour'}
                                onChange={e => setSelectedHour(e.target.value)}
                                variant="outlined"
                            >
                                {allowedHours.map(h => {
                                    const hh = String(h).padStart(2,'0');
                                    return <MenuItem key={hh} value={hh}>{hh}:00</MenuItem>;
                                })}
                            </Select>
                        </FormControl>
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDateDialog}>{t('cancel') || 'Cancel'}</Button>
                    <Button onClick={saveDateDialog} variant="contained">{t('ok') || 'OK'}</Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}

export default function ToolBar() {
    // Local state for the Analogs modal (navigation inside modal remains local)
    const [modalAnalogsOpen, setModalAnalogsOpen] = React.useState(false);
    // Local state for the Distributions modal
    const [modalDistributionsOpen, setModalDistributionsOpen] = React.useState(false);

    const handleModalAnalogsClose = (result) => {
        // close modal first
        setModalAnalogsOpen(false);
        // If modal returned a selection object, log it for now.
        // We intentionally do NOT sync these selections with global app state here.
        if (result && typeof result === 'object') {
            console.log('Analogs modal selection:', result);
        }
    };

    const handleModalDistributionsClose = (result) => {
        // close modal
        setModalDistributionsOpen(false);
        if (result && typeof result === 'object') {
            console.log('Distributions modal selection:', result);
        }
    };

    return (
        <>
        <header className="toolbar">
            <ToolbarSquares/>
            <ToolbarCenter/>
            <div className="toolbar-right">
                <button className="toolbar-icon-btn" onClick={() => setModalDistributionsOpen(true)}><FrameDistributionsIcon/></button>
                <button className="toolbar-icon-btn" onClick={() => setModalAnalogsOpen(true)}><FrameAnalogsIcon/></button>
            </div>
        </header>
        <ModalAnalogs open={modalAnalogsOpen} onClose={handleModalAnalogsClose} />
        <ModalDistributions open={modalDistributionsOpen} onClose={handleModalDistributionsClose} />
        </>
    );
}