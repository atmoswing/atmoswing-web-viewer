// Shared test utilities for unit tests
// Provides helpers and shared mocks to reduce duplication across tests.
//
// The mock helpers return module *factories* rather than calling vi.mock themselves: Vitest
// requires vi.mock at the top level of the test file (from v5 it throws otherwise), so each
// test file declares the mock and borrows the factory:
//
//   vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());
//
// The factory is loaded with a dynamic import because vi.mock is hoisted above the file's
// static imports.

/**
 * Module replacing react-i18next: `t` returns the key, or the `date` option when given.
 * @returns {Object} Mocked module
 */
export function i18nMockModule() {
  return {
    useTranslation: () => ({
      t: (k, opts) => (opts && opts.date ? String(opts.date) : k),
      i18n: {language: 'en'}
    })
  };
}

export function makeSizedRef(width = 700, height = 360, append = false) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', {get: () => width});
  Object.defineProperty(div, 'clientHeight', {get: () => height});
  if (append && typeof document !== 'undefined' && document.body) document.body.appendChild(div);
  return {current: div};
}

/**
 * Default behaviour of the useCachedRequest mock: never loading, and returning the caller's
 * `initialData`. Matches the hook's `(key, fetchFn, options)` signature.
 */
const cachedRequestDefault = (key, fn, opts) => ({
  data: opts && opts.initialData !== undefined ? opts.initialData : null,
  loading: false,
  error: null
});

// Shared mock for useCachedRequest so tests can override implementations per-case
export const useCachedRequestMock = vi.fn(cachedRequestDefault);

/**
 * Module replacing `@/hooks/useCachedRequest.js`, backed by the shared `useCachedRequestMock`.
 * @returns {Object} Mocked module
 */
export function cachedRequestMockModule() {
  return {
    useCachedRequest: useCachedRequestMock,
    clearCachedRequests: vi.fn()
  };
}

// Convenience: default mocked implementation
export function setUseCachedRequestDefault() {
  useCachedRequestMock.mockImplementation(cachedRequestDefault);
}

// Helper to reset mocks between tests
export function resetTestUtils() {
  useCachedRequestMock.mockReset();
}
