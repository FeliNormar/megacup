import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false,
      workbox: {
        globPatterns: [],
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  // En producción el frontend llama directo al backend de Render
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'https://megacup-api.onrender.com')
  }
})
