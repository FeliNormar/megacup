import React, { useState } from 'react'
import { X, QrCode, Users, Package, Warehouse, Calendar } from 'lucide-react'
import QRScanner from './QRScanner'
import { fmtDateTime } from '../utils/time'

export default function NewDescarga({ naves, workers, providers, activeNaveIds, onSave, onClose }) {
  const [naveId,   setNaveId]   = useState('')
  const [provider, setProvider] = useState('')
  const [product,  setProduct]  = useState('')
  const [po,       setPo]       = useState('')
  const [selected, setSelected] = useState([])
  const [showQR,   setShowQR]   = useState(false)

  // Hora del dispositivo, se actualiza al abrir el modal
  const [deviceTime] = useState(() => Date.now())

  const availableNaves = naves.filter((n) => !activeNaveIds.includes(n.id))
  const selProvider    = providers.find((p) => p.name === provider)
  const products       = selProvider?.products || []

  const toggleWorker = (name) =>
    setSelected((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])

  const handleQR = ({ provider: p, po: o, product: pr }) => {
    if (p)  setProvider(p)
    if (o)  setPo(o)
    if (pr) setProduct(pr)
    setShowQR(false)
  }

  const canSave = naveId && provider && product && selected.length > 0

  const handleSave = () => {
    if (!canSave) return
    const nave = naves.find((n) => n.id === naveId)
    onSave({
      naveId,
      naveName: nave?.name || naveId,
      provider,
      product,
      po,
      workers: selected,
      // La hora se registra en App.jsx con Date.now() en el momento exacto de confirmar
    })
  }

  return (
    <>
      {showQR && <QRScanner onResult={handleQR} onClose={() => setShowQR(false)} />}

      <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
        <div className="w-full sm:max-w-lg bg-white dark:bg-[#162050] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col">

          {/* Header fijo */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#8fa3b1]/20 shrink-0">
            <span className="font-bold text-lg text-[#1a3a8f] dark:text-white">Nueva Descarga</span>
            <div className="flex items-center gap-3">
              {/* Hora del dispositivo */}
              <div className="flex items-center gap-1 text-xs text-[#8fa3b1]">
                <Calendar size={12} />
                <span>{fmtDateTime(deviceTime)}</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a3a8f]/30">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scroll content */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">

            {/* 1. Nave */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                <Warehouse size={12} className="inline mr-1" />Nave / Bodega
              </label>
              {availableNaves.length === 0
                ? <p className="text-sm text-amber-500">Todas las naves tienen una descarga activa.</p>
                : <div className="flex flex-wrap gap-2">
                    {availableNaves.map((n) => (
                      <button key={n.id} onClick={() => setNaveId(n.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                          naveId === n.id
                            ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white'
                            : 'border-[#8fa3b1]/40 dark:border-[#8fa3b1]/30 text-gray-700 dark:text-gray-300'
                        }`}>
                        Nave {n.name}
                      </button>
                    ))}
                  </div>
              }
            </div>

            {/* 2. Proveedor */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                Proveedor
              </label>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button key={p.id} onClick={() => { setProvider(p.name); setProduct('') }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                      provider === p.name
                        ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white'
                        : 'border-[#8fa3b1]/40 dark:border-[#8fa3b1]/30 text-gray-700 dark:text-gray-300'
                    }`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Producto (aparece al seleccionar proveedor) */}
            {provider && (
              <div>
                <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                  <Package size={12} className="inline mr-1" />Producto del Trailer
                </label>
                {products.length === 0
                  ? <p className="text-xs text-gray-400 italic">Este proveedor no tiene productos registrados. Agrégalos en Configuración.</p>
                  : <div className="flex flex-wrap gap-2">
                      {products.map((pr) => (
                        <button key={pr} onClick={() => setProduct(pr)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                            product === pr
                              ? 'bg-[#2563c4] border-[#2563c4] text-white'
                              : 'border-[#8fa3b1]/40 dark:border-[#8fa3b1]/30 text-gray-700 dark:text-gray-300'
                          }`}>
                          {pr}
                        </button>
                      ))}
                    </div>
                }
              </div>
            )}

            {/* 4. PO + QR */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                Orden de Compra (PO) — opcional
              </label>
              <div className="flex gap-2">
                <input type="text" value={po} onChange={(e) => setPo(e.target.value)}
                  placeholder="Ej. PO-2024-001"
                  className="flex-1 rounded-xl border-2 border-[#8fa3b1]/40 dark:border-[#8fa3b1]/30 bg-transparent px-4 py-3 text-sm focus:border-[#1a3a8f] outline-none" />
                <button onClick={() => setShowQR(true)}
                  className="touch-target px-4 rounded-xl bg-[#1a3a8f]/10 dark:bg-[#8fa3b1]/10 text-[#1a3a8f] dark:text-[#8fa3b1] flex items-center gap-1 text-sm font-medium">
                  <QrCode size={18} /> QR
                </button>
              </div>
            </div>

            {/* 5. Personal */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                <Users size={12} className="inline mr-1" />Personal Asignado ({selected.length})
              </label>
              {workers.length === 0
                ? <p className="text-sm text-gray-400 italic">No hay personal registrado. Agrégalo en Configuración.</p>
                : <div className="flex flex-wrap gap-2">
                    {workers.map((w) => (
                      <button key={w.id} onClick={() => toggleWorker(w.name)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                          selected.includes(w.name)
                            ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white'
                            : 'border-[#8fa3b1]/40 dark:border-[#8fa3b1]/30 text-gray-700 dark:text-gray-300'
                        }`}>
                        {w.name}
                      </button>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Footer fijo */}
          <div className="px-5 pb-6 pt-3 border-t border-[#8fa3b1]/20 shrink-0">
            {!canSave && (
              <p className="text-xs text-[#8fa3b1] text-center mb-2">
                Selecciona nave, proveedor, producto y al menos un operador
              </p>
            )}
            <button onClick={handleSave} disabled={!canSave}
              className="touch-target w-full rounded-xl text-white font-bold text-base py-4 disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: canSave ? 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' : undefined, backgroundColor: !canSave ? '#8fa3b1' : undefined }}>
              Iniciar Descarga
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
