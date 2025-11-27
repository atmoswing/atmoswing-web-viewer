import {describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import useDarkMode from '@/components/map/hooks/useDarkMode.js';

describe('useDarkMode', () => {
  it('initially reflects matchMedia preference', () => {
    const mq = {matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()};
    window.matchMedia = vi.fn().mockReturnValue(mq);
    const {result} = renderHook(() => useDarkMode());
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    let listener;
    const mq = {
      matches: false,
      addEventListener: vi.fn((event, cb) => {
        if (event === 'change') listener = cb;
      }),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn().mockReturnValue(mq);
    const {result} = renderHook(() => useDarkMode());
    expect(result.current).toBe(false);
    act(() => {
      mq.matches = true;
      listener({matches: true});
    });
    expect(result.current).toBe(true);
  });
});

