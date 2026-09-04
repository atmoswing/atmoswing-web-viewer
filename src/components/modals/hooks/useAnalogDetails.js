/**
 * @module components/modals/hooks/useAnalogDetails
 * @description Loads the detailed analog list for the analogs modal's current selection.
 */

import {useForecastSession} from '@/contexts/forecast/ForecastSessionContext.jsx';
import {getAnalogs} from '@/services/api.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeAnalogsResponse} from '@/utils/normalize/analogs.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';
import {useModalSelectionData} from './useModalSelectionData.js';

const EMPTY_ANALOGS = [];

/**
 * Loads the analogs for the selected method, configuration, entity and lead.
 *
 * @param {Object} params
 * @param {boolean} params.open - Whether the modal is open; nothing is fetched while closed
 * @param {Object} params.selection - Raw selection `{ methodId, configId, entityId, lead }`
 * @returns {Object} Analog data and status
 * @returns {Array} returns.analogs - Analog records, empty when unavailable
 * @returns {boolean} returns.analogsLoading - Whether the request is in flight
 * @returns {Error|null} returns.analogsError - Error from the request
 * @returns {string|number|null} returns.resolvedMethodId - Effective method id
 * @returns {string|number|null} returns.resolvedConfigId - Effective configuration id
 * @returns {string|number|null} returns.resolvedEntityId - Effective entity id
 * @example
 * const { analogs, analogsLoading } = useAnalogDetails({open, selection});
 */
export function useAnalogDetails({open, selection}) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {resolvedMethodId, resolvedConfigId, resolvedEntityId} = useModalSelectionData(open, selection);

  const canQuery = open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId
    && resolvedEntityId != null && selection.lead != null;
  const analogsCacheKey = canQuery
    ? `analogs|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}|${resolvedEntityId}|${selection.lead}`
    : null;

  const {data: analogsData, loading: analogsLoading, error: analogsError} = useCachedRequest(
    analogsCacheKey,
    async () => normalizeAnalogsResponse(
      await getAnalogs(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead)
    ),
    {enabled: !!analogsCacheKey, initialData: [], ttlMs: SHORT_TTL}
  );

  return {
    analogs: Array.isArray(analogsData) ? analogsData : EMPTY_ANALOGS,
    analogsLoading,
    analogsError,
    resolvedMethodId,
    resolvedConfigId,
    resolvedEntityId
  };
}
