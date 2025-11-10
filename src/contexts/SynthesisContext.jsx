import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useForecastSession} from './ForecastSessionContext.jsx';
import {getSynthesisPerMethod, getSynthesisTotal} from '../services/api.js';
import {parseForecastDate} from '../utils/forecastDateUtils.js';
import {isSameDay, isSameInstant} from '../utils/targetDateUtils.js';
import {useCachedRequest} from '../hooks/useCachedRequest.js';
import {normalizePerMethodSynthesis} from '../utils/apiNormalization.js';
import {DEFAULT_TTL} from '../utils/cacheTTLs.js';

const SynthesisContext = createContext({});

// Baseline synthesis parameters (fixed colors reference)
const BASELINE_PERCENTILE = 90; // represents 0.9
const BASELINE_NORMALIZATION_REF = 10;

export function SynthesisProvider({children}) {
  const {workspace, activeForecastDate, setForecastBaseDate} = useForecastSession();

  // Leads selection (from baseline synthesis)
  const [dailyLeads, setDailyLeads] = useState([]);
  const [subDailyLeads, setSubDailyLeads] = useState([]);
  const [leadResolution, setLeadResolution] = useState('daily');
  const [selectedLead, setSelectedLead] = useState(0);
  const [selectedTargetDate, setSelectedTargetDate] = useState(null);

  // Reintroduced state for per-method synthesis
  const [perMethodSynthesis, setPerMethodSynthesis] = useState([]);

  // Parse series_percentiles into daily/subDaily and base date
  const parseTotalSynthesis = useCallback((resp) => {
    const arr = Array.isArray(resp?.series_percentiles) ? resp.series_percentiles : [];
    const baseStr = resp?.parameters?.forecast_date || activeForecastDate;
    const baseDt = parseForecastDate(baseStr) || parseForecastDate(activeForecastDate) || (baseStr ? new Date(baseStr) : null);
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
    daily.sort((a, b) => a.date - b.date);
    sub.sort((a, b) => a.date - b.date);
    return {baseDt, daily, sub};
  }, [activeForecastDate]);

  // Fetch total synthesis (leads) via cached request
  const totalSynthKey = workspace && activeForecastDate ? `synth_total|${workspace}|${activeForecastDate}|${BASELINE_PERCENTILE}|${BASELINE_NORMALIZATION_REF}` : null;
  const {data: totalSynthRaw, loading: totalSynthLoading, error: totalSynthError} = useCachedRequest(
    totalSynthKey,
    async () => {
      return await getSynthesisTotal(workspace, activeForecastDate, BASELINE_PERCENTILE, BASELINE_NORMALIZATION_REF);
    },
    [workspace, activeForecastDate],
    {enabled: !!totalSynthKey, initialData: null, ttlMs: DEFAULT_TTL}
  );

  // Parse total synthesis whenever raw data changes
  useEffect(() => {
    if (!workspace || !activeForecastDate) {
      setDailyLeads([]);
      setSubDailyLeads([]);
      setSelectedLead(0);
      setSelectedTargetDate(null);
      setForecastBaseDate(null);
      return;
    }
    if (!totalSynthRaw) { // still loading or error
      return;
    }
    try {
      const {baseDt, daily, sub} = parseTotalSynthesis(totalSynthRaw);
      setForecastBaseDate(baseDt);
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
      setDailyLeads([]);
      setSubDailyLeads([]);
      setSelectedLead(0);
      setSelectedTargetDate(null);
      setForecastBaseDate(null);
    }
  }, [totalSynthRaw, workspace, activeForecastDate, parseTotalSynthesis, setForecastBaseDate]);

  // Fetch per-method synthesis (baseline)
  const perMethodKey = workspace && activeForecastDate ? `synth_per_method|${workspace}|${activeForecastDate}|${BASELINE_PERCENTILE}` : null;
  const {
    data: fetchedPerMethodData,
    loading: perMethodSynthesisLoading,
    error: perMethodSynthesisError
  } = useCachedRequest(
    perMethodKey,
    async () => {
      const resp = await getSynthesisPerMethod(workspace, activeForecastDate, BASELINE_PERCENTILE);
      return normalizePerMethodSynthesis(resp);
    },
    [workspace, activeForecastDate],
    {enabled: !!workspace && !!activeForecastDate, initialData: [], ttlMs: DEFAULT_TTL}
  );

  useEffect(() => {
    // keep state name same for external API
    if (fetchedPerMethodData) setPerMethodSynthesis(fetchedPerMethodData);
  }, [fetchedPerMethodData]);

  // Public selection helper
  const selectTargetDate = useCallback((date, preferSub) => {
    if (!date) return;
    if (preferSub && subDailyLeads.length) {
      const idx = subDailyLeads.findIndex(l => isSameInstant(l.date, date));
      if (idx >= 0) {
        setSelectedLead(idx);
        setLeadResolution('sub');
        setSelectedTargetDate(subDailyLeads[idx].date);
        return;
      }
    }
    if (dailyLeads.length) {
      const idx = dailyLeads.findIndex(l => isSameDay(l.date, date));
      if (idx >= 0) {
        setSelectedLead(idx);
        setLeadResolution('daily');
        setSelectedTargetDate(dailyLeads[idx].date);
      }
    }
  }, [dailyLeads, subDailyLeads]);

  const value = useMemo(() => ({
    dailyLeads, subDailyLeads,
    leadResolution, setLeadResolution,
    selectedLead, setSelectedLead,
    selectedTargetDate, selectTargetDate,
    perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError,
    totalSynthLoading, totalSynthError
  }), [dailyLeads, subDailyLeads, leadResolution, selectedLead, selectedTargetDate, selectTargetDate, perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError, totalSynthLoading, totalSynthError]);

  return <SynthesisContext.Provider value={value}>{children}</SynthesisContext.Provider>;
}

export const useSynthesis = () => useContext(SynthesisContext);
