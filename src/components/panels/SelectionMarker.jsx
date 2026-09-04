/**
 * @module components/panels/SelectionMarker
 * @description Small dot marking the selected cell in the synthesis grid.
 */

import React from 'react';

/**
 * Centred dot overlaid on the selected synthesis cell.
 *
 * Positioned absolutely, so the cell it sits in must be positioned itself.
 *
 * @param {Object} props - Component props
 * @param {number} [props.size=6] - Diameter in pixels
 * @param {string} [props.color='#2a2a2a'] - Fill colour
 * @returns {React.ReactElement}
 * @example
 * <div style={{position: 'relative'}}>{selected && <SelectionMarker/>}</div>
 */
export default function SelectionMarker({size = 6, color = '#2a2a2a'}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        background: color,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    />
  );
}
