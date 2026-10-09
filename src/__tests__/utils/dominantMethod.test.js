/**
 * @fileoverview Tests for findDominantMethod: which method gives a toolbar lead square its colour.
 *
 * The fixture follows the shape of the API's series-synthesis-per-method response for a
 * workspace mixing daily and 6-hourly methods (no time_step per entry, shared midnight dates).
 */

import {describe, expect, it} from 'vitest';
import {findDominantMethod} from '@/utils/dominantMethod.js';

const daily = (methodId, values) => ({
  method_id: methodId,
  target_dates: values.map((_, i) => `2026-10-${String(9 + i).padStart(2, '0')}T00:00:00`),
  values_normalized: values
});
const sixHourly = (methodId, values) => ({
  method_id: methodId,
  target_dates: values.map((_, i) => {
    const day = 9 + Math.floor(i / 4);
    const hour = (i % 4) * 6;
    return `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`;
  }),
  values_normalized: values
});

const perMethod = [
  daily('24h-ARP', [0.11, 0.18, 0.01]),
  daily('24h-GFS', [0.19, 0.07]), // shorter: no third day
  sixHourly('06h-ARP', [0.10, 0.30, 0.05, 0.02, 0.07]),
  sixHourly('06h-GFS', [0.08, 0.30, 0.04, 0.02, 0.04])
];
const day = (d, h = 0) => new Date(2026, 9, d, h);

describe('findDominantMethod', () => {
  it('picks the daily method with the highest value on that day', () => {
    expect(findDominantMethod(perMethod, day(9))).toEqual({methodId: '24h-GFS', value: 0.19});
    expect(findDominantMethod(perMethod, day(10))).toEqual({methodId: '24h-ARP', value: 0.18});
  });

  it('ignores sub-daily methods for a daily square, though they share the midnight date', () => {
    // 06h-ARP has 0.10 at 00:00 on the 9th; a daily square must not consider it.
    // (Two values: with a single 00:00 date a method cannot be told apart from a daily one.)
    const onlySub = [sixHourly('06h-ARP', [0.9, 0.1])];
    expect(findDominantMethod(onlySub, day(9))).toBeNull();
  });

  it('picks among sub-daily methods for a sub-daily segment, matching the exact hour', () => {
    expect(findDominantMethod(perMethod, day(9, 0), {subDaily: true})).toEqual({methodId: '06h-ARP', value: 0.10});
    expect(findDominantMethod(perMethod, day(9, 12), {subDaily: true})).toEqual({methodId: '06h-ARP', value: 0.05});
    expect(findDominantMethod(perMethod, day(9, 3), {subDaily: true})).toBeNull();
  });

  it('accepts the target date as an API string', () => {
    expect(findDominantMethod(perMethod, '2026-10-09T00')).toEqual({methodId: '24h-GFS', value: 0.19});
  });

  it('skips methods without data at the lead', () => {
    // 24h-GFS stops on the 10th: the 11th falls to the only method left.
    expect(findDominantMethod(perMethod, day(11))).toEqual({methodId: '24h-ARP', value: 0.01});
  });

  it.each([
    ['null', null],
    ['NaN', NaN],
    ['missing', undefined],
    ['a string', '0.9']
  ])('skips a value that is %s', (_label, bad) => {
    const data = [daily('A', [bad]), daily('B', [0.2])];
    expect(findDominantMethod(data, day(9))).toEqual({methodId: 'B', value: 0.2});
  });

  it('returns null when no method has a value, or the input is unusable', () => {
    expect(findDominantMethod(perMethod, day(20))).toBeNull();
    expect(findDominantMethod([], day(9))).toBeNull();
    expect(findDominantMethod(null, day(9))).toBeNull();
    expect(findDominantMethod(perMethod, null)).toBeNull();
    expect(findDominantMethod([{target_dates: ['2026-10-09T00:00:00'], values_normalized: [1]}], day(9))).toBeNull();
  });

  it('ignores malformed entries and unreadable dates', () => {
    const data = [
      {method_id: 'NoArrays', target_dates: 'x', values_normalized: 'y'},
      {method_id: 'NoValues', target_dates: ['2026-10-09T00:00:00']},
      {method_id: 'BadDate', target_dates: ['not a date', '2026-10-09T00:00:00'], values_normalized: [0.9, 0.1]},
      daily('Good', [0.2])
    ];
    // BadDate's readable date still counts; its unreadable one is skipped, not matched.
    expect(findDominantMethod(data, day(9))).toEqual({methodId: 'Good', value: 0.2});
    expect(findDominantMethod(data, 'not a date')).toBeNull();
  });

  describe('ties', () => {
    const tiedAt = day(9, 6); // 06h-ARP and 06h-GFS both 0.30

    it('keeps the preferred (currently selected) method when it is among the tied ones', () => {
      expect(findDominantMethod(perMethod, tiedAt, {subDaily: true, preferredMethodId: '06h-GFS'}))
        .toEqual({methodId: '06h-GFS', value: 0.30});
    });

    it('ignores the preferred method when it is not among the tied ones', () => {
      expect(findDominantMethod(perMethod, tiedAt, {
        subDaily: true,
        preferredMethodId: '24h-ARP',
        methodOrder: ['06h-GFS', '06h-ARP']
      })).toEqual({methodId: '06h-GFS', value: 0.30});
    });

    it('otherwise follows the display order, then the response order', () => {
      expect(findDominantMethod(perMethod, tiedAt, {subDaily: true, methodOrder: ['06h-GFS', '06h-ARP']}).methodId)
        .toBe('06h-GFS');
      expect(findDominantMethod(perMethod, tiedAt, {subDaily: true}).methodId).toBe('06h-ARP');
      // Methods missing from the display order come after those in it.
      expect(findDominantMethod(perMethod, tiedAt, {subDaily: true, methodOrder: ['06h-GFS']}).methodId)
        .toBe('06h-GFS');
    });

    it('does not treat close but different values as tied', () => {
      const data = [daily('A', [0.3]), daily('B', [0.31])];
      expect(findDominantMethod(data, day(9), {preferredMethodId: 'A'}).methodId).toBe('B');
    });
  });
});
