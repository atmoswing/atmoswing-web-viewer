/**
 * @module components/modals/common/useModalSelectionData
 * @description Resolves the effective method/config/entity for a modal's raw selection,
 * filling in the first configuration when the user has not chosen one explicitly.
 */

import {useMemo} from 'react';
import {useForecastSession} from '@/contexts/ForecastSessionContext.jsx';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {getMethodsAndConfigs} from '@/services/api.js';
import {DEFAULT_TTL} from '@/utils/cacheTTLs.js';

/**
 * Hook returning resolved selection data (with fallback config if none explicitly chosen).
 * @param {string} cachePrefix - Cache key namespace prefix
 * @param {boolean} open - Whether owning modal is open
 * @param {Object} selection - Raw selection { methodId, configId, entityId }
 * @returns {Object} Object with resolvedMethodId, resolvedConfigId, resolvedEntityId
 * @example
 * const { resolvedMethodId, resolvedConfigId } = useModalSelectionData('dist_', open, selection);
 */
export function useModalSelectionData(cachePrefix, open, selection) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {methodId, configId, entityId} = selection;

  // Re-compute resolvedConfig
  const methodsCacheKey = open && workspace && activeForecastDate
    ? `${cachePrefix}methods|${workspace}|${activeForecastDate}`
    : null;
  const {data: methodsData} = useCachedRequest(
    methodsCacheKey,
    async () => getMethodsAndConfigs(workspace, activeForecastDate),
    {enabled: !!methodsCacheKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  const resolvedConfig = useMemo(() => {
    if (!methodsData?.methods) return configId || null;
    const m = methodsData.methods.find(mm => mm.id === methodId);
    return configId || (m?.configurations?.[0]?.id) || null;
  }, [methodsData, methodId, configId]);

  return {
    resolvedMethodId: methodId,
    resolvedConfigId: resolvedConfig,
    resolvedEntityId: entityId
  };
}
