/**
 * @module components/panels/SubDailyStrip
 * @description One day of the synthesis grid split into its sub-daily segments.
 */

import React from 'react';
import {valueToColorCSS} from '@/utils/colorUtils.js';
import {SUB_HOURS} from '@/utils/targetDateUtils.js';
import SelectionMarker from './SelectionMarker.jsx';

const SEGMENT_BORDER = '1px solid #2a2a2a';

/**
 * Renders a day as one segment per sub-daily hour, coloured by its normalized value.
 *
 * Hours with no segment render as an inert placeholder, so a partially covered day keeps the
 * same width as a full one and the grid columns stay aligned.
 *
 * @param {Object} props - Component props
 * @param {Map<number, Object>} props.segmentsByHour - Hour -> `{date, valueNorm}`
 * @param {string} props.methodLabel - Method name, shown in each segment's tooltip
 * @param {Function} props.onSelect - Called with the segment's date when one is clicked
 * @param {Date|null} props.selectedDate - Currently selected target date
 * @param {boolean} props.isMethodSelected - Whether this row's method is the selected one
 * @returns {React.ReactElement}
 * @example
 * <SubDailyStrip segmentsByHour={byHour} methodLabel="Method A"
 *                onSelect={selectDate} selectedDate={date} isMethodSelected/>
 */
export default function SubDailyStrip({
  segmentsByHour,
  methodLabel,
  onSelect,
  selectedDate,
  isMethodSelected
}) {
  return (
    // Clicks are handled per segment; this stops one reaching the day cell underneath.
    <div style={{display: 'flex', width: '100%', height: '100%'}} onClick={e => e.stopPropagation()}>
      {SUB_HOURS.map((hour, idx) => {
        const borderRight = idx < SUB_HOURS.length - 1 ? SEGMENT_BORDER : 'none';
        const segment = segmentsByHour.get(hour);

        if (!segment) {
          return (
            <div
              key={hour}
              className="alarm-sub-seg placeholder"
              style={{flex: 1, borderRight, position: 'relative', cursor: 'default'}}
            />
          );
        }

        const color = valueToColorCSS(typeof segment.valueNorm === 'number' ? segment.valueNorm : 0, 1);
        const selected = isMethodSelected
          && selectedDate
          && segment.date.getTime() === selectedDate.getTime();

        return (
          <div
            key={hour}
            className="alarm-sub-seg"
            title={`${methodLabel} | ${segment.date.toLocaleString()}`}
            style={{flex: 1, background: color, borderRight, cursor: 'pointer', position: 'relative'}}
            onClick={e => {
              e.stopPropagation();
              onSelect && onSelect(segment.date);
            }}
          >
            {selected && <SelectionMarker/>}
          </div>
        );
      })}
    </div>
  );
}
