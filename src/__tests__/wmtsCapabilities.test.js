import { describe, it, expect, vi } from 'vitest';
import { loadWmtsCapabilities, createWmtsTileLayer } from '@/components/map/utils/loadWmtsCapabilities.js';

// Mock ol modules used internally
vi.mock('ol/format/WMTSCapabilities', () => ({
  default: vi.fn().mockImplementation(() => ({
    read: vi.fn().mockImplementation((txt) => ({ contents: txt, Capability: { Layers: [] } }))
  }))
}));

// mock optionsFromCapabilities to return deterministic option object
vi.mock('ol/source/WMTS', () => ({
  default: vi.fn().mockImplementation((opts) => ({ __wmts: true, opts })),
  optionsFromCapabilities: vi.fn().mockImplementation((caps, { layer, matrixSet, style }) => ({ layer, matrixSet, style }))
}));

import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';

const runtimeConfig = {
  providers: [
    { name: 'provA', wmtsUrl: 'https://example.com/wmtsA' }
  ],
  baseLayers: [
    { source: 'wmts', wmtsLayer: 'LayerA', provider: 'provA', title: 'Layer A', style: 'default' }
  ],
  overlayLayers: [
    { source: 'wmts', wmtsLayer: 'LayerB', provider: 'provA', title: 'Layer B' }
  ]
};

describe('loadWmtsCapabilities', () => {
  it('loads capabilities and populates cache with styled layer then fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<Capabilities />') });
    const warnings = [];
    const cache = await loadWmtsCapabilities(runtimeConfig, (msg) => warnings.push(msg));
    expect(Object.keys(cache)).toContain('LayerA');
    expect(Object.keys(cache)).toContain('LayerB');
    expect(cache.LayerA.style).toBe('default');
    // LayerB had no style -> style undefined in options
    expect(cache.LayerB.style).toBeUndefined();
    expect(warnings.length).toBe(0);
  });

  it('enqueueWarning called on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
    const warnings = [];
    const cache = await loadWmtsCapabilities(runtimeConfig, (msg) => warnings.push(msg));
    expect(cache).toEqual({});
    expect(warnings.length).toBe(2); // one per layer
    expect(warnings[0]).toMatch(/Failed to load layer/);
  });
});

describe('createWmtsTileLayer', () => {
  it('returns WMTS instance when layer options cached', () => {
    const cache = { LayerA: { layer: 'LayerA', matrixSet: 'PM' } };
    const source = createWmtsTileLayer({ wmtsLayer: 'LayerA' }, cache);
    expect(source).toBeTruthy();
    expect(source.__wmts).toBe(true);
    expect(WMTS).toHaveBeenCalled();
  });

  it('returns null when layer not in cache', () => {
    const cache = { LayerA: {} };
    const source = createWmtsTileLayer({ wmtsLayer: 'MissingLayer' }, cache);
    expect(source).toBeNull();
  });
});

