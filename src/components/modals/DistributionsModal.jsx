/**
 * @module components/modals/DistributionsModal
 * @description Modal displaying precipitation and criteria distributions for a selected method/config/entity/lead.
 * Provides percentile markers, reference return periods, best analog overlays and export options.
 */

import React, {useEffect, useRef, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import {useForecastSession} from '@/contexts/forecast/ForecastSessionContext.jsx';
import {useTranslation} from 'react-i18next';
import * as d3 from 'd3';
import {useDistributionData} from './hooks/useDistributionData.js';
import ExportMenu from './common/ExportMenu.jsx';
import {
  exportChartPDF,
  exportChartPNG,
  exportChartSVG,
  formatExportDatePart,
  safeForFilename
} from './common/exportUtils.js';
import PrecipitationDistributionChart from './charts/PrecipitationDistributionChart.jsx';
import CriteriaDistributionChart from './charts/CriteriaDistributionChart.jsx';
import MethodConfigSelector from './common/MethodConfigSelector.jsx';

function TabPanel({children, value, index, ...other}) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{pt: 1}}>{children}</Box>
      )}
    </div>
  );
}

/**
 * DistributionsModal component.
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is open
 * @param {Function} props.onClose - Close callback
 * @returns {React.ReactElement}
 */
export default function DistributionsModal({open, onClose}) {
  const {activeForecastDate} = useForecastSession();
  const {t} = useTranslation();

  // Local selections managed by shared selector component
  const [selection, setSelection] = useState({
    methodId: null,
    configId: null,
    entityId: null,
    lead: null
  });

  const [tabIndex, setTabIndex] = useState(0);
  // options for precipitation plot (best analogs / return periods)
  const [options, setOptions] = useState({bestAnalogs: false, tenYearReturn: true, allReturnPeriods: false});
  // trigger to force chart redraw on resize/tab change
  const [renderTick, setRenderTick] = useState(0);

  // chart refs
  const precipRef = useRef(null);
  const critRef = useRef(null);

  const {
    analogValues,
    analogLoading,
    analogError,
    criteriaValues,
    criteriaLoading,
    bestAnalogsData,
    percentileMarkers,
    referenceValues,
    stationName,
    resolvedMethodId,
    resolvedConfigId
  } = useDistributionData({open, selection, options});

  // redraw on window resize (debounced)
  useEffect(() => {
    let timer = null;

    function handler() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setRenderTick(t => t + 1), 120);
    }

    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Cleanup on close: the request keys go null with `open`, so only the chart DOM
  // and the local selection need resetting.
  useEffect(() => {
    if (!open) {
      // Clear chart containers immediately for visual cleanup
      try {
        if (precipRef.current) d3.select(precipRef.current).selectAll('*').remove();
      } catch { /* container already detached; nothing to clean up */
      }
      try {
        if (critRef.current) d3.select(critRef.current).selectAll('*').remove();
      } catch { /* container already detached; nothing to clean up */
      }
      setSelection({
        methodId: null,
        configId: null,
        entityId: null,
        lead: null
      });
    }
  }, [open]);


  // Option toggles (mutual exclusion for return period checkboxes)
  const handleOptionChange = (key) => (e) => {
    const checked = e.target.checked;
    setOptions(prev => {
      if (key === 'tenYearReturn') {
        return {...prev, tenYearReturn: checked, allReturnPeriods: checked ? false : prev.allReturnPeriods};
      }
      if (key === 'allReturnPeriods') {
        return {...prev, allReturnPeriods: checked, tenYearReturn: checked ? false : prev.tenYearReturn};
      }
      return {...prev, [key]: checked};
    });
  };

  const buildExportFilenamePrefix = () => {
    const datePart = formatExportDatePart(activeForecastDate);
    const entityPart = safeForFilename(stationName || 'entity');
    const safeMethod = safeForFilename(resolvedMethodId || 'method');
    const leadPart = (selection.lead != null) ? `L${selection.lead}` : '';
    const tabPart = tabIndex === 0 ? 'distribution' : 'criteria';
    return [datePart, entityPart, safeMethod, leadPart, tabPart].filter(Boolean).join('_') || 'distribution';
  };

  const findCurrentChartSVG = () => {
    const el = tabIndex === 0 ? precipRef.current : critRef.current;
    return el ? el.querySelector('svg') : null;
  };

  const exportSVG = () => exportChartSVG(findCurrentChartSVG(), buildExportFilenamePrefix());
  const exportPNG = () => exportChartPNG(findCurrentChartSVG(), buildExportFilenamePrefix());
  const exportPDF = () => exportChartPDF(findCurrentChartSVG(), buildExportFilenamePrefix());

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="lg"
            sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '1100px'}}}>
      <DialogTitle sx={{pr: 5}}>
        {t('distributionPlots.title') || 'Distribution plots'}
        <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF} sx={{marginLeft: 5}}/>
        <IconButton aria-label={t('detailsAnalogsModal.close') || 'Close'} onClick={onClose} size="small"
                    sx={{position: 'absolute', right: 8, top: 8}}>
          <CloseIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
          <MethodConfigSelector
            open={open}
            value={selection}
            onChange={setSelection}
          >
            {tabIndex === 0 && (
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox checked={options.bestAnalogs} onChange={handleOptionChange('bestAnalogs')}
                                     size="small"/>} label={t('seriesModal.bestAnalogs')}/>
                <FormControlLabel
                  control={<Checkbox checked={options.tenYearReturn} onChange={handleOptionChange('tenYearReturn')}
                                     size="small"/>} label={t('seriesModal.tenYearReturn')}/>
                <FormControlLabel control={<Checkbox checked={options.allReturnPeriods}
                                                     onChange={handleOptionChange('allReturnPeriods')} size="small"/>}
                                  label={t('seriesModal.allReturnPeriods')}/>
              </FormGroup>
            )}
          </MethodConfigSelector>
          <Box sx={{borderLeft: '1px dashed #e0e0e0', pl: 2, minHeight: 360}}>
            <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
              <Tab label={t('distributionPlots.predist') || 'Predictands distribution'}/>
              <Tab label={t('distributionPlots.critdist') || 'Criteria distribution'}/>
            </Tabs>
            <TabPanel value={tabIndex} index={0}>
              <Box sx={{mt: 1}}>
                {analogLoading &&
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={20}/><Typography
                    variant="caption">{t('detailsAnalogsModal.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                {analogError && <Typography variant="caption"
                                            sx={{color: '#b00020'}}>{t('detailsAnalogsModal.errorLoadingAnalogs') || 'Failed to load analogs'}</Typography>}
                {!analogLoading && !analogError && (!analogValues || (Array.isArray(analogValues) && analogValues.length === 0)) && (
                  <Typography variant="caption"
                              sx={{color: '#666'}}>{t('distributionPlots.noAnalogs') || 'No analog values for the selected method/config/entity/lead.'}</Typography>
                )}
                <PrecipitationDistributionChart
                  ref={precipRef}
                  analogValues={analogValues}
                  bestAnalogsData={bestAnalogsData}
                  percentileMarkers={percentileMarkers}
                  referenceValues={referenceValues}
                  options={options}
                  selectedMethodId={resolvedMethodId}
                  selectedConfigId={resolvedConfigId}
                  selectedLead={selection.lead}
                  leads={[]}
                  activeForecastDate={activeForecastDate}
                  stationName={stationName}
                  t={t}
                  renderTick={renderTick}
                />
              </Box>
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <Box sx={{mt: 1}}>
                {(criteriaLoading) &&
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={20}/><Typography
                    variant="caption">{t('detailsAnalogsModal.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                {!criteriaLoading && (!criteriaValues || (Array.isArray(criteriaValues) && criteriaValues.length === 0)) && (
                  <Typography variant="caption"
                              sx={{color: '#666'}}>{t('distributionPlots.noCriteria') || 'No criteria values available for the selected selection.'}</Typography>
                )}
                <CriteriaDistributionChart
                  ref={critRef}
                  criteriaValues={criteriaValues}
                  analogValues={analogValues}
                  selectedMethodId={resolvedMethodId}
                  selectedConfigId={resolvedConfigId}
                  selectedLead={selection.lead}
                  leads={[]}
                  activeForecastDate={activeForecastDate}
                  stationName={stationName}
                  t={t}
                  renderTick={renderTick}
                />
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
