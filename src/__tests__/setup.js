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

