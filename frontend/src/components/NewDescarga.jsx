import { useState } from 'react'
import { X, QrCode, Users, Package, Warehouse, Calendar, Plus, Minus } from 'lucide-react'
import QRScanner from './QRScanner'
import { fmtDateTime } from '../utils/time'

// Normaliza producto — puede ser string (legacy) u objeto nuevo
const normProd = (p) => typeof p === 'string'
  ? { id: p, nombre: p, sku: '', tipo: 'Ligero' }
  : { id: p.id || p.nombre, nombre: p.nombre, sku: p.sku || '', tipo: p.tipo || 'Ligero' }

export default function NewDescarga({ naves, workers, providers, activeNaveIds, adminCred, onSave, onClose, inline }) {
  const [naveId,        setNaveId]        = useState('')
  const [provider,      setProvider]      = useState('')
  const [product,       setProduct]       = useState('')
  const [po,            setPo]            = useState('')
  const [descargadores, setDescargadores] = useState([])
  const [estibadores,   setEstibadores]   = useState([])
  const [showQR,        setShowQR]        = useState(false)
  const [tipoCarga,     setTipoCarga]     = useState('')
  const [cajasEst,      setCajasEst]      = useState('')
  const [manifiesto,    setManifiesto]    = useState([]) // [{productoId, nombre, sku, tipo, cantidadEsperada}]
  const [deviceTime]                      = useState(() => Date.now())

  const allWorkers = adminCred?.username
    ? [{ id: 'admin', name: adminCred.username }, ...workers]
    : workers

  const availableNaves = naves.filter((n) => !activeNaveIds.includes(n.id))
  const selProvider    = providers.find((p) => p.name === provider)
  const products       = (selProvider?.products || []).map(normProd)

  const toggleDesc  = (name) => setDescargadores((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])
  const toggleEstib = (name) => setEstibadores((p)   => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])

  // Manifiesto helpers
  const addToManifiesto = (prod) => {
    setManifiesto(prev => {
      const exists = prev.find(m => m.productoId === prod.id)
      if (exists) return prev.map(m => m.productoId === prod.id ? { ...m, cantidadEsperada: m.cantidadEsperada + 1 } : m)
      return [...prev, { productoId: prod.id, nombre: prod.nombre, sku: prod.sku, tipo: prod.tipo, cantidadEsperada: 1 }]
    })
  }
  const updateCantidad = (productoId, val) => {
    const n = parseInt(val) || 0
    if (n <= 0) setManifiesto(prev => prev.filter(m => m.productoId !== productoId))
    else setManifiesto(prev => prev.map(m => m.productoId === productoId ? { ...m, cantidadEsperada: n } : m))
  }
  const removeFromManifiesto = (productoId) => setManifiesto(prev => prev.filter(m => m.productoId !== productoId))

  const handleQR = ({ provider: p, po: o, product: pr }) => {
    if (p)  setProvider(p)
    if (o)  setPo(o)
    if (pr) setProduct(pr)
    setShowQR(false)
  }

  const totalPersonal = [...new Set([...descargadores, ...estibadores])]
  // product puede venir del manifiesto o selección directa
  const hasProduct = product || manifiesto.length > 0
  const canSave = naveId && provider && hasProduct && totalPersonal.length > 0 && tipoCarga

  const handleSave = () => {
    if (!canSave) return
    const nave = naves.find((n) => n.id === naveId)
    // Si no hay producto seleccionado directamente, usar el primer item del manifiesto
    const productName = product || manifiesto[0]?.nombre || ''
    onSave({
      naveId,
      naveName:       nave?.name || naveId,
      provider,
      product:        productName,
      po,
      workers:        totalPersonal,
      descargadores,
      estibadores,
      tipoCarga,
      cajasEstimadas: cajasEst ? Number(cajasEst) : null,
      manifiesto:     manifiesto.length > 0 ? manifiesto : null,
    })
  }

  const btnBase = 'px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors'

  const formContent = (
    <>
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
                  className={`${btnBase} ${naveId === n.id ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'}`}>
                  Nave {n.name}
                </button>
              ))}
            </div>
        }
      </div>

      {/* 2. Proveedor */}
      <div>
        <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">Proveedor</label>
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <button key={p.id} onClick={() => { setProvider(p.name); setProduct('') }}
              className={`${btnBase} ${provider === p.name ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Producto principal + Manifiesto */}
      {provider && (
        <div className="space-y-3">
          <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
            <Package size={12} className="inline mr-1" />Productos del Tráiler
          </label>
          {products.length === 0
            ? <p className="text-xs text-gray-400 italic">Sin productos. Agrégalos en Configuración.</p>
            : <>
                {/* Catálogo — toca para agregar al manifiesto */}
                <div className="flex flex-wrap gap-2">
                  {products.map((pr) => {
                    const inManif = manifiesto.find(m => m.productoId === pr.id)
                    return (
                      <button key={pr.id} onClick={() => { addToManifiesto(pr); setProduct(pr.nombre) }}
                        className={`${btnBase} flex items-center gap-1 ${inManif ? 'bg-[#2563c4] border-[#2563c4] text-white' : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'}`}>
                        {pr.nombre}
                        {pr.sku && <span className="text-[10px] opacity-70">({pr.sku})</span>}
                        {inManif && <span className="text-[10px] font-bold ml-1">×{inManif.cantidadEsperada}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Manifiesto — cantidades esperadas */}
                {manifiesto.length > 0 && (
                  <div className="rounded-xl border border-[#8fa3b1]/20 overflow-hidden">
                    <div className="px-3 py-2 bg-[#1a3a8f]/5 dark:bg-[#1a3a8f]/20">
                      <p className="text-xs font-bold text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">📋 Manifiesto — Cantidades esperadas</p>
                    </div>
                    <div className="divide-y divide-[#8fa3b1]/10">
                      {manifiesto.map((m) => (
                        <div key={m.productoId} className="flex items-center gap-2 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-white truncate">{m.nombre}</p>
                            {m.sku && <p className="text-[10px] text-slate-400 font-mono">{m.sku}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => updateCantidad(m.productoId, m.cantidadEsperada - 1)}
                              className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                              <Minus size={10} />
                            </button>
                            <input type="number" value={m.cantidadEsperada}
                              onChange={(e) => updateCantidad(m.productoId, e.target.value)}
                              className="w-14 text-center rounded-lg border border-[#8fa3b1]/30 bg-transparent text-sm font-bold outline-none focus:border-[#1a3a8f]" />
                            <button onClick={() => updateCantidad(m.productoId, m.cantidadEsperada + 1)}
                              className="w-6 h-6 rounded-full bg-[#1a3a8f] flex items-center justify-center text-white">
                              <Plus size={10} />
                            </button>
                            <button onClick={() => removeFromManifiesto(m.productoId)} className="ml-1 text-red-400">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
          }
        </div>
      )}

      {/* 4. PO + QR */}
      <div>
        <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">PO — opcional</label>
        <div className="flex gap-2">
          <input type="text" value={po} onChange={(e) => setPo(e.target.value)} placeholder="Ej. PO-2024-001"
            className="flex-1 rounded-xl border-2 border-[#8fa3b1]/40 bg-transparent px-4 py-3 text-sm focus:border-[#1a3a8f] outline-none" />
          <button onClick={() => setShowQR(true)}
            className="touch-target px-4 rounded-xl bg-[#1a3a8f]/10 text-[#1a3a8f] dark:text-[#8fa3b1] flex items-center gap-1 text-sm font-medium">
            <QrCode size={18} /> QR
          </button>
        </div>
      </div>

      {/* 5. Descargadores */}
      <div>
        <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
          <Users size={12} className="inline mr-1" />Descargadores ({descargadores.length})
        </label>
        <div className="flex flex-wrap gap-2">
          {allWorkers.map((w) => (
            <button key={w.id} onClick={() => toggleDesc(w.name)}
              className={`${btnBase} ${descargadores.includes(w.name) ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'}`}>
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Estibadores */}
      <div>
        <label className="block text-xs font-bold mb-2 text-[#2563c4] dark:text-[#8fa3b1] uppercase tracking-wide">
          🏗️ Estibadores ({estibadores.length})
        </label>
        <div className="flex flex-wrap gap-2">
          {allWorkers.map((w) => (
            <button key={w.id} onClick={() => toggleEstib(w.name)}
              className={`${btnBase} ${estibadores.includes(w.name) ? 'bg-[#2563c4] border-[#2563c4] text-white' : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'}`}>
              {w.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#8fa3b1] mt-1">Un operario puede estar en ambos roles.</p>
      </div>

      {/* 7. Tipo de carga */}
      <div>
        <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">Tipo de Carga</label>
        <div className="flex gap-2">
          {['Ligero', 'Semi pesado', 'Pesado'].map((t) => (
            <button key={t} onClick={() => setTipoCarga(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${tipoCarga === t ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 8. Cajas estimadas */}
      <div>
        <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">Cajas Estimadas — opcional</label>
        <input type="number" min="0" value={cajasEst} onChange={(e) => setCajasEst(e.target.value)} placeholder="Ej. 200"
          className="w-full rounded-xl border-2 border-[#8fa3b1]/40 bg-transparent px-4 py-3 text-sm focus:border-[#1a3a8f] outline-none" />
      </div>
    </>
  )

  const footer = (
    <>
      {!canSave && <p className="text-xs text-[#8fa3b1] text-center mb-2">Selecciona nave, proveedor, producto, tipo de carga y al menos un operador</p>}
      <button onClick={handleSave} disabled={!canSave}
        className="touch-target w-full rounded-xl text-white font-bold text-base py-4 disabled:opacity-40 active:scale-95 transition-transform"
        style={{ background: canSave ? 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' : '#8fa3b1' }}>
        Iniciar Descarga
      </button>
    </>
  )

  if (inline) {
    return (
      <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20">
        {showQR && <QRScanner onResult={handleQR} onClose={() => setShowQR(false)} />}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#8fa3b1]/20">
          <span className="font-bold text-lg text-[#1a3a8f] dark:text-white">Nueva Descarga</span>
          <div className="flex items-center gap-1 text-xs text-[#8fa3b1]">
            <Calendar size={12} /><span>{fmtDateTime(deviceTime)}</span>
          </div>
        </div>
        <div className="p-5 space-y-5">{formContent}</div>
        <div className="px-5 pb-6 pt-3 border-t border-[#8fa3b1]/20">{footer}</div>
      </div>
    )
  }

  return (
    <>
      {showQR && <QRScanner onResult={handleQR} onClose={() => setShowQR(false)} />}
      <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
        <div className="w-full sm:max-w-lg bg-white dark:bg-[#162050] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#8fa3b1]/20 shrink-0">
            <span className="font-bold text-lg text-[#1a3a8f] dark:text-white">Nueva Descarga</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-[#8fa3b1]"><Calendar size={12} /><span>{fmtDateTime(deviceTime)}</span></div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a3a8f]/30"><X size={20} /></button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-5 space-y-5">{formContent}</div>
          <div className="px-5 pb-6 pt-3 border-t border-[#8fa3b1]/20 shrink-0">{footer}</div>
        </div>
      </div>
    </>
  )
}