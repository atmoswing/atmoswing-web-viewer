/**
 * @fileoverview Tests for the pure chart geometry helpers.
 *
 * These were previously buried inside a 345-line D3 draw effect and could not be reached without
 * rendering a chart; they are plain functions now.
 */

import {describe, expect, it} from 'vitest';
import {
  computeChartGeometry,
  computeMedianStepMs,
  computeTimeDomain,
  computeYMax,
  extractReferencePairs
} from '@/components/modals/charts/draw/chartGeometry.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

describe('computeChartGeometry', () => {
  it('derives inner dimensions from the container size', () => {
    const {svgWidth, svgHeight, innerW, innerH, margin} =
      computeChartGeometry({clientWidth: 800, clientHeight: 500});

    expect(innerW).toBe(800 - margin.left - margin.right);
    expect(innerH).toBe(500 - margin.top - margin.bottom - 28);
    expect(svgWidth).toBe(800);
    expect(svgHeight).toBe(500);
  });

  it('applies the minimum size for a collapsed container', () => {
    const {svgWidth, svgHeight, innerW, innerH} =
      computeChartGeometry({clientWidth: 0, clientHeight: 0});

    expect(svgWidth).toBeGreaterThanOrEqual(420);
    expect(svgHeight).toBeGreaterThanOrEqual(300);
    expect(innerW).toBeGreaterThan(0);
    expect(innerH).toBeGreaterThan(0);
  });

  it('never returns a negative plot area', () => {
    const {innerW, innerH} = computeChartGeometry({clientWidth: 10, clientHeight: 10});
    expect(innerW).toBeGreaterThan(0);
    expect(innerH).toBeGreaterThan(0);
  });
});

describe('computeMedianStepMs', () => {
  it('returns the median gap between dates', () => {
    const base = new Date('2025-01-01T00:00:00Z').getTime();
    const dates = [0, 6, 12, 36].map(h => new Date(base + h * HOUR));
    expect(computeMedianStepMs(dates)).toBe(6 * HOUR);
  });

  it('falls back when there are too few dates', () => {
    expect(computeMedianStepMs([])).toBe(12 * HOUR);
    expect(computeMedianStepMs([new Date()])).toBe(12 * HOUR);
  });

  it('ignores non-positive gaps', () => {
    const d = new Date('2025-01-01T00:00:00Z');
    expect(computeMedianStepMs([d, d])).toBe(12 * HOUR);
  });
});

describe('computeTimeDomain', () => {
  it('starts two days before the forecast run so the marker is visible', () => {
    const run = new Date('2025-01-05T00:00:00Z');
    const dates = [new Date('2025-01-06T00:00:00Z'), new Date('2025-01-07T00:00:00Z')];

    const [start, end] = computeTimeDomain(dates, run);

    expect(start.getTime()).toBe(run.getTime() - 2 * DAY);
    expect(end.getTime()).toBeGreaterThan(dates[1].getTime());
  });

  it('keeps the earliest target date when it precedes the run window', () => {
    const run = new Date('2025-01-05T00:00:00Z');
    const early = new Date('2024-12-20T00:00:00Z');

    const [start] = computeTimeDomain([early, new Date('2025-01-06T00:00:00Z')], run);

    expect(start.getTime()).toBe(early.getTime());
  });

  it('returns nulls with no dates', () => {
    expect(computeTimeDomain([], new Date())).toEqual([null, null]);
  });
});

describe('computeYMax', () => {
  it('adds headroom above the largest value', () => {
    expect(computeYMax([[1, 2], [5]])).toBeCloseTo(5.4);
  });

  it('ignores non-finite values', () => {
    expect(computeYMax([[NaN, Infinity, 2]])).toBeCloseTo(2.16);
  });

  it('falls back when nothing is plottable', () => {
    expect(computeYMax([])).toBe(1);
    expect(computeYMax([[], [NaN]])).toBe(1);
  });
});

describe('extractReferencePairs', () => {
  it('picks out the ten-year value and every finite pair', () => {
    const {tenYearVal, rpPairs} = extractReferencePairs({axis: [2, 10, 100], values: [10, 42, 80]});

    expect(tenYearVal).toBe(42);
    expect(rpPairs).toEqual([{rp: 2, val: 10}, {rp: 10, val: 42}, {rp: 100, val: 80}]);
  });

  it('returns no ten-year value when the axis lacks one', () => {
    const {tenYearVal, rpPairs} = extractReferencePairs({axis: [2, 100], values: [10, 80]});

    expect(tenYearVal).toBeNull();
    expect(rpPairs).toHaveLength(2);
  });

  it('handles missing or empty reference values', () => {
    expect(extractReferencePairs(null)).toEqual({tenYearVal: null, rpPairs: []});
    expect(extractReferencePairs({axis: [], values: []})).toEqual({tenYearVal: null, rpPairs: []});
  });
});
