/**
 * @fileoverview Tests for the distribution charts' geometry, plotting positions and layers.
 */

import {describe, expect, it} from 'vitest';
import * as d3 from 'd3';

import {
  collectOverlayValues,
  computeDistributionGeometry,
  computeDistributionXMax,
  drawReturnPeriodMarkers,
  empiricalCdf,
  returnPeriodColor,
  returnPeriodMarkers
} from '@/components/modals/charts/draw/distributionLayers.js';
import {TEN_YEAR_COLOR} from '@/components/modals/charts/plotConstants.js';

const MARGIN = {top: 28, right: 40, bottom: 40, left: 56};
const REFERENCE = {axis: [2, 5, 10, 20, 50, 100], values: [14, 21, 26, 31, 38, 44]};

describe('computeDistributionGeometry', () => {
  it('sizes the plot area from the container', () => {
    const geo = computeDistributionGeometry({clientWidth: 800, clientHeight: 400}, {
      margin: MARGIN, minHeight: 240, fallbackHeight: 320
    });
    expect(geo).toMatchObject({width: 800, height: 400, innerW: 704, innerH: 332});
  });

  it('falls back to fixed sizes when the container is not laid out', () => {
    const geo = computeDistributionGeometry({clientWidth: 0, clientHeight: 0}, {
      margin: MARGIN, minHeight: 240, fallbackHeight: 320
    });
    expect(geo.width).toBe(700);
    expect(geo.height).toBe(320);
  });

  it('never goes below the minimum height or the plot-area floors', () => {
    const geo = computeDistributionGeometry({clientWidth: 50, clientHeight: 100}, {
      margin: MARGIN, minHeight: 240, fallbackHeight: 320
    });
    expect(geo.height).toBe(240);
    expect(geo.innerW).toBe(10);
  });
});

describe('empiricalCdf', () => {
  it('uses the Gringorten plotting position (i - 0.44) / (N + 0.12)', () => {
    const cdf = empiricalCdf([3, 1, 2]);
    expect(cdf.map(p => p.x)).toEqual([1, 2, 3]);
    expect(cdf[0].y).toBeCloseTo(0.56 / 3.12, 10);
    expect(cdf[1].y).toBeCloseTo(0.5, 10);
    expect(cdf[2].y).toBeCloseTo(2.56 / 3.12, 10);
  });

  it('is symmetric about 0.5, as Gringorten positions are', () => {
    const cdf = empiricalCdf([5, 9, 1, 7, 3, 11]);
    cdf.forEach((p, i) => {
      expect(p.y + cdf[cdf.length - 1 - i].y).toBeCloseTo(1, 10);
    });
  });

  it('drops non-finite values and sorts the rest', () => {
    const cdf = empiricalCdf([4, NaN, 2, Infinity, 'x', 3]);
    expect(cdf.map(p => p.x)).toEqual([2, 3, 4]);
  });

  it('returns no points for an empty or missing sample', () => {
    expect(empiricalCdf([])).toEqual([]);
    expect(empiricalCdf(null)).toEqual([]);
  });
});

describe('collectOverlayValues', () => {
  it('includes only the marked percentiles', () => {
    const xs = collectOverlayValues({percentileMarkers: {10: 1, 20: 2, 60: 6, 90: 9}});
    expect(xs).toEqual([2, 6, 9]);
  });

  it('includes return periods only for the enabled toggles', () => {
    expect(collectOverlayValues({referenceValues: REFERENCE, options: {}})).toEqual([]);
    expect(collectOverlayValues({referenceValues: REFERENCE, options: {tenYearReturn: true}})).toEqual([26]);
    expect(collectOverlayValues({referenceValues: REFERENCE, options: {allReturnPeriods: true}}))
      .toEqual([14, 21, 26, 31, 38, 44]);
  });

  it('counts best analogs whether or not their overlay is shown', () => {
    // Existing behaviour, kept by the refactor: toggling the overlay does not rescale the axis.
    const xs = collectOverlayValues({bestAnalogsData: [{value: 5}, {value: 'x'}], options: {bestAnalogs: false}});
    expect(xs).toEqual([5]);
  });
});

describe('computeDistributionXMax', () => {
  it('adds 5% headroom above the largest value or overlay', () => {
    expect(computeDistributionXMax([1, 10], [])).toBeCloseTo(10.5, 10);
    expect(computeDistributionXMax([1, 10], [20])).toBeCloseTo(21, 10);
  });

  it('falls back to 1 when everything is zero', () => {
    expect(computeDistributionXMax([0, 0], [])).toBe(1);
  });
});

describe('returnPeriodColor', () => {
  it('ramps from yellow to red', () => {
    expect(returnPeriodColor(0, 6)).toBe('rgb(255, 255, 0)');
    expect(returnPeriodColor(5, 6)).toBe('rgb(255, 0, 0)');
  });

  it('uses yellow for a single period', () => {
    expect(returnPeriodColor(0, 1)).toBe('rgb(255, 255, 0)');
  });
});

describe('returnPeriodMarkers', () => {
  it('draws the ten-year line in its own colour, without opacity', () => {
    expect(returnPeriodMarkers(REFERENCE, {tenYearReturn: true})).toEqual([
      {value: 26, color: TEN_YEAR_COLOR, label: 'P10', opacity: undefined}
    ]);
  });

  it('draws every period in ascending order along the colour ramp', () => {
    const markers = returnPeriodMarkers(REFERENCE, {allReturnPeriods: true});
    expect(markers.map(m => m.label)).toEqual(['P2', 'P5', 'P10', 'P20', 'P50', 'P100']);
    expect(markers[0].color).toBe('rgb(255, 255, 0)');
    expect(markers[5].color).toBe('rgb(255, 0, 0)');
    markers.forEach(m => expect(m.opacity).toBe(0.95));
  });

  it('draws the ten-year period twice when both toggles are on', () => {
    const labels = returnPeriodMarkers(REFERENCE, {tenYearReturn: true, allReturnPeriods: true}).map(m => m.label);
    expect(labels.filter(l => l === 'P10')).toHaveLength(2);
  });

  it('skips periods whose value is not numeric', () => {
    const markers = returnPeriodMarkers({axis: [2, 10], values: ['n/a', 'x']}, {tenYearReturn: true, allReturnPeriods: true});
    expect(markers).toEqual([]);
  });

  it('returns nothing for missing reference values', () => {
    expect(returnPeriodMarkers(null, {allReturnPeriods: true})).toEqual([]);
    expect(returnPeriodMarkers({axis: [10]}, {tenYearReturn: true})).toEqual([]);
  });
});

describe('drawReturnPeriodMarkers', () => {
  it('sets stroke-opacity only on markers that carry one', () => {
    const svg = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    const g = svg.append('g');
    const x = d3.scaleLinear().domain([0, 100]).range([0, 100]);

    drawReturnPeriodMarkers(g, {
      markers: [
        {value: 10, color: 'red', label: 'P10', opacity: undefined},
        {value: 50, color: 'blue', label: 'P50', opacity: 0.95}
      ],
      x,
      innerH: 200
    });

    const lines = g.selectAll('line').nodes();
    expect(lines).toHaveLength(2);
    expect(lines[0].hasAttribute('stroke-opacity')).toBe(false);
    expect(lines[1].getAttribute('stroke-opacity')).toBe('0.95');
    expect(g.selectAll('text').nodes().map(n => n.textContent)).toEqual(['P10', 'P50']);
  });
});
