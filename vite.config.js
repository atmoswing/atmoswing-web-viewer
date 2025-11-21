import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '@': srcDir
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reports: ['text', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/__tests__/**',
        '**/*.d.ts',
        'src/main.jsx',
        'src/App.jsx'
      ]
    }
  }
})
