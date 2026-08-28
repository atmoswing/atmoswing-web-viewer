/**
 * @module components/modals/hooks/useMethodConfigOptions
 * @description Loads the chained option lists behind the modal selector — methods and their
 * configurations, then entities, then lead times — plus the per-configuration relevance map.
 */

import {useMemo} from 'react';
import {useForecastSession} from '@/contexts/ForecastSessionContext.jsx';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {
  getEntities,
  getMethodsAndConfigs,
  getRelevantEntities,
  getSeriesValuesPercentiles
} from '@/services/api.js';
import {
  extractTargetDatesArray,
  normalizeEntitiesResponse,
  normalizeRelevantEntityIds
} from '@/utils/apiNormalization.js';
import {DEFAULT_TTL, SHORT_TTL} from '@/utils/cacheTTLs.js';
import {compareEntitiesByName, formatDateLabel} from '@/utils/formattingUtils.js';

const EMPTY_LIST = [];
const EMPTY_RELEVANCE = new Map();

/**
 * Turns a series-percentiles response into selectable lead times.
 *
 * @private
 * @param {Object} resp - Raw series-percentiles response
 * @param {Date|null} forecastBaseDate - Base date the lead hours are measured from
 * @returns {Array<{lead: number, date: Date|null, label: string}>} Selectable leads
 */
function toLeadOptions(resp, forecastBaseDate) {
  const rawDates = extractTargetDatesArray(resp);
  const baseDate = (forecastBaseDate && !isNaN(forecastBaseDate.getTime()))
    ? forecastBaseDate
    : (resp?.parameters?.forecast_date ? new Date(resp.parameters.forecast_date) : null);

  return rawDates.map(s => {
    let d = null;
    try {
      d = s ? new Date(s) : null;
      if (d && isNaN(d)) d = null;
    } catch {
      d = null;
    }
    const label = d ? formatDateLabel(d) : String(s);
    const leadNum = (d && baseDate && !isNaN(baseDate.getTime()))
      ? Math.round((d.getTime() - baseDate.getTime()) / 3600000)
      : null;
    return {lead: leadNum, date: d, label};
  }).filter(x => x.lead != null && !isNaN(x.lead));
}

/**
 * Loads every option list the selector renders, for the given selection.
 *
 * Each list depends on the one before it, so a list stays empty until its inputs are chosen.
 *
 * @param {Object} params
 * @param {string} params.cachePrefix - Cache key namespace, so two modals do not share entries
 * @param {boolean} params.open - Whether the owning modal is open; nothing is fetched while closed
 * @param {Object} params.value - Current selection `{ methodId, configId, entityId }`
 * @returns {Object} Option lists and their status
 * @returns {Array} returns.methodOptions - Available methods, each with `configurations`
 * @returns {boolean} returns.methodsLoading - Whether methods are loading
 * @returns {Error|null} returns.methodsError - Error from the methods request
 * @returns {string|number|null} returns.resolvedConfig - Selected config, or the method's first
 * @returns {Array} returns.configsForSelectedMethod - Configurations of the selected method
 * @returns {Array} returns.stations - Entities, sorted by name
 * @returns {boolean} returns.stationsLoading - Whether entities are loading
 * @returns {Error|null} returns.stationsError - Error from the entities request
 * @returns {Array} returns.leads - Selectable lead times
 * @returns {boolean} returns.leadsLoading - Whether leads are loading
 * @returns {Error|null} returns.leadsError - Error from the leads request
 * @returns {Map} returns.relevantConfigIds - configId -> whether the entity is relevant to it
 * @example
 * const { methodOptions, stations, leads } = useMethodConfigOptions({cachePrefix: 'dist_', open, value});
 */
export function useMethodConfigOptions({cachePrefix, open, value}) {
  const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
  const {methodId: selectedMethodId, configId: selectedConfigId, entityId: selectedStationId} = value;

  const sessionPart = (open && workspace && activeForecastDate)
    ? `${workspace}|${activeForecastDate}`
    : null;

  // METHODS
  const methodsCacheKey = sessionPart ? `${cachePrefix}methods|${sessionPart}` : null;
  const {data: methodsData, loading: methodsLoading, error: methodsError} = useCachedRequest(
    methodsCacheKey,
    async () => getMethodsAndConfigs(workspace, activeForecastDate),
    {enabled: !!methodsCacheKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  const methodOptions = useMemo(() => methodsData?.methods || EMPTY_LIST, [methodsData]);

  const configsForSelectedMethod = useMemo(() => {
    const m = methodOptions.find(x => x.id === selectedMethodId);
    return m?.configurations || EMPTY_LIST;
  }, [methodOptions, selectedMethodId]);

  // The explicit choice wins; otherwise fall back to the method's first configuration.
  const resolvedConfig = useMemo(() => {
    if (!methodsData?.methods) return null;
    const m = methodsData.methods.find(mm => mm.id === selectedMethodId);
    if (!m) return null;
    return selectedConfigId || (m.configurations?.[0]?.id) || null;
  }, [methodsData, selectedMethodId, selectedConfigId]);

  // ENTITIES
  const entitiesCacheKey = (sessionPart && selectedMethodId && resolvedConfig)
    ? `${cachePrefix}entities|${sessionPart}|${selectedMethodId}|${resolvedConfig}`
    : null;
  const {data: entitiesDataRaw, loading: stationsLoading, error: stationsError} = useCachedRequest(
    entitiesCacheKey,
    async () => normalizeEntitiesResponse(await getEntities(workspace, activeForecastDate, selectedMethodId, resolvedConfig)),
    {enabled: !!entitiesCacheKey, initialData: [], ttlMs: DEFAULT_TTL}
  );

  const stations = useMemo(() => {
    if (!Array.isArray(entitiesDataRaw)) return EMPTY_LIST;
    return [...entitiesDataRaw].sort(compareEntitiesByName);
  }, [entitiesDataRaw]);

  // LEADS (derived from the series percentiles response)
  // The cached entry holds lead numbers computed against forecastBaseDate, so the base date is
  // part of the key: it arrives asynchronously and would otherwise pin the first value computed.
  // 'resp' marks the branch that falls back to the response's own forecast_date.
  const leadsBasePart = (forecastBaseDate && !isNaN(forecastBaseDate.getTime()))
    ? forecastBaseDate.getTime()
    : 'resp';
  const leadsCacheKey = (sessionPart && selectedMethodId && resolvedConfig && selectedStationId != null)
    ? `${cachePrefix}leads|${sessionPart}|${selectedMethodId}|${resolvedConfig}|${selectedStationId}|${leadsBasePart}`
    : null;
  const {data: leadsRaw, loading: leadsLoading, error: leadsError} = useCachedRequest(
    leadsCacheKey,
    async () => {
      const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, selectedMethodId, resolvedConfig, selectedStationId);
      return toLeadOptions(resp, forecastBaseDate);
    },
    {enabled: !!leadsCacheKey, initialData: [], ttlMs: SHORT_TTL}
  );

  const leads = useMemo(() => (Array.isArray(leadsRaw) ? leadsRaw : EMPTY_LIST), [leadsRaw]);

  // RELEVANCE: which configurations list the selected entity as relevant.
  const relevanceKey = (sessionPart && selectedMethodId && selectedStationId != null)
    ? `${cachePrefix}relevance|${sessionPart}|${selectedMethodId}|${selectedStationId}`
    : null;
  const {data: relevanceMap} = useCachedRequest(
    relevanceKey,
    async () => {
      const methodNode = methodsData?.methods?.find(m => m.id === selectedMethodId);
      if (!methodNode?.configurations) return {};
      const results = await Promise.all(
        methodNode.configurations.map(async cfg => {
          try {
            const resp = await getRelevantEntities(workspace, activeForecastDate, selectedMethodId, cfg.id);
            const idsSet = normalizeRelevantEntityIds(resp);
            return [cfg.id, idsSet.has(selectedStationId)];
          } catch {
            return [cfg.id, false];
          }
        })
      );
      return Object.fromEntries(results);
    },
    {enabled: !!relevanceKey && !!methodsData?.methods?.length, initialData: null, ttlMs: DEFAULT_TTL}
  );

  // The key carries the method and entity, so a change resets relevanceMap to null on its own.
  const relevantConfigIds = useMemo(
    () => (relevanceMap && typeof relevanceMap === 'object' ? new Map(Object.entries(relevanceMap)) : EMPTY_RELEVANCE),
    [relevanceMap]
  );

  return {
    methodOptions,
    methodsLoading,
    methodsError,
    resolvedConfig,
    configsForSelectedMethod,
    stations,
    stationsLoading,
    stationsError,
    leads,
    leadsLoading,
    leadsError,
    relevantConfigIds
  };
}
