/**
 * @module components/modals/hooks/useForecastDetailsData
 * @description Loads everything the forecast details window shows for one method, configuration,
 * entity and lead: the analogs (table, precipitation and criteria distributions), percentile
 * markers and reference return periods.
 */

import {useMemo} from 'react';
import {useForecastSession} from '@/contexts/forecast/ForecastSessionContext.jsx';
import {getAnalogs, getAnalogValuesPercentiles} from '@/services/api.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {useEntitiesList, useReferenceValues} from '@/hooks/forecastQueries.js';
import {normalizeAnalogPercentiles, normalizeAnalogsResponse} from '@/utils/normalize/analogs.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';
import {entityDisplayName} from '@/utils/formattingUtils.js';

/** Percentiles marked on the precipitation distribution. */
const MARKER_PERCENTILES = [20, 60, 90];

/** How many analogs the "best analogs" overlay shows. */
const BEST_ANALOGS_COUNT = 10;

/** Stable empty list, so consumers memoising on `analogs` don't churn. */
const EMPTY_ANALOGS = [];

/**
 * Picks the best analogs to overlay on the distribution.
 * Sorted by criteria when enough analogs carry one (lower is better), otherwise by rank.
 *
 * @private
 * @param {Array|null} analogs - Analog records for the selected lead
 * @returns {Array|null} Array of `{ rank, value }`, or null when there is nothing to show
 */
function pickBestAnalogs(analogs) {
  const list = Array.isArray(analogs) ? analogs : [];
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
 * Criteria of each analog, in rank order, for the criteria distribution.
 *
 * @private
 * @param {Array} analogs - Analog records
 * @returns {Array<{index: number, value: number}>|null} Criteria, or null when none are present
 */
function criteriaOf(analogs) {
  const values = analogs
    .map(a => (a && a.criteria != null ? Number(a.criteria) : null))
    .filter(v => v != null && Number.isFinite(v));
  return values.length ? values.map((v, i) => ({index: i + 1, value: v})) : null;
}

/**
 * Loads the forecast details for the window's current selection.
 *
 * One `/analogs` request per selection feeds all three tabs. Its records carry the date, value,
 * criteria and rank of each analog, which is everything `/analog-values` (values only) and
 * `/analogy-criteria` (criteria only) returned separately; the three were checked to agree
 * value for value on real forecasts.
 *
 * @param {Object} params
 * @param {boolean} params.open - Whether the window is open; nothing is fetched while closed
 * @param {Object} params.selection - Selection `{ methodId, configId, entityId, lead }`
 * @param {Object} params.options - Display options `{ bestAnalogs, tenYearReturn, allReturnPeriods }`
 * @returns {Object} Details data and status
 * @returns {Array} returns.analogs - Analog records `{rank, date, value, criteria}`; empty when none
 * @returns {Array|null} returns.analogValues - The same records for the distribution chart, or null when none
 * @returns {boolean} returns.analogsLoading - Whether the analogs are loading
 * @returns {Error|null} returns.analogsError - Error from the analogs request
 * @returns {Array|null} returns.criteriaValues - Criteria as `{ index, value }`, or null when none
 * @returns {Array|null} returns.bestAnalogsData - Best analogs overlay, when the option is enabled
 * @returns {Object|null} returns.percentileMarkers - Percentile marker values
 * @returns {Object|null} returns.referenceValues - Reference (return period) values
 * @returns {string} returns.stationName - Display name of the selected entity
 * @example
 * const { analogs, analogValues, criteriaValues, analogsLoading } = useForecastDetailsData({open, selection, options});
 */
export function useForecastDetailsData({open, selection, options}) {
  const {workspace, activeForecastDate} = useForecastSession();
  // Nothing loads until the selector has settled the configuration: a provisional one would
  // fetch analogs that are replaced as soon as the entity's relevant configuration is known.
  const {methodId, configId, entityId, lead} = selection;

  // Shared prefix of the per-selection keys; null disables them all.
  const methodConfigPart = (open && workspace && activeForecastDate && methodId && configId)
    ? `${workspace}|${activeForecastDate}|${methodId}|${configId}`
    : null;
  const hasEntity = methodConfigPart && entityId != null;
  const hasEntityAndLead = hasEntity && lead != null;

  const analogsKey = hasEntityAndLead ? `analogs|${methodConfigPart}|${entityId}|${lead}` : null;
  const {data: analogsData, loading: analogsLoading, error: analogsError} = useCachedRequest(
    analogsKey,
    async () => normalizeAnalogsResponse(
      await getAnalogs(workspace, activeForecastDate, methodId, configId, entityId, lead)
    ),
    {enabled: !!analogsKey, initialData: EMPTY_ANALOGS, ttlMs: SHORT_TTL}
  );

  const analogs = Array.isArray(analogsData) ? analogsData : EMPTY_ANALOGS;
  const analogValues = analogs.length ? analogs : null;
  const criteriaValues = useMemo(() => criteriaOf(analogs), [analogs]);

  const pctsKey = hasEntityAndLead ? `analog_percentiles|${methodConfigPart}|${entityId}|${lead}` : null;
  const {data: percentileMarkers} = useCachedRequest(
    pctsKey,
    async () => normalizeAnalogPercentiles(await getAnalogValuesPercentiles(workspace, activeForecastDate, methodId, configId, entityId, lead, MARKER_PERCENTILES)),
    {enabled: !!pctsKey, initialData: null, ttlMs: SHORT_TTL}
  );

  const {data: referenceValues} = useReferenceValues(
    workspace, activeForecastDate, methodId, configId, entityId,
    {enabled: !!hasEntity && (options.tenYearReturn || options.allReturnPeriods)}
  );

  // Entity list, used only to show and export the station's display name.
  const {data: entities} = useEntitiesList(
    workspace, activeForecastDate, methodId, configId,
    {enabled: !!methodConfigPart}
  );
  const stationName = useMemo(
    () => entityDisplayName(entities, entityId),
    [entities, entityId]
  );

  const bestAnalogsData = useMemo(
    () => (options.bestAnalogs ? pickBestAnalogs(analogValues) : null),
    [options.bestAnalogs, analogValues]
  );

  return {
    analogs,
    analogValues,
    analogsLoading,
    analogsError,
    criteriaValues,
    bestAnalogsData,
    percentileMarkers,
    referenceValues,
    stationName
  };
}
