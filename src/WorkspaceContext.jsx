import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { getWorkspaceInitData } from './services/api';
import {useConfig} from "./ConfigContext.jsx";

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
    const requestIdRef = useRef(0); // guard against stale async responses

    // If runtime config updates and current workspace is no longer valid, pick first available
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
            // Immediately clear old data to avoid consumers using stale method/config
            setWorkspaceData(null);
            setLoading(true);
            setError(null);
            try {
                const data = await getWorkspaceInitData(workspace);
                if (cancelled || currentId !== requestIdRef.current) return; // stale
                // Tag the data with the workspace it belongs to
                setWorkspaceData({...data, __workspace: workspace});
            } catch (e) {
                if (cancelled || currentId !== requestIdRef.current) return; // stale
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

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    return useContext(WorkspaceContext);
}