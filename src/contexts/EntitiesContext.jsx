import React, {createContext, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {getEntities, getRelevantEntities} from '../services/api.js';
import { isMethodSelectionValid, methodExists, deriveConfigId, keyForEntities } from '../utils/contextGuards.js';
import { useManagedRequest } from '../hooks/useManagedRequest.js';
import { normalizeEntitiesResponse, normalizeRelevantEntityIds } from '../utils/apiNormalization.js';

const EntitiesContext = createContext({});

export function EntitiesProvider({children}) {
    const {workspace, activeForecastDate, resetVersion} = useForecastSession();
    const {selectedMethodConfig, methodConfigTree, methodsLoading} = useMethods();

    const [entities, setEntities] = useState([]);
    const [entitiesLoading, setEntitiesLoading] = useState(false);
    const [entitiesError, setEntitiesError] = useState(null);
    const [relevantEntities, setRelevantEntities] = useState(null);
    const [refreshTick, setRefreshTick] = useState(0);

    const entitiesCacheRef = useRef(new Map());
    const relevantCacheRef = useRef(new Map());
    const prevWorkspaceRef = useRef(workspace);
    const versionRef = useRef(0);

    const refreshEntities = useCallback(() => {
        setRefreshTick(t => t + 1);
        setEntitiesError(null);
    }, []);

    // Clear caches on session reset or workspace change
    useEffect(() => {
        if (prevWorkspaceRef.current !== workspace) {
            entitiesCacheRef.current.clear();
            relevantCacheRef.current.clear();
            setEntities([]);
            setRelevantEntities(null);
            prevWorkspaceRef.current = workspace;
        }
    }, [workspace]);

    useEffect(() => {
        entitiesCacheRef.current.clear();
        relevantCacheRef.current.clear();
        setEntities([]);
        setRelevantEntities(null);
    }, [resetVersion]);

    const effectiveConfigId = deriveConfigId(selectedMethodConfig, methodConfigTree);
    const canQueryEntities = !!workspace && !!activeForecastDate && !methodsLoading && isMethodSelectionValid(selectedMethodConfig, workspace) && !!effectiveConfigId && methodExists(methodConfigTree, selectedMethodConfig?.method?.id);

    const entitiesKey = canQueryEntities ? keyForEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, effectiveConfigId) : null;

    const { data: entitiesData, loading: entitiesReqLoading, error: entitiesReqError } = useManagedRequest(
        async () => {
            const cached = entitiesCacheRef.current.get(entitiesKey);
            if (cached) return cached;
            const resp = await getEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, effectiveConfigId);
            const list = normalizeEntitiesResponse(resp);
            entitiesCacheRef.current.set(entitiesKey, list);
            return list;
        },
        [workspace, activeForecastDate, selectedMethodConfig, effectiveConfigId, methodConfigTree, methodsLoading, refreshTick],
        { enabled: !!entitiesKey, initialData: [] }
    );

    useEffect(() => {
        setEntities(entitiesData || []);
        setEntitiesLoading(!!entitiesReqLoading);
        setEntitiesError(entitiesReqError || null);
    }, [entitiesData, entitiesReqLoading, entitiesReqError]);

    const canQueryRelevant = canQueryEntities && !!selectedMethodConfig?.config?.id;
    const relevantKey = canQueryRelevant ? keyForEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, selectedMethodConfig.config.id) : null;

    const { data: relevantData } = useManagedRequest(
        async () => {
            const cached = relevantCacheRef.current.get(relevantKey);
            if (cached) return cached;
            const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, selectedMethodConfig.config.id);
            const setIds = normalizeRelevantEntityIds(resp);
            relevantCacheRef.current.set(relevantKey, setIds);
            return setIds;
        },
        [workspace, activeForecastDate, selectedMethodConfig, methodConfigTree],
        { enabled: !!relevantKey, initialData: null }
    );

    useEffect(() => { setRelevantEntities(relevantData || null); }, [relevantData]);

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
