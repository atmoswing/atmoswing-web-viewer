import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  applyWmtsSource,
  clearWmtsCapabilitiesCache,
  createWmtsTileLayer,
  fetchWmtsCapabilities,
  loadWmtsCapabilities,
  makeRetryingTileLoadFunction
} from '@/components/map/utils/loadWmtsCapabilities.js';
import WMTS from 'ol/source/WMTS';
import TileState from 'ol/TileState';

// Mock ol modules used internally
// Constructed with `new` by the code under test, so a `function`: from Vitest 4 an arrow throws,
// and loadWmtsCapabilities would swallow that and return an empty cache.
vi.mock('ol/format/WMTSCapabilities', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      read: vi.fn().mockImplementation((txt) => ({contents: txt, Capability: {Layers: []}}))
    };
  })
}));

// mock optionsFromCapabilities to return deterministic option object
vi.mock('ol/source/WMTS', () => ({
  // A `function`, not an arrow: the code constructs it with `new`.
  default: vi.fn().mockImplementation(function (opts) { return {__wmts: true, opts}; }),
  optionsFromCapabilities: vi.fn().mockImplementation((caps, {layer, matrixSet, style}) => ({layer, matrixSet, style}))
}));

const runtimeConfig = {
  providers: [
    {name: 'provA', wmtsUrl: 'https://example.com/wmtsA'}
  ],
  baseLayers: [
    {source: 'wmts', wmtsLayer: 'LayerA', provider: 'provA', title: 'Layer A', style: 'default'}
  ],
  overlayLayers: [
    {source: 'wmts', wmtsLayer: 'LayerB', provider: 'provA', title: 'Layer B'}
  ]
};

const okResponse = (text = '<Capabilities />') => ({ok: true, status: 200, text: () => Promise.resolve(text)});

beforeEach(() => {
  clearWmtsCapabilitiesCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadWmtsCapabilities', () => {
  it('loads capabilities and populates cache with styled layer then fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse());
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

  it('reports an HTTP error status instead of parsing the error page', async () => {
    global.fetch = vi.fn().mockResolvedValue({ok: false, status: 503, text: () => Promise.resolve('down')});
    const warnings = [];
    const cache = await loadWmtsCapabilities(runtimeConfig, (msg) => warnings.push(msg));
    expect(cache).toEqual({});
    expect(warnings).toEqual(['Failed to load layer Layer A: HTTP 503', 'Failed to load layer Layer B: HTTP 503']);
  });

  it('gives up on a provider that does not answer within the timeout', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((url, {signal}) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const warnings = [];
    const pending = loadWmtsCapabilities(runtimeConfig, (msg) => warnings.push(msg));
    await vi.advanceTimersByTimeAsync(15000);
    expect(await pending).toEqual({});
    expect(warnings[0]).toBe('Failed to load layer Layer A: no response after 15 s');
  });

  it('only resolves the requested items', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse());
    const cache = await loadWmtsCapabilities(runtimeConfig, undefined, {items: runtimeConfig.overlayLayers});
    expect(Object.keys(cache)).toEqual(['LayerB']);
  });

  it('fetches several providers in parallel', async () => {
    const resolvers = [];
    global.fetch = vi.fn(() => new Promise(resolve => resolvers.push(resolve)));
    const config = {
      providers: [{name: 'a', wmtsUrl: 'https://a/caps'}, {name: 'b', wmtsUrl: 'https://b/caps'}],
      baseLayers: [
        {source: 'wmts', wmtsLayer: 'A1', provider: 'a', title: 'A1'},
        {source: 'wmts', wmtsLayer: 'B1', provider: 'b', title: 'B1'}
      ]
    };
    const pending = loadWmtsCapabilities(config);
    // Both requests are out before either has answered.
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    resolvers.forEach(resolve => resolve(okResponse()));
    expect(Object.keys(await pending).sort()).toEqual(['A1', 'B1']);
  });
});

describe('fetchWmtsCapabilities', () => {
  it('shares one request between concurrent and later callers', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse());
    const [a, b] = await Promise.all([fetchWmtsCapabilities('https://x/caps'), fetchWmtsCapabilities('https://x/caps')]);
    const c = await fetchWmtsCapabilities('https://x/caps');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('does not keep a failed request, so a later call tries again', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network down')).mockResolvedValue(okResponse());
    await expect(fetchWmtsCapabilities('https://x/caps')).rejects.toThrow('Network down');
    await expect(fetchWmtsCapabilities('https://x/caps')).resolves.toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('makeRetryingTileLoadFunction', () => {
  const makeTile = () => {
    const tile = {
      state: TileState.LOADING,
      image: {addEventListener: vi.fn(), src: ''},
      getState: vi.fn(() => tile.state),
      setState: vi.fn(s => {
        tile.state = s;
      }),
      getImage: vi.fn(() => tile.image),
      load: vi.fn(() => {
        tile.state = TileState.LOADING;
      })
    };
    return tile;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:tile');
    URL.revokeObjectURL = vi.fn();
  });

  it('draws a loaded tile from its blob, and frees the blob once drawn', async () => {
    global.fetch = vi.fn().mockResolvedValue({ok: true, status: 200, blob: () => Promise.resolve('png')});
    const tile = makeTile();
    makeRetryingTileLoadFunction()(tile, 'https://x/tile');
    await vi.advanceTimersByTimeAsync(0);
    expect(tile.image.src).toBe('blob:tile');
    expect(tile.setState).not.toHaveBeenCalled();
    const onLoad = tile.image.addEventListener.mock.calls.find(([type]) => type === 'load')[1];
    onLoad();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tile');
  });

  it('retries a transient failure after a growing delay, then stops with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ok: false, status: 404, text: () => Promise.resolve('<html>Not Found</html>')});
    const tile = makeTile();
    const load = makeRetryingTileLoadFunction({maxRetries: 2, delayMs: 1000});
    // What ImageTile.load() does after an error: back to loading, through the load function again.
    tile.load.mockImplementation(() => {
      tile.state = TileState.LOADING;
      load(tile, 'https://x/tile');
    });

    load(tile, 'https://x/tile');
    await vi.advanceTimersByTimeAsync(0);
    expect(tile.setState).toHaveBeenLastCalledWith(TileState.ERROR);
    await vi.advanceTimersByTimeAsync(999);
    expect(tile.load).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(tile.load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(tile.load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10000);
    expect(tile.load).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(tile.state).toBe(TileState.ERROR);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/tile failed after 3 attempt\(s\) \(HTTP 404\)/);
    warn.mockRestore();
  });

  it('marks a tile the server has no data for as empty, without retrying or warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const report = '<ExceptionReport xmlns="http://www.opengis.net/ows/1.1">'
      + '<Exception exceptionCode="Not Found">No data found</Exception></ExceptionReport>';
    global.fetch = vi.fn().mockResolvedValue({ok: false, status: 404, text: () => Promise.resolve(report)});
    const tile = makeTile();
    makeRetryingTileLoadFunction({delayMs: 10, label: 'Hydro'})(tile, 'https://x/tile');
    await vi.advanceTimersByTimeAsync(1000);
    expect(tile.setState).toHaveBeenCalledExactlyOnceWith(TileState.EMPTY);
    expect(tile.load).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('retries network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const tile = makeTile();
    makeRetryingTileLoadFunction({maxRetries: 1, delayMs: 10})(tile, 'https://x/tile');
    await vi.advanceTimersByTimeAsync(10);
    expect(tile.load).toHaveBeenCalledTimes(1);
  });

  it('does not retry a permanent error, but reports it under the layer name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ok: false, status: 403});
    const tile = makeTile();
    makeRetryingTileLoadFunction({delayMs: 10, label: 'Hydro'})(tile, 'https://x/tile');
    await vi.advanceTimersByTimeAsync(1000);
    expect(tile.setState).toHaveBeenCalledWith(TileState.ERROR);
    expect(tile.load).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('Hydro: tile failed after 1 attempt(s) (HTTP 403)', 'https://x/tile');
    warn.mockRestore();
  });

  it('leaves a tile alone once it is no longer loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({ok: false, status: 503});
    const tile = makeTile();
    makeRetryingTileLoadFunction({delayMs: 10})(tile, 'https://x/tile');
    tile.state = TileState.ABORT;
    await vi.advanceTimersByTimeAsync(1000);
    expect(tile.setState).not.toHaveBeenCalled();
    expect(tile.load).not.toHaveBeenCalled();
  });
});

describe('applyWmtsSource', () => {
  it('hides the layer beyond one zoom level coarser than the tile grid', () => {
    const layer = {setSource: vi.fn(), setMaxResolution: vi.fn()};
    const source = {getTileGrid: () => ({getResolution: (z) => [2445.98, 1222.99][z]})};
    applyWmtsSource(layer, source);
    expect(layer.setSource).toHaveBeenCalledWith(source);
    expect(layer.setMaxResolution).toHaveBeenCalledWith(4891.96);
  });

  it('leaves the resolution range alone when the grid is unknown', () => {
    const layer = {setSource: vi.fn(), setMaxResolution: vi.fn()};
    applyWmtsSource(layer, {});
    expect(layer.setSource).toHaveBeenCalled();
    expect(layer.setMaxResolution).not.toHaveBeenCalled();
  });
});

describe('createWmtsTileLayer', () => {
  it('returns WMTS instance when layer options cached, loading tiles with retries', () => {
    const cache = {LayerA: {layer: 'LayerA', matrixSet: 'PM'}};
    const source = createWmtsTileLayer({wmtsLayer: 'LayerA'}, cache);
    expect(source).toBeTruthy();
    expect(source.__wmts).toBe(true);
    expect(WMTS).toHaveBeenCalledWith(expect.objectContaining({layer: 'LayerA', tileLoadFunction: expect.any(Function)}));
  });

  it('returns null when layer not in cache', () => {
    const cache = {LayerA: {}};
    const source = createWmtsTileLayer({wmtsLayer: 'MissingLayer'}, cache);
    expect(source).toBeNull();
  });
});
