/**
 * @module components/modals/hooks/useTimeSeriesData
 * @description Fetches every series the time series modal can draw — percentiles, reference
 * return periods, best analogs and previous forecasts — for the current selection.
 */

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {useForecastSession, useMethods, useSelectedEntity} from '@/contexts/forecast/ForecastsContext.jsx';
import {
  getSeriesBestAnalogs,
  getSeriesValuesPercentiles,
  getSeriesValuesPercentilesHistory
} from '@/services/api.js';
import {useCachedRequest} from '@/hooks/useCachedRequest.js';
import {useReferenceValues} from '@/hooks/forecastQueries.js';
import {DEFAULT_TTL, SHORT_TTL} from '@/utils/cacheTTLs.js';
import {
  normalizeSeriesBestAnalogs,
  normalizeSeriesValuesPercentiles,
  normalizeSeriesValuesPercentilesHistory
} from '@/utils/apiNormalization.js';
import {parseForecastDate} from '@/utils/forecastDateUtils.js';
import {DEFAULT_PCTS, FULL_PCTS} from '../charts/plotConstants.js';
import {useResolvedEntityConfig} from './useResolvedEntityConfig.js';

/**
 * Loads the time series data for the selected entity.
 *
 * The optional series are only requested when the corresponding display option is enabled, so
 * toggling a checkbox off stops the request rather than merely hiding the result.
 *
 * @param {Object} options - Display options from the modal
 * @param {boolean} options.allQuantiles - Request the full percentile set instead of the default one
 * @param {boolean} options.bestAnalogs - Request the best analog series
 * @param {boolean} options.tenYearReturn - Request reference (return period) values
 * @param {boolean} options.allReturnPeriods - Request reference values for every return period
 * @param {boolean} options.previousForecasts - Request the previous forecasts history
 * @returns {Object} Series data and status
 * @returns {Object|null} returns.series - Percentile series for the entity
 * @returns {Object|null} returns.referenceValues - Reference values, as `{ axis, values }`
 * @returns {Object|null} returns.bestAnalogs - Best analogs, as `{ items, dates }`
 * @returns {Object|null} returns.pastForecasts - Previous forecast series
 * @returns {boolean} returns.loading - Whether the main percentile series is loading
 * @returns {Error|null} returns.error - Error from the main percentile series request
 * @returns {string|number|null} returns.resolvedConfigId - Configuration the data was fetched for
 * @returns {boolean} returns.resolvingConfig - Whether the configuration is still being resolved
 * @example
 * const { series, bestAnalogs, loading, error } = useTimeSeriesData(options);
 */
export function useTimeSeriesData(options) {
  const {selectedEntityId} = useSelectedEntity();
  const {selectedMethodConfig} = useMethods();
  const {workspace, activeForecastDate} = useForecastSession();
  const {t} = useTranslation();
  const {resolvedConfigId, resolvingConfig} = useResolvedEntityConfig();

  const methodId = selectedMethodConfig?.method?.id;
  const requestedPercentiles = useMemo(
    () => (options.allQuantiles ? FULL_PCTS : DEFAULT_PCTS),
    [options.allQuantiles]
  );

  // Every request shares the same selection; a null base disables all four at once.
  const base = (workspace && activeForecastDate && methodId && resolvedConfigId && selectedEntityId != null)
    ? `${workspace}|${activeForecastDate}|${methodId}|${resolvedConfigId}|${selectedEntityId}`
    : null;

  const seriesKey = base ? `series|${base}|${requestedPercentiles?.join(',') || ''}` : null;
  const {data: series, loading, error} = useCachedRequest(
    seriesKey,
    async () => {
      const resp = await getSeriesValuesPercentiles(workspace, activeForecastDate, methodId, resolvedConfigId, selectedEntityId, requestedPercentiles);
      return normalizeSeriesValuesPercentiles(resp, parseForecastDate);
    },
    {enabled: !!seriesKey, initialData: null, ttlMs: SHORT_TTL}
  );

  // Same resource the distributions modal loads, so the two share one cache entry.
  const {data: referenceValues} = useReferenceValues(
    workspace, activeForecastDate, methodId, resolvedConfigId, selectedEntityId,
    {enabled: !!base && (options.tenYearReturn || options.allReturnPeriods)}
  );

  const bestAnalogsKey = (base && options.bestAnalogs) ? `series_bestanalogs|${base}` : null;
  const {data: bestAnalogs} = useCachedRequest(
    bestAnalogsKey,
    async () => {
      const resp = await getSeriesBestAnalogs(workspace, activeForecastDate, methodId, resolvedConfigId, selectedEntityId);
      const parsed = normalizeSeriesBestAnalogs(resp, parseForecastDate);
      if (parsed && Array.isArray(parsed.items)) {
        // add labels for display consistency
        parsed.items = parsed.items.map((it, idx) => ({label: t('seriesModal.analogWithIndex', {index: idx + 1}), ...it}));
      }
      return parsed;
    },
    {enabled: !!bestAnalogsKey, initialData: null, ttlMs: SHORT_TTL}
  );

  const pastKey = (base && options.previousForecasts) ? `series_history|${base}` : null;
  const {data: pastForecasts} = useCachedRequest(
    pastKey,
    async () => {
      const resp = await getSeriesValuesPercentilesHistory(workspace, activeForecastDate, methodId, resolvedConfigId, selectedEntityId);
      return normalizeSeriesValuesPercentilesHistory(resp, parseForecastDate);
    },
    {enabled: !!pastKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  return {
    series,
    referenceValues,
    bestAnalogs,
    pastForecasts,
    loading,
    error,
    resolvedConfigId,
    resolvingConfig
  };
}
