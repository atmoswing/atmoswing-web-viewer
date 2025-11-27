import { describe, it, expect } from 'vitest';
import { buildLegendStops } from '@/components/map/utils/buildLegendStops.js';

describe('buildLegendStops', () => {
  it('should generate legend stops with default parameters', () => {
    const stops = buildLegendStops();
    expect(stops).toBeInstanceOf(Array);
    expect(stops.length).toBeGreaterThan(0);
    expect(stops[0]).toHaveProperty('color');
    expect(stops[0]).toHaveProperty('pct');
  });

  it('should generate correct number of stops', () => {
    const samples = 10;
    const stops = buildLegendStops(100, samples);
    expect(stops).toHaveLength(samples + 1); // +1 because it includes 0
  });

  it('should start at 0% and end at 100%', () => {
    const stops = buildLegendStops(100, 10);
    expect(stops[0].pct).toBe(0);
    expect(stops[stops.length - 1].pct).toBe(100);
  });

  it('should return RGB color strings', () => {
    const stops = buildLegendStops(100, 5);
    stops.forEach(stop => {
      expect(stop.color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    });
  });

  it('should have white at 0%', () => {
    const stops = buildLegendStops(100, 10);
    expect(stops[0].color).toBe('rgb(255,255,255)');
  });

  it('should have red at 100%', () => {
    const stops = buildLegendStops(100, 10);
    expect(stops[stops.length - 1].color).toBe('rgb(255,0,0)');
  });

  it('should handle small maxVal', () => {
    const stops = buildLegendStops(1, 5);
    expect(stops).toHaveLength(6);
    expect(stops[0].pct).toBe(0);
    expect(stops[stops.length - 1].pct).toBe(100);
  });

  it('should handle large maxVal', () => {
    const stops = buildLegendStops(1000, 5);
    expect(stops).toHaveLength(6);
    expect(stops[0].pct).toBe(0);
    expect(stops[stops.length - 1].pct).toBe(100);
  });

  it('should handle samples = 1', () => {
    const stops = buildLegendStops(100, 1);
    expect(stops).toHaveLength(2);
    expect(stops[0].pct).toBe(0);
    expect(stops[1].pct).toBe(100);
  });

  it('should handle samples = 0 gracefully', () => {
    const stops = buildLegendStops(100, 0);
    expect(stops).toHaveLength(2); // 0 and 1 (i from 0 to Math.max(1, 0))
  });

  it('should have evenly distributed percentages', () => {
    const samples = 4;
    const stops = buildLegendStops(100, samples);
    expect(stops[0].pct).toBe(0);
    expect(stops[1].pct).toBe(25);
    expect(stops[2].pct).toBe(50);
    expect(stops[3].pct).toBe(75);
    expect(stops[4].pct).toBe(100);
  });

  it('should generate gradient from white through green to red', () => {
    const stops = buildLegendStops(100, 20);
    // First stop should be white
    expect(stops[0].color).toBe('rgb(255,255,255)');

    // Middle stops should have high green component
    const midStop = stops[Math.floor(stops.length / 2)];
    expect(midStop.color).toContain('255'); // Should have 255 in green

    // Last stop should be red
    expect(stops[stops.length - 1].color).toBe('rgb(255,0,0)');
  });
});

