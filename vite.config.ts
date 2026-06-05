import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy always targets localhost — this config only runs during `vite dev`, never on Vercel.
// In production the VITE_API_BASE_URL env var (set on Vercel) points the browser directly at
// the Render backend, so this proxy is completely bypassed.
const DEV_BACKEND = 'http://localhost:4000'
const DEV_BACKEND_WS = 'ws://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: DEV_BACKEND,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: DEV_BACKEND_WS,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
