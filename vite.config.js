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
  server: {
    proxy: {
      // Mirrors the same-origin relay in nginx.conf (Vigicrues sends no CORS headers).
      '/proxy/vigicrues.geojson': {
        target: 'https://www.vigicrues.gouv.fr',
        changeOrigin: true,
        rewrite: () => '/services/InfoVigiCru.geojson'
      }
    }
  }
})
