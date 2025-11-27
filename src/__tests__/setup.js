import '@testing-library/jest-dom/vitest';

// Polyfill matchMedia if not present
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  });
}

// Suppress React 18 act() warnings for async updates in tests
// These warnings are expected when testing providers that use useEffect
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: An update to') ||
       message.includes('Warning: A suspended resource') ||
       message.includes('inside a test was not wrapped in act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

