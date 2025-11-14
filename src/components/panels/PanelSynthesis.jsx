import Panel from './Panel.jsx';
import React, {useCallback, useMemo} from 'react';
import {useMethods, useSynthesis} from '@/contexts/ForecastsContext.jsx';
import {valueToColorCSS} from '@/utils/colorUtils.js';
import {isSameDay, makeDayKey, parseDayKey, SUB_HOURS} from '@/utils/targetDateUtils.js';
import {formatDateDDMMYYYY} from '@/utils/formattingUtils.js';
import {useTranslation} from 'react-i18next';
import PanelStatus from './PanelStatus.jsx';

// Local small helpers (kept in this file as they are only used here)
function SelectionMarker({size = 6, color = '#2a2a2a'}) {
  const s = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: size,
    height: size,
    background: color,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)'
  };
  return <div style={s}/>;
}

function SubDailyStrip({segmentsByHour, methodLabel, onSelect, selectedDate, isMethodSelected}) {
  const hours = React.useMemo(() => SUB_HOURS, []);
  return (
    <div style={{display: 'flex', width: '100%', height: '100%'}} onClick={e => e.stopPropagation()}>
      {hours.map((hr, idx) => {
        const seg = segmentsByHour.get(hr);
        if (!seg) {
          return <div key={idx} className="alarm-sub-seg placeholder" style={{
            flex: 1,
            borderRight: idx < hours.length - 1 ? '1px solid #2a2a2a' : 'none',
            position: 'relative',
            cursor: 'default'
          }}/>;
        }
        const color = valueToColorCSS(typeof seg.valueNorm === 'number' ? seg.valueNorm : 0, 1);
        const selected = isMethodSelected && selectedDate && seg.date.getTime() === selectedDate.getTime();
        return (
          <div
            key={idx}
            className="alarm-sub-seg"
            title={`${methodLabel} | ${seg.date.toLocaleString()}`}
            style={{
              flex: 1,
              background: color,
              borderRight: idx < hours.length - 1 ? '1px solid #2a2a2a' : 'none',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect(seg.date);
            }}
          >
            {selected && <SelectionMarker/>}
          </div>
        );
      })}
    </div>
  );
}

export default function PanelSynthesis(props) {
  const {t} = useTranslation();
  const {perMethodSynthesis, perMethodSynthesisLoading, perMethodSynthesisError} = useSynthesis();
  const {methodConfigTree, setSelectedMethodConfig, selectedMethodConfig} = useMethods();
  const {selectTargetDate, selectedTargetDate, dailyLeads} = useSynthesis();

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
        const dayKey = makeDayKey(dt);
        if (!map.has(methodId)) map.set(methodId, new Map());
        const mMap = map.get(methodId);
        if (!mMap.has(dayKey)) mMap.set(dayKey, []);
        mMap.get(dayKey).push({date: dt, valueNorm: vals[idx]});
      });
    });
    // Sort segments within each day chronologically
    map.forEach(mMap => mMap.forEach(arr => arr.sort((a, b) => a.date - b.date)));
    return map;
  }, [perMethodSynthesis]);

  // Collect all day keys (union) and sort ascending (include fallback dailyLeads so we can show selection before perMethodSynthesis arrives)
  const days = useMemo(() => {
    const set = new Set();
    // from per-method synthesis
    data.forEach(mMap => mMap.forEach((_, dayKey) => set.add(dayKey)));
    // fallback daily leads
    if (dailyLeads && dailyLeads.length) {
      dailyLeads.forEach(dl => set.add(makeDayKey(dl.date)));
    }
    const arr = Array.from(set).map(k => ({key: k, date: parseDayKey(k)}));
    arr.sort((a, b) => a.date - b.date);
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
  const subHours = useMemo(() => SUB_HOURS, []);

  if (perMethodSynthesisLoading || perMethodSynthesisError || !perMethodSynthesis.length) {
    return (
      <Panel title={t('panel.synthesis')} defaultOpen={props.defaultOpen}>
        <PanelStatus
          loading={perMethodSynthesisLoading}
          error={!!perMethodSynthesisError}
          empty={!perMethodSynthesisError && !perMethodSynthesisLoading && !perMethodSynthesis.length}
          messages={{
            loading: t('panel.loading'),
            error: t('panel.errorLoading', {what: t('panel.synthesis')}),
            empty: t('panel.noData'),
          }}
        />
      </Panel>
    );
  }

  return (
    <Panel title={t('panel.synthesis')} defaultOpen={props.defaultOpen}>
      <span className="panel-secondary-text">{t('synthesis.normalizedValues')} (P/P10, q90)</span>

      <table style={{borderCollapse: 'collapse', fontSize: 11, width: '100%'}}>
        <thead>
        <tr>
          {days.map(d => {
            const ddmm = formatDateDDMMYYYY(d.date).slice(0, 5);
            return <th key={d.key} style={{padding: '2px', border: '0', fontWeight: 'normal'}}>{ddmm}</th>;
          })}
        </tr>
        </thead>
        <tbody>
        {methodOrder.map(methodId => (
          <tr key={methodId}>
            {days.map(d => {
              const segs = data.get(methodId)?.get(d.key) || [];
              const isMethodSelected = selectedMethodConfig?.method?.id === methodId;
              const dayMatches = selectedTargetDate && isSameDay(selectedTargetDate, d.date);
              // Index sub segments by hour for slot placement
              const segByHour = new Map(segs.map(s => [s.date.getHours(), s]));
              const isSubDailyDay = subHours.length > 0 && segs.some(s => s.date.getHours() !== 0);
              if (!segs.length) {
                const selected = isMethodSelected && dayMatches;
                return <td key={d.key} style={{
                  width: 40,
                  height: 24,
                  padding: 0,
                  border: '1px solid #2a2a2a',
                  position: 'relative'
                }} title={methodName[methodId] || methodId} onClick={() => handleSelect(methodId, d.date, false)}>
                  {selected && <SelectionMarker/>}
                </td>;
              }
              // Daily only (single) if only one segment AND it is midnight (assumed daily forecast) OR no subHours defined
              const isDailySingle = !isSubDailyDay || (segs.length === 1 && (segs[0].date.getHours() === 0 || subHours.length === 0));
              return (
                <td key={d.key} style={{
                  width: 40,
                  height: 24,
                  padding: 0,
                  border: '1px solid #2a2a2a',
                  cursor: 'pointer',
                  position: 'relative'
                }} title={methodName[methodId] || methodId}
                    onClick={() => handleSelect(methodId, segs[0].date, !isDailySingle)}>
                  {isDailySingle ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      background: valueToColorCSS(typeof segs[0].valueNorm === 'number' ? segs[0].valueNorm : 0, 1)
                    }}>
                      {isMethodSelected && dayMatches && <SelectionMarker/>}
                    </div>
                  ) : (
                    <SubDailyStrip
                      segmentsByHour={segByHour}
                      methodLabel={methodName[methodId] || methodId}
                      selectedDate={selectedTargetDate}
                      isMethodSelected={isMethodSelected}
                      onSelect={(dt) => handleSelect(methodId, dt, true)}
                    />
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
