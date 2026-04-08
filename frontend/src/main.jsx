import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── Limpieza de service worker y caché al actualizar ─────────────────────────
const APP_VERSION = '1.1.0' // incrementar en cada deploy importante

async function clearAndReload() {
  try {
    // Desregistrar todos los service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    // Limpiar todos los cachés del navegador
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    // Marcar versión y recargar
    localStorage.setItem('app_version', APP_VERSION)
    window.location.reload()
  } catch (e) {
    console.warn('Cache clear error:', e)
  }
}

const storedVersion = localStorage.getItem('app_version')
if (storedVersion !== APP_VERSION) {
  clearAndReload()
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
