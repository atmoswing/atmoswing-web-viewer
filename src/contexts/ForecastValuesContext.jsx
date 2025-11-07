import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {useMethods} from './MethodsContext.jsx';
import {useSynthesis} from './SynthesisContext.jsx';
import {getAggregatedEntitiesValues, getEntitiesValuesPercentile} from '../services/api.js';
import { computeLeadHours, hasTargetDate } from '../utils/targetDateUtils.js';
import { isMethodSelectionValid, methodExists, keyForForecastValues } from '../utils/contextGuards.js';
import { useManagedRequest } from '../hooks/useManagedRequest.js';

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
    const canQuery = !!workspace && !!activeForecastDate && isMethodSelectionValid(selectedMethodConfig, workspace) && methodExists(methodConfigTree, selectedMethodConfig?.method?.id) && !forecastUnavailable;
    const methodId = selectedMethodConfig?.method?.id;
    const configId = selectedMethodConfig?.config?.id;
    const key = canQuery ? keyForForecastValues(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef) : null;

    const { data: valuesData, loading: valuesReqLoading, error: valuesReqError } = useManagedRequest(
        async () => {
            const cached = cacheRef.current.get(key);
            if (cached) return cached;
            const resp = configId
                ? await getEntitiesValuesPercentile(workspace, activeForecastDate, methodId, configId, leadHours, percentile, normalizationRef)
                : await getAggregatedEntitiesValues(workspace, activeForecastDate, methodId, leadHours, percentile, normalizationRef);
            const ids = resp.entity_ids || [];
            const valsNorm = Array.isArray(resp.values_normalized) ? resp.values_normalized : [];
            const valsRaw = Array.isArray(resp.values) ? resp.values : [];
            const allEmpty = ids.length > 0 && valsNorm.length === 0 && valsRaw.length === 0;
            const mismatch = ids.length > 0 && ((valsNorm.length > 0 && valsNorm.length !== ids.length) && (valsRaw.length > 0 && valsRaw.length !== ids.length));
            if (allEmpty || mismatch) {
                return { norm: {}, raw: {}, unavailable: true };
            }
            const normMap = {}, rawMap = {};
            ids.forEach((id,i)=>{ normMap[id]=valsNorm[i]; rawMap[id]=valsRaw[i]; });
            const result = { norm: normMap, raw: rawMap, unavailable: false };
            cacheRef.current.set(key, result);
            return result;
        },
        [workspace, activeForecastDate, selectedMethodConfig, percentile, normalizationRef, selectedLead, leadResolution, dailyLeads, subDailyLeads, forecastBaseDate, selectedTargetDate, methodConfigTree, forecastUnavailable],
        { enabled: !!key }
    );

    useEffect(() => {
        if (!key) {
            setForecastValuesNorm({});
            setForecastValues({});
            setForecastLoading(false);
            setForecastError(null);
            return;
        }
        setForecastLoading(valuesReqLoading);
        setForecastError(valuesReqError || null);
        if (valuesData) {
            setForecastValuesNorm(valuesData.norm || {});
            setForecastValues(valuesData.raw || {});
            setForecastUnavailable(!!valuesData.unavailable);
        }
    }, [key, valuesData, valuesReqLoading, valuesReqError]);

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
