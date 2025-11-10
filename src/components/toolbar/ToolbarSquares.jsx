import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import {useTranslation} from 'react-i18next';
import {useSynthesis} from '../../contexts/ForecastsContext.jsx';
import {valueToColorCSS} from '../../utils/colorUtils.js';
import {isSameDay, makeDayKey, SUB_HOURS} from '../../utils/targetDateUtils.js';
import {formatDateDDMMYYYY} from '../../utils/formattingUtils.js';

export default function ToolbarSquares() {
  const {dailyLeads, subDailyLeads, selectedTargetDate, selectTargetDate} = useSynthesis();
  const {t} = useTranslation();
  const maxVal = 1;

  const subHours = React.useMemo(() => SUB_HOURS, []);

  const subByDay = React.useMemo(() => {
    const m = new Map();
    subDailyLeads.forEach(s => {
      const k = makeDayKey(s.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    });
    m.forEach(arr => arr.sort((a, b) => a.date - b.date));
    return m;
  }, [subDailyLeads]);

  return (
    <div className="toolbar-left" style={{display: 'flex', gap: 4}}>
      {dailyLeads.map((d, i) => {
        const label = formatDateDDMMYYYY(d.date).slice(0, 5);
        const color = valueToColorCSS(d.valueNorm, maxVal);
        const key = makeDayKey(d.date);
        const subs = subByDay.get(key) || [];
        const subsByHour = new Map(subs.map(s => [s.date.getHours(), s]));
        const hasAnySub = subHours.some(hr => subsByHour.has(hr));
        const isSelected = selectedTargetDate && isSameDay(d.date, selectedTargetDate) && (!selectedTargetDate.getHours() || subs.length === 0);
        return (
          <Tooltip
            key={i}
            title={
              <>
                <div>{t('toolbar.selectLeadTime', {defaultValue: 'Select lead time'})} {label}</div>
                <div>{t('toolbar.colorSynthesis', {defaultValue: 'Color: synthesis of all methods'})}</div>
              </>
            }
            arrow
          >
            <div
              className={`toolbar-square${isSelected ? ' selected' : ''}`}
              style={{background: color}}
              onClick={() => selectTargetDate(d.date, false)}
            >
              <span>{label}</span>
              {subHours.length > 0 && (
                <div
                  className={`square-subdaily${hasAnySub ? ' has-subs' : ''}`}
                  style={!hasAnySub ? {display: 'none'} : undefined}
                  onClick={e => {
                    e.stopPropagation();
                  }}
                >
                  {subHours.map((hr, j) => {
                    const s = subsByHour.get(hr);
                    if (!s) return <div key={j} className="square-subdaily-seg placeholder"/>;
                    const subColor = valueToColorCSS(s.valueNorm, maxVal);
                    const subSelected = selectedTargetDate && s.date.getTime() === selectedTargetDate.getTime();
                    return (
                      <div
                        key={j}
                        className={`square-subdaily-seg${subSelected ? ' selected' : ''}`}
                        style={{background: subColor}}
                        onClick={() => selectTargetDate(s.date, true)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

