import React, {createContext, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useWorkspace} from './WorkspaceContext.jsx';
import {getMethodsAndConfigs} from '../services/api.js';
import { useCachedRequest } from '../hooks/useCachedRequest.js';
import { normalizeMethodsAndConfigs } from '../utils/apiNormalization.js';
import { DEFAULT_TTL } from '../utils/cacheTTLs.js';

const MethodsContext = createContext({});

export function MethodsProvider({children}) {
    const {workspace, activeForecastDate} = useForecastSession();
    const {workspaceData} = useWorkspace();

    const [selectedMethodConfig, setSelectedMethodConfig] = useState(null);
    const keyRef = useRef(null);
    const prevWorkspaceRef = useRef(workspace);

    // Preload adoption
    const preloaded = (workspaceData && workspaceData.__workspace === workspace && workspaceData.date?.last_forecast_date === activeForecastDate) ? workspaceData.methodsAndConfigs : null;

    const cacheKey = workspace && activeForecastDate ? `methods|${workspace}|${activeForecastDate}` : null;
    const { data: methodsAndConfigs, loading: methodsLoading, error: methodsError } = useCachedRequest(
        cacheKey,
        async () => {
            if (preloaded && keyRef.current !== cacheKey) {
                keyRef.current = cacheKey; // mark adopted
                return preloaded;
            }
            const fetched = await getMethodsAndConfigs(workspace, activeForecastDate);
            keyRef.current = cacheKey;
            return fetched;
        },
        [workspace, activeForecastDate, preloaded],
        { enabled: !!workspace && !!activeForecastDate, initialData: null, ttlMs: DEFAULT_TTL }
    );

    // Clear selection on workspace change
    useEffect(() => {
        if (prevWorkspaceRef.current !== workspace) {
            setSelectedMethodConfig(null);
            keyRef.current = null;
            prevWorkspaceRef.current = workspace;
        }
    }, [workspace]);

    const methodConfigTree = useMemo(() => {
        if (!methodsAndConfigs?.methods) return [];
        return normalizeMethodsAndConfigs(methodsAndConfigs);
    }, [methodsAndConfigs]);

    const setSelectedMethodConfigScoped = useCallback(sel => {
        if (!sel) { setSelectedMethodConfig(null); return; }
        setSelectedMethodConfig({...sel, _workspace: workspace});
    }, [workspace]);

    // Auto select first method
    useEffect(() => {
        if (!selectedMethodConfig && methodConfigTree.length) {
            setSelectedMethodConfigScoped({method: methodConfigTree[0], config: null});
        } else if (selectedMethodConfig && (!methodConfigTree.find(m => m.id === selectedMethodConfig.method?.id) || selectedMethodConfig._workspace !== workspace)) {
            // Clear if method missing or workspace changed
            setSelectedMethodConfig(null);
        }
    }, [methodConfigTree, selectedMethodConfig, setSelectedMethodConfigScoped, workspace]);

    const value = useMemo(() => ({
        methodConfigTree,
        methodsLoading,
        methodsError,
        selectedMethodConfig,
        setSelectedMethodConfig: setSelectedMethodConfigScoped
    }), [methodConfigTree, methodsLoading, methodsError, selectedMethodConfig, setSelectedMethodConfigScoped]);

    return <MethodsContext.Provider value={value}>{children}</MethodsContext.Provider>;
}

export const useMethods = () => useContext(MethodsContext);
