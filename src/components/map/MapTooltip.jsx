/**
 * @module components/map/MapTooltip
 * @description Floating tooltip overlay displaying entity name and raw value at pointer position.
 */

import React from 'react';

export default function MapTooltip({tooltip, label}) {
  /**
   * MapTooltip component.
   * @param {Object} props
   * @param {{x:number,y:number,name:string,valueRaw:number}} [props.tooltip] - Tooltip data (null to hide)
   * @param {string} props.label - Value label prefix
   * @returns {React.ReactElement|null}
   */

  if (!tooltip) return null;
  return (
    <div style={{
      position: 'absolute',
      top: tooltip.y + 12,
      left: tooltip.x + 12,
      background: 'rgba(0,0,0,0.75)',
      color: '#fff',
      padding: '4px 6px',
      borderRadius: 4,
      fontSize: 12,
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }}>
      <div>{tooltip.name}</div>
      <div>{label}: {tooltip.valueRaw == null || isNaN(tooltip.valueRaw) ? 'NaN' : tooltip.valueRaw.toFixed(1)} mm</div>
    </div>
  );
}
