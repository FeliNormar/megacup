/**
 * TrailerCierreModal
 * Registra las cajas del trailer al cierre del día.
 * Las cajas se dividen equitativamente entre los grupos activos del día.
 */
import { useState, useMemo } from 'react'
import { X, Truck, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { PESO_FACTORES } from '../utils/productividad'
import { fmtTime } from '../utils/time'

export default function TrailerCierreModal({ records = [], workers = [], trailersCierre = [], onSave, onClose }) {
  const [cajasTrailer,  setCajasTrailer]  = useState('')
  const [tipoCarga,     setTipoCarga]     = useState('Ligero')
  const [gruposActivos, setGruposActivos] = useState([])
  const [showHistorial, setShowHistorial] = useState(false)

  // Operadores que participaron hoy
  const operadoresHoy = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoyTs = hoy.getTime()
    const nombres = new Set(
      records
        .filter((r) => r.startTime >= hoyTs)
        .flatMap((r) => r.workers || [])
    )
    return [...nombres]
  }, [records])

  // Si no hay operadores hoy, mostrar todos los workers como fallback
  const listaOperadores = operadoresHoy.length > 0
    ? operadoresHoy
    : workers.map((w) => w.name)

  const toggleGrupo = (name) =>
    setGruposActivos((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )

  const cajas     = parseInt(cajasTrailer) || 0
  const numGrupos = gruposActivos.length
  const cajasPorGrupo = numGrupos > 0 && cajas > 0
    ? Math.round(cajas / numGrupos)
    : 0
  const factor    = PESO_FACTORES[tipoCarga] ?? 1.0
  const puntosXGrupo = Math.round(cajasPorGrupo * factor)

  const canSave = cajas > 0 && numGrupos > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      cajasTrailer:  cajas,
      tipoCarga,
      gruposActivos,
      cajasPorGrupo,
      puntosXGrupo,
      timestamp:     Date.now(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#162050] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#8fa3b1]/20 shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-[#1a3a8f] dark:text-[#8fa3b1]" />
            <span className="font-bold text-lg text-[#1a3a8f] dark:text-white">Cierre de Trailer</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#1a3a8f]/30">
            <X size={18} className="text-[#8fa3b1]" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Cajas totales del trailer */}
          <div>
            <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
              Total de cajas del trailer
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCajasTrailer((v) => String(Math.max(0, (parseInt(v) || 0) - 10)))}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <Minus size={16} />
              </button>
              <input
                type="number" min="0"
                value={cajasTrailer}
                onChange={(e) => setCajasTrailer(e.target.value)}
                placeholder="Ej. 400"
                className="flex-1 rounded-xl border-2 border-[#8fa3b1]/40 bg-transparent px-4 py-3 text-center text-lg font-bold focus:border-[#1a3a8f] outline-none"
              />
              <button
                onClick={() => setCajasTrailer((v) => String((parseInt(v) || 0) + 10))}
                className="w-10 h-10 rounded-full bg-[#1a3a8f] flex items-center justify-center text-white"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Tipo de carga */}
          <div>
            <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
              Tipo de carga
            </label>
            <div className="flex gap-2">
              {Object.keys(PESO_FACTORES).map((t) => (
                <button key={t} onClick={() => setTipoCarga(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    tipoCarga === t
                      ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white'
                      : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#8fa3b1] mt-1">Factor: ×{factor}</p>
          </div>

          {/* Grupos que participaron */}
          <div>
            <label className="block text-xs font-bold mb-2 text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
              Grupos que participaron hoy
            </label>
            <p className="text-xs text-[#8fa3b1] mb-2">
              Las cajas se dividen entre los grupos seleccionados.
            </p>
            <div className="flex flex-wrap gap-2">
              {listaOperadores.map((name) => (
                <button key={name} onClick={() => toggleGrupo(name)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                    gruposActivos.includes(name)
                      ? 'bg-[#2563c4] border-[#2563c4] text-white'
                      : 'border-[#8fa3b1]/40 text-gray-700 dark:text-gray-300'
                  }`}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa del reparto */}
          {canSave && (
            <div className="rounded-xl bg-[#1a3a8f]/5 dark:bg-[#1a3a8f]/20 border border-[#1a3a8f]/20 p-4 space-y-2">
              <p className="text-xs font-bold text-[#1a3a8f] dark:text-[#8fa3b1] uppercase tracking-wide">
                Vista previa del reparto
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {cajas} cajas ÷ {numGrupos} grupos = <span className="font-bold text-slate-800 dark:text-white">{cajasPorGrupo} cajas por grupo</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {cajasPorGrupo} cajas × {factor} ({tipoCarga}) = <span className="font-bold text-[#ec4899]">{puntosXGrupo} pts por grupo</span>
              </p>
              <div className="pt-1 space-y-1">
                {gruposActivos.map((name) => (
                  <div key={name} className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300">{name}</span>
                    <span className="font-bold text-slate-800 dark:text-white">+{cajasPorGrupo} cajas · +{puntosXGrupo} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Historial de trailers registrados */}
          {trailersCierre.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistorial((v) => !v)}
                className="w-full flex items-center justify-between text-xs text-[#8fa3b1] font-semibold py-2"
              >
                <span>📋 Trailers registrados ({trailersCierre.length})</span>
                {showHistorial ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showHistorial && (
                <div className="space-y-2 mt-1">
                  {trailersCierre.map((t) => (
                    <div key={t.id} className="rounded-xl bg-slate-50 dark:bg-[#1a3a8f]/10 px-3 py-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700 dark:text-white">
                          {t.cajasTrailer} cajas · {t.tipoCarga}
                        </span>
                        <span className="text-[#8fa3b1]">{fmtTime(t.timestamp)}</span>
                      </div>
                      <p className="text-[#8fa3b1] mt-0.5">
                        {t.gruposActivos?.join(', ')} · {t.cajasPorGrupo} c/grupo · {t.puntosXGrupo} pts/grupo
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-[#8fa3b1]/20 shrink-0 space-y-2">
          {!canSave && (
            <p className="text-xs text-[#8fa3b1] text-center">
              Ingresa las cajas y selecciona al menos un grupo
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 rounded-xl py-3 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!canSave}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
              style={{ background: canSave ? 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' : '#8fa3b1' }}>
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
