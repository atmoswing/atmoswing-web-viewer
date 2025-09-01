import React, {createContext, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {getEntities, getRelevantEntities} from '../services/api.js';

const EntitiesContext = createContext({});

export function EntitiesProvider({children}) {
    const {workspace, activeForecastDate, resetVersion} = useForecastSession();
    const {selectedMethodConfig, methodConfigTree, methodsLoading} = useMethods();

    const [entities, setEntities] = useState([]);
    const [entitiesLoading, setEntitiesLoading] = useState(false);
    const [entitiesError, setEntitiesError] = useState(null);
    const [relevantEntities, setRelevantEntities] = useState(null);

    const versionRef = useRef(0);
    const entitiesReqIdRef = useRef(0);
    const relevantReqIdRef = useRef(0);
    const entitiesCacheRef = useRef(new Map());
    const relevantCacheRef = useRef(new Map());

    const refreshEntities = useCallback(() => {
        versionRef.current += 1;
        setEntitiesError(null);
    }, []);

    // Clear caches on session reset
    useEffect(() => {
        entitiesCacheRef.current.clear();
        relevantCacheRef.current.clear();
        setEntities([]);
        setRelevantEntities(null);
    }, [resetVersion]);

    // Fetch entities
    useEffect(() => {
        let cancelled = false;
        const reqId = ++entitiesReqIdRef.current;
        async function run() {
            if (methodsLoading) return;
            if (!workspace || !activeForecastDate || !selectedMethodConfig?.method) {
                setEntities([]);
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodConfigTree.find(m => m.id === methodId)) { setEntities([]); return; }
            let configId = selectedMethodConfig.config?.id;
            if (!configId) {
                const m = methodConfigTree.find(m => m.id === methodId);
                configId = m?.children?.[0]?.id;
                if (!configId) { setEntities([]); return; }
            }
            const key = `${workspace}|${activeForecastDate}|${methodId}|${configId}`;
            const cached = entitiesCacheRef.current.get(key);
            if (cached) { setEntities(cached); return; }
            setEntitiesLoading(true);
            setEntitiesError(null);
            try {
                const resp = await getEntities(workspace, activeForecastDate, methodId, configId);
                if (cancelled || reqId !== entitiesReqIdRef.current) return;
                const list = resp?.entities || resp || [];
                setEntities(list);
                entitiesCacheRef.current.set(key, list);
            } catch (e) {
                if (!cancelled && reqId === entitiesReqIdRef.current) {
                    setEntities([]);
                    setEntitiesError(e);
                }
            } finally {
                if (!cancelled && reqId === entitiesReqIdRef.current) setEntitiesLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate, selectedMethodConfig, methodConfigTree, methodsLoading, versionRef.current]);

    // Fetch relevant entities
    useEffect(() => {
        let cancelled = false;
        const reqId = ++relevantReqIdRef.current;
        async function run() {
            if (!workspace || !activeForecastDate || !selectedMethodConfig?.method || !selectedMethodConfig.config) {
                setRelevantEntities(null);
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            const configId = selectedMethodConfig.config.id;
            if (!methodConfigTree.find(m => m.id === methodId)) { setRelevantEntities(null); return; }
            const key = `${workspace}|${activeForecastDate}|${methodId}|${configId}`;
            const cached = relevantCacheRef.current.get(key);
            if (cached) { setRelevantEntities(cached); return; }
            try {
                const resp = await getRelevantEntities(workspace, activeForecastDate, methodId, configId);
                if (cancelled || reqId !== relevantReqIdRef.current) return;
                let ids = [];
                if (Array.isArray(resp)) ids = typeof resp[0] === 'object' ? resp.map(r => r.id ?? r.entity_id).filter(v => v != null) : resp; else if (resp && typeof resp === 'object') ids = resp.entity_ids || resp.entities_ids || resp.ids || (Array.isArray(resp.entities) ? resp.entities.map(e => e.id) : []);
                const setIds = new Set(ids);
                relevantCacheRef.current.set(key, setIds);
                setRelevantEntities(setIds);
            } catch { if (!cancelled && reqId === relevantReqIdRef.current) setRelevantEntities(null); }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate, selectedMethodConfig, methodConfigTree]);

    const value = useMemo(() => ({
        entities,
        entitiesLoading,
        entitiesError,
        refreshEntities,
        relevantEntities,
        entitiesWorkspace: workspace
    }), [entities, entitiesLoading, entitiesError, refreshEntities, relevantEntities, workspace]);

    return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
}

export const useEntities = () => useContext(EntitiesContext);
