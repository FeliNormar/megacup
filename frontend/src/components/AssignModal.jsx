import React, { useState } from 'react'
import { X, QrCode, Users, Package } from 'lucide-react'
import QRScanner from './QRScanner'

export default function AssignModal({ nave, workers, providers, onSave, onClose }) {
  const [provider, setProvider] = useState('')
  const [product,  setProduct]  = useState('')
  const [po,       setPo]       = useState('')
  const [selected, setSelected] = useState([])
  const [showQR,   setShowQR]   = useState(false)

  const selectedProvider = providers.find((p) => p.name === provider)
  const products = selectedProvider?.products || []

  const toggleWorker = (name) =>
    setSelected((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])

  const handleQR = ({ provider: p, po: o, product: pr }) => {
    if (p)  setProvider(p)
    if (o)  setPo(o)
    if (pr) setProduct(pr)
    setShowQR(false)
  }

  const canSave = provider && selected.length > 0

  return (
    <>
      {showQR && <QRScanner onResult={handleQR} onClose={() => setShowQR(false)} />}

      <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center">
        <div className="w-full sm:max-w-md bg-white dark:bg-[#162050] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#8fa3b1]/20 sticky top-0 bg-white dark:bg-[#162050] z-10">
            <span className="font-bold text-lg text-[#1a3a8f] dark:text-white">Nave {nave?.name} — Asignar Trailer</span>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a3a8f]/30">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5">

            {/* Proveedor */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">Proveedor</label>
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

            {/* Producto */}
            {products.length > 0 && (
              <div>
                <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                  <Package size={12} className="inline mr-1" />Producto
                </label>
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}

            {/* PO + QR */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">Orden de Compra (PO)</label>
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

            {/* Personal */}
            <div>
              <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                <Users size={12} className="inline mr-1" />Personal ({selected.length} seleccionados)
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

            <button onClick={() => canSave && onSave({ provider, product, po, workers: selected })}
              disabled={!canSave}
              className="touch-target w-full rounded-xl bg-[#1a3a8f] text-white font-bold text-base py-3 disabled:opacity-40 active:scale-95 transition-transform">
              Confirmar Asignación
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
