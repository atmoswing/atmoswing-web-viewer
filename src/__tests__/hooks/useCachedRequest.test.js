import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCachedRequest } from '@/hooks/useCachedRequest.js';

describe('useCachedRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial data and loading state', () => {
    const fetchFn = vi.fn(() => Promise.resolve({ data: 'test' }));
    const { result } = renderHook(() =>
      useCachedRequest('test-key', fetchFn, [])
    );

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and return data', async () => {
    const mockData = { data: 'test' };
    const fetchFn = vi.fn(() => Promise.resolve(mockData));
    const { result } = renderHook(() =>
      useCachedRequest('test-key-unique-1', fetchFn, [])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Fetch failed');
    const fetchFn = vi.fn(() => Promise.reject(mockError));
    const { result } = renderHook(() =>
      useCachedRequest('test-key-unique-2', fetchFn, [])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).toEqual(mockError);
  });

  it('should use cached data on subsequent calls', async () => {
    const mockData = { data: 'test' };
    const fetchFn = vi.fn(() => Promise.resolve(mockData));

    const { result, rerender } = renderHook(() =>
      useCachedRequest('test-key-unique-3', fetchFn, [])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.data).toEqual(mockData);

    // Rerender with same key
    rerender();

    // Cache should be used
    expect(result.current.data).toEqual(mockData);
  });

  it('should skip fetch when enabled is false', () => {
    const fetchFn = vi.fn(() => Promise.resolve({ data: 'test' }));
    renderHook(() =>
      useCachedRequest('test-key', fetchFn, [], { enabled: false })
    );

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should skip fetch when key is null', () => {
    const fetchFn = vi.fn(() => Promise.resolve({ data: 'test' }));
    renderHook(() =>
      useCachedRequest(null, fetchFn, [])
    );

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should use initialData option', async () => {
    const initialData = { initial: 'value' };
    const fetchFn = vi.fn(() => Promise.resolve({ data: 'test' }));
    const { result } = renderHook(() =>
      useCachedRequest('test-key', fetchFn, [], { initialData })
    );

    // Initially should show initialData while loading
    if (result.current.loading) {
      expect(result.current.data).toEqual(initialData);
    }

    // After loading, should have fetched data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
  });

  it('should provide cacheHit as alias for fromCache', async () => {
    const mockData = { data: 'test' };
    const fetchFn = vi.fn(() => Promise.resolve(mockData));
    const { result, rerender } = renderHook(() => useCachedRequest('alias-key', fetchFn, []) );
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender();
    expect(result.current.cacheHit).toBe(result.current.fromCache);
  });
});
