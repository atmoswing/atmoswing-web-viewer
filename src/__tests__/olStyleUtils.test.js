import { describe, it, expect } from 'vitest';
import { toRGBA } from '@/components/map/utils/olStyleUtils';

describe('olStyleUtils', () => {
  describe('toRGBA', () => {
    it('should convert hex color to rgba', () => {
      expect(toRGBA('#ff0000')).toBe('rgba(255,0,0,1)');
      expect(toRGBA('#00ff00')).toBe('rgba(0,255,0,1)');
      expect(toRGBA('#0000ff')).toBe('rgba(0,0,255,1)');
    });

    it('should handle short hex format', () => {
      expect(toRGBA('#f00')).toBe('rgba(255,0,0,1)');
      expect(toRGBA('#0f0')).toBe('rgba(0,255,0,1)');
      expect(toRGBA('#00f')).toBe('rgba(0,0,255,1)');
    });

    it('should preserve existing rgb/rgba strings', () => {
      expect(toRGBA('rgb(255,0,0)')).toBe('rgb(255,0,0)');
      expect(toRGBA('rgba(255,0,0,0.5)')).toBe('rgba(255,0,0,0.5)');
    });

    it('should convert QGIS-style comma-separated values', () => {
      expect(toRGBA('255,0,0,255')).toBe('rgba(255,0,0,1)');
      expect(toRGBA('255,0,0,128')).toBe('rgba(255,0,0,0.5019607843137255)');
    });

    it('should handle QGIS-style without alpha', () => {
      expect(toRGBA('255,0,0')).toBe('rgba(255,0,0,1)');
    });

    it('should convert array format', () => {
      expect(toRGBA([255, 0, 0])).toBe('rgba(255,0,0,1)');
      expect(toRGBA([255, 0, 0, 255])).toBe('rgba(255,0,0,1)');
      expect(toRGBA([255, 0, 0, 128])).toBe('rgba(255,0,0,0.5019607843137255)');
    });

    it('should handle array with 0-1 alpha', () => {
      expect(toRGBA([255, 0, 0, 0.5])).toBe('rgba(255,0,0,0.5)');
    });

    it('should use alphaFallback parameter', () => {
      expect(toRGBA('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
      expect(toRGBA('255,0,0', 0.7)).toBe('rgba(255,0,0,0.7)');
    });

    it('should return default black for null input', () => {
      expect(toRGBA(null)).toBe('rgba(0,0,0,1)');
      expect(toRGBA(undefined)).toBe('rgba(0,0,0,1)');
      expect(toRGBA('')).toBe('rgba(0,0,0,1)');
    });

    it('should use alphaFallback for invalid input', () => {
      expect(toRGBA('invalid', 0.3)).toBe('rgba(0,0,0,0.3)');
    });

    it('should handle hex colors with different cases', () => {
      expect(toRGBA('#FF0000')).toBe('rgba(255,0,0,1)');
      expect(toRGBA('#Ff0000')).toBe('rgba(255,0,0,1)');
    });

    it('should trim whitespace', () => {
      expect(toRGBA('  #ff0000  ')).toBe('rgba(255,0,0,1)');
      expect(toRGBA('  255, 0, 0  ')).toBe('rgba(255,0,0,1)');
    });

    it('should handle various gray values', () => {
      expect(toRGBA('#808080')).toBe('rgba(128,128,128,1)');
      expect(toRGBA('#000000')).toBe('rgba(0,0,0,1)');
      expect(toRGBA('#ffffff')).toBe('rgba(255,255,255,1)');
    });

    it('should convert alpha > 1 to 0-1 range', () => {
      expect(toRGBA('255,0,0,200')).toContain('0.784');
    });
  });
});

