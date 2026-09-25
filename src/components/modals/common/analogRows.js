/**
 * @module components/modals/common/analogRows
 * @description Sorting and CSV export of the analog records shown in the forecast details table.
 */

import {downloadBlob} from './svgDom.js';

/** Fallback column headers, when the caller passes none. */
const CSV_COLUMNS = ['rank', 'date', 'precipitation', 'criteria'];

/**
 * Field separator and decimal mark of the exported CSV.
 *
 * The file is meant to be opened by double-clicking it, in a spreadsheet set to the locale this
 * app is used in (French by default). Excel splits on the locale's list separator and only reads
 * numbers written with its decimal mark, so a comma-separated file with dotted decimals would
 * land in a single column, every value as text.
 */
const SEPARATOR = ';';
const DECIMAL_MARK = ',';

/** Marks the file as UTF-8 for Excel, which otherwise reads it in the system code page. */
const BOM = '﻿';

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

/** An API date: `YYYY-MM-DDThh:mm(:ss)`, the only form the dates below are rewritten from. */
const API_DATE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/;

/**
 * Writes a date the way a spreadsheet reads it.
 *
 * `YYYY-MM-DD hh:mm:ss` is recognised as a date-time whatever the spreadsheet's locale, while the
 * `T` of the API form leaves it as text; the order stays unambiguous, unlike a day-first format,
 * and still sorts chronologically if a tool does treat it as text. Sub-daily methods analogue at
 * 06:00, 12:00 and 18:00, so the time is kept whenever it says something; on a daily method every
 * analog falls at midnight and the whole column is written as plain dates.
 *
 * @private
 * @param {*} raw - Date as the API gave it
 * @param {boolean} withTime - Whether this file keeps the time part
 * @returns {*} Rewritten date, or the value untouched when it is not an API date
 */
function csvDate(raw, withTime) {
  const parts = typeof raw === 'string' ? raw.match(API_DATE) : null;
  if (!parts) return raw;
  return withTime ? `${parts[1]} ${parts[2]}` : parts[1];
}

/**
 * Whether any analog falls at another time than midnight, which makes the time worth writing.
 *
 * @private
 * @param {Array<Object>} analogs - Normalized analog records
 * @returns {boolean} True when at least one date carries a time
 */
function anyTimeOfDay(analogs) {
  return analogs.some(a => {
    const parts = typeof a?.date === 'string' ? a.date.match(API_DATE) : null;
    return !!parts && !/^00:00(:00)?$/.test(parts[2]);
  });
}

/**
 * Formats one CSV cell: numbers with the decimal mark, and quotes around anything holding a
 * separator, quote or line break.
 *
 * @private
 * @param {*} value - Cell value
 * @returns {string} CSV-safe text; empty for null or undefined
 */
function csvCell(value) {
  if (value == null) return '';
  const text = typeof value === 'number' ? String(value).replace('.', DECIMAL_MARK) : String(value);
  return (/["\r\n]/.test(text) || text.includes(SEPARATOR))
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

/**
 * Builds a CSV document of the analogs, in rank order.
 *
 * The headers are the table's own column labels, in the reader's language, since the file is
 * written to be opened in a spreadsheet and read by a person. Dates keep the ISO order but are
 * written so the spreadsheet reads them as dates (see `csvDate`), and numbers keep the full
 * precision the table rounds away, written for its locale (see `SEPARATOR`). Rows are in rank
 * order, whatever sort the table happens to show.
 *
 * @param {Array<Object>} analogs - Normalized analog records
 * @param {Array<string>} [headers] - Column labels for rank, date, precipitation and criteria
 * @returns {string} CSV text with a header row and CRLF line endings
 * @example
 * analogsToCsv([{rank: 1, date: '1990-09-04T00:00:00', value: 0.3, criteria: 50.33}],
 *   ['Rang', 'Date', 'Précipitation', 'Critère'])
 * // "Rang;Date;Précipitation;Critère\r\n1;1990-09-04;0,3;50,33\r\n"
 */
export function analogsToCsv(analogs, headers = CSV_COLUMNS) {
  const sorted = sortAnalogs(analogs, 'rank', 'asc');
  const withTime = anyTimeOfDay(sorted);
  const rows = sorted.map(a => [a.rank, csvDate(a.date, withTime), a.value, a.criteria]);
  return [headers, ...rows].map(row => row.map(csvCell).join(SEPARATOR)).join('\r\n') + '\r\n';
}

/**
 * Downloads the analogs as a .csv file.
 *
 * @param {Array<Object>} analogs - Normalized analog records
 * @param {string} baseName - Filename without extension
 * @param {Array<string>} [headers] - Column labels for rank, date, precipitation and criteria
 * @returns {void}
 * @throws {Error} When there are no analogs, so the caller can tell the user instead of saving
 *   an empty file
 */
export function exportAnalogsCSV(analogs, baseName, headers) {
  if (!Array.isArray(analogs) || analogs.length === 0) {
    throw new Error('No analogs to export');
  }
  const blob = new Blob([BOM + analogsToCsv(analogs, headers)], {type: 'text/csv;charset=utf-8'});
  downloadBlob(blob, `${baseName}.csv`);
}
