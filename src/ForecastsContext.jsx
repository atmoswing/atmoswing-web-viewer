import React, {createContext, useContext, useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';
import {
    getEntities,
    getAggregatedEntitiesValues,
    getEntitiesValuesPercentile,
    getRelevantEntities,
    getSynthesisTotal,
    getSynthesisPerMethod,
    getMethodsAndConfigs
} from './services/api.js';

// Legacy combined context (kept for backward compatibility)
const ForecastsContext = createContext({});
// New granular contexts
const MethodsContext = createContext({});
const EntitiesContext = createContext({});
const ParametersContext = createContext({});
const SynthesisContext = createContext({});
const PerMethodSynthesisContext = createContext({});
const RelevantEntitiesContext = createContext({});
const ForecastValuesContext = createContext({});

// ---------------- Helpers ----------------
function parseForecastDate(str) {
    if (!str) return null;
    const mHourOnly = str?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
    if (mHourOnly) {
        const [, y, mo, d, h] = mHourOnly;
        const dt = new Date(+y, +mo - 1, +d, +h, 0, 0);
        if (!isNaN(dt)) return dt;
    }
    let dt = new Date(str);
    if (!isNaN(dt)) return dt;
    if (/^\d{4}-\d{2}-\d{2}[ _]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
        dt = new Date(str.replace(/[ _]/, 'T') + (str.length === 16 ? ':00' : '') + 'Z');
        if (!isNaN(dt)) return dt;
    }
    if (/^\d{10}(\d{2})?$/.test(str)) {
        const year = str.slice(0, 4), mo = str.slice(4, 6), d = str.slice(6, 8), h = str.slice(8, 10),
            mi = str.length >= 12 ? str.slice(10, 12) : '00';
        dt = new Date(`${year}-${mo}-${d}T${h}:${mi}:00Z`);
        if (!isNaN(dt)) return dt;
    }
    return null;
}

function formatForecastDateForApi(dateObj, reference) {
    if (!dateObj || isNaN(dateObj)) return null;
    const pad = n => String(n).padStart(2, '0');
    if (reference && /^\d{4}-\d{2}-\d{2}T\d{2}$/.test(reference)) {
        return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(reference || '')) {
        return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:00`;
    }
    if (!reference) return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    return dateObj.toISOString();
}

export function ForecastsProvider({children}) {
    const {workspace, workspaceData} = useWorkspace();

    // Core forecast date state
    const [activeForecastDate, setActiveForecastDate] = useState(null);
    const [activeForecastDatePattern, setActiveForecastDatePattern] = useState(null);

    // Methods / configs
    const [methodsAndConfigs, setMethodsAndConfigs] = useState(null);
    const [methodsLoading, setMethodsLoading] = useState(false);
    const [methodsError, setMethodsError] = useState(null);
    const methodsReqIdRef = useRef(0);
    const methodsKeyRef = useRef(null);

    // Selected method-config pair
    const [selectedMethodConfig, setSelectedMethodConfig] = useState(null);

    // Entities
    const [entities, setEntities] = useState([]);
    const entitiesWorkspaceRef = useRef(null);
    const [entitiesLoading, setEntitiesLoading] = useState(false);
    const [entitiesError, setEntitiesError] = useState(null);
    const [entitiesVersion, setEntitiesVersion] = useState(0);
    const entitiesReqIdRef = useRef(0);
    const entitiesCacheRef = useRef(new Map());
    const refreshEntities = useCallback(() => setEntitiesVersion(v => v + 1), []);

    // Forecast values
    const [forecastValuesNorm, setForecastValuesNorm] = useState({});
    const [forecastValues, setForecastValues] = useState({});
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastError, setForecastError] = useState(null);
    const forecastReqIdRef = useRef(0);
    const forecastCacheRef = useRef(new Map());

    // Parameters
    const [percentile, setPercentile] = useState(90);
    const [normalizationRef, setNormalizationRef] = useState(10);
    const [forecastUnavailable, setForecastUnavailable] = useState(false);

    // Leads / synthesis
    const [selectedLead, setSelectedLead] = useState(0);
    const [selectedTargetDate, setSelectedTargetDate] = useState(null);
    const [leadResolution, setLeadResolution] = useState('daily');
    const [dailyLeads, setDailyLeads] = useState([]);
    const [subDailyLeads, setSubDailyLeads] = useState([]);
    const [forecastBaseDate, setForecastBaseDate] = useState(null);
    const synthesisReqIdRef = useRef(0);

    // Per-method synthesis
    const [perMethodSynthesis, setPerMethodSynthesis] = useState([]);
    const [perMethodSynthesisLoading, setPerMethodSynthesisLoading] = useState(false);
    const [perMethodSynthesisError, setPerMethodSynthesisError] = useState(null);
    const perMethodReqIdRef = useRef(0);

    // Relevant entities
    const [relevantEntities, setRelevantEntities] = useState(null);
    const relevantReqIdRef = useRef(0);
    const relevantCacheRef = useRef(new Map());

    // Full reset
    const fullReset = useCallback((optimisticDateObj) => {
        setMethodsAndConfigs(null);
        methodsKeyRef.current = null; // clear key so next effect can refetch if needed
        setEntities([]);
        entitiesWorkspaceRef.current = workspace;
        setEntitiesError(null);
        setEntitiesLoading(false);
        setForecastValues({});
        setForecastValuesNorm({});
        setForecastError(null);
        setForecastLoading(false);
        setForecastUnavailable(false);
        setDailyLeads([]);
        setSubDailyLeads([]);
        setSelectedLead(0);
        setSelectedTargetDate(null);
        setPerMethodSynthesis([]);
        setPerMethodSynthesisLoading(false);
        setPerMethodSynthesisError(null);
        setRelevantEntities(null);
        relevantCacheRef.current.clear();
        forecastCacheRef.current.clear();
        entitiesCacheRef.current.clear();
        setForecastBaseDate(optimisticDateObj || null);
    }, [workspace]);

    // Initialize from workspaceData
    useEffect(() => {
        if (workspaceData?.date?.last_forecast_date) {
            const raw = workspaceData.date.last_forecast_date;
            setActiveForecastDate(raw);
            setActiveForecastDatePattern(p => p || raw);
            fullReset(parseForecastDate(raw));
            if (workspaceData.methodsAndConfigs) {
                setMethodsAndConfigs(workspaceData.methodsAndConfigs);
                methodsKeyRef.current = `${workspace}|${raw}`;
            }
        }
    }, [workspaceData, fullReset, workspace]);

    // Fetch methods
    useEffect(() => {
        let cancelled = false;
        const reqId = ++methodsReqIdRef.current;

        async function run() {
            if (!workspace || !activeForecastDate) {
                setMethodsAndConfigs(null);
                methodsKeyRef.current = null;
                return;
            }
            const key = `${workspace}|${activeForecastDate}`;
            if (methodsAndConfigs && methodsKeyRef.current === key) {
                return; // already have correct data
            }
            setMethodsLoading(true);
            setMethodsError(null);
            try {
                const data = await getMethodsAndConfigs(workspace, activeForecastDate);
                if (!cancelled && reqId === methodsReqIdRef.current) {
                    setMethodsAndConfigs(data);
                    methodsKeyRef.current = key;
                }
            } catch (e) {
                if (!cancelled && reqId === methodsReqIdRef.current) {
                    setMethodsError(e);
                    setMethodsAndConfigs(null);
                    methodsKeyRef.current = null;
                }
            } finally {
                if (!cancelled && reqId === methodsReqIdRef.current) setMethodsLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeForecastDate, methodsAndConfigs]);

    // Build method tree
    const methodConfigTree = useMemo(() => {
        if (!methodsAndConfigs?.methods) return [];
        return methodsAndConfigs.methods.map(m => ({
            id: m.id,
            name: m.name,
            children: (m.configurations || []).map(c => ({id: c.id, name: c.name}))
        }));
    }, [methodsAndConfigs]);

    // Auto-select first method
    useEffect(() => {
        if (!selectedMethodConfig && methodConfigTree.length) {
            setSelectedMethodConfig({workspace, method: methodConfigTree[0], config: null});
        } else if (selectedMethodConfig && !methodConfigTree.find(m => m.id === selectedMethodConfig.method?.id)) {
            setSelectedMethodConfig(null);
        }
    }, [methodConfigTree, selectedMethodConfig, workspace]);

    // Entities effect
    useEffect(() => {
        let cancelled = false;
        const reqId = ++entitiesReqIdRef.current;

        async function run() {
            if (methodsLoading || !methodsAndConfigs) return;
            if (!activeForecastDate || !selectedMethodConfig?.method) {
                setEntities([]);
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodConfigTree.find(m => m.id === methodId)) {
                setEntities([]);
                return;
            }
            let configId = selectedMethodConfig.config?.id;
            if (!configId) {
                const m = methodConfigTree.find(m => m.id === methodId);
                configId = m?.children?.[0]?.id;
                if (!configId) {
                    setEntities([]);
                    return;
                }
            }

            const cacheKey = `${workspace}|${activeForecastDate}|${methodId}|${configId}`;
            const cached = entitiesCacheRef.current.get(cacheKey);
            if (cached) {
                setEntities(cached);
                entitiesWorkspaceRef.current = workspace;
                return;
            }
            setEntitiesLoading(true);
            setEntitiesError(null);
            try {
                const resp = await getEntities(workspace, activeForecastDate, methodId, configId);
                if (cancelled || reqId !== entitiesReqIdRef.current) return;
                const list = resp.entities || resp || [];
                setEntities(list);
                entitiesWorkspaceRef.current = workspace;
                entitiesCacheRef.current.set(cacheKey, list);
            } catch (e) {
                if (!cancelled && reqId === entitiesReqIdRef.current) {
                    setEntities([]);
                    setEntitiesError(e);
                    entitiesWorkspaceRef.current = workspace;
                    entitiesCacheRef.current.delete(cacheKey);
                }
            } finally {
                if (!cancelled && reqId === entitiesReqIdRef.current) setEntitiesLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeForecastDate, selectedMethodConfig, entitiesVersion, methodConfigTree, methodsLoading, methodsAndConfigs]);

    // Synthesis
    useEffect(() => {
        let cancelled = false;
        const reqId = ++synthesisReqIdRef.current;

        async function run() {
            if (!activeForecastDate) {
                setDailyLeads([]);
                setSubDailyLeads([]);
                setSelectedLead(0);
                setSelectedTargetDate(null);
                return;
            }
            try {
                const resp = await getSynthesisTotal(workspace, activeForecastDate, percentile, normalizationRef);
                if (cancelled || reqId !== synthesisReqIdRef.current) return;
                const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                const baseStr = resp?.parameters?.forecast_date || activeForecastDate;
                const baseDt = parseForecastDate(baseStr) || parseForecastDate(activeForecastDate) || (baseStr ? new Date(baseStr) : null);
                setForecastBaseDate(baseDt);
                let daily = [], sub = [];
                arr.forEach(sp => {
                    const dates = Array.isArray(sp.target_dates) ? sp.target_dates : [];
                    const vals = Array.isArray(sp.values_normalized) ? sp.values_normalized : [];
                    dates.forEach((dStr, i) => {
                        const dt = parseForecastDate(dStr) || new Date(dStr);
                        if (isNaN(dt)) return;
                        const rec = {index: i, date: dt, time_step: sp.time_step, valueNorm: vals[i]};
                        if (sp.time_step === 24) daily.push(rec); else sub.push({...rec, subIndex: i});
                    });
                });
                daily.sort((a, b) => a.date - b.date);
                sub.sort((a, b) => a.date - b.date);
                setDailyLeads(daily);
                setSubDailyLeads(sub);
                if (daily.length) {
                    setSelectedLead(0);
                    setLeadResolution('daily');
                    setSelectedTargetDate(daily[0].date);
                } else if (sub.length) {
                    setSelectedLead(0);
                    setLeadResolution('sub');
                    setSelectedTargetDate(sub[0].date);
                } else {
                    setSelectedLead(0);
                    setSelectedTargetDate(null);
                    setLeadResolution('daily');
                }
            } catch {
                if (cancelled || reqId !== synthesisReqIdRef.current) return;
                setDailyLeads([]);
                setSubDailyLeads([]);
                setSelectedLead(0);
                setSelectedTargetDate(null);
                setForecastBaseDate(null);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeForecastDate, percentile, normalizationRef]);

    // Per-method synthesis
    useEffect(() => {
        let cancelled = false;
        const reqId = ++perMethodReqIdRef.current;

        async function run() {
            setPerMethodSynthesis([]);
            setPerMethodSynthesisError(null);
            if (!activeForecastDate || !methodConfigTree.length) return;
            setPerMethodSynthesisLoading(true);
            try {
                const resp = await getSynthesisPerMethod(workspace, activeForecastDate, percentile);
                if (!cancelled && reqId === perMethodReqIdRef.current) setPerMethodSynthesis(Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : []);
            } catch (e) {
                if (!cancelled && reqId === perMethodReqIdRef.current) {
                    setPerMethodSynthesisError(e);
                    setPerMethodSynthesis([]);
                }
            } finally {
                if (!cancelled && reqId === perMethodReqIdRef.current) setPerMethodSynthesisLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeForecastDate, percentile, methodConfigTree]);

    // Forecast values
    useEffect(() => {
        let cancelled = false;
        const reqId = ++forecastReqIdRef.current;

        async function run() {
            if (!activeForecastDate || !selectedMethodConfig?.method) {
                setForecastValues({});
                setForecastValuesNorm({});
                setForecastLoading(false);
                setForecastUnavailable(false);
                setForecastError(null);
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodConfigTree.find(m => m.id === methodId)) {
                setForecastValues({});
                setForecastValuesNorm({});
                return;
            }
            const configId = selectedMethodConfig.config?.id;
            let leadHours = 0;
            if (forecastBaseDate && selectedTargetDate) {
                leadHours = Math.max(0, Math.round((selectedTargetDate.getTime() - forecastBaseDate.getTime()) / 3600000));
            } else {
                if (leadResolution === 'sub') {
                    const step = subDailyLeads[selectedLead]?.time_step || (subDailyLeads[0]?.time_step || 0);
                    leadHours = step * selectedLead;
                } else {
                    const step = dailyLeads[selectedLead]?.time_step || (dailyLeads[0]?.time_step || 24);
                    leadHours = step * selectedLead;
                }
            }
            const cacheKey = `${workspace}|${activeForecastDate}|${methodId}|${configId || 'agg'}|${leadHours}|${percentile}|${normalizationRef || 'raw'}`;
            const cached = forecastCacheRef.current.get(cacheKey);
            if (cached) {
                setForecastValuesNorm(cached.norm);
                setForecastValues(cached.raw);
                setForecastUnavailable(false);
                return;
            }
            setForecastLoading(true);
            setForecastError(null);
            setForecastValues({});
            setForecastValuesNorm({});
            try {
                let resp;
                if (configId) resp = await getEntitiesValuesPercentile(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef); else resp = await getAggregatedEntitiesValues(workspace, activeForecastDate, methodId, leadHours, percentile, normalizationRef);
                if (cancelled || reqId !== forecastReqIdRef.current) return;
                const ids = resp.entity_ids || [];
                const valsNorm = Array.isArray(resp.values_normalized) ? resp.values_normalized : [];
                const valsRaw = Array.isArray(resp.values) ? resp.values : [];
                const allEmpty = ids.length > 0 && valsNorm.length === 0 && valsRaw.length === 0;
                const mismatch = ids.length > 0 && ((valsNorm.length > 0 && valsNorm.length !== ids.length) && (valsRaw.length > 0 && valsRaw.length !== ids.length));
                if (allEmpty || mismatch) {
                    setForecastValues({});
                    setForecastValuesNorm({});
                    setForecastUnavailable(true);
                    return;
                }
                const normMap = {}, rawMap = {};
                ids.forEach((id, i) => {
                    normMap[id] = valsNorm[i];
                    rawMap[id] = valsRaw[i];
                });
                setForecastValuesNorm(normMap);
                setForecastValues(rawMap);
                setForecastUnavailable(false);
                forecastCacheRef.current.set(cacheKey, {norm: normMap, raw: rawMap});
            } catch (e) {
                if (!cancelled && reqId === forecastReqIdRef.current) {
                    setForecastError(e);
                    setForecastValues({});
                    setForecastValuesNorm({});
                }
            } finally {
                if (!cancelled && reqId === forecastReqIdRef.current) setForecastLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeForecastDate, selectedMethodConfig, percentile, normalizationRef, selectedLead, leadResolution, dailyLeads, subDailyLeads, forecastBaseDate, selectedTargetDate, methodConfigTree]);

    // Relevant entities
    useEffect(() => {
        let cancelled = false;
        const reqId = ++relevantReqIdRef.current;

        async function run() {
            if (!activeForecastDate || !selectedMethodConfig?.method || !selectedMethodConfig.config) {
                setRelevantEntities(null);
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            const configId = selectedMethodConfig.config.id;
            if (!methodConfigTree.find(m => m.id === methodId)) {
                setRelevantEntities(null);
                return;
            }
            const cacheKey = `${workspace}|${activeForecastDate}|${methodId}|${configId}`;
            const cached = relevantCacheRef.current.get(cacheKey);
            if (cached) {
                setRelevantEntities(cached);
                return;
            }
            try {
                const resp = await getRelevantEntities(workspace, activeForecastDate, methodId, configId);
                if (cancelled || reqId !== relevantReqIdRef.current) return;
                let ids = [];
                if (Array.isArray(resp)) {
                    ids = typeof resp[0] === 'object' ? resp.map(r => r.id ?? r.entity_id).filter(v => v != null) : resp;
                } else if (resp && typeof resp === 'object') {
                    ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
                }
                const setIds = new Set(ids);
                relevantCacheRef.current.set(cacheKey, setIds);
                setRelevantEntities(setIds);
            } catch {
                if (!cancelled && reqId === relevantReqIdRef.current) setRelevantEntities(null);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [workspace, activeForecastDate, selectedMethodConfig, methodConfigTree]);

    // Availability immediate feedback
    useEffect(() => {
        if (!selectedMethodConfig?.method || !activeForecastDate) {
            setForecastUnavailable(false);
            return;
        }
        if (!selectedTargetDate) {
            setForecastUnavailable(false);
            return;
        }
        if (leadResolution === 'sub') {
            const match = subDailyLeads.find(l => l.date.getTime() === selectedTargetDate.getTime());
            setForecastUnavailable(!match);
        } else {
            const match = dailyLeads.find(l => l.date.getFullYear() === selectedTargetDate.getFullYear() && l.date.getMonth() === selectedTargetDate.getMonth() && l.date.getDate() === selectedTargetDate.getDate());
            setForecastUnavailable(!match);
        }
    }, [selectedMethodConfig, activeForecastDate, leadResolution, selectedTargetDate, dailyLeads, subDailyLeads]);

    // Shift base date
    const shiftForecastBaseDate = useCallback((hours) => {
        setActiveForecastDate(prev => {
            if (!prev) return prev;
            const dt = parseForecastDate(prev);
            if (!dt) return prev;
            dt.setHours(dt.getHours() + hours);
            const newRaw = formatForecastDateForApi(dt, activeForecastDatePattern || prev) || prev;
            fullReset(dt);
            return newRaw;
        });
    }, [activeForecastDatePattern, fullReset]);

    // Select target date
    const selectTargetDate = useCallback((date, preferSub) => {
        if (!date) return;
        if (preferSub && subDailyLeads.length) {
            const idx = subDailyLeads.findIndex(l => l.date.getTime() === date.getTime());
            if (idx >= 0) {
                setSelectedLead(idx);
                setLeadResolution('sub');
                setSelectedTargetDate(subDailyLeads[idx].date);
                return;
            }
        }
        if (dailyLeads.length) {
            const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
            const idx = dailyLeads.findIndex(l => l.date.getFullYear() === y && l.date.getMonth() === m && l.date.getDate() === d);
            if (idx >= 0) {
                setSelectedLead(idx);
                setLeadResolution('daily');
                setSelectedTargetDate(dailyLeads[idx].date);
            }
        }
    }, [dailyLeads, subDailyLeads]);

    // ---------- Context values ----------
    const setSelectedMethodConfigScoped = useCallback(sel => setSelectedMethodConfig(sel ? {
        ...sel,
        workspace
    } : null), [workspace]);

    const methodsValue = useMemo(() => ({
        methodConfigTree,
        methodsLoading,
        methodsError,
        selectedMethodConfig,
        setSelectedMethodConfig: setSelectedMethodConfigScoped
    }), [methodConfigTree, methodsLoading, methodsError, selectedMethodConfig, setSelectedMethodConfigScoped]);

    const entitiesValue = useMemo(() => ({
        entities,
        entitiesLoading,
        entitiesError,
        refreshEntities,
        setSelectedMethodConfig: setSelectedMethodConfigScoped
    }), [entities, entitiesLoading, entitiesError, refreshEntities, setSelectedMethodConfigScoped]);

    const parametersValue = useMemo(() => ({
        percentile,
        setPercentile,
        normalizationRef,
        setNormalizationRef
    }), [percentile, normalizationRef]);

    const synthesisValue = useMemo(() => ({
        dailyLeads,
        subDailyLeads,
        leadResolution,
        setLeadResolution,
        selectedLead,
        setSelectedLead,
        selectedTargetDate,
        selectTargetDate,
        forecastBaseDate,
        activeForecastDate,
        shiftForecastBaseDate
    }), [dailyLeads, subDailyLeads, leadResolution, selectedLead, selectedTargetDate, selectTargetDate, forecastBaseDate, activeForecastDate, shiftForecastBaseDate]);

    const perMethodValue = useMemo(() => ({
        perMethodSynthesis,
        perMethodSynthesisLoading,
        perMethodSynthesisError
    }), [perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError]);

    const relevantValue = useMemo(() => ({relevantEntities}), [relevantEntities]);

    const forecastValuesValue = useMemo(() => ({
        forecastValues,
        forecastValuesNorm,
        forecastLoading,
        forecastError,
        forecastUnavailable
    }), [forecastValues, forecastValuesNorm, forecastLoading, forecastError, forecastUnavailable]);

    const combinedValue = useMemo(() => ({
        ...methodsValue,
        ...entitiesValue,
        ...parametersValue,
        ...synthesisValue,
        ...perMethodValue,
        ...relevantValue,
        ...forecastValuesValue
    }), [methodsValue, entitiesValue, parametersValue, synthesisValue, perMethodValue, relevantValue, forecastValuesValue]);

    return (
        <MethodsContext.Provider value={methodsValue}>
            <ParametersContext.Provider value={parametersValue}>
                <SynthesisContext.Provider value={synthesisValue}>
                    <EntitiesContext.Provider value={entitiesValue}>
                        <PerMethodSynthesisContext.Provider value={perMethodValue}>
                            <RelevantEntitiesContext.Provider value={relevantValue}>
                                <ForecastValuesContext.Provider value={forecastValuesValue}>
                                    <ForecastsContext.Provider value={combinedValue}>
                                        {children}
                                    </ForecastsContext.Provider>
                                </ForecastValuesContext.Provider>
                            </RelevantEntitiesContext.Provider>
                        </PerMethodSynthesisContext.Provider>
                    </EntitiesContext.Provider>
                </SynthesisContext.Provider>
            </ParametersContext.Provider>
        </MethodsContext.Provider>
    );
}

// Legacy full hook
export function useForecasts() {
    return useContext(ForecastsContext);
}

// Granular hooks
export const useMethods = () => useContext(MethodsContext);
export const useEntities = () => useContext(EntitiesContext);
export const useForecastParameters = () => useContext(ParametersContext);
export const useSynthesis = () => useContext(SynthesisContext);
export const useForecastValues = () => useContext(ForecastValuesContext);
export const useRelevantEntities = () => useContext(RelevantEntitiesContext);
export const usePerMethodSynthesis = () => useContext(PerMethodSynthesisContext);

