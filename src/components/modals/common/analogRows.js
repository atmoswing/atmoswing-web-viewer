/**
 * @module components/modals/common/analogRows
 * @description Sorting and CSV export of the analog records shown in the forecast details table.
 */

import {downloadBlob} from './svgDom.js';

/** Columns of the exported CSV, in order. */
const CSV_COLUMNS = ['rank', 'date', 'precipitation', 'criteria'];

/**
 * Value an analog is sorted by for a given column.
 *
 * @private
 * @param {Object} analog - Normalized analog record
 * @param {string} column - Column name
 * @returns {number} Sort key
 */
function sortKey(analog, column) {
  switch (column) {
    case 'rank':
      return analog.rank ?? 0;
    case 'date':
      return new Date(analog.date).getTime();
    case 'value':
      return analog.value ?? 0;
    case 'criteria':
      return analog.criteria ?? 0;
    default:
      return 0;
  }
}

/**
 * Sorts analog records by a table column, without modifying the input.
 *
 * @param {Array<Object>} analogs - Normalized analog records `{rank, date, value, criteria}`
 * @param {string} column - 'rank', 'date', 'value' or 'criteria'
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array<Object>} Sorted copy; empty when there is nothing to sort
 * @example
 * sortAnalogs(analogs, 'value', 'desc') // wettest first
 */
export function sortAnalogs(analogs, column, direction) {
  if (!Array.isArray(analogs) || analogs.length === 0) return [];
  const factor = direction === 'desc' ? -1 : 1;
  return [...analogs].sort((a, b) => {
    const aVal = sortKey(a, column);
    const bVal = sortKey(b, column);
    if (aVal < bVal) return -factor;
    if (aVal > bVal) return factor;
    return 0;
  });
}

/**
 * Formats one CSV cell, quoting it when it holds a separator, quote or line break.
 *
 * @private
 * @param {*} value - Cell value
 * @returns {string} CSV-safe text; empty for null or undefined
 */
function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds a CSV document of the analogs, in rank order.
 *
 * Machine-readable rather than presentational: fixed English headers, the API's ISO dates and
 * unrounded numbers, whatever sort the table currently shows.
 *
 * @param {Array<Object>} analogs - Normalized analog records
 * @returns {string} CSV text with a header row and CRLF line endings
 * @example
 * analogsToCsv([{rank: 1, date: '1990-09-04T00:00:00', value: 0.3, criteria: 50.33}])
 * // "rank,date,precipitation,criteria\r\n1,1990-09-04T00:00:00,0.3,50.33\r\n"
 */
export function analogsToCsv(analogs) {
  const rows = sortAnalogs(analogs, 'rank', 'asc').map(a => [a.rank, a.date, a.value, a.criteria]);
  return [CSV_COLUMNS, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/**
 * Downloads the analogs as a .csv file.
 *
 * @param {Array<Object>} analogs - Normalized analog records
 * @param {string} baseName - Filename without extension
 * @returns {void}
 * @throws {Error} When there are no analogs, so the caller can tell the user instead of saving
 *   an empty file
 */
export function exportAnalogsCSV(analogs, baseName) {
  if (!Array.isArray(analogs) || analogs.length === 0) {
    throw new Error('No analogs to export');
  }
  const blob = new Blob([analogsToCsv(analogs)], {type: 'text/csv;charset=utf-8'});
  downloadBlob(blob, `${baseName}.csv`);
}
