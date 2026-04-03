import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // Same port as production URL habit; API runs on 8788 in dev (see package.json "dev").
    port: 8787,
    strictPort: true,
    watch: { usePolling: true },
    // Avoid stale HTML/JS while iterating (browser aggressive cache on localhost).
    headers: { 'Cache-Control': 'no-store' },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
})
