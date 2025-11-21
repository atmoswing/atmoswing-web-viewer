/**
 * @module contexts/ForecastValuesContext
 * @description Fetches and exposes forecast values (normalized + raw) for entities based on current selection.
 * Handles lead time resolution, availability detection, and percentile/normalization parameters.
 */

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {useSynthesis} from './SynthesisContext.jsx';
import {getAggregatedEntitiesValues, getEntitiesValuesPercentile} from '@/services/api.js';
import {computeLeadHours, hasTargetDate} from '@/utils/targetDateUtils.js';
import {isMethodSelectionValid, keyForForecastValues, methodExists} from '@/utils/contextGuards.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeForecastValuesResponse} from '@/utils/apiNormalization.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';

const ForecastValuesContext = createContext({});

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

  const [forecastValuesNorm, setForecastValuesNorm] = useState({});
  const [forecastValues, setForecastValues] = useState({});
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [forecastUnavailable, setForecastUnavailable] = useState(false);

  // Immediate availability feedback based on selection vs leads
  useEffect(() => {
    if (!isMethodSelectionValid(selectedMethodConfig, workspace) || !activeForecastDate) {
      setForecastUnavailable(false);
      return;
    }
    if (!selectedTargetDate) {
      setForecastUnavailable(false);
      return;
    }
    setForecastUnavailable(!hasTargetDate(leadResolution, selectedTargetDate, dailyLeads, subDailyLeads));
  }, [selectedMethodConfig, workspace, activeForecastDate, leadResolution, selectedTargetDate, dailyLeads, subDailyLeads]);

  const leadHours = computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads);
  const canQuery = !!workspace && !!activeForecastDate && isMethodSelectionValid(selectedMethodConfig, workspace) && methodExists(methodConfigTree, selectedMethodConfig?.method?.id);
  const methodId = selectedMethodConfig?.method?.id;
  const configId = selectedMethodConfig?.config?.id;
  const key = canQuery ? keyForForecastValues(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef) : null;

  const {data: valuesData, loading: valuesReqLoading, error: valuesReqError} = useCachedRequest(
    key,
    async () => {
      const resp = configId
        ? await getEntitiesValuesPercentile(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef)
        : await getAggregatedEntitiesValues(workspace, activeForecastDate, methodId, leadHours, percentile, normalizationRef);
      return normalizeForecastValuesResponse(resp);
    },
    [workspace, activeForecastDate, selectedMethodConfig, percentile, normalizationRef, selectedLead, leadResolution, dailyLeads, subDailyLeads, forecastBaseDate, selectedTargetDate, methodConfigTree],
    {enabled: !!key, initialData: null, ttlMs: SHORT_TTL}
  );

  useEffect(() => {
    if (!key) {
      setForecastValuesNorm({});
      setForecastValues({});
      setForecastLoading(false);
      setForecastError(null);
      // don't leave stale "unavailable" if nothing is selected
      setForecastUnavailable(false);
      return;
    }
    // entering a new fetch cycle: clear stale unavailable while loading
    setForecastLoading(valuesReqLoading);
    setForecastError(valuesReqError || null);
    if (valuesReqLoading) {
      setForecastUnavailable(false);
    }
    if (valuesData) {
      setForecastValuesNorm(valuesData.norm || {});
      setForecastValues(valuesData.raw || {});
      setForecastUnavailable(!!valuesData.unavailable);
    }
  }, [key, valuesData, valuesReqLoading, valuesReqError]);

  // Clear all data when workspace changes
  useEffect(() => {
    setForecastValuesNorm({});
    setForecastValues({});
    setForecastLoading(false);
    setForecastError(null);
    setForecastUnavailable(false);
  }, [workspace]);

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
