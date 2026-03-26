import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

/**
 * QRScanner
 * Espera un QR con formato JSON: { provider, po }
 * o texto plano "PROVEEDOR|PO"
 */
export default function QRScanner({ onResult, onClose }) {
  const scannerRef = useRef(null)
  const [error, setError]   = useState(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => {
        scanner.stop().catch(() => {})
        let result = { provider: '', po: '' }
        try {
          result = JSON.parse(text)
        } catch (_) {
          const parts = text.split('|')
          result = { provider: parts[0]?.trim() || text, po: parts[1]?.trim() || '' }
        }
        onResult(result)
      },
      () => {} // ignore per-frame errors
    )
      .then(() => setActive(true))
      .catch((e) => setError(e?.message || 'No se pudo acceder a la cámara'))

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-white font-semibold">Escanear QR</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        {error
          ? <div className="p-6 text-red-400 text-center text-sm">{error}</div>
          : <div id="qr-reader" className="w-full" />
        }

        <p className="text-gray-400 text-xs text-center py-3 px-4">
          Apunta al código QR del trailer. Se detectará automáticamente.
        </p>
      </div>
    </div>
  )
}
