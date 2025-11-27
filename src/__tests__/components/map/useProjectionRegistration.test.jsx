import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useProjectionRegistration from '@/components/map/hooks/useProjectionRegistration.js';
import proj4 from 'proj4';

vi.mock('ol/proj/proj4', () => ({ register: vi.fn() }));
import { register } from 'ol/proj/proj4';

describe('useProjectionRegistration', () => {
  it('registers new EPSG when first used', () => {
    const code = 'EPSG:2154';
    delete proj4.defs[code];
    const { result, rerender } = renderHook(({ epsg }) => useProjectionRegistration(epsg), { initialProps: { epsg: code } });
    expect(result.current.current).toBe(code);
    expect(proj4.defs[code]).toBeDefined();
    expect(register).toHaveBeenCalled();
    const calls = register.mock.calls.length;
    rerender({ epsg: code });
    expect(register.mock.calls.length).toBe(calls); // no re-register
  });

  it('ignores invalid codes', () => {
    const { result } = renderHook(({ epsg }) => useProjectionRegistration(epsg), { initialProps: { epsg: 'CRS:84' } });
    expect(result.current.current).toBeNull();
  });

  it('switches projection and registers new one', () => {
    const codeA = 'EPSG:2154';
    const codeB = 'EPSG:2056';
    delete proj4.defs[codeA];
    delete proj4.defs[codeB];
    const { result, rerender } = renderHook(({ epsg }) => useProjectionRegistration(epsg), { initialProps: { epsg: codeA } });
    expect(result.current.current).toBe(codeA);
    rerender({ epsg: codeB });
    expect(result.current.current).toBe(codeB);
    expect(proj4.defs[codeB]).toBeDefined();
  });
});

