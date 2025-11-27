import {describe, expect, it} from 'vitest';
import {valueToColor, valueToColorCSS} from '@/utils/colorUtils.js';

describe('colorUtils', () => {
  describe('valueToColor', () => {
    it('should return gray for null value', () => {
      const result = valueToColor(null, 100);
      expect(result).toEqual([150, 150, 150]);
    });

    it('should return gray for NaN value', () => {
      const result = valueToColor(NaN, 100);
      expect(result).toEqual([150, 150, 150]);
    });

    it('should return white for zero value', () => {
      const result = valueToColor(0, 100);
      expect(result).toEqual([255, 255, 255]);
    });

    it('should return color for value at 25% (white->cyan->green range)', () => {
      const result = valueToColor(25, 100);
      expect(result).toHaveLength(3);
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[0]).toBeLessThanOrEqual(255);
      expect(result[1]).toBe(255);
      expect(result[2]).toBeGreaterThanOrEqual(0);
      expect(result[2]).toBeLessThanOrEqual(255);
    });

    it('should return green-ish for value at 50%', () => {
      const result = valueToColor(50, 100);
      expect(result).toHaveLength(3);
      // At 50%, should be in green range
      expect(result[1]).toBe(255); // green component should be high
    });

    it('should return yellow-ish for value at 75% (green->yellow->red range)', () => {
      const result = valueToColor(75, 100);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe(255); // red component maxed
      expect(result[1]).toBeGreaterThan(0); // yellow has green
      expect(result[2]).toBe(0); // no blue
    });

    it('should return red for value at 100%', () => {
      const result = valueToColor(100, 100);
      expect(result).toEqual([255, 0, 0]);
    });

    it('should handle maxValue of 0 by using 1 as fallback', () => {
      const result = valueToColor(0.5, 0);
      expect(result).toHaveLength(3);
      expect(result).not.toEqual([255, 255, 255]); // Should not be white
    });

    it('should handle negative maxValue by using 1 as fallback', () => {
      const result = valueToColor(0.5, -10);
      expect(result).toHaveLength(3);
    });

    it('should clamp values beyond maxValue appropriately', () => {
      const result = valueToColor(150, 100);
      expect(result).toEqual([255, 0, 0]); // Should be red (clamped)
    });
  });

  describe('valueToColorCSS', () => {
    it('should return CSS rgb string for valid value', () => {
      const result = valueToColorCSS(50, 100);
      expect(result).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    });

    it('should return gray CSS string for null', () => {
      const result = valueToColorCSS(null, 100);
      expect(result).toBe('rgb(150,150,150)');
    });

    it('should return white CSS string for zero', () => {
      const result = valueToColorCSS(0, 100);
      expect(result).toBe('rgb(255,255,255)');
    });

    it('should return red CSS string for maxValue', () => {
      const result = valueToColorCSS(100, 100);
      expect(result).toBe('rgb(255,0,0)');
    });
  });
});

