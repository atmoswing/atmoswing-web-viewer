/**
 * @module hooks/useCachedRequest
 * @description Generic cached request hook that provides shared in-memory caching across hook instances.
 */

import {useCallback, useEffect, useRef, useState} from 'react';

/**
 * Global cache storage. Maps cache keys to objects containing timestamp and data.
 * @type {Map<string, {timestamp: number, data: any}>}
 */
const GLOBAL_CACHE = new Map();

/**
 * Whether a cache entry exists and is within its time-to-live.
 * @private
 * @param {{timestamp: number, data: any}|undefined|null} entry - Cache entry
 * @param {number|null} ttlMs - Time-to-live; null means entries never expire
 * @returns {boolean} True if the entry can be served
 */
function isFresh(entry, ttlMs) {
  return !!entry && (ttlMs == null || Date.now() - entry.timestamp <= ttlMs);
}

/**
 * Custom hook for making cached API requests with automatic deduplication.
 *
 * The `key` is the single source of truth for when a refetch happens: it must encode every
 * value `fetchFn` reads. A null key (or `enabled: false`) resets the hook back to `initialData`,
 * so a cleared selection never leaves the previous selection's data behind.
 *
 * The data returned always belongs to the current key. State is only updated in an effect, so on
 * the render where the key changes it still holds the previous key's result; that render gets the
 * new key's cached entry instead, or `initialData` while it loads. Without this, a caller that
 * validates a choice against the returned list would check it against another selection's list.
 *
 * @param {string|null} key - Unique cache key. If null/undefined, the fetch is skipped and state resets
 * @param {Function} fetchFn - Async function that returns the data. Always called at its latest version
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enabled=true] - Whether the request is enabled
 * @param {*} [options.initialData=null] - Value used before the first result and after a reset or error.
 *   Captured on first render, so passing a fresh `[]`/`{}` literal each render is safe and keeps a stable identity
 * @param {number|null} [options.ttlMs=null] - Time-to-live in milliseconds. If provided and cache is stale, refetch occurs
 * @returns {Object} Request state object
 * @returns {*} returns.data - The fetched data
 * @returns {boolean} returns.loading - Whether the request is in progress
 * @returns {Error|null} returns.error - Error object if request failed
 * @returns {Function} returns.refresh - Function to force a refetch, bypassing the cached entry
 * @returns {boolean} returns.fromCache - Whether data was served from cache
 * @example
 * const { data, loading, error, refresh } = useCachedRequest(
 *   `entities|${region}|${date}|${methodId}|${configId}`,
 *   () => getEntities(region, date, methodId, configId),
 *   { ttlMs: 60000 }
 * );
 */
export function useCachedRequest(key, fetchFn, options = {}) {
  const {enabled = true, initialData = null, ttlMs = null} = options;

  // Captured once: call sites pass fresh [] / {} literals, and a stable identity keeps
  // downstream useMemo/useEffect from churning on every render.
  const initialDataRef = useRef(initialData);

  // `key` records which request the state belongs to (null for the reset state).
  const [state, setState] = useState(() => ({
    key: null,
    data: initialDataRef.current,
    loading: false,
    error: null,
    fromCache: false
  }));

  // fetchFn is a new closure on every render. Keep the latest one in a ref so it never has
  // to be an effect dependency; declared before the fetching effect so it syncs first.
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => {
    if (key) GLOBAL_CACHE.delete(key);
    setRefreshCount(c => c + 1);
  }, [key]);

  const reqIdRef = useRef(0);
  const active = enabled && !!key;
  const activeKey = active ? key : null;

  useEffect(() => {
    // Invalidate any in-flight request from a previous key.
    const localReqId = ++reqIdRef.current;

    if (!active) {
      setState({key: null, data: initialDataRef.current, loading: false, error: null, fromCache: false});
      return;
    }

    const cached = GLOBAL_CACHE.get(key);
    if (isFresh(cached, ttlMs)) {
      setState({key, data: cached.data, loading: false, error: null, fromCache: true});
      return;
    }

    setState({key, data: initialDataRef.current, loading: true, error: null, fromCache: false});

    let cancelled = false;
    (async () => {
      try {
        const result = await fetchFnRef.current();
        if (cancelled || localReqId !== reqIdRef.current) return;
        GLOBAL_CACHE.set(key, {timestamp: Date.now(), data: result});
        setState({key, data: result, loading: false, error: null, fromCache: false});
      } catch (e) {
        if (cancelled || localReqId !== reqIdRef.current) return;
        setState({key, data: initialDataRef.current, loading: false, error: e, fromCache: false});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, active, ttlMs, refreshCount]);

  // The key changed and the effect has not caught up yet: answer for the new key.
  if (state.key !== activeKey) {
    const cached = activeKey ? GLOBAL_CACHE.get(activeKey) : null;
    const fresh = isFresh(cached, ttlMs);
    return {
      data: fresh ? cached.data : initialDataRef.current,
      loading: !!activeKey && !fresh,
      error: null,
      fromCache: fresh,
      cacheHit: fresh,
      refresh
    };
  }

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    fromCache: state.fromCache,
    cacheHit: state.fromCache,
    refresh
  };
}

/**
 * Removes a single entry from the shared cache.
 * @param {string|null} key - Cache key to drop
 * @returns {void}
 */
export function invalidateCachedKey(key) {
  if (key && GLOBAL_CACHE.has(key)) GLOBAL_CACHE.delete(key);
}

/**
 * Clears cached entries, optionally only those whose key starts with a prefix.
 * @param {string|null} [prefix=null] - Key prefix to match; clears everything when omitted
 * @returns {void}
 */
export function clearCachedRequests(prefix = null) {
  if (!prefix) {
    GLOBAL_CACHE.clear();
    return;
  }
  Array.from(GLOBAL_CACHE.keys()).forEach(k => {
    if (k.startsWith(prefix)) GLOBAL_CACHE.delete(k);
  });
}
