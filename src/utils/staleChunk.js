/**
 * @module utils/staleChunk
 * @description Detects a lazy chunk that failed to load and reloads the page to recover.
 *
 * Chunks are served under hashed names with `immutable` caching, and each deploy replaces them.
 * A tab opened before a deploy still refers to the old names, so the first lazy import after the
 * deploy — opening a modal, typically — requests a file that no longer exists. `index.html` is
 * served `no-store`, so reloading fetches the current chunk names and fixes it.
 */

/** sessionStorage key recording when the last recovery reload happened. */
export const RELOAD_GUARD_KEY = 'atmoswing:stale-chunk-reload';

/**
 * A chunk still failing this soon after a recovery reload is missing from the current deploy
 * too, so reloading again would loop.
 */
export const RELOAD_GUARD_MS = 10000;

/**
 * Messages browsers and Vite use when a lazy chunk cannot be loaded. They differ per engine.
 * @constant {Array<RegExp>}
 */
const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i // Vite, when a chunk's stylesheet is missing
];

/**
 * Tells whether an error means a lazy chunk could not be loaded, as opposed to a bug in it.
 *
 * @param {*} error - Caught error
 * @returns {boolean} True for a failed chunk load
 * @example
 * isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/X.js')) // true
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  const message = String(error.message || '');
  return CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Reloads the page to pick up the current chunks, unless a recovery reload just happened.
 *
 * @param {Object} [deps] - Overridable for tests
 * @param {Storage} [deps.storage] - Where the guard timestamp is kept (default sessionStorage)
 * @param {Function} [deps.reload] - Performs the reload (default `window.location.reload`)
 * @param {number} [deps.now] - Current time in ms
 * @returns {boolean} True when a reload was triggered; false when one just happened or the
 *   guard cannot be stored, since either way a reload could loop
 */
export function reloadForStaleChunk({
  storage,
  reload = () => window.location.reload(),
  now = Date.now()
} = {}) {
  try {
    // Resolved in here rather than as a default: merely reading sessionStorage throws a
    // SecurityError in some browsers when site data is blocked.
    const store = storage === undefined ? globalThis.sessionStorage : storage;
    if (!store) return false;
    const last = Number(store.getItem(RELOAD_GUARD_KEY)) || 0;
    if (now - last < RELOAD_GUARD_MS) return false;
    store.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    // Without storage nothing can stop a reload loop, so leave it to the user.
    return false;
  }
  reload();
  return true;
}
