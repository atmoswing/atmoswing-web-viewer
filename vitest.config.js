import {defineConfig, mergeConfig} from 'vitest/config';

import viteConfig from './vite.config.js';

// Plugins and the `@` alias come from vite.config.js, so tests resolve modules exactly the
// way the built app does and the two files cannot drift apart.
export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '*.config.js',
        'generate-docs.*',
        'docs/',
        'public/',
        'src/main.jsx',
        'src/assets/',
        'src/styles/'
      ],
      include: ['src/**/*.{js,jsx}'],
      all: true,
      // Must be nested under `thresholds`: set directly on `coverage` they are silently ignored.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
}));
