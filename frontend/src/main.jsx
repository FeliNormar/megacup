import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const APP_VERSION = '1.1.5'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', background: '#0d1b3e', color: '#fff', minHeight: '100vh' }}>
          <h2 style={{ color: '#ec4899' }}>Error de aplicación</h2>
          <pre style={{ fontSize: 12, color: '#8fa3b1', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <button onClick={() => { localStorage.removeItem('app_version'); window.location.reload() }}
            style={{ marginTop: 16, padding: '10px 20px', background: '#1a3a8f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Limpiar caché y recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
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
