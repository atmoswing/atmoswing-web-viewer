import React, {createContext, useContext, useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';
import {getEntities, getAggregatedEntitiesValues, getEntitiesValuesPercentile} from './services/api.js';

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
    const forecastRequestIdRef = useRef(0);
    const forecastCacheRef = useRef(new Map());
    const forecastFailedRef = useRef(new Set());

    useEffect(() => {
        let cancelled = false;
        async function loadForecastValues() {
            if (!workspaceData || !selectedMethodConfig?.method) {
                setForecastValues({});
                setForecastLoading(false);
                setForecastError(null);
                return;
            }
            if (selectedMethodConfig.workspace && selectedMethodConfig.workspace !== workspace) {
                return; // stale selection
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodConfigTree.find(m => m.id === methodId)) {
                return; // method not in current workspace anymore
            }
            const configId = selectedMethodConfig.config?.id; // may be undefined for aggregated
            const date = workspaceData.date?.last_forecast_date;
            if (!date) {
                setForecastValues({});
                setForecastLoading(false);
                return;
            }
            setForecastLoading(true);
            setForecastError(null);
            const currentId = ++forecastRequestIdRef.current;
            const lead = 0;
            const perc = 90; // percentile 0.9
            const cacheKey = `${workspace}|${date}|${methodId}|${configId}|${lead}|${perc}`;
            try {
                if (forecastFailedRef.current.has(cacheKey)) {
                    return; // skip repeated failing attempts
                }
                const cached = forecastCacheRef.current.get(cacheKey);
                if (cached) {
                    setForecastValues(cached);
                    setForecastLoading(false);
                    return;
                }
                let resp;
                if (configId) {
                    resp = await getEntitiesValuesPercentile(workspace, date, methodId, configId, lead, perc);
                } else {
                    resp = await getAggregatedEntitiesValues(workspace, date, methodId, lead, perc);
                }
                if (cancelled || currentId !== forecastRequestIdRef.current) return; // stale
                const ids = resp.entity_ids || [];
                let valuesNorm = resp.values_normalized || [];
                let valuesRaw = resp.values || [];
                if (!Array.isArray(valuesNorm)) valuesNorm = [];
                if (!Array.isArray(valuesRaw)) valuesRaw = [];
                const normMap = {};
                const rawMap = {};
                ids.forEach((id, idx) => {
                    normMap[id] = valuesNorm[idx];
                    rawMap[id] = valuesRaw[idx];
                });
                setForecastValuesNorm(normMap);
                setForecastValues(rawMap);
                forecastCacheRef.current.set(cacheKey, normMap);
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
    }, [workspace, workspaceData, selectedMethodConfig]);

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
        forecastError
    }), [methodConfigTree, selectedMethodConfig, entities, entitiesLoading, entitiesError, refreshEntities, forecastValues, forecastValuesNorm, forecastLoading, forecastError, workspace]);

    return (
        <ForecastsContext.Provider value={value}>
            {children}
        </ForecastsContext.Provider>
    );
}

export function useForecasts() {
    return useContext(ForecastsContext);
}
