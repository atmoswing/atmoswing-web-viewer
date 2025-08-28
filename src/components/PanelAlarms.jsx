import Panel from './Panel';
import React, {useMemo} from 'react';
import {useForecasts} from '../ForecastsContext.jsx';
import {valueToColorCSS} from '../utils/colors.js';

export default function PanelAlarms(props) {
    const { perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError, methodConfigTree } = useForecasts();

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

    // Collect all day keys (union) and sort ascending
    const days = useMemo(() => {
        const set = new Set();
        data.forEach(mMap => mMap.forEach((_, dayKey) => set.add(dayKey)));
        const arr = Array.from(set).map(k => {
            const [y,m,d] = k.split('-').map(Number);
            return { key: k, date: new Date(y, m, d) };
        });
        arr.sort((a,b)=>a.date-b.date);
        return arr;
    }, [data]);

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
                            if (!segs.length) {
                                return <td key={d.key} style={{ width:40, height:24, padding:0, border:'1px solid #2a2a2a'}} title={methodName[methodId] || methodId} />;
                            }
                            return (
                                <td key={d.key} style={{ width:40, height:24, padding:0, border:'1px solid #2a2a2a'}} title={methodName[methodId] || methodId}>
                                    <div style={{display:'flex', width:'100%', height:'100%'}}>
                                        {segs.map((s, idx) => {
                                            const color = valueToColorCSS(typeof s.valueNorm === 'number' ? s.valueNorm : 0, 1);
                                            return <div key={idx} title={`${methodName[methodId] || methodId} | ${s.date.toLocaleString()}`} style={{flex:1, background:color, borderRight: idx < segs.length-1 ? '1px solid #222':'none'}}/>;
                                        })}
                                    </div>
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