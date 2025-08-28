import React, {createContext, useContext, useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';
import {getEntities, getAggregatedEntitiesValues, getEntitiesValuesPercentile, getRelevantEntities, getSynthesisTotal, getSynthesisPerMethod} from './services/api.js';

const ForecastsContext = createContext();

export function ForecastsProvider({children}) {
    const { workspace, workspaceData } = useWorkspace();

    // Build method/config tree from workspaceData
    const methodConfigTree = useMemo(() => {
        if (!workspaceData?.methodsAndConfigs?.methods) return [];
        return workspaceData.methodsAndConfigs.methods.map(method => ({
            id: method.id,
            name: method.name,
            children: (method.configurations || []).map(cfg => ({
                id: cfg.id,
                name: cfg.name
            }))
        }));
    }, [workspaceData]);

    const [selectedMethodConfig, setSelectedMethodConfig] = useState(null);

    // Reset selection when workspace changes
    useEffect(() => {
        setSelectedMethodConfig(null);
        // Clear entities immediately to avoid stale fit in map
        setEntities([]);
        entitiesWorkspaceRef.current = workspace; // tag cleared state to new workspace
        // Reset lead related state so that "forecast unavailable" message is not shown during initial load
        setDailyLeads([]);
        setSubDailyLeads([]);
        setSelectedLead(0);
        setSelectedTargetDate(null);
        setForecastUnavailable(false);
        setForecastBaseDate(null);
    }, [workspace]);

    // Auto-select first method when data arrives or tree changes (only for current workspace)
    useEffect(() => {
        if (!selectedMethodConfig && methodConfigTree.length > 0) {
            const first = { workspace, method: methodConfigTree[0], config: null };
            setSelectedMethodConfig(first);
        }
    }, [methodConfigTree, selectedMethodConfig, workspace]);

    // Entities for current selection (need them also when only a method is selected -> use first config just to fetch entities)
    const [entities, setEntities] = useState([]);
    const entitiesWorkspaceRef = useRef(null); // workspace key for which entities are valid
    const [entitiesLoading, setEntitiesLoading] = useState(false);
    const [entitiesError, setEntitiesError] = useState(null);
    const [entitiesVersion, setEntitiesVersion] = useState(0); // manual refresh counter
    const entitiesRequestIdRef = useRef(0);
    const entitiesCacheRef = useRef(new Map()); // cache for entity fetch results
    const entitiesFailedRef = useRef(new Set()); // cacheKey set for failed entity fetches

    const refreshEntities = useCallback(() => setEntitiesVersion(v => v + 1), []);

    useEffect(() => {
        let cancelled = false;
        async function loadEntities() {
            if (!workspaceData || !selectedMethodConfig || !selectedMethodConfig.method) {
                setEntities([]);
                setEntitiesLoading(false);
                setEntitiesError(null);
                return;
            }
            // Guard: selection belongs to previous workspace -> wait for reset
            if (selectedMethodConfig.workspace && selectedMethodConfig.workspace !== workspace) {
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            // Ensure method still exists in current workspace tree
            if (!methodConfigTree.find(m => m.id === methodId)) {
                return;
            }
            // Use selected config if present, else first one for this method (only to get locations)
            let configId = selectedMethodConfig.config?.id;
            if (!configId) {
                const method = methodConfigTree.find(m => m.id === methodId);
                configId = method?.children?.[0]?.id;
                if (!configId) { // cannot load entities
                    setEntities([]);
                    setEntitiesLoading(false);
                    return;
                }
            }
            const date = workspaceData.date?.last_forecast_date;
            if (!date) {
                setEntities([]);
                setEntitiesLoading(false);
                return;
            }
            setEntitiesLoading(true);
            setEntitiesError(null);
            const currentId = ++entitiesRequestIdRef.current;
            const cacheKey = `${workspace}|${date}|${methodId}|${configId}`;
            try {
                if (entitiesFailedRef.current.has(cacheKey)) {
                    // Avoid hammering after failure until manual refresh
                    setEntitiesLoading(false);
                    return;
                }
                const cached = entitiesCacheRef.current.get(cacheKey);
                if (cached) {
                    setEntities(cached);
                    entitiesWorkspaceRef.current = workspace;
                    setEntitiesLoading(false);
                    return;
                }
                const list = await getEntities(workspace, date, methodId, configId);
                if (cancelled || currentId !== entitiesRequestIdRef.current) return; // stale
                setEntities(list.entities || list || []);
                entitiesWorkspaceRef.current = workspace;
                entitiesCacheRef.current.set(cacheKey, list.entities || list || []);
            } catch (e) {
                if (cancelled || currentId !== entitiesRequestIdRef.current) return; // stale
                console.error('Entities load failed:', e);
                setEntitiesError(e);
                setEntities([]);
                entitiesWorkspaceRef.current = workspace;
                entitiesCacheRef.current.delete(cacheKey); // don't cache failures
                entitiesFailedRef.current.add(cacheKey);
            } finally {
                if (cancelled || currentId !== entitiesRequestIdRef.current) return; // stale
                setEntitiesLoading(false);
            }
        }
        loadEntities();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, selectedMethodConfig, entitiesVersion, methodConfigTree]);

    // Forecast values (aggregated if method only, else per config)
    const [forecastValuesNorm, setForecastValuesNorm] = useState({}); // id -> normalized value
    const [forecastValues, setForecastValues] = useState({}); // id -> raw (non-normalized) value
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastError, setForecastError] = useState(null);
    const [percentile, setPercentile] = useState(90); // selected percentile (e.g. 90)
    const [normalizationRef, setNormalizationRef] = useState(10); // e.g. 2, 5, 10
    const [forecastUnavailable, setForecastUnavailable] = useState(false); // lead time not available flag
    // Lead time & synthesis series
    const [selectedLead, setSelectedLead] = useState(0); // index in active resolution series
    const [selectedTargetDate, setSelectedTargetDate] = useState(null); // Date object of selected lead target
    const [leadResolution, setLeadResolution] = useState('daily'); // 'daily' | 'sub'
    const [dailyLeads, setDailyLeads] = useState([]); // [{index,date,valueNorm?}]
    const [subDailyLeads, setSubDailyLeads] = useState([]); // similar
    const [forecastBaseDate, setForecastBaseDate] = useState(null); // Date object for forecast base (parameters.forecast_date)
    // Per-method synthesis (alarms panel)
    const [perMethodSynthesis, setPerMethodSynthesis] = useState([]);
    const [perMethodSynthesisLoading, setPerMethodSynthesisLoading] = useState(false);
    const [perMethodSynthesisError, setPerMethodSynthesisError] = useState(null);
    const synthesisReqIdRef = useRef(0);
    const forecastRequestIdRef = useRef(0);
    const forecastCacheRef = useRef(new Map());
    const forecastFailedRef = useRef(new Set());

    useEffect(() => {
        let cancelled = false;
        async function loadForecastValues() {
            if (!workspaceData || !selectedMethodConfig?.method) {
                setForecastValues({});
                setForecastValuesNorm({});
                setForecastLoading(false);
                setForecastError(null);
                setForecastUnavailable(false);
                return;
            }
            if (selectedMethodConfig.workspace && selectedMethodConfig.workspace !== workspace) {
                return; // stale selection
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodConfigTree.find(m => m.id === methodId)) {
                setForecastValues({}); setForecastValuesNorm({}); setForecastUnavailable(false);
                return; // method not in current workspace anymore
            }
            const configId = selectedMethodConfig.config?.id; // may be undefined for aggregated
            const date = workspaceData.date?.last_forecast_date;
            if (!date) {
                setForecastValues({}); setForecastValuesNorm({});
                setForecastLoading(false);
                setForecastUnavailable(false);
                return;
            }
            setForecastUnavailable(false);
            // Clear previous values immediately to avoid stale display while new fetch pending
            setForecastValues({}); setForecastValuesNorm({});
            setForecastLoading(true);
            setForecastError(null);
            const currentId = ++forecastRequestIdRef.current;
            // Compute lead in hours based on selected target date vs forecast base if available
            let leadHours = 0;
            if (forecastBaseDate && selectedTargetDate) {
                leadHours = Math.round((selectedTargetDate.getTime() - forecastBaseDate.getTime()) / 3600000);
                if (leadHours < 0) leadHours = 0; // guard
            } else {
                if (leadResolution === 'sub') {
                    const step = subDailyLeads[selectedLead]?.time_step || (subDailyLeads.length ? subDailyLeads[0].time_step : 0);
                    leadHours = step * selectedLead;
                } else {
                    const step = dailyLeads[selectedLead]?.time_step || (dailyLeads.length ? dailyLeads[0].time_step : 24);
                    leadHours = step * selectedLead;
                }
            }
            const perc = percentile; // percentile
            const norm = normalizationRef; // normalization reference
            const cacheKey = `${workspace}|${date}|${methodId}|${configId}|${leadHours}|${perc}|${norm||'raw'}`;
            try {
                if (forecastFailedRef.current.has(cacheKey)) {
                    setForecastLoading(false);
                    return; // skip repeated failing attempts
                }
                const cached = forecastCacheRef.current.get(cacheKey);
                if (cached) {
                    if (cached.norm && cached.raw) {
                        setForecastValuesNorm(cached.norm);
                        setForecastValues(cached.raw);
                    } else {
                        setForecastValuesNorm(cached);
                        setForecastValues({});
                    }
                    setForecastUnavailable(false);
                    setForecastLoading(false);
                    return;
                }
                let resp;
                if (configId) {
                    resp = await getEntitiesValuesPercentile(workspace, date, methodId, configId, leadHours, perc, norm);
                } else {
                    resp = await getAggregatedEntitiesValues(workspace, date, methodId, leadHours, perc, norm);
                }
                if (cancelled || currentId !== forecastRequestIdRef.current) return; // stale
                const ids = resp.entity_ids || [];
                let valuesNorm = resp.values_normalized || [];
                let valuesRaw = resp.values || [];
                if (!Array.isArray(valuesNorm)) valuesNorm = [];
                if (!Array.isArray(valuesRaw)) valuesRaw = [];
                // Detect unavailable lead: ids present but no values
                const allEmpty = ids.length > 0 && valuesNorm.length === 0 && valuesRaw.length === 0;
                const lengthMismatch = ids.length > 0 && (valuesNorm.length > 0 && valuesNorm.length !== ids.length) && (valuesRaw.length > 0 && valuesRaw.length !== ids.length);
                if (allEmpty || lengthMismatch) {
                    setForecastValuesNorm({});
                    setForecastValues({});
                    setForecastUnavailable(true);
                    setForecastLoading(false);
                    return;
                }
                const normMap = {}; const rawMap = {};
                ids.forEach((id, idx) => { normMap[id] = valuesNorm[idx]; rawMap[id] = valuesRaw[idx]; });
                setForecastValuesNorm(normMap);
                setForecastValues(rawMap);
                setForecastUnavailable(false);
                forecastCacheRef.current.set(cacheKey, { norm: normMap, raw: rawMap });
            } catch (e) {
                if (cancelled || currentId !== forecastRequestIdRef.current) return; // stale
                console.error('Forecast values load failed:', e);
                setForecastError(e); setForecastValuesNorm({}); setForecastValues({}); forecastCacheRef.current.delete(cacheKey);
                forecastFailedRef.current.add(cacheKey);
            } finally {
                if (cancelled || currentId !== forecastRequestIdRef.current) return; // stale
                setForecastLoading(false);
            }
        }
        loadForecastValues();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, selectedMethodConfig, percentile, normalizationRef, selectedLead, leadResolution, dailyLeads, subDailyLeads, forecastBaseDate, selectedTargetDate, methodConfigTree]);

    // Relevant entities (only when a specific config selected)
    const [relevantEntities, setRelevantEntities] = useState(null); // null = not applicable (aggregated); Set when available
    const relevantCacheRef = useRef(new Map());
    const relevantReqIdRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        async function loadRelevant() {
            // Only fetch when a config is explicitly selected (not aggregated)
            if (!workspaceData || !selectedMethodConfig?.method || !selectedMethodConfig.config) {
                setRelevantEntities(null);
                return;
            }
            if (selectedMethodConfig.workspace && selectedMethodConfig.workspace !== workspace) return;
            const methodId = selectedMethodConfig.method.id;
            const configId = selectedMethodConfig.config.id;
            const date = workspaceData.date?.last_forecast_date;
            if (!date) { setRelevantEntities(null); return; }
            const cacheKey = `${workspace}|${date}|${methodId}|${configId}`;
            if (relevantCacheRef.current.has(cacheKey)) {
                setRelevantEntities(relevantCacheRef.current.get(cacheKey));
                return;
            }
            const currentId = ++relevantReqIdRef.current;
            try {
                const resp = await getRelevantEntities(workspace, date, methodId, configId);
                if (cancelled || currentId !== relevantReqIdRef.current) return;
                let ids = [];
                if (Array.isArray(resp)) {
                    // Could be array of ids or objects
                    if (resp.length && typeof resp[0] === 'object') {
                        ids = resp.map(r => r.id ?? r.entity_id).filter(v => v != null);
                    } else {
                        ids = resp;
                    }
                } else if (resp && typeof resp === 'object') {
                    ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
                }
                const set = new Set(ids);
                relevantCacheRef.current.set(cacheKey, set);
                setRelevantEntities(set);
            } catch (e) {
                if (cancelled || currentId !== relevantReqIdRef.current) return;
                // On failure treat as not available rather than filtering everything
                setRelevantEntities(null);
            }
        }
        loadRelevant();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, selectedMethodConfig]);

    // Fetch synthesis total to derive lead target dates (for selecting lead time)
    useEffect(() => {
        let cancelled = false;
        async function loadSynthesis() {
            if (!workspaceData?.date?.last_forecast_date) { setDailyLeads([]); setSubDailyLeads([]); setSelectedLead(0); setSelectedTargetDate(null); return; }
            const currentId = ++synthesisReqIdRef.current;
            try {
                const resp = await getSynthesisTotal(workspace, workspaceData.date.last_forecast_date, percentile, normalizationRef);
                if (cancelled || currentId !== synthesisReqIdRef.current) return;
                const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                // Store forecast base date
                const baseStr = resp?.parameters?.forecast_date;
                setForecastBaseDate(baseStr ? new Date(baseStr) : null);
                let daily = [];
                let sub = [];
                arr.forEach(sp => {
                    const dates = Array.isArray(sp.target_dates) ? sp.target_dates : [];
                    const valsNorm = Array.isArray(sp.values_normalized) ? sp.values_normalized : [];
                    dates.forEach((dStr, idx) => {
                        const dt = dStr ? new Date(dStr) : null;
                        if (!dt) return;
                        const rec = { index: idx, date: dt, time_step: sp.time_step, valueNorm: valsNorm[idx] };
                        if (sp.time_step === 24) daily.push(rec); else sub.push({...rec, subIndex: idx});
                    });
                });
                daily = daily.sort((a,b)=>a.date-b.date);
                sub = sub.sort((a,b)=>a.date-b.date);
                setDailyLeads(daily);
                setSubDailyLeads(sub);
                // Reset selection to first daily
                if (daily.length > 0) {
                    setSelectedLead(0);
                    setLeadResolution('daily');
                    setSelectedTargetDate(daily[0].date);
                } else if (sub.length > 0) {
                    setSelectedLead(0);
                    setLeadResolution('sub');
                    setSelectedTargetDate(sub[0].date);
                } else {
                    setSelectedLead(0);
                    setSelectedTargetDate(null);
                    setLeadResolution('daily');
                }
            } catch (e) {
                if (cancelled || currentId !== synthesisReqIdRef.current) return;
                setDailyLeads([]); setSubDailyLeads([]); setSelectedLead(0); setSelectedTargetDate(null); setForecastBaseDate(null);
            }
        }
        loadSynthesis();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, percentile, normalizationRef]);

    // New: per-method synthesis (alarms panel)
    useEffect(() => {
        let cancelled = false;
        async function loadPerMethod() {
            setPerMethodSynthesis([]);
            setPerMethodSynthesisError(null);
            if (!workspaceData?.date?.last_forecast_date || !methodConfigTree.length) { return; }
            setPerMethodSynthesisLoading(true);
            try {
                const resp = await getSynthesisPerMethod(workspace, workspaceData.date.last_forecast_date, percentile);
                if (!cancelled) {
                    const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                    setPerMethodSynthesis(arr);
                }
            } catch (e) {
                if (!cancelled) {
                    setPerMethodSynthesisError(e);
                    setPerMethodSynthesis([]);
                }
            } finally {
                if (!cancelled) setPerMethodSynthesisLoading(false);
            }
        }
        loadPerMethod();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, percentile, methodConfigTree]);

    // Fallback: if we have workspace last_forecast_date but no forecastBaseDate yet (e.g. synthesis not fetched), set it.
    useEffect(() => {
        if (workspaceData?.date?.last_forecast_date) {
            if (!forecastBaseDate) {
                try { setForecastBaseDate(new Date(workspaceData.date.last_forecast_date)); } catch { /* ignore */ }
            }
        } else if (!workspaceData) {
            // When workspace data cleared, also clear base date
            if (forecastBaseDate) setForecastBaseDate(null);
        }
    }, [workspaceData, forecastBaseDate]);

    const selectTargetDate = useCallback((date, preferSub) => {
        if (!date) return;
        // Try sub-daily if preferred and available
        if (preferSub && subDailyLeads.length) {
            const idx = subDailyLeads.findIndex(l => l.date.getTime() === date.getTime());
            if (idx >= 0) {
                setSelectedLead(idx);
                setLeadResolution('sub');
                setSelectedTargetDate(subDailyLeads[idx].date);
                return;
            }
        }
        // Fallback to daily (match by Y/M/D)
        if (dailyLeads.length) {
            const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
            const idx = dailyLeads.findIndex(l => l.date.getFullYear()===y && l.date.getMonth()===m && l.date.getDate()===d);
            if (idx >= 0) {
                setSelectedLead(idx);
                setLeadResolution('daily');
                setSelectedTargetDate(dailyLeads[idx].date);
            }
        }
    }, [dailyLeads, subDailyLeads]);

    // Derive availability independently so UI updates immediately on selection change
    useEffect(() => {
        if (!selectedMethodConfig?.method || !workspaceData?.date?.last_forecast_date) {
            setForecastUnavailable(false); // missing context
            return;
        }
        if (!selectedTargetDate) {
            // No selection yet -> don't show unavailable message
            setForecastUnavailable(false);
            return;
        }
        if (leadResolution === 'sub') {
            const match = subDailyLeads.find(l => selectedTargetDate && l.date.getTime() === selectedTargetDate.getTime());
            setForecastUnavailable(!match);
        } else { // daily
            const match = dailyLeads.find(l => selectedTargetDate && l.date.getFullYear()===selectedTargetDate.getFullYear() && l.date.getMonth()===selectedTargetDate.getMonth() && l.date.getDate()===selectedTargetDate.getDate());
            setForecastUnavailable(!match);
        }
    }, [selectedMethodConfig, workspaceData, leadResolution, selectedTargetDate, dailyLeads, subDailyLeads]);

    const value = useMemo(() => ({
        methodConfigTree,
        selectedMethodConfig,
        setSelectedMethodConfig: (sel) => setSelectedMethodConfig(sel ? { ...sel, workspace } : null),
        entities,
        entitiesWorkspace: entitiesWorkspaceRef.current,
        entitiesLoading,
        entitiesError,
        refreshEntities,
        forecastValues, // raw
        forecastValuesNorm, // normalized
        forecastLoading,
        forecastError,
        relevantEntities,
        percentile,
        setPercentile,
        normalizationRef,
        setNormalizationRef,
        dailyLeads,
        subDailyLeads,
        leadResolution,
        selectedLead,
        selectedTargetDate,
        selectTargetDate,
        forecastUnavailable,
        forecastBaseDate,
        perMethodSynthesis,
        perMethodSynthesisLoading,
        perMethodSynthesisError
    }), [methodConfigTree, selectedMethodConfig, entities, entitiesLoading, entitiesError, refreshEntities, forecastValues, forecastValuesNorm, forecastLoading, forecastError, relevantEntities, percentile, normalizationRef, dailyLeads, subDailyLeads, leadResolution, selectedLead, selectedTargetDate, forecastBaseDate, workspace, selectTargetDate, forecastUnavailable, perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError]);

    return (
        <ForecastsContext.Provider value={value}>
            {children}
        </ForecastsContext.Provider>
    );
}

export function useForecasts() {
    return useContext(ForecastsContext);
}
