/**
 * @module contexts/EntitiesContext
 * @description Manages fetching and caching of forecast entities (stations/points) and relevant subsets.
 * Selection changes are expressed through the cache keys, so the request hook clears itself
 * whenever the workspace, date or method/config selection stops being queryable.
 */

import React, {createContext, useContext, useMemo} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {getRelevantEntities} from '@/services/api.js';
import {deriveConfigId, isMethodSelectionValid, methodExists} from '@/utils/contextGuards.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {useEntitiesList} from '@/hooks/forecastQueries.js';
import {normalizeRelevantEntityIds} from '@/utils/normalize/entities.js';
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
  const {workspace, activeForecastDate} = useForecastSession();
  const {selectedMethodConfig, methodConfigTree, methodsLoading} = useMethods();

  const effectiveConfigId = deriveConfigId(selectedMethodConfig, methodConfigTree);
  const canQueryEntities = !!workspace && !!activeForecastDate && !methodsLoading && isMethodSelectionValid(selectedMethodConfig, workspace) && !!effectiveConfigId && methodExists(methodConfigTree, selectedMethodConfig?.method?.id);

  // Shared with the modals' entity lists, so opening a modal on the same selection is a cache hit.
  const {data: entities, loading: entitiesLoading, error: entitiesError, key: entitiesKey} = useEntitiesList(
    workspace,
    activeForecastDate,
    selectedMethodConfig?.method?.id,
    effectiveConfigId,
    {enabled: canQueryEntities}
  );

  const canQueryRelevant = canQueryEntities && !!selectedMethodConfig?.config?.id;
  const relevantKey = canQueryRelevant
    ? `relevant_entities|${workspace}|${activeForecastDate}|${selectedMethodConfig.method.id}|${selectedMethodConfig.config.id}`
    : null;

  const {data: relevantEntities} = useCachedRequest(
    relevantKey,
    async () => {
      const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodConfig.method.id, selectedMethodConfig.config.id);
      return normalizeRelevantEntityIds(resp);
    },
    {enabled: !!relevantKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

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
