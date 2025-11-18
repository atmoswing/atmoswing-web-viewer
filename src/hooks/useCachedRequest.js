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
 * Custom hook for making cached API requests with automatic deduplication.
 *
 * @param {string|null} key - Unique cache key. If null/undefined, fetch is skipped
 * @param {Function} fetchFn - Async function that returns the data
 * @param {Array} deps - Dependency array for the effect
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enabled=true] - Whether the request is enabled
 * @param {*} [options.initialData=null] - Initial data value
 * @param {number|null} [options.ttlMs=null] - Time-to-live in milliseconds. If provided and cache is stale, refetch occurs
 * @returns {Object} Request state object
 * @returns {*} returns.data - The fetched data
 * @returns {boolean} returns.loading - Whether the request is in progress
 * @returns {Error|null} returns.error - Error object if request failed
 * @returns {Function} returns.refresh - Function to force refetch bypassing cache
 * @returns {boolean} returns.fromCache - Whether data was served from cache
 * @example
 * const { data, loading, error, refresh } = useCachedRequest(
 *   'forecast-entities',
 *   () => getEntities(region, date, methodId, configId),
 *   [region, date, methodId, configId],
 *   { ttlMs: 60000 }
 * );
 */
export function useCachedRequest(key, fetchFn, deps, options = {}) {
  const {enabled = true, initialData = null, ttlMs = null} = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const reqIdRef = useRef(0);
  const forceRefreshRef = useRef(0);

  const refresh = useCallback(() => {
    forceRefreshRef.current += 1;
  }, []);

  useEffect(() => {
    if (!enabled || !key) return; // skip entirely
    let cancelled = false;
    const localReqId = ++reqIdRef.current;

    async function run() {
      setLoading(true);
      setError(null);
      setFromCache(false);
      const cached = GLOBAL_CACHE.get(key);
      const now = Date.now();
      const stale = ttlMs != null && cached && (now - cached.timestamp) > ttlMs;
      if (cached && !stale && forceRefreshRef.current === 0) {
        // Serve from cache synchronously
        setData(cached.data);
        setFromCache(true);
        setLoading(false);
        return;
      }
      // Not from cache, reset to initial data
      setData(initialData);
      try {
        const result = await fetchFn();
        if (cancelled || localReqId !== reqIdRef.current) return;
        setData(result);
        GLOBAL_CACHE.set(key, {timestamp: Date.now(), data: result});
        setFromCache(false);
      } catch (e) {
        if (cancelled || localReqId !== reqIdRef.current) return;
        setError(e);
        setData(initialData);
      } finally {
        if (!cancelled && localReqId === reqIdRef.current) setLoading(false);
        // reset forceRefresh flag after attempt
        if (!cancelled && forceRefreshRef.current > 0) forceRefreshRef.current = 0;
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttlMs, forceRefreshRef.current, ...deps]);

  const cacheHit = fromCache; // alias

  return {data, loading, error, refresh, fromCache, cacheHit};
}

export function invalidateCachedKey(key) {
  if (key && GLOBAL_CACHE.has(key)) GLOBAL_CACHE.delete(key);
}

export function clearCachedRequests(prefix = null) {
  if (!prefix) {
    GLOBAL_CACHE.clear();
    return;
  }
  Array.from(GLOBAL_CACHE.keys()).forEach(k => {
    if (k.startsWith(prefix)) GLOBAL_CACHE.delete(k);
  });
}
