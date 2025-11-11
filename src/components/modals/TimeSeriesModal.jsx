import React, {useEffect, useMemo, useRef, useState} from 'react';
import * as d3 from 'd3';
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
  Typography
} from '@mui/material';
import Popper from '@mui/material/Popper';
import {useEntities, useForecastSession, useMethods, useSelectedEntity} from '@/contexts/ForecastsContext.jsx';
import {
  getReferenceValues,
  getRelevantEntities,
  getSeriesBestAnalogs,
  getSeriesValuesPercentiles,
  getSeriesValuesPercentilesHistory
} from '@/services/api.js';
import {parseForecastDate} from '@/utils/forecastDateUtils.js';
import {useCachedRequest, clearCachedRequests} from '@/hooks/useCachedRequest.js';
import {DEFAULT_TTL, SHORT_TTL} from '@/utils/cacheTTLs.js';
import {
  normalizeReferenceValues,
  normalizeSeriesBestAnalogs,
  normalizeSeriesValuesPercentiles,
  normalizeSeriesValuesPercentilesHistory
} from '@/utils/apiNormalization.js';
import TimeSeriesChart from './charts/TimeSeriesChart.jsx';
import ExportMenu from './common/ExportMenu.jsx';
import {DEFAULT_PCTS, FULL_PCTS} from './common/plotConstants.js';
import { safeForFilename, downloadBlob, inlineAllStyles, getSVGSize, withTemporaryContainer } from './common/exportUtils.js';

export default function TimeSeriesModal() {
  const {selectedEntityId, setSelectedEntityId} = useSelectedEntity();
  const {selectedMethodConfig, methodConfigTree} = useMethods();
  const {workspace, activeForecastDate} = useForecastSession();
  const {entities} = useEntities();
  const {t} = useTranslation();

  const [series, setSeries] = useState(null);
  // referenceValues stores { axis: number[], values: number[] } or null
  const [referenceValues, setReferenceValues] = useState(null);
  // bestAnalogs: { items: Array<{label, values: number[]}>, dates?: Date[] }
  const [bestAnalogs, setBestAnalogs] = useState(null);
  // previous forecasts history
  const [pastForecasts, setPastForecasts] = useState(null);

  // Sidebar state
  const [options, setOptions] = useState({
    mainQuantiles: true,
    allQuantiles: false,
    bestAnalogs: false,
    tenYearReturn: true,
    allReturnPeriods: false,
    previousForecasts: false,
  });

  // Percentile sets used for requests (arrays lifted out of component to stabilize deps)
  const requestedPercentiles = useMemo(() => (options.allQuantiles ? FULL_PCTS : DEFAULT_PCTS), [options.allQuantiles]);

  const handleOptionChange = (key) => (e) => {
    const checked = e.target.checked;
    setOptions(o => {
      if (key === 'tenYearReturn') {
        // if enabling tenYearReturn, disable allReturnPeriods
        return {...o, tenYearReturn: checked, allReturnPeriods: checked ? false : o.allReturnPeriods};
      }
      if (key === 'allReturnPeriods') {
        // if enabling allReturnPeriods, disable tenYearReturn
        return {...o, allReturnPeriods: checked, tenYearReturn: checked ? false : o.tenYearReturn};
      }
      return {...o, [key]: checked};
    });
  };

  const chartRef = useRef(null);
  // Tooltip state for best analogs (MUI Popper anchored to hovered D3 circle)
  const [analogTooltip, setAnalogTooltip] = useState({open: false, anchorEl: null, title: ''});

  const [autoConfigId, setAutoConfigId] = useState(null);
  const [resolvingConfig, setResolvingConfig] = useState(false);
  const autoConfigCache = useRef(new Map()); // key: workspace|date|methodId|entityId -> configId

  // Effect to auto-determine config for selected entity if none chosen explicitly
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Reset previous auto config when dependencies change
      setAutoConfigId(null);
      setResolvingConfig(false);
      if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || selectedMethodConfig?.config || selectedEntityId == null) {
        // Explicit config selected or insufficient info; nothing to resolve
        return;
      }
      const methodNode = methodConfigTree.find(m => m.id === selectedMethodConfig.method.id);
      if (!methodNode || !methodNode.children?.length) {
        return;
      }
      const cacheKey = `${workspace}|${selectedMethodConfig.method.id}|${selectedEntityId}`;
      if (autoConfigCache.current.has(cacheKey)) {
        setAutoConfigId(autoConfigCache.current.get(cacheKey));
        return;
      }
      setResolvingConfig(true);
      // Try each config until entity is relevant
      for (const cfg of methodNode.children) {
        try {
          const rel = await getRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, cfg.id);
          if (cancelled) return;
          if (Array.isArray(rel?.entities) && rel.entities.find(e => e.id === selectedEntityId)) {
            autoConfigCache.current.set(cacheKey, cfg.id);
            setAutoConfigId(cfg.id);
            setResolvingConfig(false);
            return;
          }
        } catch {
          if (cancelled) return; // ignore individual errors and continue
        }
      }
      // Fallback to first config if none matched
      const fallback = methodNode.children[0].id;
      autoConfigCache.current.set(cacheKey, fallback);
      if (!cancelled) {
        setAutoConfigId(fallback);
        setResolvingConfig(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [workspace, activeForecastDate, selectedMethodConfig, selectedEntityId, methodConfigTree]);

  const resolvedConfigId = useMemo(() => {
    if (!selectedMethodConfig?.method) return null;
    if (selectedMethodConfig.config) return selectedMethodConfig.config.id; // user selection overrides
    if (resolvingConfig) return null; // delay until auto config determined
    if (autoConfigId) return autoConfigId;
    return null; // no config yet
  }, [selectedMethodConfig, autoConfigId, resolvingConfig]);

  // Clear series while waiting for config resolution to avoid flashing stale data
  useEffect(() => {
    setSeries(null);
  }, [resolvedConfigId, selectedEntityId, selectedMethodConfig, workspace, activeForecastDate]);

  // Series via useCachedRequest with normalization
  const seriesKey = useMemo(() => {
    if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
    const pctsKey = requestedPercentiles?.length ? requestedPercentiles.join(',') : '';
    return `series|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}|${pctsKey}`;
  }, [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, requestedPercentiles]);
  const {data: seriesData, loading, error} = useCachedRequest(
    seriesKey,
    async () => {
      const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId, requestedPercentiles);
      return normalizeSeriesValuesPercentiles(resp, parseForecastDate);
    },
    [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, requestedPercentiles],
    {enabled: !!seriesKey, initialData: null, ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setSeries(seriesData || null);
  }, [seriesData]);

  const stationName = useMemo(() => {
    if (selectedEntityId == null) return '';
    const match = entities?.find(e => e.id === selectedEntityId);
    return match?.name || match?.id || selectedEntityId;
  }, [selectedEntityId, entities]);

  const referenceKey = useMemo(() => {
    if (!(options.tenYearReturn || options.allReturnPeriods)) return null;
    if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
    return `series_ref|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
  }, [options.tenYearReturn, options.allReturnPeriods, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);
  const {data: refData} = useCachedRequest(
    referenceKey,
    async () => {
      const resp = await getReferenceValues(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
      return normalizeReferenceValues(resp);
    },
    [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, options.tenYearReturn, options.allReturnPeriods],
    {enabled: !!referenceKey, initialData: null, ttlMs: DEFAULT_TTL}
  );
  useEffect(() => {
    setReferenceValues(refData || null);
  }, [refData]);

  const bestAnalogsKey = useMemo(() => {
    if (!options.bestAnalogs) return null;
    if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
    return `series_bestanalogs|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
  }, [options.bestAnalogs, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);
  const {data: bestAnalogsData} = useCachedRequest(
    bestAnalogsKey,
    async () => {
      const resp = await getSeriesBestAnalogs(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
      const parsed = normalizeSeriesBestAnalogs(resp, parseForecastDate);
      if (parsed && Array.isArray(parsed.items)) {
        // add labels for display consistency
        parsed.items = parsed.items.map((it, idx) => ({label: t('seriesModal.analogWithIndex', {index: idx + 1}), ...it}));
      }
      return parsed;
    },
    [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId, t],
    {enabled: !!bestAnalogsKey, initialData: null, ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setBestAnalogs(bestAnalogsData || null);
  }, [bestAnalogsData]);

  const pastKey = useMemo(() => {
    if (!options.previousForecasts) return null;
    if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !resolvedConfigId || selectedEntityId == null) return null;
    return `series_history|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${resolvedConfigId}|${selectedEntityId}`;
  }, [options.previousForecasts, workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId]);
  const {data: pastData} = useCachedRequest(
    pastKey,
    async () => {
      const resp = await getSeriesValuesPercentilesHistory(workspace, activeForecastDate, selectedMethodConfig.method.id, resolvedConfigId, selectedEntityId);
      return normalizeSeriesValuesPercentilesHistory(resp, parseForecastDate);
    },
    [workspace, activeForecastDate, selectedMethodConfig, resolvedConfigId, selectedEntityId],
    {enabled: !!pastKey, initialData: null, ttlMs: DEFAULT_TTL}
  );
  useEffect(() => {
    setPastForecasts(pastData || null);
  }, [pastData]);

  const handleClose = () => setSelectedEntityId(null);

  const showHover = (anchorEl, title) => setAnalogTooltip({open: true, anchorEl, title});
  const hideHover = () => setAnalogTooltip(prev => ({...prev, open: false}));

  const findChartSVG = () => {
    const el = chartRef.current;
    if (!el) return null;
    return el.querySelector('svg');
  };

  const buildExportFilenamePrefix = () => {
    let datePart = '';
    if (activeForecastDate) {
      try {
        const d = parseForecastDate(activeForecastDate) || new Date(activeForecastDate);
        if (d && !isNaN(d)) datePart = d3.timeFormat('%Y-%m-%d')(d);
      } catch {}
    }
    const entityPart = safeForFilename(stationName || selectedEntityId || 'entity');
    const methodIdPart = selectedMethodConfig?.method ? String(selectedMethodConfig.method.id || selectedMethodConfig.method.name || 'method') : 'method';
    const safeMethod = safeForFilename(methodIdPart);
    return [datePart, entityPart, safeMethod].filter(p => p).join('_');
  };


  const exportSVG = () => {
    const svg = findChartSVG();
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serializer = new XMLSerializer();
    withTemporaryContainer(clone, () => {
      const svgStr = serializer.serializeToString(clone);
      const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
      const prefix = buildExportFilenamePrefix() || 'series';
      const filename = `${prefix}.svg`;
      downloadBlob(blob, filename);
    });
  };

  const exportPNG = async () => {
    const svg = findChartSVG();
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const {width, height} = getSVGSize(clone);
    const serializer = new XMLSerializer();
    let svgStr;
    withTemporaryContainer(clone, () => { svgStr = serializer.serializeToString(clone); });
    const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
      const scale = 3;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const prefix = buildExportFilenamePrefix() || 'series';
      const filename = `${prefix}.png`;
      downloadBlob(blob, filename);
    } catch (e) {
      console.error('Export PNG failed', e);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const exportPDF = async () => {
    const svg = findChartSVG();
    if (!svg) return;
    let jsPDFLib, svg2pdfModule;
    try {
      jsPDFLib = await import('jspdf');
      svg2pdfModule = await import('svg2pdf.js');
    } catch (e) {
      console.error('Failed to load PDF libraries', e);
      return;
    }
    const jsPDF = jsPDFLib.jsPDF || jsPDFLib.default || jsPDFLib;
    const svg2pdf = svg2pdfModule.svg2pdf || svg2pdfModule.default || svg2pdfModule;
    if (!jsPDF || !svg2pdf) {
      console.error('PDF libraries did not provide expected exports', {jsPDF, svg2pdf});
      return;
    }
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.appendChild(clone);
    document.body.appendChild(container);
    try {
      try { inlineAllStyles(clone); } catch {}
      let {width: svgW, height: svgH} = getSVGSize(clone);
      try {
        const bbox = clone.getBBox();
        if (bbox && Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
          const pad = 2;
          svgW = bbox.width + pad * 2;
          svgH = bbox.height + pad * 2;
          clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${svgW} ${svgH}`);
        } else {
          clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
        }
      } catch {
        clone.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
      }
      clone.setAttribute('width', String(Math.round(svgW)));
      clone.setAttribute('height', String(Math.round(svgH)));
      const pdfWidth = Math.round(svgW);
      const pdfHeight = Math.round(svgH);
      const pdf = new jsPDF({ unit: 'px', format: [pdfWidth, pdfHeight], orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait' });
      await svg2pdf(clone, pdf, {x: 0, y: 0, width: pdfWidth, height: pdfHeight});
      const prefix = buildExportFilenamePrefix() || 'series';
      const filename = `${prefix}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error('Export PDF (vector) failed', e);
    } finally {
      document.body.removeChild(container);
    }
  };

  // When modal closes (selectedEntityId becomes null), clear series state, caches, and chart DOM
  useEffect(() => {
    if (selectedEntityId == null) {
      setSeries(null);
      setReferenceValues(null);
      setBestAnalogs(null);
      setPastForecasts(null);
      try { if (chartRef.current) d3.select(chartRef.current).selectAll('*').remove(); } catch {}
      // clear cached series-related keys
      clearCachedRequests('series|');
      clearCachedRequests('series_ref|');
      clearCachedRequests('series_bestanalogs|');
      clearCachedRequests('series_history|');
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
        <IconButton aria-label={t('seriesModal.close')} onClick={handleClose} size="small"
                    sx={{position: 'absolute', right: 8, top: 8}}>
          <CloseIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers
                     sx={{display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'stretch', flex: 1, minHeight: 0}}>
        {selectedEntityId && (
          <Box sx={{width: 220, flexShrink: 0, borderRight: '1px solid #e0e0e0', pr: 1, overflowY: 'auto'}}>
            <FormGroup>
              <FormControlLabel control={<Checkbox size="small" checked={options.mainQuantiles}
                                                   onChange={handleOptionChange('mainQuantiles')}/>} label={<Typography variant="body2">{t('seriesModal.mainQuantiles')}</Typography>}/>
              <FormControlLabel control={<Checkbox size="small" checked={options.allQuantiles}
                                                   onChange={handleOptionChange('allQuantiles')}/>} label={<Typography variant="body2">{t('seriesModal.allQuantiles')}</Typography>}/>
              <FormControlLabel control={<Checkbox size="small" checked={options.bestAnalogs}
                                                   onChange={handleOptionChange('bestAnalogs')}/>} label={<Typography variant="body2">{t('seriesModal.bestAnalogs')}</Typography>}/>
              <FormControlLabel control={<Checkbox size="small" checked={options.tenYearReturn}
                                                   onChange={handleOptionChange('tenYearReturn')}/>} label={<Typography variant="body2">{t('seriesModal.tenYearReturn')}</Typography>}/>
              <FormControlLabel control={<Checkbox size="small" checked={options.allReturnPeriods}
                                                   onChange={handleOptionChange('allReturnPeriods')}/>} label={<Typography variant="body2">{t('seriesModal.allReturnPeriods')}</Typography>}/>
              <FormControlLabel control={<Checkbox size="small" checked={options.previousForecasts}
                                                   onChange={handleOptionChange('previousForecasts')}/>} label={<Typography variant="body2">{t('seriesModal.previousForecasts')}</Typography>}/>
            </FormGroup>
            <Box sx={{display: 'flex', justifyContent: 'center', mt: 1}}>
              <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF} />
            </Box>
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
              <Typography variant="caption" sx={{color: '#555'}}>{resolvingConfig ? t('seriesModal.resolvingConfig') : t('seriesModal.loadingSeries')}</Typography>
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
