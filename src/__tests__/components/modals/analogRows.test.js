/**
 * @fileoverview Tests for sorting and CSV export of the analog table rows.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

const {downloadBlob} = vi.hoisted(() => ({downloadBlob: vi.fn()}));
vi.mock('@/components/modals/common/svgDom.js', () => ({downloadBlob}));

import {analogsToCsv, exportAnalogsCSV, sortAnalogs} from '@/components/modals/common/analogRows.js';

const ANALOGS = [
  {rank: 3, date: '2003-01-10T00:00:00', value: 12.4, criteria: 60.1},
  {rank: 1, date: '1990-09-04T00:00:00', value: 0.3, criteria: 50.33},
  {rank: 4, date: null, value: null, criteria: null},
  {rank: 2, date: '2019-09-03T00:00:00', value: 12.4, criteria: 54.35}
];

/** The sort as it was written inline in DetailsAnalogsModal, kept to prove the move changed nothing. */
function originalSort(analogs, sortColumn, sortDirection) {
  if (!analogs || analogs.length === 0) return [];
  const sorted = [...analogs];
  sorted.sort((a, b) => {
    let aVal, bVal;
    switch (sortColumn) {
      case 'rank': aVal = a.rank ?? 0; bVal = b.rank ?? 0; break;
      case 'date': aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime(); break;
      case 'value': aVal = a.value ?? 0; bVal = b.value ?? 0; break;
      case 'criteria': aVal = a.criteria ?? 0; bVal = b.criteria ?? 0; break;
      default: return 0;
    }
    if (sortDirection === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });
  return sorted;
}

describe('sortAnalogs', () => {
  it.each(['rank', 'date', 'value', 'criteria', 'unknown'].flatMap(c => [[c, 'asc'], [c, 'desc']]))(
    'matches the original table sort for %s %s', (column, direction) => {
      expect(sortAnalogs(ANALOGS, column, direction)).toEqual(originalSort(ANALOGS, column, direction));
    });

  it('sorts by rank', () => {
    expect(sortAnalogs(ANALOGS, 'rank', 'asc').map(a => a.rank)).toEqual([1, 2, 3, 4]);
    expect(sortAnalogs(ANALOGS, 'rank', 'desc').map(a => a.rank)).toEqual([4, 3, 2, 1]);
  });

  it('does not modify its input', () => {
    const before = ANALOGS.map(a => a.rank);
    sortAnalogs(ANALOGS, 'value', 'desc');
    expect(ANALOGS.map(a => a.rank)).toEqual(before);
  });

  it('returns an empty list for missing input', () => {
    expect(sortAnalogs([], 'rank', 'asc')).toEqual([]);
    expect(sortAnalogs(null, 'rank', 'asc')).toEqual([]);
  });
});

describe('analogsToCsv', () => {
  // Semicolons and comma decimals: what a spreadsheet set to French reads without an import step.
  it('writes a header and one row per analog, in rank order', () => {
    expect(analogsToCsv(ANALOGS)).toBe(
      'rank;date;precipitation;criteria\r\n' +
      '1;1990-09-04T00:00:00;0,3;50,33\r\n' +
      '2;2019-09-03T00:00:00;12,4;54,35\r\n' +
      '3;2003-01-10T00:00:00;12,4;60,1\r\n' +
      '4;;;\r\n'
    );
  });

  it('writes the column labels it is given, so the file reads in the user language', () => {
    const csv = analogsToCsv(ANALOGS, ['Rang', 'Date', 'Précipitation', 'Critère']);
    expect(csv.split('\r\n')[0]).toBe('Rang;Date;Précipitation;Critère');
    expect(csv.split('\r\n')[1]).toBe('1;1990-09-04T00:00:00;0,3;50,33');
  });

  it('keeps full precision rather than the table rounding', () => {
    expect(analogsToCsv([{rank: 1, date: 'd', value: 0.123456, criteria: 1.23456789}]))
      .toContain('1;d;0,123456;1,23456789');
  });

  it('quotes a cell containing a separator or quote, and leaves commas in text alone', () => {
    const csv = analogsToCsv([{rank: 1, date: 'a;"b", c', value: 1, criteria: 2}]);
    expect(csv).toContain('1;"a;""b"", c";1;2');
  });
});

describe('exportAnalogsCSV', () => {
  afterEach(() => vi.clearAllMocks());

  it('downloads a CSV named after the base name', async () => {
    exportAnalogsCSV(ANALOGS, 'details_analogs');

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, name] = downloadBlob.mock.calls[0];
    expect(name).toBe('details_analogs.csv');
    expect(blob.type).toBe('text/csv;charset=utf-8');
    // jsdom's Blob has no .text(), so read it the way a browser page would. Reading as text
    // decodes and drops the byte-order mark, so the bytes are what shows it is there.
    const read = (method) => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader[method](blob);
    });
    expect(await read('readAsText')).toBe(analogsToCsv(ANALOGS));
    // EF BB BF: the UTF-8 byte-order mark that tells Excel how to decode the file.
    expect([...new Uint8Array(await read('readAsArrayBuffer')).slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
  });

  it('refuses to save an empty file', () => {
    expect(() => exportAnalogsCSV([], 'x')).toThrow('No analogs to export');
    expect(() => exportAnalogsCSV(null, 'x')).toThrow('No analogs to export');
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
