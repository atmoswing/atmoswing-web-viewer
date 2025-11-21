/**
 * @module contexts/EntitiesContext
 * @description Manages fetching and caching of forecast entities (stations/points) and relevant subsets.
 * Handles automatic clearing on workspace or configuration changes and derives cache keys.
 */

import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {getEntities, getRelevantEntities} from '@/services/api.js';
import {
  deriveConfigId,
  isMethodSelectionValid,
  keyForEntities,
  keyForRelevantEntities,
  methodExists
} from '@/utils/contextGuards.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeEntitiesResponse, normalizeRelevantEntityIds} from '@/utils/apiNormalization.js';
import {DEFAULT_TTL} from '@/utils/cacheTTLs.js';

const EntitiesContext = createContext({});

/**
 * EntitiesProvider component.
 * Fetches entity list and relevant entity IDs for the selected method/config.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {React.ReactElement}
 */
export function EntitiesProvider({children}) {
  const {workspace, activeForecastDate, resetVersion} = useForecastSession();
  const {selectedMethodConfig, methodConfigTree, methodsLoading} = useMethods();

  const [entities, setEntities] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState(null);
  const [relevantEntities, setRelevantEntities] = useState(null);

  const prevWorkspaceRef = useRef(workspace);
  const prevConfigRef = useRef(selectedMethodConfig?.config?.id || null);

  // Clear derived state on session reset or workspace change
  useEffect(() => {
    if (prevWorkspaceRef.current !== workspace) {
      setEntities([]);
      setRelevantEntities(null);
      prevWorkspaceRef.current = workspace;
    }
  }, [workspace]);

  useEffect(() => {
    const currConfigId = selectedMethodConfig?.config?.id || null;
    if (prevConfigRef.current !== currConfigId) {
      setRelevantEntities(null);
      prevConfigRef.current = currConfigId;
    }
  }, [selectedMethodConfig]);

  useEffect(() => {
    setEntities([]);
    setRelevantEntities(null);
  }, [resetVersion]);

  const effectiveConfigId = deriveConfigId(selectedMethodConfig, methodConfigTree);
  const canQueryEntities = !!workspace && !!activeForecastDate && !methodsLoading && isMethodSelectionValid(selectedMethodConfig, workspace) && !!effectiveConfigId && methodExists(methodConfigTree, selectedMethodConfig?.method?.id);

  const entitiesKey = canQueryEntities ? keyForEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, effectiveConfigId) : null;

  const {data: entitiesData, loading: entitiesReqLoading, error: entitiesReqError} = useCachedRequest(
    entitiesKey,
    async () => {
      const resp = await getEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, effectiveConfigId);
      return normalizeEntitiesResponse(resp);
    },
    [workspace, activeForecastDate, selectedMethodConfig, effectiveConfigId, methodConfigTree, methodsLoading],
    {enabled: !!entitiesKey, initialData: [], ttlMs: DEFAULT_TTL}
  );

  useEffect(() => {
    setEntities(entitiesData || []);
    setEntitiesLoading(!!entitiesReqLoading);
    setEntitiesError(entitiesReqError || null);
  }, [entitiesData, entitiesReqLoading, entitiesReqError]);

  const canQueryRelevant = canQueryEntities && !!selectedMethodConfig?.config?.id;
  const relevantKey = canQueryRelevant ? keyForRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, selectedMethodConfig.config.id) : null;

  const {data: relevantData} = useCachedRequest(
    relevantKey,
    async () => {
      const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, selectedMethodConfig.config.id);
      return normalizeRelevantEntityIds(resp);
    },
    [workspace, activeForecastDate, selectedMethodConfig, methodConfigTree],
    {enabled: !!relevantKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  useEffect(() => {
    setRelevantEntities(relevantData || null);
  }, [relevantData]);

  const value = useMemo(() => ({
    entities,
    entitiesLoading,
    entitiesError,
    relevantEntities,
    entitiesWorkspace: workspace,
    entitiesKey
  }), [entities, entitiesLoading, entitiesError, relevantEntities, workspace, entitiesKey]);

  return <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>;
}

/**
 * Hook to access entities context.
 * @returns {Object} Entities context value
 * @returns {Array} returns.entities - Array of entity objects
 * @returns {boolean} returns.entitiesLoading - Loading state
 * @returns {Error|null} returns.entitiesError - Error during entity fetch
 * @returns {Set<string|number>|null} returns.relevantEntities - Set of relevant entity IDs or null
 * @returns {string} returns.entitiesWorkspace - Workspace key used for entities
 * @returns {string|null} returns.entitiesKey - Cache key used for the request
 */
export const useEntities = () => useContext(EntitiesContext);
