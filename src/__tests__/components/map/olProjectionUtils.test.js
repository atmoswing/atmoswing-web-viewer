import {describe, expect, it, vi} from 'vitest';
import {ensureProjDefined} from '@/components/map/utils/olProjectionUtils.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4';

// Mock register to avoid actual OL side-effects
vi.mock('ol/proj/proj4', () => ({register: vi.fn()}));

describe('ensureProjDefined', () => {
  it('registers predefined EPSG definition if not present', () => {
    const code = 'EPSG:2154';
    // Remove existing def if present
    delete proj4.defs[code];
    ensureProjDefined(code);
    expect(proj4.defs[code]).toBeDefined();
    expect(register).toHaveBeenCalled();
  });

  it('skips non-EPSG codes', () => {
    const before = register.mock.calls.length;
    ensureProjDefined('CRS:84');
    expect(register.mock.calls.length).toBe(before); // No extra call
  });

  it('does nothing if definition already exists', () => {
    const code = 'EPSG:2056';
    proj4.defs(code, '+proj=test +units=m');
    const existing = proj4.defs[code];
    ensureProjDefined(code);
    expect(proj4.defs[code]).toBe(existing); // unchanged
  });

  it('handles invalid input gracefully', () => {
    ensureProjDefined(null);
    ensureProjDefined('');
    ensureProjDefined('EPSG');
    // No thrown errors
    expect(true).toBe(true);
  });
});

