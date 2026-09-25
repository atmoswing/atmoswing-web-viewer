/**
 * @module hooks/forecastQueries
 * @description Cached requests for the forecast resources that more than one part of the app
 * asks for.
 *
 * `useCachedRequest` keys into one module-level cache, so two callers share an entry only when
 * they build the *same* key. Resources requested from several places therefore get their
 * canonical key here rather than in each consumer: methods/configs are wanted by the workspace
 * prefetch, `MethodsContext` and both modals, and entities by `EntitiesContext` and the modals.
 * Composing those keys locally is what previously stored one immutable response under four
 * different keys and re-fetched it each time.
 *
 * These hooks take the selection as arguments instead of reading it from context, so they work
 * at any level of the provider stack — `WorkspaceContext` sits outside the forecast contexts and
 * could not call a hook that used `useForecastSession()`.
 */

import {getEntities, getMethodsAndConfigs, getReferenceValues, getRelevantEntities} from '@/services/api.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeEntitiesResponse, normalizeRelevantEntityIds} from '@/utils/normalize/entities.js';
import {normalizeReferenceValues} from '@/utils/normalize/values.js';
import {DEFAULT_TTL} from '@/utils/cacheTTLs.js';

/**
 * Canonical cache key for a workspace's methods and configurations.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @returns {string|null} Cache key, or null when the selection is incomplete
 * @example
 * methodsAndConfigsKey('rhone', '2025-01-01T06:00') // "methods|rhone|2025-01-01T06:00"
 */
export function methodsAndConfigsKey(workspace, forecastDate) {
  return (workspace && forecastDate) ? `methods|${workspace}|${forecastDate}` : null;
}

/**
 * Canonical cache key for the entities of a method/configuration.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {string|number|null} methodId - Method identifier
 * @param {string|number|null} configId - Configuration identifier
 * @returns {string|null} Cache key, or null when the selection is incomplete
 */
export function entitiesKey(workspace, forecastDate, methodId, configId) {
  return (workspace && forecastDate && methodId && configId)
    ? `entities|${workspace}|${forecastDate}|${methodId}|${configId}`
    : null;
}

/**
 * Canonical cache key for an entity's reference (return period) values.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {string|number|null} methodId - Method identifier
 * @param {string|number|null} configId - Configuration identifier
 * @param {string|number|null} entityId - Entity identifier
 * @returns {string|null} Cache key, or null when the selection is incomplete
 */
export function referenceValuesKey(workspace, forecastDate, methodId, configId, entityId) {
  return (workspace && forecastDate && methodId && configId && entityId != null)
    ? `reference|${workspace}|${forecastDate}|${methodId}|${configId}|${entityId}`
    : null;
}

/**
 * Loads a workspace's methods and configurations, in the raw API shape.
 *
 * Consumers normalize what they need (`normalizeMethodsAndConfigs` for the tree); the cache holds
 * the raw response so every caller shares one entry.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Set false to hold the request (e.g. a closed modal)
 * @returns {Object} `useCachedRequest` result plus the `key` in use
 * @example
 * const {data, loading} = useMethodsAndConfigs(workspace, activeForecastDate, {enabled: open});
 */
export function useMethodsAndConfigs(workspace, forecastDate, {enabled = true} = {}) {
  const key = enabled ? methodsAndConfigsKey(workspace, forecastDate) : null;
  const result = useCachedRequest(
    key,
    async () => getMethodsAndConfigs(workspace, forecastDate),
    {enabled: !!key, initialData: null, ttlMs: DEFAULT_TTL}
  );
  return {...result, key};
}

/**
 * Loads the entities (stations/points) of a method/configuration, normalized.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {string|number|null} methodId - Method identifier
 * @param {string|number|null} configId - Configuration identifier
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Set false to hold the request
 * @returns {Object} `useCachedRequest` result plus the `key` in use
 * @example
 * const {data: entities, key} = useEntitiesList(workspace, date, methodId, configId);
 */
export function useEntitiesList(workspace, forecastDate, methodId, configId, {enabled = true} = {}) {
  const key = enabled ? entitiesKey(workspace, forecastDate, methodId, configId) : null;
  const result = useCachedRequest(
    key,
    async () => normalizeEntitiesResponse(await getEntities(workspace, forecastDate, methodId, configId)),
    {enabled: !!key, initialData: [], ttlMs: DEFAULT_TTL}
  );
  return {...result, key};
}

/**
 * Loads an entity's reference (return period) values, normalized.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {string|number|null} methodId - Method identifier
 * @param {string|number|null} configId - Configuration identifier
 * @param {string|number|null} entityId - Entity identifier
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Set false to hold the request
 * @returns {Object} `useCachedRequest` result plus the `key` in use
 * @example
 * const {data: referenceValues} = useReferenceValues(ws, date, m, c, e, {enabled: showReturnPeriods});
 */
export function useReferenceValues(workspace, forecastDate, methodId, configId, entityId, {enabled = true} = {}) {
  const key = enabled ? referenceValuesKey(workspace, forecastDate, methodId, configId, entityId) : null;
  const result = useCachedRequest(
    key,
    async () => normalizeReferenceValues(await getReferenceValues(workspace, forecastDate, methodId, configId, entityId)),
    {enabled: !!key, initialData: null, ttlMs: DEFAULT_TTL}
  );
  return {...result, key};
}

/**
 * Canonical cache key for the relevant entities of every configuration of a method.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {string|number|null} methodId - Method identifier
 * @returns {string|null} Cache key, or null when the selection is incomplete
 */
export function relevantEntitiesByConfigKey(workspace, forecastDate, methodId) {
  return (workspace && forecastDate && methodId)
    ? `relevant_entities_by_config|${workspace}|${forecastDate}|${methodId}`
    : null;
}

/**
 * Loads, for each configuration of a method, the entities it is relevant to.
 *
 * Which entities a configuration covers does not depend on the entity in hand, so one entry per
 * method answers for every entity: the details window labels and picks configurations with it,
 * and the time series resolves the configuration of the entity it shows with it. A configuration
 * whose request fails comes back with an empty set rather than failing the others.
 *
 * The key holds the method rather than the configurations, which are themselves fixed by the
 * workspace, date and method; pass the ids of that same method.
 *
 * @param {string|null} workspace - Workspace key
 * @param {string|null} forecastDate - Active forecast date
 * @param {string|number|null} methodId - Method identifier
 * @param {Array<string|number>} configIds - Configuration ids of that method
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Set false to hold the request
 * @returns {Object} `useCachedRequest` result plus the `key` in use; the data is a
 *   `Map` of configuration id to a `Set` of relevant entity ids, or null until loaded
 * @example
 * const {data: relevance} = useRelevantEntitiesByConfig(ws, date, methodId, configIds);
 * const isRelevant = !!relevance?.get(configId)?.has(entityId);
 */
export function useRelevantEntitiesByConfig(workspace, forecastDate, methodId, configIds, {enabled = true} = {}) {
  const key = (enabled && configIds?.length) ? relevantEntitiesByConfigKey(workspace, forecastDate, methodId) : null;
  const result = useCachedRequest(
    key,
    async () => new Map(await Promise.all(
      configIds.map(async configId => {
        try {
          return [configId, normalizeRelevantEntityIds(await getRelevantEntities(workspace, forecastDate, methodId, configId))];
        } catch {
          return [configId, new Set()];
        }
      })
    )),
    {enabled: !!key, initialData: null, ttlMs: DEFAULT_TTL}
  );
  return {...result, key};
}
