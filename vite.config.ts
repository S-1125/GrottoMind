import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('@react-three')) {
            return 'three-vendor'
          }
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) {
            return 'anim-vendor'
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/react-markdown')) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
})
