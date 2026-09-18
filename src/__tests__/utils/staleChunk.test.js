/**
 * @fileoverview Tests for stale-chunk detection and the guarded recovery reload.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {
  isChunkLoadError,
  RELOAD_GUARD_KEY,
  RELOAD_GUARD_MS,
  reloadForStaleChunk
} from '@/utils/staleChunk.js';

/** In-memory stand-in for sessionStorage. */
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    data
  };
}

describe('isChunkLoadError', () => {
  it.each([
    ['Chromium', 'Failed to fetch dynamically imported module: https://x/assets/Modal-abc.js'],
    ['Firefox', 'error loading dynamically imported module: https://x/assets/Modal-abc.js'],
    ['Safari', 'Importing a module script failed.'],
    ['Vite CSS preload', 'Unable to preload CSS for /assets/Modal-abc.css']
  ])('recognises the %s message', (_engine, message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('recognises a ChunkLoadError by name', () => {
    const err = new Error('whatever');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('does not treat an ordinary rendering bug as a stale chunk', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
  });

  it('handles missing or unusual values', () => {
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({})).toBe(false);
  });
});

describe('reloadForStaleChunk', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reloads and records when it did', () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    expect(reloadForStaleChunk({storage, reload, now: 50000})).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.data.get(RELOAD_GUARD_KEY)).toBe('50000');
  });

  it('refuses a second reload inside the guard window, which would loop', () => {
    // Still failing right after a reload means the chunk is missing from this deploy too.
    const storage = memoryStorage({[RELOAD_GUARD_KEY]: '50000'});
    const reload = vi.fn();

    expect(reloadForStaleChunk({storage, reload, now: 50000 + RELOAD_GUARD_MS - 1})).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads again once the window has passed', () => {
    const storage = memoryStorage({[RELOAD_GUARD_KEY]: '50000'});
    const reload = vi.fn();

    expect(reloadForStaleChunk({storage, reload, now: 50000 + RELOAD_GUARD_MS})).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when there is no storage to guard with', () => {
    const reload = vi.fn();
    expect(reloadForStaleChunk({storage: null, reload})).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when storage throws', () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: vi.fn()
    };
    expect(reloadForStaleChunk({storage, reload})).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when the guard cannot be written', () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };
    expect(reloadForStaleChunk({storage, reload})).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('uses sessionStorage by default', () => {
    const storage = memoryStorage();
    vi.stubGlobal('sessionStorage', storage);
    const reload = vi.fn();

    reloadForStaleChunk({reload, now: 1700000000000});

    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.data.get(RELOAD_GUARD_KEY)).toBe('1700000000000');
  });

  it('survives sessionStorage itself being unreadable', () => {
    // Some browsers throw on merely reading `sessionStorage` when site data is blocked.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      }
    });
    try {
      const reload = vi.fn();
      expect(reloadForStaleChunk({reload})).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    }
  });
});
