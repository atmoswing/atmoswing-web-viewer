import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getLastForecastDate, getMethodsAndConfigs } from '../services/api.js';
import {useConfig} from './ConfigContext.jsx';

const WorkspaceContext = createContext();

function getWorkspaceFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('workspace') || params.get('ws') || '';
    } catch {
        return '';
    }
}

function setWorkspaceInUrl(nextWs) {
    try {
        const url = new URL(window.location.href);
        if (nextWs) {
            url.searchParams.set('workspace', nextWs);
        } else {
            url.searchParams.delete('workspace');
        }
        // Preserve hash and path, avoid extra history entries for same value
        if (url.toString() !== window.location.href) {
            window.history.pushState({}, '', url);
        }
    } catch {
        // no-op
    }
}

export function WorkspaceProvider({ children }) {
    const config = useConfig();
    const workspaces = useMemo(() => (config?.workspaces?.map(ws => ({
        key: ws.key,
        name: ws.name
    })) || []), [config]);

    // Internal state setter is renamed; we'll expose a wrapper that also syncs URL
    const [workspace, setWorkspaceState] = useState('');
    const [workspaceData, setWorkspaceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [invalidWorkspaceKey, setInvalidWorkspaceKey] = useState(null);
    const requestIdRef = useRef(0);
    const methodsReqIdRef = useRef(0); // controls second phase

    // Synchronize initial workspace selection with URL and available workspaces
    useEffect(() => {
        const availableKeys = workspaces.map(w => w.key);
        if (availableKeys.length === 0) {
            // No workspaces loaded yet; defer
            return;
        }

        const urlWs = getWorkspaceFromUrl();
        const hasUrl = !!urlWs;
        const hasUrlWs = hasUrl && availableKeys.includes(urlWs);

        if (hasUrlWs) {
            setInvalidWorkspaceKey(null);
            if (workspace !== urlWs) {
                setWorkspaceState(urlWs);
            }
        } else if (hasUrl) {
            // URL provided but invalid -> flag and fallback
            setInvalidWorkspaceKey(urlWs);
            if (!workspace || !availableKeys.includes(workspace)) {
                const first = availableKeys[0];
                if (first) {
                    setWorkspaceState(first);
                    setWorkspaceInUrl(first);
                }
            }
        } else {
            // No URL -> clear invalid flag; fallback if none selected or invalid
            setInvalidWorkspaceKey(null);
            if (!workspace || !availableKeys.includes(workspace)) {
                const first = availableKeys[0];
                if (first) {
                    setWorkspaceState(first);
                    setWorkspaceInUrl(first);
                }
            }
        }
    }, [workspaces]);

    // Keep URL in sync whenever workspace state changes and is valid
    useEffect(() => {
        if (!workspace) return;
        const isValid = workspaces.some(w => w.key === workspace);
        if (isValid) {
            const currentParam = getWorkspaceFromUrl();
            if (currentParam !== workspace) {
                setWorkspaceInUrl(workspace);
            }
        }
    }, [workspace, workspaces]);

    // React to browser navigation (back/forward) updating workspace from URL
    useEffect(() => {
        const onPopState = () => {
            const availableKeys = workspaces.map(w => w.key);
            if (availableKeys.length === 0) return;
            const urlWs = getWorkspaceFromUrl();
            const hasUrl = !!urlWs;
            const isValid = hasUrl && availableKeys.includes(urlWs);
            if (isValid) {
                setInvalidWorkspaceKey(null);
                if (urlWs !== workspace) setWorkspaceState(urlWs);
            } else if (hasUrl) {
                // Invalid key in URL -> show toast and fallback locally without mutating history
                setInvalidWorkspaceKey(urlWs);
                const first = availableKeys[0];
                if (first && first !== workspace) setWorkspaceState(first);
            } else {
                setInvalidWorkspaceKey(null);
                // No param in URL -> keep current selection
            }
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [workspace, workspaces]);

    // Data loading pipeline bound to workspace
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
                } catch {
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

    // Public setter that also updates URL
    const setWorkspace = React.useCallback((next) => {
        if (next === workspace) return;
        const isValid = workspaces.some(w => w.key === next);
        if (!isValid) return; // ignore invalid selections
        setInvalidWorkspaceKey(null);
        setWorkspaceState(next);
        setWorkspaceInUrl(next);
    }, [workspace, workspaces]);

    const value = useMemo(() => ({
        workspace,
        setWorkspace,
        workspaceData,
        loading,
        error,
        invalidWorkspaceKey
    }), [workspace, setWorkspace, workspaceData, loading, error, invalidWorkspaceKey]);

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() { return useContext(WorkspaceContext); }
