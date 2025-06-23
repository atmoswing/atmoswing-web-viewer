import React, { createContext, useContext, useState, useEffect } from 'react';
import { getWorkspaceInitData } from './services/api';
import {useConfig} from "./ConfigContext.jsx";

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
    const config = useConfig();
    const workspaces = config?.workspaces?.map(ws => ({
        key: ws.key,
        name: ws.name
    })) || [];

    const [workspace, setWorkspace] = useState(workspaces[0]?.key || '');
    const [workspaceData, setWorkspaceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (workspace) {
            setLoading(true);
            setError(null);
            getWorkspaceInitData(workspace)
                .then(setWorkspaceData)
                .catch(setError)
                .finally(() => setLoading(false));
        } else {
            setWorkspaceData(null);
        }
    }, [workspace]);

    // Returns a flat array of all configs with their method name
    const getMethodConfigTree = () => {
        if (!workspaceData?.methodsAndConfigs?.methods) return [];
        return workspaceData.methodsAndConfigs.methods.map(method => ({
            id: method.id,
            name: method.name,
            children: (method.configurations || []).map(cfg => ({
                id: cfg.id,
                name: cfg.name
            }))
        }));
    };

    return (
        <WorkspaceContext.Provider value={{ workspace, setWorkspace, workspaceData, getMethodConfigTree }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    return useContext(WorkspaceContext);
}