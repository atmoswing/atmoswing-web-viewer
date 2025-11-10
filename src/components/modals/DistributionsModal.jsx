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
  Select,
  MenuItem,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import {useForecastSession} from '../../contexts/ForecastSessionContext.jsx';
import {
  getMethodsAndConfigs,
  getEntities,
  getAnalogValues,
  getAnalogyCriteria,
  getSeriesValuesPercentiles,
  getAnalogValuesPercentiles,
  getReferenceValues,
  getRelevantEntities
} from '../../services/api.js';
import {useTranslation} from 'react-i18next';
import * as d3 from 'd3';
// add caching + normalizers + shared components
import { useCachedRequest, clearCachedRequests } from '../../hooks/useCachedRequest.js';
import {
  extractTargetDatesArray,
  normalizeAnalogCriteriaArray,
  normalizeAnalogPercentiles,
  normalizeAnalogsResponse,
  normalizeEntitiesResponse,
  normalizeReferenceValues
} from '../../utils/apiNormalization.js';
import {DEFAULT_TTL, SHORT_TTL} from '../../utils/cacheTTLs.js';
import ExportMenu from './common/ExportMenu.jsx';
import { SELECTED_RPS, TEN_YEAR_COLOR } from './common/plotConstants.js';

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
  const { data: methodsResp, loading: methodsLoading } = useCachedRequest(
    methodsKey,
    async () => await getMethodsAndConfigs(workspace, activeForecastDate),
    [workspace, activeForecastDate, open],
    { enabled: !!methodsKey, initialData: null, ttlMs: DEFAULT_TTL }
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
  const { data: stationsRaw, loading: stationsLoading } = useCachedRequest(
    entitiesKey,
    async () => normalizeEntitiesResponse(await getEntities(workspace, activeForecastDate, selectedMethodId, resolvedConfigId)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, open],
    { enabled: !!entitiesKey, initialData: [], ttlMs: DEFAULT_TTL }
  );
  useEffect(() => {
    if (!open) return;
    const sorted = Array.isArray(stationsRaw) ? [...stationsRaw].sort((a,b) => String(a?.name ?? a?.id ?? '').localeCompare(String(b?.name ?? b?.id ?? ''), undefined, {sensitivity: 'base'})) : [];
    setStations(sorted);
    if (!selectedStationId && sorted.length) setSelectedStationId(sorted[0].id);
    if (selectedStationId && !sorted.find(s => s.id === selectedStationId)) setSelectedStationId(null);
  }, [open, stationsRaw]);

  // Leads via cache
  const leadsKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId ? `dist_leads|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}` : null;
  const { data: leadsRaw, loading: leadsLoading } = useCachedRequest(
    leadsKey,
    async () => {
      const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, [20]);
      const rawDates = extractTargetDatesArray(resp);
      let baseDate = null;
      if (forecastBaseDate && !isNaN(forecastBaseDate.getTime())) baseDate = forecastBaseDate;
      if (!baseDate && activeForecastDate) { try { const d = new Date(activeForecastDate); if (!isNaN(d)) baseDate = d; } catch {} }
      if (!baseDate && resp?.parameters?.forecast_date) { try { const d = new Date(resp.parameters.forecast_date); if (!isNaN(d)) baseDate = d; } catch {} }
      return rawDates.map(s => {
        let d = null; try { d = s ? new Date(s) : null; if (d && isNaN(d)) d = null; } catch { d = null; }
        const label = d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}${(d.getHours()||d.getMinutes()) ? ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') : ''}` : String(s);
        const leadNum = (d && baseDate) ? Math.round((d.getTime() - baseDate.getTime())/3600000) : null;
        return {lead: leadNum, date: d, label};
      }).filter(x => x.lead != null && !isNaN(x.lead) && x.lead >= 0).sort((a,b) => a.lead - b.lead);
    },
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, forecastBaseDate, open],
    { enabled: !!leadsKey, initialData: [], ttlMs: SHORT_TTL }
  );
  useEffect(() => {
    setLeads(leadsRaw || []);
    if ((selectedLead == null || selectedLead === '') && Array.isArray(leadsRaw) && leadsRaw.length) setSelectedLead(leadsRaw[0].lead);
  }, [leadsRaw, selectedLead]);

  // Analog values via cache
  const analogKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null && selectedLead != null ?
    `dist_analogs|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}|${selectedLead}` : null;
  const { data: analogResp, loading: analogLoading, error: analogError } = useCachedRequest(
    analogKey,
    async () => normalizeAnalogsResponse(await getAnalogValues(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, open],
    { enabled: !!analogKey, initialData: [], ttlMs: SHORT_TTL }
  );
  useEffect(() => { setAnalogValues(Array.isArray(analogResp) ? analogResp : null); }, [analogResp]);

  // Criteria via cache
  const criteriaKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null && selectedLead != null ?
    `dist_criteria|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}|${selectedLead}` : null;
  const { data: criteriaResp, loading: criteriaLoading } = useCachedRequest(
    criteriaKey,
    async () => normalizeAnalogCriteriaArray(await getAnalogyCriteria(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, open],
    { enabled: !!criteriaKey, initialData: null, ttlMs: SHORT_TTL }
  );
  useEffect(() => {
    if (criteriaResp) setCriteriaValues(criteriaResp.map((v, i) => ({ index: i + 1, value: v })).filter(x => x.value != null)); else setCriteriaValues(null);
  }, [criteriaResp]);

  // Percentile markers via cache
  const pctsKey = open && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null && selectedLead != null ?
    `dist_percentiles|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}|${selectedLead}` : null;
  const { data: percentilesMap } = useCachedRequest(
    pctsKey,
    async () => normalizeAnalogPercentiles(await getAnalogValuesPercentiles(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, [20,60,90])),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, selectedLead, open],
    { enabled: !!pctsKey, initialData: null, ttlMs: SHORT_TTL }
  );
  useEffect(() => { setPercentileMarkers(percentilesMap || null); }, [percentilesMap]);

  // Reference values via cache
  const refKey = open && (options.tenYearReturn || options.allReturnPeriods) && workspace && activeForecastDate && selectedMethodId && resolvedConfigId && selectedStationId != null ?
    `dist_reference|${workspace}|${activeForecastDate}|${selectedMethodId}|${resolvedConfigId}|${selectedStationId}` : null;
  const { data: refResp } = useCachedRequest(
    refKey,
    async () => normalizeReferenceValues(await getReferenceValues(workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId)),
    [workspace, activeForecastDate, selectedMethodId, resolvedConfigId, selectedStationId, options.tenYearReturn, options.allReturnPeriods, open],
    { enabled: !!refKey, initialData: null, ttlMs: DEFAULT_TTL }
  );
  useEffect(() => { setReferenceValues(refResp || null); }, [refResp]);

  // Cleanup on close: reset and clear caches for this modal
  useEffect(() => {
    if (!open) {
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

  const handleOptionChange = (key) => (e) => {
    const checked = e.target.checked;
    setOptions(o => {
      if (key === 'tenYearReturn') {
        return {...o, tenYearReturn: checked, allReturnPeriods: checked ? false : o.allReturnPeriods};
      }
      if (key === 'allReturnPeriods') {
        return {...o, allReturnPeriods: checked, tenYearReturn: checked ? false : o.tenYearReturn};
      }
      return {...o, [key]: checked};
    });
  };

  // Fetch analog values when selection changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId || selectedLead == null) {
        setAnalogValues(null);
        setAnalogError(null);
        setAnalogLoading(false);
        return;
      }
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
      if (!cfgId) {
        setAnalogValues(null);
        return;
      }
      setAnalogLoading(true);
      setAnalogError(null);
      try {
        const resp = await getAnalogValues(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead);
        if (cancelled) return;
        let arr;
        if (Array.isArray(resp)) arr = resp;
        else if (resp && Array.isArray(resp.analogs)) arr = resp.analogs;
        else if (resp && Array.isArray(resp.analog_values)) arr = resp.analog_values;
        else if (resp && Array.isArray(resp.values)) arr = resp.values;
        else if (resp && Array.isArray(resp.data)) arr = resp.data;
        else if (resp && Array.isArray(resp.items)) arr = resp.items;
        else arr = [];

        const values = arr.map((it, i) => {
          if (it == null) return {rank: i + 1, date: null, value: null, criteria: null};
          if (typeof it === 'number') return {rank: i + 1, date: null, value: it, criteria: null};
          const rank = it.rank ?? it.analog ?? (i + 1);
          const date = it.date ?? it.analog_date ?? it.dt ?? it.target_date ?? null;
          const v = (it.value != null) ? it.value : (it.precip_value != null ? it.precip_value : (it.value_mm != null ? it.value_mm : (it.amount != null ? it.amount : null)));
          const criteria = it.criteria ?? it.score ?? it.criterion ?? it.crit ?? null;
          if (v == null) {
            const numKeys = ['val', 'value_mm', 'precip', 'precipitation'];
            for (const k of numKeys) {
              if (it[k] != null && typeof it[k] === 'number') {
                return {rank, date, value: it[k], criteria};
              }
            }
          }
          return {rank, date, value: (typeof v === 'number' ? v : (v != null ? Number(v) : null)), criteria};
        });
        setAnalogValues(values);
      } catch (e) {
        if (!cancelled) setAnalogError(e);
        setAnalogValues([]);
      } finally {
        if (!cancelled) setAnalogLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

  // Fetch criteria distribution explicitly if available
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!open || !workspace || !activeForecastDate || !selectedMethodId || !selectedStationId || selectedLead == null) {
        setCriteriaValues(null);
        setCriteriaLoading(false);
        return;
      }
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      const cfgId = selectedConfigId || (methodNode && methodNode.configurations && methodNode.configurations[0] && methodNode.configurations[0].id) || null;
      if (!cfgId) {
        setCriteriaValues(null);
        return;
      }
      setCriteriaLoading(true);
      try {
        const resp = await getAnalogyCriteria(workspace, activeForecastDate, selectedMethodId, cfgId, selectedStationId, selectedLead);
        if (cancelled) return;
        let list = [];
        if (Array.isArray(resp)) list = resp;
        else if (resp && Array.isArray(resp.criteria)) list = resp.criteria;
        else if (resp && Array.isArray(resp.analogs)) list = resp.analogs.map(a => a.criteria ?? a.score ?? a.criterion).filter(v => v != null);
        else if (resp && Array.isArray(resp.values)) list = resp.values;
        else if (resp && Array.isArray(resp.data)) list = resp.data;
        setCriteriaValues(list.map((v, i) => ({
          index: i + 1,
          value: (typeof v === 'object' && v.value != null) ? v.value : v
        })).filter(x => x.value != null));
      } catch (e) {
        setCriteriaValues(null);
      } finally {
        if (!cancelled) setCriteriaLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, workspace, activeForecastDate, selectedMethodId, selectedConfigId, selectedStationId, selectedLead, methodsData]);

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

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="lg"
            sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '1100px'}}}>
      <DialogTitle sx={{pr: 5}}>
        {t('distributionPlots.title') || 'Distribution plots'}
        <IconButton aria-label={t('modalAnalogs.close') || 'Close'} onClick={onClose} size="small"
                    sx={{position: 'absolute', right: 8, top: 8}}>
          <CloseIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
            <FormControl fullWidth size="small">
              <InputLabel id="dist-method-label">{t('modalAnalogs.method')}</InputLabel>
              <Select variant="standard" labelId="dist-method-label" value={selectedMethodId ?? ''}
                      label={t('modalAnalogs.method')}
                      onChange={(e) => {
                        setSelectedMethodId(e.target.value);
                        setSelectedConfigId(null);
                        relevantRef.current.clear();
                        setRelevantMapVersion(v => v + 1);
                      }}>
                {methodsLoading && <MenuItem value=""><em>{t('modalAnalogs.loading')}</em></MenuItem>}
                {!methodsLoading && methodOptions.length === 0 &&
                  <MenuItem value=""><em>{t('modalAnalogs.noMethods')}</em></MenuItem>}
                {methodOptions.map(m => (<MenuItem key={m.id} value={m.id}>{m.name || m.id}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="dist-config-label">{t('modalAnalogs.config')}</InputLabel>
              <Select variant="standard" labelId="dist-config-label" value={selectedConfigId ?? ''}
                      label={t('modalAnalogs.config')}
                      onChange={(e) => setSelectedConfigId(e.target.value)} renderValue={(v) => {
                const cfg = configsForSelectedMethod.find(c => c.id === v);
                return cfg ? (cfg.name || cfg.id) : '';
              }}>
                {configsForSelectedMethod.length === 0 &&
                  <MenuItem value=""><em>{t('modalAnalogs.noConfigs')}</em></MenuItem>}
                {configsForSelectedMethod.map(cfg => (
                  <MenuItem key={cfg.id} value={cfg.id}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                      <Typography component="span">{cfg.name || cfg.id}</Typography>
                      {!!relevantRef.current.get(cfg.id) && (
                        <Typography variant="caption" sx={{
                          color: 'primary.main',
                          fontWeight: 600
                        }}>({t('modalAnalogs.relevant')})</Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="dist-entity-label">{t('modalAnalogs.entity')}</InputLabel>
              <Select variant="standard" labelId="dist-entity-label" value={selectedStationId ?? ''}
                      label={t('modalAnalogs.entity')}
                      onChange={(e) => setSelectedStationId(e.target.value)}
                      MenuProps={{PaperProps: {style: {maxHeight: 320}}}}>
                {stationsLoading && <MenuItem value=""><em>{t('modalAnalogs.loadingEntities')}</em></MenuItem>}
                {!stationsLoading && stations.length === 0 &&
                  <MenuItem value=""><em>{t('modalAnalogs.noEntities')}</em></MenuItem>}
                {stations.map(s => (<MenuItem key={s.id} value={s.id}>{s.name || s.id}</MenuItem>))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="dist-lead-label">{t('modalAnalogs.lead')}</InputLabel>
              <Select variant="standard" labelId="dist-lead-label" value={selectedLead ?? ''}
                      label={t('modalAnalogs.lead')}
                      onChange={(e) => setSelectedLead(e.target.value === '' ? null : Number(e.target.value))}>
                {leadsLoading && <MenuItem value=""><em>{t('modalAnalogs.loadingAnalogs')}</em></MenuItem>}
                {!leadsLoading && leads.length === 0 &&
                  <MenuItem value=""><em>{t('modalAnalogs.noLeads') || 'No lead times'}</em></MenuItem>}
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
              <ExportMenu t={t} onExportPNG={exportPNG} onExportSVG={exportSVG} onExportPDF={exportPDF} />
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
                    variant="caption">{t('modalAnalogs.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                {analogError && <Typography variant="caption"
                                            sx={{color: '#b00020'}}>{t('modalAnalogs.errorLoadingAnalogs') || 'Failed to load analogs'}</Typography>}
                {!analogLoading && !analogError && (!analogValues || (Array.isArray(analogValues) && analogValues.length === 0)) && (
                  <Typography variant="caption"
                              sx={{color: '#666'}}>{t('distributionPlots.noAnalogs') || 'No analog values for the selected method/config/entity/lead.'}</Typography>
                )}
                <div ref={precipRef} style={{width: '100%', height: 360, minHeight: 240}}/>
              </Box>
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <Box sx={{mt: 1}}>
                {(criteriaLoading) &&
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={20}/><Typography
                    variant="caption">{t('modalAnalogs.loadingAnalogs') || 'Loading...'}</Typography></Box>}
                {!criteriaLoading && (!criteriaValues || (Array.isArray(criteriaValues) && criteriaValues.length === 0)) && (
                  <Typography variant="caption"
                              sx={{color: '#666'}}>{t('distributionPlots.noCriteria') || 'No criteria values available for the selected selection.'}</Typography>
                )}
                <div ref={critRef} style={{width: '100%', height: 360, minHeight: 240}}/>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
