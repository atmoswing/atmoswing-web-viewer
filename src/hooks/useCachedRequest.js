// Generic cached request hook: provides shared in-memory caching across instances.
// API: useCachedRequest(key, fetchFn, deps, { enabled=true, initialData=null, ttlMs=null })
// Returns: { data, loading, error, refresh, fromCache, cacheHit }
// - key: unique string identifying the resource. If null/undefined, fetch is skipped.
// - fetchFn: async function returning data.
// - ttlMs: optional time-to-live. If provided and stale, refetch occurs.
// - refresh(): forces refetch bypassing cache.
// Caching is global (module-level) per key.
import {useCallback, useEffect, useRef, useState} from 'react';

const GLOBAL_CACHE = new Map(); // key -> { timestamp, data }

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

