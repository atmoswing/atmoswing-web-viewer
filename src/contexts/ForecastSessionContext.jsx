import React, {createContext, useContext, useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';
import {parseForecastDate, formatForecastDateForApi} from '../utils/forecastDateUtils.js';
import {hasForecastDate, getSynthesisTotal} from '../services/api.js';

const ForecastSessionContext = createContext({});

export function ForecastSessionProvider({children}) {
    const {workspace, workspaceData} = useWorkspace();

    const [activeForecastDate, setActiveForecastDate] = useState(null); // raw string (API)
    const [activeForecastDatePattern, setActiveForecastDatePattern] = useState(null);
    const [forecastBaseDate, setForecastBaseDate] = useState(null); // parsed Date from synthesis

    // Display / fetch parameters shared across domains
    const [percentile, setPercentile] = useState(90);
    const [normalizationRef, setNormalizationRef] = useState(10);

    // Incremented whenever a date shift or explicit reset occurs; downstream providers clear caches on change
    const [resetVersion, setResetVersion] = useState(0);

    // Flag set when a shift search (6h navigation) exhausted 12 attempts without finding any available forecast
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
            if (!activeForecastDate || !workspace) { setBaseDateSearchFailed(false); setBaseDateSearching(false); return; }
            const start = parseForecastDate(activeForecastDate);
            if (!start || isNaN(start)) { setBaseDateSearching(false); return; }
            const MAX_ATTEMPTS = 12;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                if (searchReqIdRef.current !== reqId) return; // cancelled
                const candidate = new Date(start.getTime());
                candidate.setHours(candidate.getHours() + hours * attempt);
                const raw = formatForecastDateForApi(candidate, activeForecastDatePattern || activeForecastDate);
                const exists = await hasForecastDate(workspace, raw);
                if (!exists['has_forecasts']) {
                    continue;
                }
                try {
                    const resp = await getSynthesisTotal(workspace, raw, 90, 10);
                    if (searchReqIdRef.current !== reqId) return; // stale
                    const series = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                    const hasLeads = series.some(sp => Array.isArray(sp?.target_dates) && sp.target_dates.length > 0);
                    if (hasLeads) {
                        setActiveForecastDate(raw);
                        fullReset(candidate);
                        setBaseDateSearchFailed(false);
                        setBaseDateSearching(false);
                        return;
                    }
                } catch (_) {
                    if (searchReqIdRef.current !== reqId) return;
                }
            }
            if (searchReqIdRef.current === reqId) {
                setBaseDateSearchFailed(true);
                setBaseDateSearching(false);
            }
        })();
    }, [activeForecastDate, activeForecastDatePattern, workspace, fullReset, baseDateSearching]);

    // Allow UI to clear the "search failed" flag (used for temporary overlays)
    const clearBaseDateSearchFailed = useCallback(() => {
        setBaseDateSearchFailed(false);
    }, []);

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
        // search feedback
        baseDateSearchFailed,
        baseDateSearching
    }), [workspace, activeForecastDate, activeForecastDatePattern, forecastBaseDate, shiftForecastBaseDate, percentile, normalizationRef, resetVersion, fullReset, baseDateSearchFailed, baseDateSearching]);

    return <ForecastSessionContext.Provider value={value}>{children}</ForecastSessionContext.Provider>;
}

export const useForecastSession = () => useContext(ForecastSessionContext);
