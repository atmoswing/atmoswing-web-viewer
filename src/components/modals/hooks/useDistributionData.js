/**
 * @module components/modals/hooks/useDistributionData
 * @description Fetches everything the distributions modal draws — analog values, analogy criteria,
 * percentile markers and reference return periods — for the current selection.
 */

import {useMemo} from 'react';
import {useForecastSession} from '@/contexts/forecast/ForecastSessionContext.jsx';
import {getAnalogValues, getAnalogValuesPercentiles, getAnalogyCriteria} from '@/services/api.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {useEntitiesList, useReferenceValues} from '@/hooks/forecastQueries.js';
import {
  normalizeAnalogCriteriaArray,
  normalizeAnalogPercentiles,
  normalizeAnalogsResponse
} from '@/utils/apiNormalization.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';
import {entityDisplayName} from '@/utils/formattingUtils.js';
import {useModalSelectionData} from './useModalSelectionData.js';

/** Percentiles marked on the precipitation distribution. */
const MARKER_PERCENTILES = [20, 60, 90];

/** How many analogs the "best analogs" overlay shows. */
const BEST_ANALOGS_COUNT = 10;

/**
 * Picks the best analogs to overlay on the distribution.
 * Sorted by criteria when enough analogs carry one (lower is better), otherwise by rank.
 *
 * @private
 * @param {Array|null} analogValues - Analog records for the selected lead
 * @returns {Array|null} Array of `{ rank, value }`, or null when there is nothing to show
 */
function pickBestAnalogs(analogValues) {
  const list = Array.isArray(analogValues) ? analogValues : [];
  if (!list.length) return null;
  const withCriteria = list.filter(a => a && a.criteria != null && isFinite(Number(a.criteria)) && a.value != null && isFinite(Number(a.value)));
  const withValue = list.filter(a => a && a.value != null && isFinite(Number(a.value)));
  const selected = withCriteria.length >= BEST_ANALOGS_COUNT
    ? [...withCriteria].sort((a, b) => Number(a.criteria) - Number(b.criteria)).slice(0, BEST_ANALOGS_COUNT)
    : [...withValue].sort((a, b) => (Number(a.rank ?? Infinity) - Number(b.rank ?? Infinity))).slice(0, BEST_ANALOGS_COUNT);
  if (!selected.length) return null;
  return selected.map(a => ({rank: a.rank, value: Number(a.value)}));
}

/**
 * Loads the distribution data for the modal's current selection.
 *
 * @param {Object} params
 * @param {boolean} params.open - Whether the modal is open; nothing is fetched while closed
 * @param {Object} params.selection - Raw selection `{ methodId, configId, entityId, lead }`
 * @param {Object} params.options - Display options `{ bestAnalogs, tenYearReturn, allReturnPeriods }`
 * @returns {Object} Distribution data and status
 * @returns {Array|null} returns.analogValues - Analog records, or null when empty
 * @returns {boolean} returns.analogLoading - Whether the analog values are loading
 * @returns {Error|null} returns.analogError - Error from the analog values request
 * @returns {Array|null} returns.criteriaValues - Criteria as `{ index, value }`, from the API or derived
 * @returns {boolean} returns.criteriaLoading - Whether the criteria are loading
 * @returns {Array|null} returns.bestAnalogsData - Best analogs overlay, when the option is enabled
 * @returns {Object|null} returns.percentileMarkers - Percentile marker values
 * @returns {Object|null} returns.referenceValues - Reference (return period) values
 * @returns {string} returns.stationName - Display name of the selected entity
 * @returns {string|number|null} returns.resolvedMethodId - Effective method id
 * @returns {string|number|null} returns.resolvedConfigId - Effective configuration id
 * @returns {string|number|null} returns.resolvedEntityId - Effective entity id
 * @example
 * const { analogValues, criteriaValues, analogLoading } = useDistributionData({open, selection, options});
 */
export function useDistributionData({open, selection, options}) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {resolvedMethodId, resolvedConfigId, resolvedEntityId} = useModalSelectionData(open, selection);

  const lead = selection.lead;

  // Shared prefix of every key below; null disables the whole set.
  const methodConfigPart = (open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId)
    ? `${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}`
    : null;
  const hasEntity = methodConfigPart && resolvedEntityId != null;
  const hasLead = methodConfigPart && lead != null;

  const analogKey = (hasEntity && lead != null) ? `analog_values|${methodConfigPart}|${resolvedEntityId}|${lead}` : null;
  const {data: analogRespRaw, loading: analogLoading, error: analogError} = useCachedRequest(
    analogKey,
    async () => normalizeAnalogsResponse(await getAnalogValues(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, lead)),
    {enabled: !!analogKey, initialData: [], ttlMs: SHORT_TTL}
  );
  const analogValues = Array.isArray(analogRespRaw) && analogRespRaw.length ? analogRespRaw : null;

  // Criteria are per-lead; the endpoint does not take an entity.
  const criteriaKey = hasLead ? `analog_criteria|${methodConfigPart}|${lead}` : null;
  const {data: criteriaResp, loading: criteriaLoading} = useCachedRequest(
    criteriaKey,
    async () => normalizeAnalogCriteriaArray(await getAnalogyCriteria(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, lead)),
    {enabled: !!criteriaKey, initialData: null, ttlMs: SHORT_TTL}
  );

  // Prefer API-provided criteria; otherwise derive them from the analog values for this lead.
  const criteriaValues = useMemo(() => {
    if (Array.isArray(criteriaResp) && criteriaResp.length) {
      return criteriaResp.map((v, i) => ({index: i + 1, value: v})).filter(x => x.value != null);
    }
    if (Array.isArray(analogValues) && analogValues.length) {
      const derived = analogValues
        .map(a => (a && a.criteria != null ? Number(a.criteria) : null))
        .filter(v => v != null && Number.isFinite(v));
      if (derived.length) return derived.map((v, i) => ({index: i + 1, value: v}));
    }
    return null;
  }, [criteriaResp, analogValues]);

  const pctsKey = (hasEntity && lead != null) ? `analog_percentiles|${methodConfigPart}|${resolvedEntityId}|${lead}` : null;
  const {data: percentileMarkers} = useCachedRequest(
    pctsKey,
    async () => normalizeAnalogPercentiles(await getAnalogValuesPercentiles(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, lead, MARKER_PERCENTILES)),
    {enabled: !!pctsKey, initialData: null, ttlMs: SHORT_TTL}
  );

  const {data: referenceValues} = useReferenceValues(
    workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId,
    {enabled: !!hasEntity && (options.tenYearReturn || options.allReturnPeriods)}
  );

  // Entity list, used only to show and export the station's display name.
  const {data: entitiesForExport} = useEntitiesList(
    workspace, activeForecastDate, resolvedMethodId, resolvedConfigId,
    {enabled: !!methodConfigPart}
  );

  const stationName = useMemo(
    () => entityDisplayName(entitiesForExport, resolvedEntityId),
    [entitiesForExport, resolvedEntityId]
  );

  const bestAnalogsData = useMemo(
    () => (options.bestAnalogs ? pickBestAnalogs(analogValues) : null),
    [options.bestAnalogs, analogValues]
  );

  return {
    analogValues,
    analogLoading,
    analogError,
    criteriaValues,
    criteriaLoading,
    bestAnalogsData,
    percentileMarkers,
    referenceValues,
    stationName,
    resolvedMethodId,
    resolvedConfigId,
    resolvedEntityId
  };
}
