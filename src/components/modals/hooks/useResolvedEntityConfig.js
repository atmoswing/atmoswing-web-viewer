/**
 * @module components/modals/hooks/useResolvedEntityConfig
 * @description Determines which configuration to use for the selected entity when the user has
 * not chosen one explicitly, from the relevant entities of the method's configurations.
 */

import {useMemo} from 'react';
import {useForecastSession, useMethods, useSelectedEntity} from '@/contexts/forecast/ForecastsContext.jsx';
import {useRelevantEntitiesByConfig} from '@/hooks/forecastQueries.js';

/**
 * Resolves the effective configuration id for the currently selected entity.
 *
 * An explicit user selection always wins. Otherwise it is the configuration that lists the entity
 * as relevant, with the method's first configuration as a fallback. The relevance lists are the
 * ones the forecast details window uses, so the two agree and share one cached request.
 *
 * @returns {Object} Resolution state
 * @returns {string|number|null} returns.resolvedConfigId - Effective configuration id, or null while unknown
 * @returns {boolean} returns.resolvingConfig - Whether the relevance lists are still loading
 * @example
 * const { resolvedConfigId, resolvingConfig } = useResolvedEntityConfig();
 */
export function useResolvedEntityConfig() {
  const {selectedEntityId} = useSelectedEntity();
  const {selectedMethodConfig, methodConfigTree} = useMethods();
  const {workspace, activeForecastDate} = useForecastSession();

  const methodId = selectedMethodConfig?.method?.id;
  const explicitConfigId = selectedMethodConfig?.config?.id ?? null;
  const configIds = useMemo(() => {
    const methodNode = methodConfigTree.find(m => m.id === methodId);
    return (methodNode?.children || []).map(c => c.id);
  }, [methodConfigTree, methodId]);

  // Nothing to resolve while the user has chosen a configuration, or no entity is selected.
  const needed = !explicitConfigId && !!methodId && selectedEntityId != null;
  const {data: relevance, loading} = useRelevantEntitiesByConfig(
    workspace, activeForecastDate, methodId, configIds, {enabled: needed}
  );

  const resolvingConfig = needed && configIds.length > 0 && !relevance;

  const resolvedConfigId = useMemo(() => {
    if (explicitConfigId) return explicitConfigId;
    if (!needed || !relevance) return null;
    const relevant = configIds.find(id => relevance.get(id)?.has(selectedEntityId));
    return relevant ?? configIds[0] ?? null;
  }, [explicitConfigId, needed, relevance, configIds, selectedEntityId]);

  return {resolvedConfigId, resolvingConfig: resolvingConfig || (needed && loading)};
}
