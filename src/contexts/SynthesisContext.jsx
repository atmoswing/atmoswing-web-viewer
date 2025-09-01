import React, {createContext, useContext, useEffect, useMemo, useRef, useState, useCallback} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {getSynthesisTotal, getSynthesisPerMethod} from '../services/api.js';
import {parseForecastDate} from '../utils/forecastDateUtils.js';

const SynthesisContext = createContext({});

export function SynthesisProvider({children}) {
    const {workspace, activeForecastDate, percentile, normalizationRef, setForecastBaseDate} = useForecastSession();

    // Leads selection
    const [dailyLeads, setDailyLeads] = useState([]);
    const [subDailyLeads, setSubDailyLeads] = useState([]);
    const [leadResolution, setLeadResolution] = useState('daily');
    const [selectedLead, setSelectedLead] = useState(0);
    const [selectedTargetDate, setSelectedTargetDate] = useState(null);

    // Per-method synthesis
    const [perMethodSynthesis, setPerMethodSynthesis] = useState([]);
    const [perMethodSynthesisLoading, setPerMethodSynthesisLoading] = useState(false);
    const [perMethodSynthesisError, setPerMethodSynthesisError] = useState(null);

    const totalReqIdRef = useRef(0);
    const perReqIdRef = useRef(0);

    // Fetch total synthesis (leads)
    useEffect(() => {
        let cancelled = false;
        const reqId = ++totalReqIdRef.current;
        async function run() {
            if (!activeForecastDate || !workspace) {
                setDailyLeads([]);
                setSubDailyLeads([]);
                setSelectedLead(0);
                setSelectedTargetDate(null);
                return;
            }
            try {
                const resp = await getSynthesisTotal(workspace, activeForecastDate, percentile, normalizationRef);
                if (cancelled || reqId !== totalReqIdRef.current) return;
                const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
                const baseStr = resp?.parameters?.forecast_date || activeForecastDate;
                const baseDt = parseForecastDate(baseStr) || parseForecastDate(activeForecastDate) || (baseStr ? new Date(baseStr) : null);
                setForecastBaseDate(baseDt);
                let daily = [], sub = [];
                arr.forEach(sp => {
                    const dates = Array.isArray(sp.target_dates) ? sp.target_dates : [];
                    const vals = Array.isArray(sp.values_normalized) ? sp.values_normalized : [];
                    dates.forEach((dStr, i) => {
                        const dt = parseForecastDate(dStr) || new Date(dStr);
                        if (isNaN(dt)) return;
                        const rec = {index: i, date: dt, time_step: sp.time_step, valueNorm: vals[i]};
                        if (sp.time_step === 24) daily.push(rec); else sub.push({...rec, subIndex: i});
                    });
                });
                daily.sort((a,b)=>a.date-b.date);
                sub.sort((a,b)=>a.date-b.date);
                setDailyLeads(daily);
                setSubDailyLeads(sub);
                if (daily.length) {
                    setSelectedLead(0);
                    setLeadResolution('daily');
                    setSelectedTargetDate(daily[0].date);
                } else if (sub.length) {
                    setSelectedLead(0);
                    setLeadResolution('sub');
                    setSelectedTargetDate(sub[0].date);
                } else {
                    setSelectedLead(0);
                    setSelectedTargetDate(null);
                    setLeadResolution('daily');
                }
            } catch {
                if (cancelled || reqId !== totalReqIdRef.current) return;
                setDailyLeads([]);
                setSubDailyLeads([]);
                setSelectedLead(0);
                setSelectedTargetDate(null);
                setForecastBaseDate(null);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate, percentile, normalizationRef, setForecastBaseDate]);

    // Fetch per-method synthesis
    useEffect(() => {
        let cancelled = false;
        const reqId = ++perReqIdRef.current;
        async function run() {
            setPerMethodSynthesis([]);
            setPerMethodSynthesisError(null);
            if (!workspace || !activeForecastDate) return;
            setPerMethodSynthesisLoading(true);
            try {
                const resp = await getSynthesisPerMethod(workspace, activeForecastDate, percentile);
                if (!cancelled && reqId === perReqIdRef.current) setPerMethodSynthesis(Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : []);
            } catch (e) {
                if (!cancelled && reqId === perReqIdRef.current) {
                    setPerMethodSynthesisError(e);
                    setPerMethodSynthesis([]);
                }
            } finally {
                if (!cancelled && reqId === perReqIdRef.current) setPerMethodSynthesisLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, activeForecastDate, percentile]);

    // Public selection helper
    const selectTargetDate = useCallback((date, preferSub) => {
        if (!date) return;
        if (preferSub && subDailyLeads.length) {
            const idx = subDailyLeads.findIndex(l => l.date.getTime() === date.getTime());
            if (idx >= 0) {
                setSelectedLead(idx);
                setLeadResolution('sub');
                setSelectedTargetDate(subDailyLeads[idx].date);
                return;
            }
        }
        if (dailyLeads.length) {
            const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
            const idx = dailyLeads.findIndex(l => l.date.getFullYear()===y && l.date.getMonth()===m && l.date.getDate()===d);
            if (idx >= 0) {
                setSelectedLead(idx);
                setLeadResolution('daily');
                setSelectedTargetDate(dailyLeads[idx].date);
            }
        }
    }, [dailyLeads, subDailyLeads]);

    const value = useMemo(()=>({
        dailyLeads, subDailyLeads,
        leadResolution, setLeadResolution,
        selectedLead, setSelectedLead,
        selectedTargetDate, selectTargetDate,
        perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError
    }), [dailyLeads, subDailyLeads, leadResolution, selectedLead, selectedTargetDate, selectTargetDate, perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError]);

    return <SynthesisContext.Provider value={value}>{children}</SynthesisContext.Provider>;
}

export const useSynthesis = () => useContext(SynthesisContext);

