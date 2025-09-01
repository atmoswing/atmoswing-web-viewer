import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getLastForecastDate, getMethodsAndConfigs } from '../services/api.js';
import {useConfig} from './ConfigContext.jsx';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
    const config = useConfig();
    const workspaces = useMemo(() => (config?.workspaces?.map(ws => ({
        key: ws.key,
        name: ws.name
    })) || []), [config]);

    const [workspace, setWorkspace] = useState(workspaces[0]?.key || '');
    const [workspaceData, setWorkspaceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const requestIdRef = useRef(0);
    const methodsReqIdRef = useRef(0); // controls second phase

    useEffect(() => {
        if (!workspace && workspaces.length > 0) {
            setWorkspace(workspaces[0].key);
        } else if (workspace && workspaces.length > 0 && !workspaces.find(w => w.key === workspace)) {
            setWorkspace(workspaces[0].key);
        }
    }, [workspaces, workspace]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!workspace) { setWorkspaceData(null); return; }
            const currentId = ++requestIdRef.current;
            setWorkspaceData(null);
            setLoading(true);
            setError(null);
            try {
                // Phase 1: fetch last forecast date
                const date = await getLastForecastDate(workspace);
                if (cancelled || currentId !== requestIdRef.current) return;
                setWorkspaceData({ date, __workspace: workspace });
                // Phase 2: fetch methods/configs
                const methodsId = ++methodsReqIdRef.current;
                try {
                    const methodsAndConfigs = await getMethodsAndConfigs(workspace, date.last_forecast_date);
                    if (cancelled || currentId !== requestIdRef.current || methodsId !== methodsReqIdRef.current) return;
                    setWorkspaceData(prev => (prev && prev.date === date ? { ...prev, methodsAndConfigs } : prev));
                } catch (e2) {
                    // Non-fatal; MethodsProvider will attempt its own fetch
                }
            } catch (e) {
                if (cancelled || currentId !== requestIdRef.current) return;
                setError(e);
                setWorkspaceData(null);
            } finally {
                if (!(cancelled || currentId !== requestIdRef.current)) {
                    setLoading(false);
                }
            }
        }
        load();
        return () => { cancelled = true; };
    }, [workspace]);

    const value = useMemo(() => ({
        workspace,
        setWorkspace,
        workspaceData,
        loading,
        error
    }), [workspace, workspaceData, loading, error]);

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() { return useContext(WorkspaceContext); }
