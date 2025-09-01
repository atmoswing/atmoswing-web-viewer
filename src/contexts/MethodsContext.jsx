import React, {createContext, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useWorkspace} from './WorkspaceContext.jsx';
import {getMethodsAndConfigs} from '../services/api.js';

const MethodsContext = createContext({});

export function MethodsProvider({children}) {
    const {workspace, activeForecastDate} = useForecastSession();
    const {workspaceData} = useWorkspace();

    const [methodsAndConfigs, setMethodsAndConfigs] = useState(null);
    const [methodsLoading, setMethodsLoading] = useState(false);
    const [methodsError, setMethodsError] = useState(null);
    const [selectedMethodConfig, setSelectedMethodConfig] = useState(null);

    const reqIdRef = useRef(0);
    const keyRef = useRef(null);
    const prevWorkspaceRef = useRef(workspace);

    // Adopt preloaded methods from workspaceData if available
    useEffect(() => {
        if (!workspaceData || !workspace || !activeForecastDate) return;
        const preloadDate = workspaceData.date?.last_forecast_date;
        if (!preloadDate) return;
        if (activeForecastDate !== preloadDate) return;
        if (workspaceData.__workspace !== workspace) return;
        if (!workspaceData.methodsAndConfigs) return;
        const key = `${workspace}|${activeForecastDate}`;
        if (keyRef.current === key) return; // already set
        setMethodsAndConfigs(workspaceData.methodsAndConfigs);
        keyRef.current = key;
        setMethodsError(null);
        setMethodsLoading(false);
    }, [workspaceData, workspace, activeForecastDate]);

    // Clear methods state and selection on workspace change
    useEffect(() => {
        if (prevWorkspaceRef.current !== workspace) {
            // Clear selection and cached key immediately on workspace change
            setSelectedMethodConfig(null);
            setMethodsAndConfigs(null);
            keyRef.current = null;
            prevWorkspaceRef.current = workspace;
        }
    }, [workspace]);

    // Fetch methods when workspace/date changes (skips if already loaded via preload)
    useEffect(() => {
        let cancelled = false;
        const reqId = ++reqIdRef.current;
        async function run() {
            if (!workspace || !activeForecastDate) {
                setMethodsAndConfigs(null);
                keyRef.current = null;
                return;
            }
            const key = `${workspace}|${activeForecastDate}`;
            if (methodsAndConfigs && keyRef.current === key) return; // already loaded or preloaded
            setMethodsLoading(true);
            setMethodsError(null);
            try {
                const data = await getMethodsAndConfigs(workspace, activeForecastDate);
                if (!cancelled && reqId === reqIdRef.current) {
                    setMethodsAndConfigs(data);
                    keyRef.current = key;
                }
            } catch (e) {
                if (!cancelled && reqId === reqIdRef.current) {
                    setMethodsError(e);
                    setMethodsAndConfigs(null);
                    keyRef.current = null;
                }
            } finally {
                if (!cancelled && reqId === reqIdRef.current) setMethodsLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate]);

    // Method tree
    const methodConfigTree = useMemo(() => {
        if (!methodsAndConfigs?.methods) return [];
        return methodsAndConfigs.methods.map(m => ({
            id: m.id,
            name: m.name,
            children: (m.configurations || []).map(c => ({id: c.id, name: c.name}))
        }));
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
