/**
 * @module components/modals/TimeSeriesModal
 * @description Modal displaying time series percentiles, best analogs, reference return periods and previous forecast histories.
 * Supports exporting charts (SVG/PNG/PDF) and dynamic configuration resolution for selected entity.
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as d3 from 'd3';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import {Box, Button, CircularProgress, Typography} from '@mui/material';
import Popper from '@mui/material/Popper';
import {
  useEntities,
  useForecastSession,
  useMethods,
  useSelectedEntity,
  useSynthesis
} from '@/contexts/forecast/ForecastsContext.jsx';
import {useForecastDetails} from '@/contexts/ForecastDetailsContext.jsx';
import {useTimeSeriesData} from './hooks/useTimeSeriesData.js';
import TimeSeriesChart from './charts/TimeSeriesChart.jsx';
import ExportMenu from './common/ExportMenu.jsx';
import ModalTitleBar from './common/ModalTitleBar.jsx';
import ChartOptionsGroup from './common/ChartOptionsGroup.jsx';
import {useChartOptions} from './hooks/useChartOptions.js';
import {useChartExport} from './hooks/useChartExport.js';
import {formatExportDatePart, safeForFilename} from './common/chartExport.js';
import {useTranslation} from 'react-i18next';
import {entityDisplayName} from '@/utils/formattingUtils.js';
import {leadHours, nearestDateIndex} from '@/utils/forecastDateUtils.js';

/** Display options offered by this modal, in the order they are listed. */
const SERIES_OPTION_KEYS = [
  'mainQuantiles',
  'allQuantiles',
  'bestAnalogs',
  'tenYearReturn',
  'allReturnPeriods',
  'previousForecasts'
];

/**
 * TimeSeriesModal component (no props - visibility controlled via selectedEntityId presence).
 * @returns {React.ReactElement|null}
 */
export default function TimeSeriesModal() {
  const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
  const {selectedMethodConfig} = useMethods();
  const {activeForecastDate, forecastBaseDate} = useForecastSession();
  const {selectedTargetDate} = useSynthesis();
  const {entities} = useEntities();
  const {openForecastDetails} = useForecastDetails();
  const {t} = useTranslation();

  // Sidebar state
  const {options, handleOptionChange} = useChartOptions({
    mainQuantiles: true,
    allQuantiles: false,
    bestAnalogs: false,
    tenYearReturn: true,
    allReturnPeriods: false,
    previousForecasts: false
  });

  const {
    series,
    referenceValues,
    bestAnalogs,
    pastForecasts,
    loading,
    error,
    resolvedConfigId,
    resolvingConfig
  } = useTimeSeriesData(options);

  const chartRef = useRef(null);
  // Tooltip state for best analogs (MUI Popper anchored to hovered D3 circle)
  const [analogTooltip, setAnalogTooltip] = useState({open: false, anchorEl: null, title: ''});

  const stationName = useMemo(
    () => entityDisplayName(entities, selectedEntityId),
    [entities, selectedEntityId]
  );

  const handleClose = () => setSelectedEntityId(null);

  // Hands over to the details window on the lead of `date`, for this station and method. The
  // configuration is left to the details window: it keeps one the app pins and otherwise picks the
  // one the station is relevant to, as this window did, and can then follow a change of station.
  const methodId = selectedMethodConfig?.method?.id;
  const openDetailsAt = useCallback((date) => {
    openForecastDetails({methodId, entityId: selectedEntityId, lead: leadHours(forecastBaseDate, date)});
    setSelectedEntityId(null);
  }, [openForecastDetails, methodId, selectedEntityId, forecastBaseDate, setSelectedEntityId]);

  // The title bar button opens on the date shown on the map, or the nearest one in the series.
  const openDetailsForMapDate = () => {
    const dates = series?.dates || [];
    openDetailsAt(dates[nearestDateIndex(dates, selectedTargetDate)] ?? dates[0] ?? null);
  };

  // Stable, because the chart redraws whenever a prop it is given changes identity. A hover
  // would otherwise replace the very element under the pointer, which then never gets its
  // `mouseleave` and leaves the tooltip on screen.
  const showHover = useCallback((anchorEl, title) => setAnalogTooltip({open: true, anchorEl, title}), []);
  const hideHover = useCallback(() => setAnalogTooltip(prev => ({...prev, open: false})), []);

  const findChartSVG = () => {
    const el = chartRef.current;
    if (!el) return null;
    return el.querySelector('svg');
  };

  const buildExportFilenamePrefix = () => {
    const datePart = formatExportDatePart(activeForecastDate);
    const entityPart = safeForFilename(stationName || selectedEntityId || 'entity');
    const methodIdPart = selectedMethodConfig?.method ? String(selectedMethodConfig.method.id || selectedMethodConfig.method.name || 'method') : 'method';
    const safeMethod = safeForFilename(methodIdPart);
    return [datePart, entityPart, safeMethod].filter(p => p).join('_') || 'series';
  };

  const {formats: chartFormats} = useChartExport({
    getSVG: findChartSVG,
    getBaseName: buildExportFilenamePrefix
  });
  // With no chart drawn there is nothing to export, and the exporters would quietly do nothing.
  const hasChart = !!series || (options.bestAnalogs && !!bestAnalogs);
  const exportFormats = chartFormats.map(format => ({...format, disabled: !hasChart}));

  // When the modal closes the request keys all go null and the hooks reset themselves.
  // The cached entries are deliberately kept: a forecast for a given station is immutable,
  // so reopening it should be instant, and the TTLs still bound staleness.
  useEffect(() => {
    if (selectedEntityId == null) {
      try {
        if (chartRef.current) d3.select(chartRef.current).selectAll('*').remove();
      } catch { /* container already detached; nothing to clean up */
      }
    }
  }, [selectedEntityId]);

  return (
    <Dialog open={selectedEntityId != null} onClose={handleClose} maxWidth={false} fullWidth
            sx={{
              '& .MuiPaper-root': {
                width: '90vw',
                maxWidth: '1000px',
                height: '50vh',
                minHeight: '460px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
              }
            }}>
      <ModalTitleBar title={stationName || ''} onClose={handleClose} closeLabel={t('seriesModal.close')}>
        <ExportMenu t={t} formats={exportFormats} sx={{marginLeft: 5}}/>
        <Button variant="outlined" size="small" onClick={openDetailsForMapDate} sx={{marginLeft: 1}}
                disabled={selectedEntityId == null}>
          {t('seriesModal.openDetails')}
        </Button>
      </ModalTitleBar>
      <DialogContent dividers
                     sx={{display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'stretch', flex: 1, minHeight: 0}}>
        {selectedEntityId && (
          <Box sx={{width: 220, flexShrink: 0, borderRight: '1px solid #e0e0e0', pr: 1, overflowY: 'auto'}}>
            <ChartOptionsGroup
              optionKeys={SERIES_OPTION_KEYS}
              options={options}
              onOptionChange={handleOptionChange}
              labelVariant="body2"
            />
          </Box>
        )}
        <Box sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!selectedEntityId && <div style={{fontSize: 13}}>{t('seriesModal.selectStation')}</div>}
          {selectedEntityId && (loading || resolvingConfig) && (
            <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
              <CircularProgress size={28}/>
              <Typography variant="caption"
                          sx={{color: '#555'}}>{resolvingConfig ? t('seriesModal.resolvingConfig') : t('seriesModal.loadingSeries')}</Typography>
            </Box>
          )}
          {selectedEntityId && error && !loading && !resolvingConfig && (
            <div style={{fontSize: 13, color: '#b00020'}}>{t('seriesModal.errorLoadingSeries')}</div>
          )}
          {selectedEntityId && !loading && !resolvingConfig && !error && (series || (options.bestAnalogs && bestAnalogs)) && (
            <div ref={chartRef} style={{position: 'relative', width: '100%', height: '100%', flex: 1, minHeight: 360}}>
              <TimeSeriesChart
                containerRef={chartRef}
                t={t}
                series={series}
                bestAnalogs={bestAnalogs}
                referenceValues={referenceValues}
                pastForecasts={pastForecasts}
                options={options}
                activeForecastDate={activeForecastDate}
                selectedMethodConfig={selectedMethodConfig}
                stationName={stationName}
                onHoverShow={showHover}
                onHoverHide={hideHover}
                onPickDate={openDetailsAt}
              />
            </div>
          )}
          {selectedEntityId && !loading && !resolvingConfig && !error && !series && !(options.bestAnalogs && bestAnalogs) && resolvedConfigId && (
            <div style={{fontSize: 13}}>{t('seriesModal.noDataForStation')}</div>
          )}
        </Box>
      </DialogContent>
      <Popper
        open={analogTooltip.open}
        anchorEl={analogTooltip.anchorEl}
        placement="top"
        modifiers={[{name: 'offset', options: {offset: [0, 8]}}]}
        sx={{zIndex: (theme) => theme.zIndex.modal + 1}}
      >
        <Box sx={{
          bgcolor: 'grey.900',
          color: 'grey.100',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          boxShadow: 3,
          fontSize: 12,
          maxWidth: 320,
          whiteSpace: 'pre-line'
        }}>
          {analogTooltip.title}
        </Box>
      </Popper>
    </Dialog>
  );
}
