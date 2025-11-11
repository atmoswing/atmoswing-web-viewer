import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {getLastForecastDate, getMethodsAndConfigs} from '@/services/api.js';
import {useConfig} from './ConfigContext.jsx';
import {onWorkspacePopState, readWorkspaceFromUrl, writeWorkspaceToUrl} from '@/utils/urlWorkspaceUtils.js';
import {clearCachedRequests, useCachedRequest} from '@/hooks/useCachedRequest.js';
import {DEFAULT_TTL} from '@/utils/cacheTTLs.js';

const WorkspaceContext = createContext();

export function WorkspaceProvider({children}) {
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
        if (first) {
          setWorkspaceState(first);
          writeWorkspaceToUrl(first);
        }
      }
    } else {
      setInvalidWorkspaceKey(null);
      if (!workspace || !availableKeys.includes(workspace)) {
        const first = availableKeys[0];
        if (first) {
          setWorkspaceState(first);
          writeWorkspaceToUrl(first);
        }
      }
    }
  }, [workspaces, workspace]);

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
    return onWorkspacePopState((urlWs) => {
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
  }, [workspace, workspaces]);

  // Phase 1: fetch last forecast date
  const lastDateKey = workspace ? `last_date|${workspace}` : null;
  const {data: lastDateResp, loading: loadingPhase1, error: errorPhase1} = useCachedRequest(
    lastDateKey,
    async () => {
      if (!workspace) return null;
      return await getLastForecastDate(workspace);
    },
    [workspace],
    {enabled: !!workspace, initialData: null, ttlMs: DEFAULT_TTL}
  );

  // Phase 2: methods/configs prefetch via cached request (optional optimization)
  const methodsPrefetchKey = workspace && lastDateResp?.last_forecast_date ? `workspace_methods|${workspace}|${lastDateResp.last_forecast_date}` : null;
  const {data: prefetchMethods} = useCachedRequest(
    methodsPrefetchKey,
    async () => {
      if (!workspace || !lastDateResp?.last_forecast_date) return null;
      const resp = await getMethodsAndConfigs(workspace, lastDateResp.last_forecast_date);
      // keep raw shape; normalization happens later in MethodsContext for tree
      return resp ?? null;
    },
    [workspace, lastDateResp?.last_forecast_date],
    {enabled: !!methodsPrefetchKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  // Consolidate workspaceData whenever phase1 or prefetch changes
  useEffect(() => {
    if (!workspace) {
      setWorkspaceData(null);
      return;
    }
    if (!lastDateResp) {
      setWorkspaceData(null);
      return;
    }
    setWorkspaceData({date: lastDateResp, __workspace: workspace, methodsAndConfigs: prefetchMethods || undefined});
  }, [workspace, lastDateResp, prefetchMethods]);

  const setWorkspace = React.useCallback((next) => {
    if (next === workspace) return;
    const isValid = workspaces.some(w => w.key === next);
    if (!isValid) return;
    setInvalidWorkspaceKey(null);
    setWorkspaceState(next);
    writeWorkspaceToUrl(next);
  }, [workspace, workspaces]);

  // Clear all cached requests when workspace changes to avoid cross-workspace leakage
  useEffect(() => {
    clearCachedRequests();
  }, [workspace]);

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

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
