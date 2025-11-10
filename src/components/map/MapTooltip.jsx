import React from 'react';

export default function MapTooltip({tooltip, label}) {
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

