import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Owner console dev server. Proxies /platform to the backend (which must run
// with SAAS_ENABLED=true). Runs on 5273 so it can coexist with the tenant
// admin (5173) during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      '/platform': { target: 'http://localhost:5050', changeOrigin: true },
    },
  },
});
