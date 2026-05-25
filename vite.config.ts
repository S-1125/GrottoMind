import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    proxy: {
      // Python FastAPI 后端（独立部署）
      '/api/agent': 'http://localhost:8788',
      '/api/literature': 'http://localhost:8788',
      '/api/health': 'http://localhost:8788',
      // Express / Vercel Serverless 后端
      '/api': 'http://localhost:8787',
    },
  },
})
