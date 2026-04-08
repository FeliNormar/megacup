import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'https://megacup-api.onrender.com')
  }
})
