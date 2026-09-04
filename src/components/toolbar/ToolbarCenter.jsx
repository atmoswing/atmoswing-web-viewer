/**
 * @module components/toolbar/ToolbarCenter
 * @description Central toolbar controls for forecast date navigation, manual date selection and restoration.
 */

import React, {useCallback, useMemo, useState} from 'react';
import Tooltip from '@mui/material/Tooltip';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import UpdateIcon from '@mui/icons-material/Update';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {useForecastSession, useMethods} from '@/contexts/forecast/ForecastsContext.jsx';
import {useWorkspace} from '@/contexts/WorkspaceContext.jsx';
import {useTranslation} from 'react-i18next';
import {formatForecastDateForApi} from '@/utils/forecastDateUtils.js';
import {formatDateHour} from '@/utils/formattingUtils.js';
import ForecastDatePickerDialog from './ForecastDatePickerDialog.jsx';

/**
 * ToolbarCenter component.
 * @returns {React.ReactElement}
 */
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
  const forecastDateStr = useMemo(() => formatDateHour(forecastBaseDate), [forecastBaseDate]);
  const buttonsDisabled = !activeForecastDate || baseDateSearching;
  const statusLabel = baseDateSearching ? t('toolbar.searching') : (forecastDateStr ? t('toolbar.forecastOf', {date: forecastDateStr}) : t('toolbar.loading'));

  const [dateDialogOpen, setDateDialogOpen] = useState(false);

  const closeDateDialog = useCallback(() => setDateDialogOpen(false), []);
  const handleCalendarClick = useCallback(() => setDateDialogOpen(true), []);

  const applyPickedDate = useCallback(picked => {
    const raw = formatForecastDateForApi(picked, activeForecastDatePattern || activeForecastDate);
    if (raw) {
      setActiveForecastDate(raw);
      fullReset(picked);
    }
    setDateDialogOpen(false);
  }, [activeForecastDatePattern, activeForecastDate, setActiveForecastDate, fullReset]);

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

      <ForecastDatePickerDialog
        open={dateDialogOpen}
        baseDate={forecastBaseDate}
        onClose={closeDateDialog}
        onConfirm={applyPickedDate}
      />
    </div>
  );
}
