/**
 * @module utils/urlWorkspaceUtils
 * @description Helpers for syncing workspace selection with URL query parameters.
 * Enables shareable URLs and browser back/forward navigation for workspace changes.
 */

/**
 * URL parameters to monitor for workspace changes.
 * @constant {Array<string>}
 * @private
 */
const PARAMS = ['workspace'];

/**
 * Reads the workspace key from the current URL query parameters.
 *
 * @returns {string} Workspace key from URL, or empty string if not present
 * @example
 * // URL: /?workspace=demo
 * readWorkspaceFromUrl() // Returns: "demo"
 */
export function readWorkspaceFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    for (const p of PARAMS) {
      const v = params.get(p);
      if (v) return v;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Updates the URL query parameter with the selected workspace key.
 * Uses pushState to update the URL without page reload.
 *
 * @param {string} next - Workspace key to set, or empty/null to remove parameter
 * @example
 * writeWorkspaceToUrl('demo') // Updates URL to: /?workspace=demo
 * writeWorkspaceToUrl(null)   // Removes workspace parameter from URL
 */
export function writeWorkspaceToUrl(next) {
  try {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('workspace', next); else url.searchParams.delete('workspace');
    if (url.toString() !== window.location.href) window.history.pushState({}, '', url);
  } catch {/* noop */
  }
}

/**
 * Registers a handler for browser back/forward navigation to sync workspace changes.
 *
 * @param {Function} handler - Callback function that receives the workspace key from URL
 * @returns {Function} Cleanup function to remove the event listener
 * @example
 * const cleanup = onWorkspacePopState((workspaceKey) => {
 *   console.log('Workspace changed via navigation:', workspaceKey);
 *   setCurrentWorkspace(workspaceKey);
 * });
 *
 * // Later, when component unmounts:
 * cleanup();
 */
export function onWorkspacePopState(handler) {
  const listener = () => handler(readWorkspaceFromUrl());
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

