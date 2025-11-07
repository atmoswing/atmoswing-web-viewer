import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getLastForecastDate, getMethodsAndConfigs } from '../services/api.js';
import {useConfig} from './ConfigContext.jsx';
import { readWorkspaceFromUrl, writeWorkspaceToUrl, onWorkspacePopState } from '../utils/urlWorkspaceUtils.js';
import { useManagedRequest } from '../hooks/useManagedRequest.js';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
    const config = useConfig();
    const workspaces = useMemo(() => (config?.workspaces?.map(ws => ({
        key: ws.key,
        name: ws.name
    })) || []), [config]);

    const [workspace, setWorkspaceState] = useState('');
    const [workspaceData, setWorkspaceData] = useState(null);
    const [invalidWorkspaceKey, setInvalidWorkspaceKey] = useState(null);

    // Synchronize initial workspace selection with URL and available workspaces
    useEffect(() => {
        const availableKeys = workspaces.map(w => w.key);
        if (availableKeys.length === 0) return;
        const urlWs = readWorkspaceFromUrl();
        const hasUrl = !!urlWs;
        const hasUrlWs = hasUrl && availableKeys.includes(urlWs);
        if (hasUrlWs) {
            setInvalidWorkspaceKey(null);
            if (workspace !== urlWs) setWorkspaceState(urlWs);
        } else if (hasUrl) {
            setInvalidWorkspaceKey(urlWs);
            if (!workspace || !availableKeys.includes(workspace)) {
                const first = availableKeys[0];
                if (first) { setWorkspaceState(first); writeWorkspaceToUrl(first); }
            }
        } else {
            setInvalidWorkspaceKey(null);
            if (!workspace || !availableKeys.includes(workspace)) {
                const first = availableKeys[0];
                if (first) { setWorkspaceState(first); writeWorkspaceToUrl(first); }
            }
        }
    }, [workspaces]);

    // Keep URL in sync whenever workspace state changes and is valid
    useEffect(() => {
        if (!workspace) return;
        const isValid = workspaces.some(w => w.key === workspace);
        if (isValid) {
            const currentParam = readWorkspaceFromUrl();
            if (currentParam !== workspace) writeWorkspaceToUrl(workspace);
        }
    }, [workspace, workspaces]);

    // React to browser navigation (back/forward) updating workspace from URL
    useEffect(() => {
        const off = onWorkspacePopState((urlWs) => {
            const availableKeys = workspaces.map(w => w.key);
            if (availableKeys.length === 0) return;
            const hasUrl = !!urlWs;
            const isValid = hasUrl && availableKeys.includes(urlWs);
            if (isValid) {
                setInvalidWorkspaceKey(null);
                if (urlWs !== workspace) setWorkspaceState(urlWs);
            } else if (hasUrl) {
                setInvalidWorkspaceKey(urlWs);
                const first = availableKeys[0];
                if (first && first !== workspace) setWorkspaceState(first);
            } else {
                setInvalidWorkspaceKey(null);
            }
        });
        return off;
    }, [workspace, workspaces]);

    // Phase 1: fetch last forecast date
    const { data: lastDateResp, loading: loadingPhase1, error: errorPhase1 } = useManagedRequest(
        async () => {
            if (!workspace) return null;
            return await getLastForecastDate(workspace);
        },
        [workspace],
        { enabled: !!workspace, initialData: null }
    );

    // Phase 2: fetch methods/configs as a side effect when phase 1 completes
    const methodsReqIdRef = useRef(0);
    useEffect(() => {
        let cancelled = false;
        async function runPhase2() {
            if (!workspace || !lastDateResp?.last_forecast_date) { setWorkspaceData(lastDateResp ? { date: lastDateResp, __workspace: workspace } : null); return; }
            const currentPhase = ++methodsReqIdRef.current;
            // set partial data first
            setWorkspaceData({ date: lastDateResp, __workspace: workspace });
            try {
                const methodsAndConfigs = await getMethodsAndConfigs(workspace, lastDateResp.last_forecast_date);
                if (cancelled || currentPhase !== methodsReqIdRef.current) return;
                setWorkspaceData(prev => (prev && prev.date === lastDateResp ? { ...prev, methodsAndConfigs } : prev));
            } catch {
                // ignore, MethodsProvider will fetch
            }
        }
        runPhase2();
        return () => { cancelled = true; };
    }, [workspace, lastDateResp]);

    const setWorkspace = React.useCallback((next) => {
        if (next === workspace) return;
        const isValid = workspaces.some(w => w.key === next);
        if (!isValid) return;
        setInvalidWorkspaceKey(null);
        setWorkspaceState(next);
        writeWorkspaceToUrl(next);
    }, [workspace, workspaces]);

    const value = useMemo(() => ({
        workspace,
        setWorkspace,
        workspaceData,
        loading: loadingPhase1,
        error: errorPhase1,
        invalidWorkspaceKey
    }), [workspace, setWorkspace, workspaceData, loadingPhase1, errorPhase1, invalidWorkspaceKey]);

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() { return useContext(WorkspaceContext); }
