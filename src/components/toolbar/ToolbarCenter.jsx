import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import UpdateIcon from '@mui/icons-material/Update';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
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
import {useForecastSession, useMethods} from '../../contexts/ForecastsContext.jsx';
import {useWorkspace} from '../../contexts/WorkspaceContext.jsx';
import {useTranslation} from 'react-i18next';
import {SUB_HOURS} from '../../utils/targetDateUtils.js';
import {formatForecastDateForApi} from '../../utils/forecastDateUtils.js';

export default function ToolbarCenter() {
  const {t} = useTranslation();
  const {selectedMethodConfig} = useMethods();
  const {
    forecastBaseDate,
    shiftForecastBaseDate,
    activeForecastDate,
    activeForecastDatePattern,
    setActiveForecastDate,
    baseDateSearching,
    restoreLastAvailableForecast,
    fullReset
  } = useForecastSession();
  const {workspaceData} = useWorkspace();
  const isShowingLastForecast = !!(activeForecastDate && workspaceData?.date?.last_forecast_date && activeForecastDate === workspaceData.date.last_forecast_date);
  const forecastDateStr = React.useMemo(() => {
    if (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) {
      const fd = forecastBaseDate;
      const dd = String(fd.getDate()).padStart(2, '0');
      const mm = String(fd.getMonth() + 1).padStart(2, '0');
      const yyyy = fd.getFullYear();
      const HH = String(fd.getHours()).padStart(2, '0');
      return `${dd}.${mm}.${yyyy} ${HH}h`;
    }
    return '';
  }, [forecastBaseDate]);
  const buttonsDisabled = !activeForecastDate || baseDateSearching;
  const statusLabel = baseDateSearching ? t('toolbar.searching') : (forecastDateStr ? t('toolbar.forecastOf', {date: forecastDateStr}) : t('toolbar.loading'));

  const [dateDialogOpen, setDateDialogOpen] = React.useState(false);
  const [dialogDate, setDialogDate] = React.useState('');
  const [selectedHour, setSelectedHour] = React.useState('00');

  const allowedHours = React.useMemo(() => SUB_HOURS, []);

  React.useEffect(() => {
    if (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) {
      const d = forecastBaseDate;
      const pad = n => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      setDialogDate(`${yyyy}-${MM}-${dd}`);
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
    if (!dialogDate) {
      setDateDialogOpen(false);
      return;
    }
    const hour = selectedHour || '00';
    const iso = `${dialogDate}T${hour}:00`;
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) {
      setDateDialogOpen(false);
      return;
    }
    const raw = formatForecastDateForApi(dt, activeForecastDatePattern || activeForecastDate);
    if (raw) {
      setActiveForecastDate(raw);
      fullReset(dt);
    }
    setDateDialogOpen(false);
  }, [dialogDate, selectedHour, activeForecastDatePattern, activeForecastDate, setActiveForecastDate, fullReset]);

  const handleCalendarClick = React.useCallback(() => {
    setDateDialogOpen(true);
  }, []);

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
            <CalendarMonthIcon fontSize="small"/>
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
                                <UpdateIcon fontSize="small"/>
                            </button>
                        </span>
          </Tooltip>
        )}
        <span>{statusLabel}</span>
        <Tooltip title="-24h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled}
                                                  onClick={() => shiftForecastBaseDate(-24)}><KeyboardDoubleArrowLeftIcon
          fontSize="small"/></button></span></Tooltip>
        <Tooltip title="-6h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled}
                                                 onClick={() => shiftForecastBaseDate(-6)}><KeyboardArrowLeftIcon
          fontSize="small"/></button></span></Tooltip>
        <Tooltip title="+6h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled}
                                                 onClick={() => shiftForecastBaseDate(6)}><KeyboardArrowRightIcon
          fontSize="small"/></button></span></Tooltip>
        <Tooltip title="+24h" arrow><span><button className="toolbar-center-btn" disabled={buttonsDisabled}
                                                  onClick={() => shiftForecastBaseDate(24)}><KeyboardDoubleArrowRightIcon
          fontSize="small"/></button></span></Tooltip>
      </div>
      <div>{selectedMethodConfig?.method ? `${selectedMethodConfig.method.name} (${selectedMethodConfig.method.id})` : ''}</div>

      <Dialog open={dateDialogOpen} onClose={closeDateDialog} fullWidth maxWidth="xs">
        <DialogTitle>{t('toolbar.pickDateTime')}</DialogTitle>
        <DialogContent>
          <div style={{display: 'flex', gap: 8, alignItems: 'center', minWidth: 240, marginTop: 10}}>
            <TextField
              label={t('toolbar.date') || 'Date'}
              type="date"
              value={dialogDate}
              onChange={e => setDialogDate(e.target.value)}
            />
            <FormControl variant="outlined" style={{minWidth: 120}}>
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
                  const hh = String(h).padStart(2, '0');
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
