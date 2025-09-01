import React, {createContext, useContext, useEffect, useRef, useState, useCallback, useMemo} from 'react';
import {useWorkspace} from '../WorkspaceContext.jsx';
import {parseForecastDate, formatForecastDateForApi} from '../utils/forecastDateUtils.js';

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
        }
    }, [workspaceData, fullReset]);

    // Shift base date by hours
    const shiftForecastBaseDate = useCallback((hours) => {
        setActiveForecastDate(prev => {
            if (!prev) return prev;
            const dt = parseForecastDate(prev);
            if (!dt) return prev;
            dt.setHours(dt.getHours() + hours);
            const newRaw = formatForecastDateForApi(dt, activeForecastDatePattern || prev) || prev;
            fullReset(dt);
            return newRaw;
        });
    }, [activeForecastDatePattern, fullReset]);

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
        fullReset
    }), [workspace, activeForecastDate, activeForecastDatePattern, forecastBaseDate, shiftForecastBaseDate, percentile, normalizationRef, resetVersion, fullReset]);

    return <ForecastSessionContext.Provider value={value}>{children}</ForecastSessionContext.Provider>;
}

export const useForecastSession = () => useContext(ForecastSessionContext);

