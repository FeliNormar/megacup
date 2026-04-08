import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, Package, Truck, Users, Trash2, Pencil, X, Camera } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'
import { fmtElapsed } from '../utils/time'
import { supabase } from '../utils/supabase'

export default function NaveCard({ nave, assignment, isWorker, isAdmin, providers, workers, naves, onFinish, onIncident, onDelete, onEdit }) {  const [confirmAction,  setConfirmAction]  = useState(null)
  const [showEdit,       setShowEdit]       = useState(false)
  const [showDelConfirm, setShowDelConfirm] = useState(false)
  const [showIncident,   setShowIncident]   = useState(false)
  const [showFinish,     setShowFinish]     = useState(false)
  const elapsed = useTimer(assignment.id, assignment.startTime)

  const handleFinish = (cajasReales) => {
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100])
    onFinish(cajasReales)
    setConfirmAction(null)
  }

  return (
    <div className="rounded-2xl shadow-lg border border-[#8fa3b1]/20 bg-white dark:bg-[#162050] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-white/80" />
          <span className="text-white font-black text-lg tracking-tight">Nave {nave.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setShowEdit(true)} className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/20">
                <Pencil size={14} />
              </button>
              <button onClick={() => setShowDelConfirm(true)} className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-red-500/60">
                <Trash2 size={14} />
              </button>
            </>
          )}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-1">
            <Clock size={14} className="text-white/80" />
            <span className="text-white font-mono font-bold text-sm">{fmtElapsed(elapsed)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <InfoRow icon={<Package size={14} />} label="Proveedor" value={assignment.provider} />
        <InfoRow icon={<Package size={14} />} label="Producto"  value={assignment.product}  />
        {assignment.po && <InfoRow icon={<Package size={14} />} label="PO" value={assignment.po} />}
        {assignment.tipoCarga && <InfoRow icon={<Package size={14} />} label="Tipo" value={assignment.tipoCarga} />}
        {assignment.cajasEstimadas && <InfoRow icon={<Package size={14} />} label="Cajas est." value={String(assignment.cajasEstimadas)} />}
        {assignment.workers?.length > 0 && <InfoRow icon={<Users size={14} />} label="Personal" value={assignment.workers.join(', ')} />}

        {/* Botones WhatsApp — solo admin */}
        {isAdmin && assignment.workers?.length > 0 && (
          <WhatsAppButtons assignment={assignment} workers={workers} />
        )}
      </div>

      {!isWorker && (
        <div className="px-4 pb-4">
          {confirmAction === 'finish' ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
              <button onClick={() => setShowFinish(true)} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#ec4899]">Confirmar fin</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowIncident(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold border-2 border-[#dc2626] text-[#dc2626]">
                <AlertTriangle size={15} /> Incidencia
              </button>
              <button onClick={() => setConfirmAction('finish')} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white bg-[#ec4899]">
                <CheckCircle size={15} /> Finalizar
              </button>
            </div>
          )}
        </div>
      )}

      {showDelConfirm && (
        <ConfirmDeleteModal
          message="Esta descarga está en progreso. ¿Seguro que quieres eliminarla? Esta acción no se puede deshacer."
          onConfirm={() => { onDelete(); setShowDelConfirm(false) }}
          onCancel={() => setShowDelConfirm(false)}
        />
      )}

      {showEdit && (
        <EditModal
          assignment={assignment}
          providers={providers}
          workers={workers}
          naves={naves}
          onSave={(changes) => { onEdit(changes); setShowEdit(false) }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showIncident && (
        <IncidentModal
          assignment={assignment}
          onConfirm={(fotoUrl) => { onIncident(fotoUrl); setShowIncident(false) }}
          onClose={() => setShowIncident(false)}
        />
      )}

      {showFinish && (
        <FinishModal
          assignment={assignment}
          onConfirm={(cajasReales) => { handleFinish(cajasReales); setShowFinish(false) }}
          onClose={() => { setShowFinish(false); setConfirmAction(null) }}
        />
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[#8fa3b1]">{icon}</span>
      <span className="text-[#8fa3b1] font-medium w-20 shrink-0">{label}:</span>
      <span className="text-slate-800 dark:text-white font-semibold truncate">{value}</span>
    </div>
  )
}

function ConfirmDeleteModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-red-500 shrink-0" />
          <p className="text-sm text-slate-700 dark:text-white">{message}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#dc2626]">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

function IncidentModal({ assignment, onConfirm, onClose }) {
  const [foto,     setFoto]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleConfirm = async () => {
    let fotoUrl = null
    if (foto) {
      setUploading(true)
      try {
        const fileName = `${assignment.id}-${Date.now()}.jpg`
        const { data, error } = await supabase.storage.from('incidencias').upload(fileName, foto)
        if (!error && data) {
          const { data: pub } = supabase.storage.from('incidencias').getPublicUrl(fileName)
          fotoUrl = pub.publicUrl
        }
      } catch (err) {
        console.error('Error subiendo foto:', err)
      }
      setUploading(false)
    }
    onConfirm(fotoUrl)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-red-500">Registrar Incidencia</h3>
          <button onClick={onClose}><X size={18} className="text-[#8fa3b1]" /></button>
        </div>

        {/* Foto opcional */}
        <div>
          <p className="text-xs text-[#8fa3b1] font-semibold uppercase mb-2">Foto (opcional)</p>
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-[#8fa3b1]/30" />
              <button onClick={() => { setFoto(null); setPreview(null) }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                <X size={11} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-2 rounded-xl border-2 border-dashed border-[#8fa3b1]/40 text-[#8fa3b1] text-xs hover:border-[#1a3a8f]">
              <Camera size={15} />
              Adjuntar foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
          <button onClick={handleConfirm} disabled={uploading}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#dc2626] disabled:opacity-60">
            {uploading ? 'Subiendo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ assignment, providers, workers, naves, onSave, onClose }) {
  const [provider,   setProvider]   = useState(assignment.provider  || '')
  const [product,    setProduct]    = useState(assignment.product   || '')
  const [po,         setPo]         = useState(assignment.po        || '')
  const [selWorkers, setSelWorkers] = useState(assignment.workers   || [])
  const [naveId,     setNaveId]     = useState(assignment.naveId    || '')

  const toggleWorker = (name) =>
    setSelWorkers((prev) => prev.includes(name) ? prev.filter((w) => w !== name) : [...prev, name])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base">Editar Descarga</h3>
          <button onClick={onClose}><X size={18} className="text-[#8fa3b1]" /></button>
        </div>

        <label className="block text-xs text-[#8fa3b1] font-semibold uppercase">Nave</label>
        <select value={naveId} onChange={(e) => setNaveId(e.target.value)}
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none">
          {(naves || []).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>

        <label className="block text-xs text-[#8fa3b1] font-semibold uppercase">Proveedor</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none">
          <option value="">Seleccionar...</option>
          {(providers || []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>

        <label className="block text-xs text-[#8fa3b1] font-semibold uppercase">Producto</label>
        <input value={product} onChange={(e) => setProduct(e.target.value)}
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />

        <label className="block text-xs text-[#8fa3b1] font-semibold uppercase">PO</label>
        <input value={po} onChange={(e) => setPo(e.target.value)}
          className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2 text-sm focus:border-[#1a3a8f] outline-none" />

        <label className="block text-xs text-[#8fa3b1] font-semibold uppercase">Personal</label>
        <div className="flex flex-wrap gap-2">
          {(workers || []).map((w) => (
            <button key={w.id} onClick={() => toggleWorker(w.name)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors ${
                selWorkers.includes(w.name) ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white' : 'border-[#8fa3b1]/40 text-[#8fa3b1]'
              }`}>
              {w.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
          <button onClick={() => onSave({ provider, product, po, workers: selWorkers, naveId })}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#1a3a8f]">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function FinishModal({ assignment, onConfirm, onClose }) {
  const [cajasReales, setCajasReales] = useState(
    assignment.cajasEstimadas ? String(assignment.cajasEstimadas) : ''
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#ec4899]">Finalizar Descarga</h3>
          <button onClick={onClose}><X size={18} className="text-[#8fa3b1]" /></button>
        </div>

        {assignment.tipoCarga && (
          <p className="text-xs text-[#8fa3b1]">Tipo de carga: <span className="font-semibold text-slate-700 dark:text-white">{assignment.tipoCarga}</span></p>
        )}
        {assignment.cajasEstimadas && (
          <p className="text-xs text-[#8fa3b1]">Cajas estimadas: <span className="font-semibold text-slate-700 dark:text-white">{assignment.cajasEstimadas}</span></p>
        )}

        <div>
          <label className="block text-xs text-[#8fa3b1] font-semibold uppercase mb-1">
            Cajas reales descargadas
          </label>
          <input
            type="number" min="0"
            value={cajasReales}
            onChange={(e) => setCajasReales(e.target.value)}
            placeholder="Ej. 185"
            className="w-full rounded-xl border-2 border-[#8fa3b1]/30 bg-transparent px-3 py-2.5 text-sm focus:border-[#ec4899] outline-none"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
          <button
            onClick={() => onConfirm(cajasReales ? Number(cajasReales) : null)}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#ec4899]"
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}

function WhatsAppButtons({ assignment, workers }) {
  const assigned = (assignment.workers || [])
    .map((name) => workers?.find((w) => w.name === name))
    .filter((w) => w?.phone)

  if (assigned.length === 0) return null

  const buildMsg = (workerName) => {
    const lines = [
      `Buenos días ${workerName} 👋`,
      `Te han asignado un trailer:`,
      `🏭 Nave: ${assignment.naveName || assignment.naveId}`,
      `📦 Proveedor: ${assignment.provider || '—'}`,
      `🛒 Producto: ${assignment.product || '—'}`,
      assignment.po ? `📋 PO: ${assignment.po}` : null,
      assignment.tipoCarga ? `⚖️ Tipo: ${assignment.tipoCarga}` : null,
      assignment.cajasEstimadas ? `📦 Cajas est.: ${assignment.cajasEstimadas}` : null,
      `👥 Equipo: ${(assignment.workers || []).join(', ')}`,
    ].filter(Boolean).join('\n')
    return encodeURIComponent(lines)
  }

  return (
    <div className="pt-1 space-y-1">
      <p className="text-xs text-[#8fa3b1] font-semibold uppercase tracking-wide">Notificar por WhatsApp</p>
      <div className="flex flex-wrap gap-2">
        {assigned.map((w) => (
          <a
            key={w.id}
            href={`https://wa.me/${w.phone}?text=${buildMsg(w.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {w.name}
          </a>
        ))}
      </div>
    </div>
  )
}
