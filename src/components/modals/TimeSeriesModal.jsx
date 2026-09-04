/**
 * @module components/modals/TimeSeriesModal
 * @description Modal displaying time series percentiles, best analogs, reference return periods and previous forecast histories.
 * Supports exporting charts (SVG/PNG/PDF) and dynamic configuration resolution for selected entity.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import * as d3 from 'd3';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {Box, CircularProgress, Typography} from '@mui/material';
import Popper from '@mui/material/Popper';
import {useEntities, useForecastSession, useMethods, useSelectedEntity} from '@/contexts/forecast/ForecastsContext.jsx';
import {useTimeSeriesData} from './hooks/useTimeSeriesData.js';
import TimeSeriesChart from './charts/TimeSeriesChart.jsx';
import ExportMenu from './common/ExportMenu.jsx';
import ChartOptionsGroup from './common/ChartOptionsGroup.jsx';
import {useChartOptions} from './hooks/useChartOptions.js';
import {useChartExport} from './hooks/useChartExport.js';
import {formatExportDatePart, safeForFilename} from './common/exportUtils.js';
import {useTranslation} from 'react-i18next';
import {entityDisplayName} from '@/utils/formattingUtils.js';

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
  const {activeForecastDate} = useForecastSession();
  const {entities} = useEntities();
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

  const showHover = (anchorEl, title) => setAnalogTooltip({open: true, anchorEl, title});
  const hideHover = () => setAnalogTooltip(prev => ({...prev, open: false}));

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

  const {exportSVG, exportPNG, exportPDF} = useChartExport({
    getSVG: findChartSVG,
    getBaseName: buildExportFilenamePrefix
  });

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
      <DialogTitle sx={{pr: 5}}>
        {stationName ? `${stationName}` : ''}
        <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF} sx={{marginLeft: 5}}/>
        <IconButton aria-label={t('seriesModal.close')} onClick={handleClose} size="small"
                    sx={{position: 'absolute', right: 8, top: 8}}>
          <CloseIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
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
                onHoverShow={(anchor, title) => showHover(anchor, title)}
                onHoverHide={hideHover}
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
