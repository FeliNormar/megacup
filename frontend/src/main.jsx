import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const APP_VERSION = '1.1.4'

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

async function clearCacheAndRender() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    localStorage.setItem('app_version', APP_VERSION)
  } catch (e) {
    console.warn('Cache clear error:', e)
  }
  renderApp()
}

const storedVersion = localStorage.getItem('app_version')
if (storedVersion !== APP_VERSION) {
  clearCacheAndRender()
} else {
  renderApp()
}
