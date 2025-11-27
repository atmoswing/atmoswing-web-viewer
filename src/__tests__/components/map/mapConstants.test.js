import {describe, expect, it} from 'vitest';
import * as mapConstants from '@/components/map/mapConstants.js';

describe('mapConstants', () => {
  it('should export DEFAULT_PROJECTION', () => {
    expect(mapConstants.DEFAULT_PROJECTION).toBe('EPSG:3857');
  });

  it('should export WMTS_MATRIX_SET_DEFAULT', () => {
    expect(mapConstants.WMTS_MATRIX_SET_DEFAULT).toBe('PM');
  });

  it('should export FIT_PADDING as array', () => {
    expect(mapConstants.FIT_PADDING).toEqual([60, 60, 60, 60]);
    expect(mapConstants.FIT_PADDING).toHaveLength(4);
  });

  it('should export LEGEND_SAMPLES', () => {
    expect(mapConstants.LEGEND_SAMPLES).toBe(40);
    expect(typeof mapConstants.LEGEND_SAMPLES).toBe('number');
  });

  it('should export forecast point radius constants', () => {
    expect(mapConstants.FORECAST_POINT_RADIUS_RELEVANT).toBe(8);
    expect(mapConstants.FORECAST_POINT_RADIUS_NORMAL).toBe(6);
    expect(mapConstants.FORECAST_POINT_RADIUS_RELEVANT).toBeGreaterThan(
      mapConstants.FORECAST_POINT_RADIUS_NORMAL
    );
  });

  it('should export forecast point stroke width', () => {
    expect(mapConstants.FORECAST_POINT_STROKE_WIDTH).toBe(2);
  });

  it('should export forecast point stroke colors', () => {
    expect(mapConstants.FORECAST_POINT_STROKE_COLOR_RELEVANT).toBe('rgba(0,0,0,0.6)');
    expect(mapConstants.FORECAST_POINT_STROKE_COLOR_DIM).toBe('rgba(0,0,0,0.3)');
  });

  it('should export forecast point opacity constants', () => {
    expect(mapConstants.FORECAST_POINT_OPACITY_RELEVANT).toBe(0.9);
    expect(mapConstants.FORECAST_POINT_OPACITY_DIM).toBe(0.7);
    expect(mapConstants.FORECAST_POINT_OPACITY_RELEVANT).toBeGreaterThan(
      mapConstants.FORECAST_POINT_OPACITY_DIM
    );
  });

  it('should export overlay layer constants', () => {
    expect(mapConstants.OVERLAY_LINE_COLOR).toBe('rgba(0, 102, 255, 0.9)');
    expect(mapConstants.OVERLAY_STROKE_WIDTH).toBe(2);
    expect(mapConstants.OVERLAY_POLYGON_FILL).toBe('rgba(0, 102, 255, 0.15)');
    expect(mapConstants.OVERLAY_POINT_RADIUS).toBe(5);
  });

  it('should have all opacity values between 0 and 1', () => {
    expect(mapConstants.FORECAST_POINT_OPACITY_RELEVANT).toBeGreaterThan(0);
    expect(mapConstants.FORECAST_POINT_OPACITY_RELEVANT).toBeLessThanOrEqual(1);
    expect(mapConstants.FORECAST_POINT_OPACITY_DIM).toBeGreaterThan(0);
    expect(mapConstants.FORECAST_POINT_OPACITY_DIM).toBeLessThanOrEqual(1);
  });

  it('should have positive numeric values for sizes', () => {
    expect(mapConstants.FORECAST_POINT_RADIUS_RELEVANT).toBeGreaterThan(0);
    expect(mapConstants.FORECAST_POINT_RADIUS_NORMAL).toBeGreaterThan(0);
    expect(mapConstants.FORECAST_POINT_STROKE_WIDTH).toBeGreaterThan(0);
    expect(mapConstants.OVERLAY_STROKE_WIDTH).toBeGreaterThan(0);
    expect(mapConstants.OVERLAY_POINT_RADIUS).toBeGreaterThan(0);
  });
});

