import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '@': srcDir
    }
  },
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
        'src/styles/',
        // Exclude heavy/charting modal components from coverage
        'src/components/modals/DetailsAnalogsModal.jsx',
        'src/components/modals/DistributionsModal.jsx',
        'src/components/modals/TimeSeriesModal.jsx'
      ],
      include: ['src/**/*.{js,jsx}'],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  }
});
