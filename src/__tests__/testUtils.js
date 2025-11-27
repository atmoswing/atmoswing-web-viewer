// Shared test utilities for unit tests
// Provides helpers and shared mocks to reduce duplication across tests

export function setupI18nMock() {
  // Call this at top-level in tests before importing components that use react-i18next
  vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (k, opts) => (opts && opts.date ? String(opts.date) : k),
      i18n: {language: 'en'}
    })
  }));
}

export function makeSizedRef(width = 700, height = 360, append = false) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', {get: () => width});
  Object.defineProperty(div, 'clientHeight', {get: () => height});
  if (append && typeof document !== 'undefined' && document.body) document.body.appendChild(div);
  return {current: div};
}

// Shared mock for useCachedRequest so tests can override implementations per-case
export const useCachedRequestMock = vi.fn((key, fn, deps, opts) => ({
  data: opts && opts.initialData !== undefined ? opts.initialData : null,
  loading: false,
  error: null
}));

export function setupUseCachedRequestMock() {
  vi.mock('@/hooks/useCachedRequest.js', () => ({
    useCachedRequest: useCachedRequestMock,
    clearCachedRequests: vi.fn()
  }));
}

// Convenience: default mocked implementation
export function setUseCachedRequestDefault() {
  useCachedRequestMock.mockImplementation((key, fn, deps, opts) => ({
    data: opts && opts.initialData !== undefined ? opts.initialData : null,
    loading: false,
    error: null
  }));
}

// Helper to reset mocks between tests
export function resetTestUtils() {
  useCachedRequestMock.mockReset();
}
