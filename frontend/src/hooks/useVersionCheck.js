import { useEffect, useRef } from 'react'

const CHECK_INTERVAL_MS = 5 * 60 * 1000 // cada 5 minutos

/**
 * Detecta si hay una nueva versión del sitio comparando el ETag/Last-Modified
 * del index.html. Si hay cambio, recarga automáticamente.
 * No requiere PWA ni Service Workers.
 */
export function useVersionCheck() {
  const lastEtag = useRef(null)

  const check = async () => {
    try {
      const res = await fetch('/', { method: 'HEAD', cache: 'no-cache' })
      const etag = res.headers.get('etag') || res.headers.get('last-modified')
      if (!etag) return
      if (lastEtag.current === null) {
        lastEtag.current = etag
        return
      }
      if (lastEtag.current !== etag) {
        // Nueva versión detectada — recargar silenciosamente
        window.location.reload()
      }
    } catch {
      // Sin conexión, ignorar
    }
  }

  useEffect(() => {
    // Verificar al enfocar la ventana (usuario vuelve a la app)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)

    // Verificar periódicamente
    const interval = setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [])
}
