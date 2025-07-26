import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://github-analyzer-bq96.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}) 