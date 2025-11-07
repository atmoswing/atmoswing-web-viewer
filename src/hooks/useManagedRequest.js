// Generic hook to manage cancellable async requests with loading/error/data state.
// fetchFn: async () => data
// deps: dependency array triggering new request
// options: {initialData, enabled}
import { useEffect, useRef, useState, useCallback } from 'react';

export function useManagedRequest(fetchFn, deps, options = {}) {
    const { initialData = null, enabled = true } = options;
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const reqIdRef = useRef(0);

    const refresh = useCallback(() => {
        reqIdRef.current += 1;
    }, []);

    useEffect(() => {
        if (!enabled) return; // skip
        let cancelled = false;
        const localReqId = ++reqIdRef.current;
        async function run() {
            setLoading(true); setError(null);
            try {
                const result = await fetchFn();
                if (cancelled || localReqId !== reqIdRef.current) return;
                setData(result);
            } catch (e) {
                if (cancelled || localReqId !== reqIdRef.current) return;
                setError(e);
                setData(initialData);
            } finally {
                if (!cancelled && localReqId === reqIdRef.current) setLoading(false);
            }
        }
        run();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ...deps]);

    return { data, loading, error, refresh };
}
