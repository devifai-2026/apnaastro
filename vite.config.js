import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Owner console dev server. Proxies /platform to the backend (which must run
// with SAAS_ENABLED=true). Runs on 5273 so it can coexist with the tenant
// admin (5173) during development.
//
// Set PROXY_TARGET to point the dev server at a remote backend instead of a
// local one, e.g. PROXY_TARGET=https://api.devifai.in npm run dev. Proxying
// (rather than VITE_API_BASE) keeps requests same-origin, so no CORS setup.
const PROXY_TARGET = process.env.PROXY_TARGET || 'http://localhost:5050';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      '/platform': {
        target: PROXY_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
