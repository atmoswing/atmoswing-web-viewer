/**
 * @module components/map/MapLegend
 * @description Legend component rendering a horizontal gradient scale for normalized forecast values.
 */

import React from 'react';

export default function MapLegend({legendStops, legendMax, dark, title}) {
  /**
   * MapLegend component.
   * @param {Object} props
   * @param {Array<{color:string,pct:number}>} props.legendStops - Gradient stops
   * @param {number} props.legendMax - Maximum value for scale labels
   * @param {boolean} props.dark - Whether dark theme styling is applied
   * @param {string} props.title - Legend title
   * @returns {React.ReactElement|null}
   */
  if (!legendStops || legendStops.length === 0) return null;
  const gradientCSS = `linear-gradient(to right, ${legendStops.map(s => `${s.color} ${s.pct}%`).join(', ')})`;
  return (
    <div style={{
      position: 'absolute',
      bottom: 10,
      left: 10,
      background: dark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)',
      color: dark ? '#fff' : '#000',
      padding: '8px 10px',
      borderRadius: 4,
      fontSize: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
    }}>
      <div style={{fontSize: 14, marginBottom: 2}}>{title}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <div style={{flex: 1, height: 14, background: gradientCSS, border: `1px solid ${dark ? '#fff' : '#333'}`}}/>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 2}}>
        <span>0</span>
        <span>{(legendMax * 0.5).toFixed(1)}</span>
        <span>{legendMax.toFixed(1)}</span>
      </div>
    </div>
  );
}
