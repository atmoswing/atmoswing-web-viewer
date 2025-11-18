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
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
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
  getMethodsAndConfigs,
  getReferenceValues,
  getRelevantEntities,
  getSeriesValuesPercentiles
} from '@/services/api.js';
import {useTranslation} from 'react-i18next';
import * as d3 from 'd3';
// add caching + normalizers + shared components
import {clearCachedRequests, useCachedRequest} from '@/hooks/useCachedRequest.js';
import {
  extractTargetDatesArray,
  normalizeAnalogCriteriaArray,
  normalizeAnalogPercentiles,
  normalizeAnalogsResponse,
  normalizeEntitiesResponse,
  normalizeReferenceValues,
  normalizeRelevantEntityIds
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
  const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
  const {t} = useTranslation();

  // methods/configs
  const [methodsData, setMethodsData] = useState(null);

  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const [stations, setStations] = useState([]);
  const [leads, setLeads] = useState([]);
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

  // Relevant config highlighting: configId -> boolean (like ModalAnalogs)
  const relevantRef = useRef(new Map());
  const [, setRelevantMapVersion] = useState(0);
  const relevanceReqRef = useRef(0);

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

  // Methods & configs via cache
  const methodsKey = open && workspace && activeForecastDate ? `dist_methods|${workspace}|${activeForecastDate}` : null;
  const {data: methodsResp, loading: methodsLoading} = useCachedRequest(
    methodsKey,
    async () => await getMethodsAndConfigs(workspace, activeForecastDate),
    [workspace, activeForecastDate, open],
    {enabled: !!methodsKey, initialData: null, ttlMs: DEFAULT_TTL}
  );
  useEffect(() => {
    if (!open) return;
    if (!methodsResp?.methods?.length) return;
    const first = methodsResp.methods[0];
    setMethodsData(methodsResp);
    if (!selectedMethodId) setSelectedMethodId(first.id);
    const firstCfg = first?.configurations?.[0]?.id ?? null;
    if (!selectedConfigId && firstCfg) setSelectedConfigId(firstCfg);
  }, [open, methodsResp]);

  // Entities via cache
  const resolvedConfigId = useMemo(() => {
    if (!methodsResp?.methods) return selectedConfigId || null;
    const m = methodsResp.methods.find(mm => mm.id === selectedMethodId);
    return selectedConfigId || (m?.configurations?.[0]?.id ?? null);
  }, [methodsResp, selectedMethodId, selectedConfigId]);
  const entitiesKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId ? `dist_entities|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}` : null;
  const {data: stationsRaw, loading: stationsLoading} = useCachedRequest(
    entitiesKey,
    async () => normalizeEntitiesResponse(await getEntities(workspace, activeForecastDate, selectedMethodId, resolvedConfigId)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, open],
    {enabled: !!entitiesKey, initialData: [], ttlMs: DEFAULT_TTL}
  );
  useEffect(() => {
    if (!open) return;
    const sorted = Array.isArray(stationsRaw) ? [...stationsRaw].sort((a, b) => String(a?.name ?? a?.id ?? '').localeCompare(String(b?.name ?? b?.id ?? ''), undefined, {sensitivity: 'base'})) : [];
    setStations(sorted);
    if (!selectedStationId && sorted.length) setSelectedStationId(sorted[0].id);
    if (selectedStationId && !sorted.find(s => s.id === selectedStationId)) setSelectedStationId(null);
  }, [open, stationsRaw]);

  // Leads via cache
  const leadsKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId ? `dist_leads|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}` : null;
  const {data: leadsRaw, loading: leadsLoading} = useCachedRequest(
    leadsKey,
    async () => {
      const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, [20]);
      const rawDates = extractTargetDatesArray(resp);
      let baseDate = null;
      if (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) baseDate = forecastBaseDate;
      if (!baseDate && activeForecastDate) {
        try {
          const d = new Date(activeForecastDate);
          if (!isNaN(d)) baseDate = d;
        } catch {
        }
      }
      if (!baseDate && resp?.parameters?.forecast_date) {
        try {
          const d = new Date(resp.parameters.forecast_date);
          if (!isNaN(d)) baseDate = d;
        } catch {
        }
      }
      return rawDates.map(s => {
        let d = null;
        try {
          d = s ? new Date(s) : null;
          if (d && isNaN(d)) d = null;
        } catch {
          d = null;
        }
        const label = d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}${(d.getHours() || d.getMinutes()) ? ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''}` : String(s);
        const leadNum = (d && baseDate) ? Math.round((d.getTime() - baseDate.getTime()) / 3600000) : null;
        return {lead: leadNum, date: d, label};
      }).filter(x => x.lead != null && !isNaN(x.lead) && x.lead >= 0).sort((a, b) => a.lead - b.lead);
    },
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, forecastBaseDate, open],
    {enabled: !!leadsKey, initialData: [], ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setLeads(leadsRaw || []);
    if ((selectedLead == null || selectedLead === '') && Array.isArray(leadsRaw) && leadsRaw.length) setSelectedLead(leadsRaw[0].lead);
  }, [leadsRaw, selectedLead]);

  // Analog values via cache
  const analogKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null && selectedLead != null ?
    `dist_analogs|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}|${selectedLead}` : null;
  const {data: analogResp, loading: analogLoading, error: analogError} = useCachedRequest(
    analogKey,
    async () => normalizeAnalogsResponse(await getAnalogValues(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, open],
    {enabled: !!analogKey, initialData: [], ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setAnalogValues(Array.isArray(analogResp) ? analogResp : null);
  }, [analogResp]);

  // Criteria via cache (per-lead; endpoint does not take entity)
  const criteriaKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedLead != null ?
    `dist_criteria|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedLead}` : null;
  const {data: criteriaResp, loading: criteriaLoading} = useCachedRequest(
    criteriaKey,
    async () => normalizeAnalogCriteriaArray(await getAnalogyCriteria(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedLead)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedLead, open],
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
        return;
      }
    }
    // otherwise keep as null
  }, [criteriaResp, analogValues, selectedLead]);

  // Percentile markers via cache
  const pctsKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null && selectedLead != null ?
    `dist_percentiles|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}|${selectedLead}` : null;
  const {data: percentilesMap} = useCachedRequest(
    pctsKey,
    async () => normalizeAnalogPercentiles(await getAnalogValuesPercentiles(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, [20, 60, 90])),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, open],
    {enabled: !!pctsKey, initialData: null, ttlMs: SHORT_TTL}
  );
  useEffect(() => {
    setPercentileMarkers(percentilesMap || null);
  }, [percentilesMap]);

  // Reference values via cache
  const refKey = open && (options.tenYearReturn || options.allReturnPeriods) && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null ?
    `dist_reference|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}` : null;
  const {data: refResp} = useCachedRequest(
    refKey,
    async () => normalizeReferenceValues(await getReferenceValues(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, options.tenYearReturn, options.allReturnPeriods, open],
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
      setSelectedMethodId(null);
      setSelectedConfigId(null);
      setSelectedStationId(null);
      setSelectedLead(null);
      setMethodsData(null);
      setStations([]);
      setAnalogValues(null);
      setCriteriaValues(null);
      setBestAnalogsData(null);
      setPercentileMarkers(null);
      setReferenceValues(null);
      relevantRef.current.clear();
      setRelevantMapVersion(v => v + 1);
      clearCachedRequests('dist_');
    }
  }, [open]);

  const methodOptions = useMemo(() => (methodsData?.methods || []), [methodsData]);
  const configsForSelectedMethod = useMemo(() => {
    const m = methodOptions.find(x => x.id === selectedMethodId);
    return m?.configurations || [];
  }, [methodOptions, selectedMethodId]);

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

  // Export helpers and filename builder
  const stationName = useMemo(() => {
    const match = stations?.find(s => s.id === selectedStationId);
    return match?.name || match?.id || selectedStationId || '';
  }, [stations, selectedStationId]);
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
    const methodIdPart = (methodsData?.methods?.find(m => m.id === selectedMethodId)?.id) || 'method';
    const safeMethod = safeForFilename(methodIdPart);
    const leadPart = (selectedLead != null) ? `L${selectedLead}` : '';
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

  // Fetch 20/60/90 percentiles for markers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPercentileMarkers(null);
      if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId || selectedLead == null) return;
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
      if (!cfgId) return;
      try {
        const resp = await getAnalogValuesPercentiles(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead, [20, 60, 90]);
        if (cancelled) return;
        let pcts = [];
        let vals = [];
        if (resp) {
          if (Array.isArray(resp.percentiles) && Array.isArray(resp.values)) {
            pcts = resp.percentiles;
            vals = resp.values;
          } else if (Array.isArray(resp.items)) {
            pcts = resp.items.map(it => it.percentile);
            vals = resp.items.map(it => it.value);
          }
        }
        const map = {};
        if (Array.isArray(pcts) && Array.isArray(vals)) {
          for (let i = 0; i < pcts.length; i++) {
            const p = Number(pcts[i]);
            const v = Number(vals[i]);
            if (Number.isFinite(p) && Number.isFinite(v)) map[p] = v;
          }
        }
        if (Object.keys(map).length) setPercentileMarkers(map);
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

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

  // Fetch return period reference values
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReferenceValues(null);
      if (!(options.tenYearReturn || options.allReturnPeriods)) return;
      if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId) return;
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
      if (!cfgId) return;
      try {
        const resp = await getReferenceValues(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId);
        if (cancelled) return;
        if (resp && Array.isArray(resp.reference_axis) && Array.isArray(resp.reference_values) && resp.reference_axis.length === resp.reference_values.length) {
          const axis = resp.reference_axis.map(Number);
          const values = resp.reference_values.map(Number);
          setReferenceValues({axis, values});
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [options.tenYearReturn, options.allReturnPeriods, open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, methodsData]);

  // When station changes, compute which configs for the selected method are relevant to that station (like ModalAnalogs)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!open || !workspace || !activeForecastDate || !selectedMethodId || selectedStationId == null) {
        relevantRef.current.clear();
        setRelevantMapVersion(v => v + 1);
        return;
      }
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      if (!methodNode || !methodNode.configurations || !methodNode.configurations.length) return;
      const reqId = ++relevanceReqRef.current;
      const promises = methodNode.configurations.map(async (cfg) => {
        try {
          const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodId, cfg.id);
          if (cancelled || reqId !== relevanceReqRef.current) return null;
          let ids = [];
          if (Array.isArray(resp)) {
            ids = (typeof resp[0] === 'object') ? resp.map(r => r.id ?? r.entity_id).filter(v => v != null) : resp;
          } else if (resp && typeof resp === 'object') {
            ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
          }
          const setIds = new Set(ids);
          const isRelevant = setIds.has(selectedStationId);
          relevantRef.current.set(cfg.id, isRelevant);
        } catch (e) {
          relevantRef.current.set(cfg.id, false);
        }
      });
      try {
        await Promise.all(promises);
        if (!cancelled && reqId === relevanceReqRef.current) setRelevantMapVersion(v => v + 1);
      } catch {
        if (!cancelled && reqId === relevanceReqRef.current) setRelevantMapVersion(v => v + 1);
      }
    }

    const timer = setTimeout(run, 120);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [open, workspace, activeForecastDate, selectedMethodId, selectedStationId, methodsData]);

  // Relevant entity ids for selected method+config
  const relIdsKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId ? `dist_relIds|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}` : null;
  const {data: relevantIdsSet} = useCachedRequest(
    relIdsKey,
    async () => normalizeRelevantEntityIds(await getRelevantEntities(workspace, activeForecastDate, selectedMethodId, resolvedConfigId)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, open],
    {enabled: !!relIdsKey, initialData: new Set(), ttlMs: SHORT_TTL}
  );

  // Prefer default station to be relevant
  useEffect(() => {
    if (!open) return;
    const list = Array.isArray(stations) ? stations : [];
    if (!list.length) return;
    const rel = relevantIdsSet instanceof Set ? relevantIdsSet : new Set();
    const isSelValid = selectedStationId != null && list.some(s => s.id === selectedStationId);
    if (isSelValid) return;
    const firstRelevant = list.find(s => rel.has(s.id));
    if (firstRelevant) setSelectedStationId(firstRelevant.id);
    else if (!selectedStationId) setSelectedStationId(list[0].id);
  }, [open, stations, relevantIdsSet]);

  useEffect(() => { /* ensure setOptions referenced */
    if (!open) setOptions(o => o);
  }, [open]);

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="lg"
            sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '1100px'}}}>
      <DialogTitle sx={{pr: 5}}>
        {t('distributionPlots.title') || 'Distribution plots'}
        <IconButton aria-label={t('detailsAnalogsModal.close') || 'Close'} onClick={onClose} size="small"
                    sx={{position: 'absolute', right: 8, top: 8}}>
          <CloseIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
            <FormControl fullWidth size="small">
              <InputLabel id="dist-method-label">{t('detailsAnalogsModal.method')}</InputLabel>
              <Select variant="standard" labelId="dist-method-label" value={selectedMethodId ?? ''}
                      label={t('detailsAnalogsModal.method')}
                      onChange={(e) => {
                        setSelectedMethodId(e.target.value);
                        setSelectedConfigId(null);
                        relevantRef.current.clear();
                        setRelevantMapVersion(v => v + 1);
                      }}>
                {methodsLoading && <MenuItem value=""><em>{t('detailsAnalogsModal.loading')}</em></MenuItem>}
                {!methodsLoading && methodOptions.length === 0 &&
                  <MenuItem value=""><em>{t('detailsAnalogsModal.noMethods')}</em></MenuItem>}
                {methodOptions.map(m => (<MenuItem key={m.id} value={m.id}>{m.name || m.id}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="dist-config-label">{t('detailsAnalogsModal.config')}</InputLabel>
              <Select variant="standard" labelId="dist-config-label" value={selectedConfigId ?? ''}
                      label={t('detailsAnalogsModal.config')}
                      onChange={(e) => setSelectedConfigId(e.target.value)} renderValue={(v) => {
                const cfg = configsForSelectedMethod.find(c => c.id === v);
                return cfg ? (cfg.name || cfg.id) : '';
              }}>
                {configsForSelectedMethod.length === 0 &&
                  <MenuItem value=""><em>{t('detailsAnalogsModal.noConfigs')}</em></MenuItem>}
                {configsForSelectedMethod.map(cfg => (
                  <MenuItem key={cfg.id} value={cfg.id}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                      <Typography component="span">{cfg.name || cfg.id}</Typography>
                      {!!relevantRef.current.get(cfg.id) && (
                        <Typography variant="caption" sx={{
                          color: 'primary.main',
                          fontWeight: 600
                        }}>({t('detailsAnalogsModal.relevant')})</Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="dist-entity-label">{t('detailsAnalogsModal.entity')}</InputLabel>
              <Select variant="standard" labelId="dist-entity-label" value={selectedStationId ?? ''}
                      label={t('detailsAnalogsModal.entity')}
                      onChange={(e) => setSelectedStationId(e.target.value)}
                      MenuProps={{PaperProps: {style: {maxHeight: 320}}}}>
                {stationsLoading && <MenuItem value=""><em>{t('detailsAnalogsModal.loadingEntities')}</em></MenuItem>}
                {!stationsLoading && stations.length === 0 &&
                  <MenuItem value=""><em>{t('detailsAnalogsModal.noEntities')}</em></MenuItem>}
                {stations.map(s => (<MenuItem key={s.id} value={s.id}>{s.name || s.id}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="dist-lead-label">{t('detailsAnalogsModal.lead')}</InputLabel>
              <Select variant="standard" labelId="dist-lead-label" value={selectedLead ?? ''}
                      label={t('detailsAnalogsModal.lead')}
                      onChange={(e) => setSelectedLead(e.target.value === '' ? null : Number(e.target.value))}>
                {leadsLoading &&
                  <MenuItem value=""><em>{t('detailsAnalogsModal.loadingAnalogs') || 'Loading...'}</em></MenuItem>}
                {!leadsLoading && leads.length === 0 &&
                  <MenuItem value=""><em>{t('detailsAnalogsModal.noLeads') || 'No lead times'}</em></MenuItem>}
                {leads.map(l => (<MenuItem key={String(l.lead) + (l.label || '')}
                                           value={l.lead}>{l.label || (l.lead != null ? `${l.lead}h` : '')}</MenuItem>))}
              </Select>
            </FormControl>

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

            {/* Export button */}
            <Box sx={{display: 'flex', justifyContent: 'center', mt: 1}}>
              <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF}/>
            </Box>
          </Box>
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
                  selectedMethodId={selectedMethodId}
                  selectedConfigId={selectedConfigId}
                  selectedLead={selectedLead}
                  leads={leads}
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
                  selectedMethodId={selectedMethodId}
                  selectedConfigId={selectedConfigId}
                  selectedLead={selectedLead}
                  leads={leads}
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
