/**
 * @module components/toolbar/ForecastDatePickerDialog
 * @description Dialog for choosing a forecast run date and hour manually.
 *
 * Owns only the entry fields: it seeds them from the current run date, snaps the hour to the
 * allowed sub-daily values and hands the chosen `Date` back. Deciding what to do with that
 * date — reformatting it for the API and resetting the session — stays with the toolbar.
 */

import React, {useCallback, useEffect, useState} from 'react';
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
import {useTranslation} from 'react-i18next';
import {nearestSubDailyHour, SUB_HOURS} from '@/utils/targetDateUtils.js';
import {formatDateISO} from '@/utils/formattingUtils.js';

const pad = n => String(n).padStart(2, '0');

/**
 * Dialog letting the user pick a forecast run date and hour.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is shown
 * @param {Date|null} props.baseDate - Current forecast run date, used to seed the fields
 * @param {Function} props.onClose - Called when the dialog is dismissed
 * @param {Function} props.onConfirm - Called with the chosen `Date` when confirmed
 * @returns {React.ReactElement}
 * @example
 * <ForecastDatePickerDialog open={open} baseDate={forecastBaseDate}
 *                           onClose={close} onConfirm={applyDate}/>
 */
export default function ForecastDatePickerDialog({open, baseDate, onClose, onConfirm}) {
  const {t} = useTranslation();
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('00');

  useEffect(() => {
    if (baseDate && !isNaN(baseDate.getTime())) {
      setDate(formatDateISO(baseDate));
      setHour(pad(nearestSubDailyHour(baseDate.getHours())));
    } else {
      setDate('');
      setHour('00');
    }
  }, [baseDate]);

  const confirm = useCallback(() => {
    // An empty or unparseable field simply dismisses: there is nothing to apply.
    if (!date) {
      onClose();
      return;
    }
    const picked = new Date(`${date}T${hour || '00'}:00`);
    if (isNaN(picked.getTime())) {
      onClose();
      return;
    }
    onConfirm(picked);
  }, [date, hour, onClose, onConfirm]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('toolbar.pickDateTime')}</DialogTitle>
      <DialogContent>
        <div style={{display: 'flex', gap: 8, alignItems: 'center', minWidth: 240, marginTop: 10}}>
          <TextField
            label={t('toolbar.date')}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <FormControl variant="outlined" style={{minWidth: 120}}>
            <InputLabel id="toolbar-hour-label">{t('toolbar.hour')}</InputLabel>
            <Select
              labelId="toolbar-hour-label"
              id="toolbar-hour-select"
              value={hour}
              label={t('toolbar.hour')}
              onChange={e => setHour(e.target.value)}
              variant="outlined"
            >
              {SUB_HOURS.map(h => {
                const hh = pad(h);
                return <MenuItem key={hh} value={hh}>{hh}:00</MenuItem>;
              })}
            </Select>
          </FormControl>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={confirm} variant="contained">{t('ok')}</Button>
      </DialogActions>
    </Dialog>
  );
}
