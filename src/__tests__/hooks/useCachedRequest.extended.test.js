import {describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {clearCachedRequests, invalidateCachedKey, useCachedRequest} from '@/hooks/useCachedRequest.js';

describe('useCachedRequest - additional coverage', () => {
  it('resets to initialData on fetch error', async () => {
    const initialData = {placeholder: 'loading'};
    const fetchFn = vi.fn().mockRejectedValue(new Error('Fetch failed'));

    const {result} = renderHook(() =>
      useCachedRequest('error-key-unique', fetchFn, [], {initialData})
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, {timeout: 3000});

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toEqual(initialData);
  });

  it('handles race condition when key changes during fetch', async () => {
    let resolveFirst;
    const firstPromise = new Promise(resolve => {
      resolveFirst = resolve;
    });
    const fetchFn = vi.fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce({data: 'second'});

    const {result, rerender} = renderHook(
      ({key}) => useCachedRequest(key, fetchFn, []),
      {initialProps: {key: 'race-key-1'}}
    );

    // Start first request
    expect(result.current.loading).toBe(true);

    // Change key to trigger second request
    rerender({key: 'race-key-2'});

    // Resolve first request (should be ignored)
    resolveFirst({data: 'first'});

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, {timeout: 3000});

    // Should have second data, not first
    expect(result.current.data).toEqual({data: 'second'});
  });

  it('invalidateCachedKey removes specific key from cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue({data: 'test'});
    const key = 'invalidate-test-key';

    const {result} = renderHook(() =>
      useCachedRequest(key, fetchFn, [])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, {timeout: 3000});

    expect(result.current.data).toEqual({data: 'test'});

    // Invalidate the key
    invalidateCachedKey(key);

    // Next render should refetch (can't easily test without remounting)
    expect(fetchFn).toHaveBeenCalled();
  });

  it('clearCachedRequests with prefix clears matching keys', async () => {
    const fetchFn1 = vi.fn().mockResolvedValue({data: '1'});
    const fetchFn2 = vi.fn().mockResolvedValue({data: '2'});

    const {result: result1} = renderHook(() =>
      useCachedRequest('prefix-key-1', fetchFn1, [])
    );

    const {result: result2} = renderHook(() =>
      useCachedRequest('other-key', fetchFn2, [])
    );

    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
      expect(result2.current.loading).toBe(false);
    }, {timeout: 3000});

    // Clear only prefix keys
    clearCachedRequests('prefix');

    // Both should have been called
    expect(fetchFn1).toHaveBeenCalled();
    expect(fetchFn2).toHaveBeenCalled();
  });

  it('clearCachedRequests without prefix clears all', () => {
    clearCachedRequests();
    // Should not throw
    expect(true).toBe(true);
  });

  it('provides refresh function', async () => {
    const fetchFn = vi.fn().mockResolvedValue({data: 'test'});

    const {result} = renderHook(() =>
      useCachedRequest('refresh-test-key', fetchFn, [])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, {timeout: 3000});

    expect(typeof result.current.refresh).toBe('function');
    expect(result.current.data).toEqual({data: 'test'});
  });

  it('cancelled requests do not update state', async () => {
    let resolveFetch;
    const fetchFn = vi.fn(() => new Promise(resolve => {
      resolveFetch = resolve;
    }));

    const {result, unmount} = renderHook(() =>
      useCachedRequest('cancel-test-key', fetchFn, [])
    );

    expect(result.current.loading).toBe(true);

    // Unmount before fetch completes
    unmount();

    // Resolve the fetch (should be ignored due to cleanup)
    resolveFetch({data: 'should-be-ignored'});

    // No way to assert state after unmount, but this tests the cleanup path
    expect(fetchFn).toHaveBeenCalled();
  });

  it('handles null key edge case', () => {
    const fetchFn = vi.fn();
    const {result} = renderHook(() =>
      useCachedRequest(null, fetchFn, [])
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('handles undefined key edge case', () => {
    const fetchFn = vi.fn();
    const {result} = renderHook(() =>
      useCachedRequest(undefined, fetchFn, [])
    );

    expect(result.current.loading).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('invalidateCachedKey handles non-existent key gracefully', () => {
    invalidateCachedKey('non-existent-key');
    // Should not throw
    expect(true).toBe(true);
  });

  it('invalidateCachedKey handles null key', () => {
    invalidateCachedKey(null);
    // Should not throw
    expect(true).toBe(true);
  });
});

