import React, {useEffect, useMemo, useRef, useState} from 'react';
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
import {useForecastSession} from '@/contexts/ForecastSessionContext.jsx';
import {
  getAnalogValues,
  getAnalogValuesPercentiles,
  getAnalogyCriteria,
  getEntities,
  getReferenceValues
} from '@/services/api.js';
import {useTranslation} from 'react-i18next';
import * as d3 from 'd3';
// add caching + normalizers + shared components
import {clearCachedRequests, useCachedRequest} from '@/hooks/useCachedRequest.js';
import {
  normalizeAnalogCriteriaArray,
  normalizeAnalogPercentiles,
  normalizeAnalogsResponse,
  normalizeEntitiesResponse,
  normalizeReferenceValues
} from '@/utils/apiNormalization.js';
import {DEFAULT_TTL, SHORT_TTL} from '@/utils/cacheTTLs.js';
import ExportMenu from './common/ExportMenu.jsx';
import {
  downloadBlob,
  getSVGSize,
  inlineAllStyles,
  safeForFilename,
  withTemporaryContainer
} from './common/exportUtils.js';
import PrecipitationDistributionChart from './charts/PrecipitationDistributionChart.jsx';
import CriteriaDistributionChart from './charts/CriteriaDistributionChart.jsx';
import MethodConfigSelector, {useModalSelectionData} from './common/MethodConfigSelector.jsx';

function TabPanel({children, value, index, ...other}) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{pt: 1}}>{children}</Box>
      )}
    </div>
  );
}

export default function DistributionsModal({open, onClose}) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {t} = useTranslation();

  // Local selections managed by shared selector component
  const [selection, setSelection] = useState({
    methodId: null,
    configId: null,
    entityId: null,
    lead: null
  });

  // Get resolved IDs from the selector
  const {resolvedMethodId, resolvedConfigId, resolvedEntityId} = useModalSelectionData('dist_', open, selection);

  const [analogValues, setAnalogValues] = useState(null);
  const [criteriaValues, setCriteriaValues] = useState(null);

  const [tabIndex, setTabIndex] = useState(0);
  // options for precipitation plot (best analogs / return periods)
  const [options, setOptions] = useState({bestAnalogs: false, tenYearReturn: true, allReturnPeriods: false});
  const [bestAnalogsData, setBestAnalogsData] = useState(null);
  const [percentileMarkers, setPercentileMarkers] = useState(null); // map percentile -> value
  const [referenceValues, setReferenceValues] = useState(null); // { axis:number[], values:number[] }
  // trigger to force chart redraw on resize/tab change
  const [renderTick, setRenderTick] = useState(0);

  // chart refs
  const precipRef = useRef(null);
  const critRef = useRef(null);

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


  // Analog values via cache
  const analogKey = open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId && resolvedEntityId != null && selection.lead != null ?
    `dist_analogs|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}|${resolvedEntityId}|${selection.lead}` : null;
  const {data: analogResp, loading: analogLoading, error: analogError} = useCachedRequest(
    analogKey,
    async () => normalizeAnalogsResponse(await getAnalogValues(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead)),
    [workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead, open],
    {enabled: !!analogKey, initialData: [], ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setAnalogValues(Array.isArray(analogResp) ? analogResp : null);
  }, [analogResp]);

  // Criteria via cache (per-lead; endpoint does not take entity)
  const criteriaKey = open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId && selection.lead != null ?
    `dist_criteria|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}|${selection.lead}` : null;
  const {data: criteriaResp, loading: criteriaLoading} = useCachedRequest(
    criteriaKey,
    async () => normalizeAnalogCriteriaArray(await getAnalogyCriteria(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, selection.lead)),
    [workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, selection.lead, open],
    {enabled: !!criteriaKey, initialData: null, ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    if (Array.isArray(criteriaResp) && criteriaResp.length) {
      setCriteriaValues(criteriaResp.map((v, i) => ({index: i + 1, value: v})).filter(x => x.value != null));
    } else {
      setCriteriaValues(null);
    }
  }, [criteriaResp]);

  // Fallback: if no criteriaResp available, derive criteria from current analogValues for the selected lead
  useEffect(() => {
    if (Array.isArray(criteriaResp) && criteriaResp.length) return; // prefer API-provided criteria
    if (Array.isArray(analogValues) && analogValues.length) {
      const derived = analogValues
        .map(a => (a && a.criteria != null ? Number(a.criteria) : null))
        .filter(v => v != null && Number.isFinite(v));
      if (derived.length) {
        setCriteriaValues(derived.map((v, i) => ({index: i + 1, value: v})));
      }
    }
    // otherwise keep as null
  }, [criteriaResp, analogValues, selection.lead]);

  // Percentile markers via cache
  const pctsKey = open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId && resolvedEntityId != null && selection.lead != null ?
    `dist_percentiles|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}|${resolvedEntityId}|${selection.lead}` : null;
  const {data: percentilesMap} = useCachedRequest(
    pctsKey,
    async () => normalizeAnalogPercentiles(await getAnalogValuesPercentiles(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead, [20, 60, 90])),
    [workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead, open],
    {enabled: !!pctsKey, initialData: null, ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setPercentileMarkers(percentilesMap || null);
  }, [percentilesMap]);

  // Reference values via cache
  const refKey = open && (options.tenYearReturn || options.allReturnPeriods) && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId && resolvedEntityId != null ?
    `dist_reference|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}|${resolvedEntityId}` : null;
  const {data: refResp} = useCachedRequest(
    refKey,
    async () => normalizeReferenceValues(await getReferenceValues(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId)),
    [workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, options.tenYearReturn, options.allReturnPeriods, open],
    {enabled: !!refKey, initialData: null, ttlMs: DEFAULT_TTL}
  );
  useEffect(() => {
    setReferenceValues(refResp || null);
  }, [refResp]);

  // Cleanup on close: reset and clear caches for this modal
  useEffect(() => {
    if (!open) {
      // Clear chart containers immediately for visual cleanup
      try {
        if (precipRef.current) d3.select(precipRef.current).selectAll('*').remove();
      } catch {
      }
      try {
        if (critRef.current) d3.select(critRef.current).selectAll('*').remove();
      } catch {
      }
      setSelection({
        methodId: null,
        configId: null,
        entityId: null,
        lead: null
      });
      setAnalogValues(null);
      setCriteriaValues(null);
      setBestAnalogsData(null);
      setPercentileMarkers(null);
      setReferenceValues(null);
      clearCachedRequests('dist_');
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

  // Export helpers and filename builder - fetch entities for display name
  const entitiesForExportKey = open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId ?
    `dist_entities|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}` : null;
  const {data: entitiesForExport} = useCachedRequest(
    entitiesForExportKey,
    async () => normalizeEntitiesResponse(await getEntities(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId)),
    [workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, open],
    {enabled: !!entitiesForExportKey, initialData: [], ttlMs: DEFAULT_TTL}
  );

  const stationName = useMemo(() => {
    const match = entitiesForExport?.find(s => s.id === resolvedEntityId);
    return match?.name || match?.id || resolvedEntityId || '';
  }, [entitiesForExport, resolvedEntityId]);
  const buildExportFilenamePrefix = () => {
    let datePart = '';
    if (activeForecastDate) {
      try {
        const d = new Date(activeForecastDate);
        if (d && !isNaN(d)) datePart = d3.timeFormat('%Y-%m-%d')(d);
      } catch { /* ignore */
      }
    }
    const entityPart = safeForFilename(stationName || 'entity');
    const methodIdPart = resolvedMethodId || 'method';
    const safeMethod = safeForFilename(methodIdPart);
    const leadPart = (selection.lead != null) ? `L${selection.lead}` : '';
    const tabPart = tabIndex === 0 ? 'distribution' : 'criteria';
    return [datePart, entityPart, safeMethod, leadPart, tabPart].filter(Boolean).join('_');
  };
  const findCurrentChartSVG = () => {
    const el = tabIndex === 0 ? precipRef.current : critRef.current;
    return el ? el.querySelector('svg') : null;
  };
  const exportSVG = () => {
    const svg = findCurrentChartSVG();
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serializer = new XMLSerializer();
    withTemporaryContainer(clone, () => {
      const svgStr = serializer.serializeToString(clone);
      downloadBlob(new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'}), `${buildExportFilenamePrefix() || 'distribution'}.svg`);
    });
  };
  const exportPNG = async () => {
    const svg = findCurrentChartSVG();
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const {width, height} = getSVGSize(clone);
    const serializer = new XMLSerializer();
    let svgStr;
    withTemporaryContainer(clone, () => {
      svgStr = serializer.serializeToString(clone);
    });
    const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      downloadBlob(blob, `${buildExportFilenamePrefix() || 'distribution'}.png`);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const exportPDF = async () => {
    const svg = findCurrentChartSVG();
    if (!svg) return;
    let jsPDFLib, svg2pdfModule;
    try {
      jsPDFLib = await import('jspdf');
      svg2pdfModule = await import('svg2pdf.js');
    } catch {
      return;
    }
    const jsPDF = jsPDFLib.jsPDF || jsPDFLib.default || jsPDFLib;
    const svg2pdf = svg2pdfModule.svg2pdf || svg2pdfModule.default || svg2pdfModule;
    if (!jsPDF || !svg2pdf) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.appendChild(clone);
    document.body.appendChild(container);
    try {
      try {
        inlineAllStyles(clone);
      } catch {
      }
      let {width: svgW, height: svgH} = getSVGSize(clone);
      try {
        const bbox = clone.getBBox();
        if (bbox && Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
          const pad = 2;
          svgW = bbox.width + 2 * pad;
          svgH = bbox.height + 2 * pad;
          clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${svgW} ${svgH}`);
        } else {
          clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
        }
      } catch {
        clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
      }
      clone.setAttribute('width', String(Math.round(svgW)));
      clone.setAttribute('height', String(Math.round(svgH)));
      const pdf = new jsPDF({
        unit: 'px',
        format: [Math.round(svgW), Math.round(svgH)],
        orientation: svgW > svgH ? 'landscape' : 'portrait'
      });
      await svg2pdf(clone, pdf, {x: 0, y: 0, width: Math.round(svgW), height: Math.round(svgH)});
      pdf.save(`${buildExportFilenamePrefix() || 'distribution'}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  // Draw precipitation distribution
  useEffect(() => {
    // removed: drawing moved to PrecipitationDistributionChart
  }, []);

  // Draw criteria distribution
  useEffect(() => {
    // removed: drawing moved to CriteriaDistributionChart
  }, []);


  // Derive 10 best analogs from already loaded analogValues when option enabled
  useEffect(() => {
    setBestAnalogsData(null);
    if (!options.bestAnalogs) return;
    const list = Array.isArray(analogValues) ? analogValues : [];
    if (!list.length) return;
    // Prefer sorting by criteria (ascending = better) if available, otherwise by rank ascending
    const withCriteria = list.filter(a => a && a.criteria != null && isFinite(Number(a.criteria)) && a.value != null && isFinite(Number(a.value)));
    const withValue = list.filter(a => a && a.value != null && isFinite(Number(a.value)));
    let selected;
    if (withCriteria.length >= 10) {
      selected = [...withCriteria].sort((a, b) => Number(a.criteria) - Number(b.criteria)).slice(0, 10);
    } else {
      selected = [...withValue].sort((a, b) => (Number(a.rank ?? Infinity) - Number(b.rank ?? Infinity))).slice(0, 10);
    }
    if (selected.length) {
      setBestAnalogsData(selected.map(a => ({rank: a.rank, value: Number(a.value)})));
    }
  }, [options.bestAnalogs, analogValues]);


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
            cachePrefix="dist_"
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
