import React, {createContext, useContext, useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';
import {getEntities} from './services/api.js';

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
    }, [workspace]);

    // Auto-select first method when data arrives or tree changes
    useEffect(() => {
        if (!selectedMethodConfig && methodConfigTree.length > 0 && methodConfigTree[0].children.length > 0) {
            const first = { method: methodConfigTree[0], config: null };
            setSelectedMethodConfig(first);
        }
    }, [methodConfigTree, selectedMethodConfig]);

    // Entities for current selection
    const [entities, setEntities] = useState([]);
    const [entitiesLoading, setEntitiesLoading] = useState(false);
    const [entitiesError, setEntitiesError] = useState(null);
    const [entitiesVersion, setEntitiesVersion] = useState(0); // manual refresh counter
    const requestIdRef = useRef(0);

    const refreshEntities = useCallback(() => setEntitiesVersion(v => v + 1), []);

    useEffect(() => {
        let cancelled = false;
        async function loadEntities() {
            if (!workspaceData || !selectedMethodConfig || !selectedMethodConfig.config) {
                setEntities([]);
                setEntitiesLoading(false);
                setEntitiesError(null);
                return;
            }
            const methodId = selectedMethodConfig.method.id;
            const configId = selectedMethodConfig.config.id;
            const date = workspaceData.date?.last_forecast_date;
            if (!date) {
                setEntities([]);
                setEntitiesLoading(false);
                return;
            }
            setEntitiesLoading(true);
            setEntitiesError(null);
            const currentId = ++requestIdRef.current;
            try {
                const list = await getEntities(workspace, date, methodId, configId);
                if (cancelled || currentId !== requestIdRef.current) return; // stale
                setEntities(list.entities || list || []);
            } catch (e) {
                if (cancelled || currentId !== requestIdRef.current) return; // stale
                console.error('Entities load failed:', e);
                setEntitiesError(e);
                setEntities([]);
            } finally {
                if (cancelled || currentId !== requestIdRef.current) return; // stale
                setEntitiesLoading(false);
            }
        }
        loadEntities();
        return () => { cancelled = true; };
    }, [workspace, workspaceData, selectedMethodConfig, entitiesVersion]);

    const value = useMemo(() => ({
        methodConfigTree,
        selectedMethodConfig,
        setSelectedMethodConfig,
        entities,
        entitiesLoading,
        entitiesError,
        refreshEntities
    }), [methodConfigTree, selectedMethodConfig, entities, entitiesLoading, entitiesError, refreshEntities]);

    return (
        <ForecastsContext.Provider value={value}>
            {children}
        </ForecastsContext.Provider>
    );
}

export function useForecasts() {
    return useContext(ForecastsContext);
}
