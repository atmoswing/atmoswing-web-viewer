/**
 * @module contexts/ForecastValuesContext
 * @description Fetches and exposes forecast values (normalized + raw) for entities based on current selection.
 * Handles lead time resolution, availability detection, and percentile/normalization parameters.
 */

import React, {createContext, useContext, useMemo} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {useSynthesis} from './SynthesisContext.jsx';
import {getAggregatedEntitiesValues, getEntitiesValuesPercentile} from '@/services/api.js';
import {computeLeadHours, hasTargetDate} from '@/utils/targetDateUtils.js';
import {isMethodSelectionValid, methodExists} from '@/utils/contextGuards.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeForecastValuesResponse} from '@/utils/normalize/values.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';

const ForecastValuesContext = createContext({});

/**
 * Composes the cache key for a forecast values request.
 *
 * `'agg'` and `'raw'` stand in for an absent configuration and normalization reference: the
 * provider calls a different endpoint when there is no configuration, so the aggregated and
 * per-configuration responses must never collapse onto one cache entry.
 *
 * @param {string} workspace - Workspace key
 * @param {string} forecastDate - Active forecast date
 * @param {string|number} methodId - Method identifier
 * @param {string|number|null} configId - Configuration identifier, or null for the aggregate
 * @param {number} leadHours - Lead time in hours
 * @param {number} percentile - Requested percentile
 * @param {string|null} normalizationRef - Normalization reference, or null for raw values
 * @returns {string} Cache key
 * @example
 * forecastValuesKey('rhone', '2025-01-01T06:00', 'm1', null, 24, 90, null);
 * // "forecast_values|rhone|2025-01-01T06:00|m1|agg|24|90|raw"
 */
export function forecastValuesKey(workspace, forecastDate, methodId, configId, leadHours, percentile, normalizationRef) {
  return `forecast_values|${workspace}|${forecastDate}|${methodId}|${configId || 'agg'}|${leadHours}|${percentile}|${normalizationRef || 'raw'}`;
}

// Stable identities for the empty case, so consumers memoising on these don't churn.
const EMPTY_VALUES = {};

/**
 * ForecastValuesProvider component.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {React.ReactElement}
 */
export function ForecastValuesProvider({children}) {
  const {workspace, activeForecastDate, percentile, normalizationRef, forecastBaseDate} = useForecastSession();
  const {selectedMethodConfig, methodConfigTree} = useMethods();
  const {selectedLead, leadResolution, dailyLeads, subDailyLeads, selectedTargetDate} = useSynthesis();

  // Immediate availability feedback: the selected target date is not among the known leads.
  const targetDateMissing = useMemo(() => {
    if (!isMethodSelectionValid(selectedMethodConfig, workspace) || !activeForecastDate) return false;
    if (!selectedTargetDate) return false;
    return !hasTargetDate(leadResolution, selectedTargetDate, dailyLeads, subDailyLeads);
  }, [selectedMethodConfig, workspace, activeForecastDate, leadResolution, selectedTargetDate, dailyLeads, subDailyLeads]);

  const leadHours = computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads);
  const canQuery = !!workspace && !!activeForecastDate && isMethodSelectionValid(selectedMethodConfig, workspace) && methodExists(methodConfigTree, selectedMethodConfig?.method?.id);
  const methodId = selectedMethodConfig?.method?.id;
  const configId = selectedMethodConfig?.config?.id;
  const key = canQuery
    ? forecastValuesKey(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef)
    : null;

  const {data: valuesData, loading: forecastLoading, error: forecastError} = useCachedRequest(
    key,
    async () => {
      const resp = configId
        ? await getEntitiesValuesPercentile(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef)
        : await getAggregatedEntitiesValues(workspace, activeForecastDate, methodId, leadHours, percentile, normalizationRef);
      return normalizeForecastValuesResponse(resp);
    },
    {enabled: !!key, initialData: null, ttlMs: SHORT_TTL}
  );

  const forecastValuesNorm = valuesData?.norm || EMPTY_VALUES;
  const forecastValues = valuesData?.raw || EMPTY_VALUES;

  // Nothing selected, or a fetch in flight, must not show a stale "unavailable" overlay.
  // Once a response is in, it is authoritative; otherwise fall back to the lead check.
  let forecastUnavailable = false;
  if (key && !forecastLoading) {
    forecastUnavailable = valuesData ? !!valuesData.unavailable : targetDateMissing;
  }

  const value = useMemo(() => ({
    forecastValues,
    forecastValuesNorm,
    forecastLoading,
    forecastError,
    forecastUnavailable
  }), [forecastValues, forecastValuesNorm, forecastLoading, forecastError, forecastUnavailable]);

  return <ForecastValuesContext.Provider value={value}>{children}</ForecastValuesContext.Provider>;
}

/**
 * Hook to access forecast values context.
 * @returns {Object} Forecast values state
 * @returns {Object} returns.forecastValues - Map entityId -> raw forecast value
 * @returns {Object} returns.forecastValuesNorm - Map entityId -> normalized forecast value
 * @returns {boolean} returns.forecastLoading - Loading state
 * @returns {Error|null} returns.forecastError - Error during fetch
 * @returns {boolean} returns.forecastUnavailable - Flag when data deemed unavailable (e.g., no leads)
 */
export const useForecastValues = () => useContext(ForecastValuesContext);
