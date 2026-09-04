/**
 * @module components/panels/hooks/useAnalogDates
 * @description Loads the ranked analog dates and their analogy criteria for the current
 * method/config selection and lead time.
 */

import {useForecastSession, useMethods} from '@/contexts/forecast/ForecastsContext.jsx';
import {useSynthesis} from '@/contexts/forecast/SynthesisContext.jsx';
import {getAnalogDates, getAnalogyCriteria} from '@/services/api.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeAnalogCriteriaArray, normalizeAnalogDatesArray} from '@/utils/normalize/analogs.js';
import {computeLeadHours} from '@/utils/targetDateUtils.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';

/**
 * Loads the analog dates table for the current selection.
 *
 * Dates and criteria come from two endpoints and are zipped into one row per rank, so the panel
 * receives rows it can hand straight to the grid.
 *
 * @returns {Object} Table data and status
 * @returns {Array<{id: number, rank: number, date: *, criteria: number|null}>} returns.rows - Ranked analogs
 * @returns {boolean} returns.loading - Whether the requests are in flight
 * @returns {string|number|null} returns.configId - Selected configuration, or null when none is chosen
 * @example
 * const { rows, loading, configId } = useAnalogDates();
 * if (!configId) return null;
 */
export function useAnalogDates() {
  const {selectedMethodConfig} = useMethods();
  const {workspace, activeForecastDate, forecastBaseDate} = useForecastSession();
  const {selectedLead, leadResolution, dailyLeads, subDailyLeads, selectedTargetDate} = useSynthesis();

  const configId = selectedMethodConfig?.config?.id ?? null;
  const methodId = selectedMethodConfig?.method?.id ?? null;

  const leadHours = computeLeadHours(
    forecastBaseDate,
    selectedTargetDate,
    leadResolution,
    selectedLead,
    dailyLeads,
    subDailyLeads
  );

  const enabled = !!configId && !!methodId && !!workspace && !!activeForecastDate;
  const cacheKey = enabled
    ? `analog_datescrit|${workspace}|${activeForecastDate}|${methodId}|${configId}|${leadHours}`
    : null;

  const {data: rows, loading} = useCachedRequest(
    cacheKey,
    async () => {
      const [datesResp, criteriaResp] = await Promise.all([
        getAnalogDates(workspace, activeForecastDate, methodId, configId, leadHours),
        getAnalogyCriteria(workspace, activeForecastDate, methodId, configId, leadHours)
      ]);
      const dates = normalizeAnalogDatesArray(datesResp);
      const criteria = normalizeAnalogCriteriaArray(criteriaResp);
      return (dates || []).map((d, idx) => ({
        id: idx + 1,
        rank: idx + 1,
        date: d,
        criteria: (criteria && criteria.length > idx) ? criteria[idx] : null
      }));
    },
    {enabled, initialData: [], ttlMs: SHORT_TTL}
  );

  return {rows, loading, configId};
}
