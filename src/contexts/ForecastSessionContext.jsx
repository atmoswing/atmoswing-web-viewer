import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';
import {formatForecastDateForApi, parseForecastDate} from '../utils/forecastDateUtils.js';
import {getLastForecastDate, getSynthesisTotal, hasForecastDate} from '../services/api.js';
import {normalizeHasForecastDate, normalizeSynthesisHasLeads} from '../utils/apiNormalization.js';
import {useCachedRequest as useCachedRequestHook} from '../hooks/useCachedRequest.js';
import config from '@/config.js';

const SHORT_TTL = 1000 * 60 * 5; // 5 minutes (for cached requests)

const ForecastSessionContext = createContext({});

// Cached helper component (hook usage must be inside provider): we expose a function that reads caches via direct fetch but benefits from prior caching.
async function findShiftedForecast(workspace, activeForecastDate, pattern, hours, maxAttempts = 12) {
  const start = parseForecastDate(activeForecastDate);
  if (!start || isNaN(start)) return null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const candidate = new Date(start.getTime());
    candidate.setHours(candidate.getHours() + hours * attempt);
    const raw = formatForecastDateForApi(candidate, pattern || activeForecastDate);
    let exists = false;
    try {
      const existsResp = await hasForecastDate(workspace, raw);
      exists = normalizeHasForecastDate(existsResp);
    } catch {
      exists = false;
    }
    if (!exists) continue;
    try {
      const resp = await getSynthesisTotal(workspace, raw, 90, 10);
      if (normalizeSynthesisHasLeads(resp)) return {raw, dateObj: candidate};
    } catch { /* continue searching */
    }
  }
  return null;
}

export function ForecastSessionProvider({children}) {
  const {workspace, workspaceData} = useWorkspace();
  const [activeForecastDate, setActiveForecastDate] = useState(null);
  const [activeForecastDatePattern, setActiveForecastDatePattern] = useState(null);
  const [forecastBaseDate, setForecastBaseDate] = useState(null);

  const [percentile, setPercentile] = useState(90);
  const [normalizationRef, setNormalizationRef] = useState(10);

  const [resetVersion, setResetVersion] = useState(0);

  const [baseDateSearchFailed, setBaseDateSearchFailed] = useState(false);
  const [baseDateSearching, setBaseDateSearching] = useState(false);
  const searchReqIdRef = useRef(0);

  const bumpResetVersion = useCallback(() => setResetVersion(v => v + 1), []);

  const fullReset = useCallback((newBaseDateObj) => {
    setForecastBaseDate(newBaseDateObj || null);
    bumpResetVersion();
  }, [bumpResetVersion]);

  // Initialize from workspaceData
  useEffect(() => {
    if (workspaceData?.date?.last_forecast_date) {
      const raw = workspaceData.date.last_forecast_date;
      setActiveForecastDate(raw);
      setActiveForecastDatePattern(p => p || raw);
      fullReset(parseForecastDate(raw));
      setBaseDateSearchFailed(false);
    }
  }, [workspaceData, fullReset]);

  // Reset forecast session state immediately when workspace changes to avoid using previous workspace's activeForecastDate and method selections.
  const prevWorkspaceRef = useRef(workspace);
  useEffect(() => {
    if (prevWorkspaceRef.current !== workspace) {
      // Workspace changed: clear date & pattern before new one loads to prevent cross-workspace fetches
      setActiveForecastDate(null);
      setActiveForecastDatePattern(null);
      fullReset(null); // increments resetVersion + clears base date
      setBaseDateSearchFailed(false);
      setBaseDateSearching(false);
      prevWorkspaceRef.current = workspace;
    }
  }, [workspace, fullReset]);

  // Shift base date by hours (with search logic for 6h increments)
  const shiftForecastBaseDate = useCallback((hours) => {
    if (baseDateSearching) return; // avoid concurrent searches
    (async () => {
      const reqId = ++searchReqIdRef.current;
      setBaseDateSearchFailed(false);
      setBaseDateSearching(true);
      if (!activeForecastDate || !workspace) {
        setBaseDateSearchFailed(false);
        setBaseDateSearching(false);
        return;
      }
      const result = await findShiftedForecast(workspace, activeForecastDate, activeForecastDatePattern, hours);
      if (searchReqIdRef.current !== reqId) return; // cancelled/stale
      if (result) {
        setActiveForecastDate(result.raw);
        fullReset(result.dateObj);
        setBaseDateSearchFailed(false);
        setBaseDateSearching(false);
      } else {
        setBaseDateSearchFailed(true);
        setBaseDateSearching(false);
      }
    })();
  }, [activeForecastDate, activeForecastDatePattern, workspace, fullReset, baseDateSearching]);

  // Allow UI to clear the "search failed" flag (used for temporary overlays)
  const clearBaseDateSearchFailed = useCallback(() => {
    setBaseDateSearchFailed(false);
  }, []);

  // Restore the session to the workspace's last known forecast (used by toolbar button)
  const restoreLastAvailableForecast = useCallback(async () => {
    let raw = workspaceData?.date?.last_forecast_date;
    if (!raw && workspace) {
      try {
        const resp = await getLastForecastDate(workspace);
        raw = resp?.last_forecast_date;
      } catch (e) {
        if (config.API_DEBUG) console.warn('[ForecastSession] getLastForecastDate failed', e);
      }
    }
    if (!raw) return;
    setActiveForecastDate(raw);
    setActiveForecastDatePattern(p => p || raw);
    fullReset(parseForecastDate(raw));
    setBaseDateSearchFailed(false);
  }, [workspaceData, fullReset, workspace]);

  // Lightweight cached lookups for current active forecast date (reactive; shifting still uses direct function with short loops)
  const hasForecastKey = workspace && activeForecastDate ? `has_date|${workspace}|${activeForecastDate}` : null;
  const {data: hasDateData} = useCachedRequestHook(
    hasForecastKey,
    async () => await hasForecastDate(workspace, activeForecastDate),
    [workspace, activeForecastDate],
    {enabled: !!hasForecastKey, initialData: null, ttlMs: SHORT_TTL}
  );
  const synthesisCheckKey = workspace && activeForecastDate ? `synth_avail|${workspace}|${activeForecastDate}` : null;
  const {data: synthesisAvailRaw} = useCachedRequestHook(
    synthesisCheckKey,
    async () => await getSynthesisTotal(workspace, activeForecastDate, 90, 10),
    [workspace, activeForecastDate],
    {enabled: !!synthesisCheckKey, initialData: null, ttlMs: SHORT_TTL}
  );
  // Lint: reference to avoid unused warnings in certain build modes
  const _hasDateBool = hasDateData ? normalizeHasForecastDate(hasDateData) : null;
  const _synthAvail = synthesisAvailRaw ? normalizeSynthesisHasLeads(synthesisAvailRaw) : null;

  const value = useMemo(() => ({
    workspace,
    activeForecastDate,
    activeForecastDatePattern,
    setActiveForecastDate, // rarely needed externally
    forecastBaseDate,
    setForecastBaseDate, // writable by synthesis provider
    shiftForecastBaseDate,
    // parameters
    percentile, setPercentile,
    normalizationRef, setNormalizationRef,
    // reset control
    resetVersion,
    fullReset,
    clearBaseDateSearchFailed,
    restoreLastAvailableForecast,
    // search feedback
    baseDateSearchFailed,
    baseDateSearching
  }), [workspace, activeForecastDate, activeForecastDatePattern, forecastBaseDate, shiftForecastBaseDate, percentile, normalizationRef, resetVersion, fullReset, clearBaseDateSearchFailed, restoreLastAvailableForecast, baseDateSearchFailed, baseDateSearching]);

  return <ForecastSessionContext.Provider value={value}>{children}</ForecastSessionContext.Provider>;
}

export const useForecastSession = () => useContext(ForecastSessionContext);
