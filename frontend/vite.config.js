import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://51.20.60.4:5000/',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}) 