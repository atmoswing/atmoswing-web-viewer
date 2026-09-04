/**
 * @fileoverview Tests for the map constants.
 *
 * These assert the properties the map's appearance actually depends on — relative sizes,
 * value ranges, parseable colours — rather than echoing each literal back. Restating a
 * constant's own value only makes the test fail whenever someone deliberately changes it,
 * which reports a decision as a defect and catches no bug.
 */

import {describe, expect, it} from 'vitest';
import * as mapConstants from '@/components/map/mapConstants.js';

const {
  DEFAULT_PROJECTION,
  FIT_PADDING,
  FORECAST_POINT_OPACITY_DIM,
  FORECAST_POINT_OPACITY_RELEVANT,
  FORECAST_POINT_RADIUS_NORMAL,
  FORECAST_POINT_RADIUS_RELEVANT,
  FORECAST_POINT_STROKE_COLOR_DIM,
  FORECAST_POINT_STROKE_COLOR_RELEVANT,
  FORECAST_POINT_STROKE_WIDTH,
  LEGEND_SAMPLES,
  OVERLAY_LINE_COLOR,
  OVERLAY_POINT_FILL,
  OVERLAY_POINT_RADIUS,
  OVERLAY_POINT_STROKE_COLOR,
  OVERLAY_POINT_STROKE_WIDTH,
  OVERLAY_POLYGON_FILL,
  OVERLAY_STROKE_WIDTH,
  WMTS_MATRIX_SET_DEFAULT
} = mapConstants;

/** Colours are handed straight to OpenLayers, which needs CSS hex or rgb()/rgba(). */
const CSS_COLOR = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\))$/;

/** Parses the alpha channel out of an `rgba()` string. */
function alphaOf(color) {
  const m = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/.exec(color);
  return m ? Number(m[1]) : 1;
}

const SIZES = {
  FORECAST_POINT_RADIUS_RELEVANT,
  FORECAST_POINT_RADIUS_NORMAL,
  FORECAST_POINT_STROKE_WIDTH,
  OVERLAY_STROKE_WIDTH,
  OVERLAY_POINT_RADIUS,
  OVERLAY_POINT_STROKE_WIDTH,
  LEGEND_SAMPLES
};

const COLORS = {
  FORECAST_POINT_STROKE_COLOR_RELEVANT,
  FORECAST_POINT_STROKE_COLOR_DIM,
  OVERLAY_LINE_COLOR,
  OVERLAY_POLYGON_FILL,
  OVERLAY_POINT_STROKE_COLOR,
  OVERLAY_POINT_FILL
};

describe('mapConstants', () => {
  it('names a projection OpenLayers can resolve', () => {
    expect(DEFAULT_PROJECTION).toMatch(/^EPSG:\d+$/);
    expect(typeof WMTS_MATRIX_SET_DEFAULT).toBe('string');
    expect(WMTS_MATRIX_SET_DEFAULT.length).toBeGreaterThan(0);
  });

  it('gives fitting a four-sided, non-negative padding', () => {
    // OpenLayers reads this as [top, right, bottom, left]; a shorter array silently misfits.
    expect(FIT_PADDING).toHaveLength(4);
    FIT_PADDING.forEach(pad => {
      expect(Number.isFinite(pad)).toBe(true);
      expect(pad).toBeGreaterThanOrEqual(0);
    });
  });

  it.each(Object.entries(SIZES))('%s is a positive finite size', (_name, value) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
  });

  it('samples the legend gradient often enough to look continuous', () => {
    expect(LEGEND_SAMPLES).toBeGreaterThanOrEqual(2);
    expect(Number.isInteger(LEGEND_SAMPLES)).toBe(true);
  });

  it.each(Object.entries(COLORS))('%s is a colour OpenLayers can parse', (_name, value) => {
    expect(value).toMatch(CSS_COLOR);
  });

  it('draws relevant forecast points more prominently than dimmed ones', () => {
    // The map distinguishes entities with data purely by size and opacity, so these
    // orderings are the behaviour, not incidental values.
    expect(FORECAST_POINT_RADIUS_RELEVANT).toBeGreaterThan(FORECAST_POINT_RADIUS_NORMAL);
    expect(FORECAST_POINT_OPACITY_RELEVANT).toBeGreaterThan(FORECAST_POINT_OPACITY_DIM);
    expect(alphaOf(FORECAST_POINT_STROKE_COLOR_RELEVANT))
      .toBeGreaterThan(alphaOf(FORECAST_POINT_STROKE_COLOR_DIM));
  });

  it('keeps every opacity within the renderable range', () => {
    [FORECAST_POINT_OPACITY_RELEVANT, FORECAST_POINT_OPACITY_DIM].forEach(opacity => {
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });
    Object.values(COLORS).forEach(color => {
      const alpha = alphaOf(color);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThanOrEqual(1);
    });
  });

  it('keeps polygon fill more transparent than its own outline', () => {
    // A fill as opaque as the stroke would hide the basemap underneath the overlay.
    expect(alphaOf(OVERLAY_POLYGON_FILL)).toBeLessThan(alphaOf(OVERLAY_LINE_COLOR));
  });
});
