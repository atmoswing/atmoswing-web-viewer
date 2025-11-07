import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {useSynthesis} from './SynthesisContext.jsx';
import {getAggregatedEntitiesValues, getEntitiesValuesPercentile} from '../services/api.js';

const ForecastValuesContext = createContext({});

export function ForecastValuesProvider({children}) {
    const {workspace, activeForecastDate, percentile, normalizationRef, forecastBaseDate} = useForecastSession();
    const {selectedMethodConfig, methodConfigTree} = useMethods();
    const {selectedLead, leadResolution, dailyLeads, subDailyLeads, selectedTargetDate} = useSynthesis();

    const [forecastValuesNorm, setForecastValuesNorm] = useState({});
    const [forecastValues, setForecastValues] = useState({});
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastError, setForecastError] = useState(null);
    const [forecastUnavailable, setForecastUnavailable] = useState(false);

    const cacheRef = useRef(new Map());
    const reqIdRef = useRef(0);

    // Immediate availability feedback based on selection vs leads
    useEffect(() => {
        if (!selectedMethodConfig?.method || !activeForecastDate) {
            setForecastUnavailable(false);
            return;
        }
        if (!selectedTargetDate) {
            setForecastUnavailable(false);
            return;
        }
        if (leadResolution === 'sub') {
            const match = subDailyLeads.find(l => l.date.getTime() === selectedTargetDate.getTime());
            setForecastUnavailable(!match);
        } else {
            const match = dailyLeads.find(l => l.date.getFullYear()===selectedTargetDate.getFullYear() && l.date.getMonth()===selectedTargetDate.getMonth() && l.date.getDate()===selectedTargetDate.getDate());
            setForecastUnavailable(!match);
        }
    }, [selectedMethodConfig, activeForecastDate, leadResolution, selectedTargetDate, dailyLeads, subDailyLeads]);

    // Fetch forecast values
    useEffect(() => {
        let cancelled = false;
        const reqId = ++reqIdRef.current;
        async function run() {
            if (!activeForecastDate || !selectedMethodConfig?.method) {
                setForecastValues({}); setForecastValuesNorm({}); setForecastLoading(false); setForecastUnavailable(false); setForecastError(null); return;
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodConfigTree.find(m => m.id === methodId)) { setForecastValues({}); setForecastValuesNorm({}); return; }
            const configId = selectedMethodConfig.config?.id;
            let leadHours = 0;
            if (forecastBaseDate && selectedTargetDate) {
                leadHours = Math.max(0, Math.round((selectedTargetDate.getTime() - forecastBaseDate.getTime()) / 3600000));
                // Get the timezone offset if possible to adjust leadHours
                let tzDiff = (selectedTargetDate.getTimezoneOffset() - forecastBaseDate.getTimezoneOffset());
                leadHours -= tzDiff / 60;
            } else {
                if (leadResolution === 'sub') {
                    const step = subDailyLeads[selectedLead]?.time_step || (subDailyLeads[0]?.time_step || 0);
                    leadHours = step * selectedLead;
                } else {
                    const step = dailyLeads[selectedLead]?.time_step || (dailyLeads[0]?.time_step || 24);
                    leadHours = step * selectedLead;
                }
            }
            const key = `${workspace}|${activeForecastDate}|${methodId}|${configId || 'agg'}|${leadHours}|${percentile}|${normalizationRef || 'raw'}`;
            const cached = cacheRef.current.get(key);
            if (cached) {
                setForecastValuesNorm(cached.norm); setForecastValues(cached.raw); setForecastUnavailable(false); return;
            }
            setForecastLoading(true); setForecastError(null); setForecastValues({}); setForecastValuesNorm({});
            try {
                let resp;
                if (configId) resp = await getEntitiesValuesPercentile(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef); else resp = await getAggregatedEntitiesValues(workspace, activeForecastDate, methodId, leadHours, percentile, normalizationRef);
                if (cancelled || reqId !== reqIdRef.current) return;
                const ids = resp.entity_ids || [];
                const valsNorm = Array.isArray(resp.values_normalized) ? resp.values_normalized : [];
                const valsRaw = Array.isArray(resp.values) ? resp.values : [];
                const allEmpty = ids.length > 0 && valsNorm.length === 0 && valsRaw.length === 0;
                const mismatch = ids.length > 0 && ((valsNorm.length > 0 && valsNorm.length !== ids.length) && (valsRaw.length > 0 && valsRaw.length !== ids.length));
                if (allEmpty || mismatch) { setForecastValues({}); setForecastValuesNorm({}); setForecastUnavailable(true); return; }
                const normMap = {}, rawMap = {};
                ids.forEach((id,i)=>{ normMap[id]=valsNorm[i]; rawMap[id]=valsRaw[i]; });
                setForecastValuesNorm(normMap); setForecastValues(rawMap); setForecastUnavailable(false); cacheRef.current.set(key,{norm:normMap, raw:rawMap});
            } catch (e) {
                if (!cancelled && reqId === reqIdRef.current) {
                    setForecastError(e); setForecastValues({}); setForecastValuesNorm({});
                }
            } finally {
                if (!cancelled && reqId === reqIdRef.current) setForecastLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate, selectedMethodConfig, percentile, normalizationRef, selectedLead, leadResolution, dailyLeads, subDailyLeads, forecastBaseDate, selectedTargetDate, methodConfigTree]);

    const value = useMemo(()=>({
        forecastValues,
        forecastValuesNorm,
        forecastLoading,
        forecastError,
        forecastUnavailable
    }), [forecastValues, forecastValuesNorm, forecastLoading, forecastError, forecastUnavailable]);

    return <ForecastValuesContext.Provider value={value}>{children}</ForecastValuesContext.Provider>;
}

export const useForecastValues = () => useContext(ForecastValuesContext);

