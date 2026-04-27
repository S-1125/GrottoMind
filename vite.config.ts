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
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
