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
      // `include` already limits coverage to src/**/*.{js,jsx}, so only exclusions inside src/
      // matter. Written as globs: from Vitest 5 a pattern without wildcards names a directory,
      // so the old 'src/__tests__/' stopped excluding the shared test helpers.
      exclude: ['src/__tests__/**', 'src/main.jsx'],
      // Every source file counts, tested or not: with `include` set, files no test loads are
      // still reported (Vitest 4 removed the old `all` option in favour of this).
      include: ['src/**/*.{js,jsx}'],
      // Must be nested under `thresholds`: set directly on `coverage` they are silently ignored.
      // Calibrated for Vitest 4+'s AST-based V8 remapping, which counts optional chaining, `??`,
      // `||` and default parameters as branches: the same tests that read 87/80/87/87 under
      // Vitest 2 read 78/67/79/81 here. A few points of headroom, so only a real regression fails.
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 65,
        statements: 75
      }
    }
  }
}));
