import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {useSynthesis} from './SynthesisContext.jsx';
import {getAggregatedEntitiesValues, getEntitiesValuesPercentile} from '../services/api.js';
import { computeLeadHours, hasTargetDate } from '../utils/targetDateUtils.js';
import { isMethodSelectionValid, methodExists, keyForForecastValues } from '../utils/contextGuards.js';

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

    // Fetch forecast values
    useEffect(() => {
        let cancelled = false;
        const reqId = ++reqIdRef.current;
        async function run() {
            if (!activeForecastDate || !isMethodSelectionValid(selectedMethodConfig, workspace)) {
                setForecastValues({}); setForecastValuesNorm({}); setForecastLoading(false); setForecastUnavailable(false); setForecastError(null); return;
            }
            const methodId = selectedMethodConfig.method.id;
            if (!methodExists(methodConfigTree, methodId)) { setForecastValues({}); setForecastValuesNorm({}); return; }
            const configId = selectedMethodConfig.config?.id; // aggregated when null
            const leadHours = computeLeadHours(forecastBaseDate, selectedTargetDate, leadResolution, selectedLead, dailyLeads, subDailyLeads);
            const key = keyForForecastValues(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef);
            const cached = cacheRef.current.get(key);
            if (cached) {
                setForecastValuesNorm(cached.norm); setForecastValues(cached.raw); setForecastUnavailable(false); return;
            }
            setForecastLoading(true); setForecastError(null); setForecastValues({}); setForecastValuesNorm({});
            try {
                const resp = configId
                    ? await getEntitiesValuesPercentile(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef)
                    : await getAggregatedEntitiesValues(workspace, activeForecastDate, methodId, leadHours, percentile, normalizationRef);
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
