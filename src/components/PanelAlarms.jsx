import Panel from './Panel';
import React, {useMemo, useCallback} from 'react';
import {useForecasts} from '../ForecastsContext.jsx';
import {valueToColorCSS} from '../utils/colors.js';

export default function PanelAlarms(props) {
    const { perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError, methodConfigTree, setSelectedMethodConfig, selectTargetDate, selectedMethodConfig, selectedTargetDate, dailyLeads } = useForecasts();

    // Map method id -> method name (order preserved as methodConfigTree)
    const methodOrder = useMemo(() => methodConfigTree.map(m => m.id), [methodConfigTree]);
    const methodName = useMemo(() => Object.fromEntries(methodConfigTree.map(m => [m.id, m.name])), [methodConfigTree]);

    // Build structure: methodId -> dayKey -> array of segments {date, valueNorm}
    const data = useMemo(() => {
        const map = new Map();
        perMethodSynthesis.forEach(sp => {
            const methodId = sp.method_id;
            if (!methodId) return;
            const dates = Array.isArray(sp.target_dates) ? sp.target_dates : [];
            const vals = Array.isArray(sp.values_normalized) ? sp.values_normalized : (Array.isArray(sp.values) ? sp.values : []);
            dates.forEach((dStr, idx) => {
                const dt = dStr ? new Date(dStr) : null;
                if (!dt || isNaN(dt)) return;
                const dayKey = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
                if (!map.has(methodId)) map.set(methodId, new Map());
                const mMap = map.get(methodId);
                if (!mMap.has(dayKey)) mMap.set(dayKey, []);
                mMap.get(dayKey).push({ date: dt, valueNorm: vals[idx] });
            });
        });
        // Sort segments within each day chronologically
        map.forEach(mMap => mMap.forEach(arr => arr.sort((a,b)=>a.date-b.date)));
        return map;
    }, [perMethodSynthesis]);

    // Collect all day keys (union) and sort ascending (include fallback dailyLeads so we can show selection before perMethodSynthesis arrives)
    const days = useMemo(() => {
        const set = new Set();
        // from per-method synthesis
        data.forEach(mMap => mMap.forEach((_, dayKey) => set.add(dayKey)));
        // fallback daily leads
        if (dailyLeads && dailyLeads.length) {
            dailyLeads.forEach(dl => {
                const k = `${dl.date.getFullYear()}-${dl.date.getMonth()}-${dl.date.getDate()}`;
                set.add(k);
            });
        }
        const arr = Array.from(set).map(k => {
            const [y,m,d] = k.split('-').map(Number);
            return { key: k, date: new Date(y, m, d) };
        });
        arr.sort((a,b)=>a.date-b.date);
        return arr;
    }, [data, dailyLeads]);

    const handleSelect = useCallback((methodId, date, isSub) => {
        if (!methodId || !date) return;
        const method = methodConfigTree.find(m => m.id === methodId);
        if (!method) return;
        setSelectedMethodConfig({method, config: null});
        // preferSub true when sub-daily segment clicked
        selectTargetDate(date, !!isSub);
    }, [methodConfigTree, setSelectedMethodConfig, selectTargetDate]);

    // Derive global set of sub-daily hours (canonical 4 slots)
    const subHours = useMemo(() => [0,6,12,18], []);

    if (perMethodSynthesisLoading) {
        return <Panel title="Alarms" defaultOpen={props.defaultOpen}>Loading…</Panel>;
    }
    if (perMethodSynthesisError) {
        return <Panel title="Alarms" defaultOpen={props.defaultOpen}>Error loading alarms</Panel>;
    }
    if (!perMethodSynthesis.length) {
        return <Panel title="Alarms" defaultOpen={props.defaultOpen}>No data</Panel>;
    }

    return (
        <Panel title="Alarms" defaultOpen={props.defaultOpen}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                <tr>
                    {days.map(d => {
                        const dd = String(d.date.getDate()).padStart(2,'0');
                        const mm = String(d.date.getMonth()+1).padStart(2,'0');
                        return <th key={d.key} style={{ padding: '2px', border: '0', fontWeight: 'normal' }}>{dd}.{mm}</th>;
                    })}
                </tr>
                </thead>
                <tbody>
                {methodOrder.map(methodId => (
                    <tr key={methodId}>
                        {days.map(d => {
                            const segs = data.get(methodId)?.get(d.key) || [];
                            const isMethodSelected = selectedMethodConfig?.method?.id === methodId;
                            const dayMatches = selectedTargetDate && selectedTargetDate.getFullYear()===d.date.getFullYear() && selectedTargetDate.getMonth()===d.date.getMonth() && selectedTargetDate.getDate()===d.date.getDate();
                            // Index sub segments by hour for slot placement
                            const segByHour = new Map(segs.map(s => [s.date.getHours(), s]));
                            const isSubDailyDay = subHours.length > 0 && segs.some(s => s.date.getHours() !== 0);
                            if (!segs.length) {
                                const selected = isMethodSelected && dayMatches;
                                return <td key={d.key} style={{ width:40, height:24, padding:0, border:'1px solid #2a2a2a', position:'relative'}} title={methodName[methodId] || methodId} onClick={()=>handleSelect(methodId, d.date, false)}>
                                    {selected && <div style={{position:'absolute', top:'50%', left:'50%', width:6, height:6, background:'#2a2a2a', borderRadius:'50%', transform:'translate(-50%,-50%)'}} />}
                                </td>;
                            }
                            // Daily only (single) if only one segment AND it is midnight (assumed daily forecast) OR no subHours defined
                            const isDailySingle = !isSubDailyDay || (segs.length === 1 && (segs[0].date.getHours() === 0 || subHours.length === 0));
                            return (
                                <td key={d.key} style={{ width:40, height:24, padding:0, border:'1px solid #2a2a2a', cursor:'pointer', position:'relative'}} title={methodName[methodId] || methodId} onClick={()=>handleSelect(methodId, segs[0].date, !isDailySingle)}>
                                    {isDailySingle ? (
                                        <div style={{width:'100%', height:'100%', position:'relative', background:valueToColorCSS(typeof segs[0].valueNorm==='number'?segs[0].valueNorm:0,1)}}>
                                            {isMethodSelected && dayMatches && <div style={{position:'absolute', top:'50%', left:'50%', width:6, height:6, background:'#2a2a2a', borderRadius:'50%', transform:'translate(-50%,-50%)'}} />}
                                        </div>
                                    ) : (
                                        <div style={{display:'flex', width:'100%', height:'100%'}} onClick={e=>e.stopPropagation()}>
                                            {subHours.map((hr, idx) => {
                                                const s = segByHour.get(hr);
                                                if (!s) {
                                                    return <div key={idx} className="alarm-sub-seg placeholder" style={{flex:1, borderRight: idx < subHours.length-1 ? '1px solid #2a2a2a':'none', position:'relative', cursor:'default'}} />;
                                                }
                                                const color = valueToColorCSS(typeof s.valueNorm === 'number' ? s.valueNorm : 0, 1);
                                                const segSelected = isMethodSelected && selectedTargetDate && s.date.getTime() === selectedTargetDate.getTime();
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="alarm-sub-seg"
                                                        title={`${methodName[methodId] || methodId} | ${s.date.toLocaleString()}`}
                                                        style={{flex:1, background:color, borderRight: idx < subHours.length-1 ? '1px solid #2a2a2a':'none', cursor:'pointer', position:'relative'}}
                                                        onClick={(e)=>{e.stopPropagation(); handleSelect(methodId, s.date, true);}}
                                                    >
                                                        {segSelected && <div style={{position:'absolute', top:'50%', left:'50%', width:6, height:6, background:'#2a2a2a', borderRadius:'50%', transform:'translate(-50%,-50%)'}} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
                </tbody>
            </table>
        </Panel>
    );
}