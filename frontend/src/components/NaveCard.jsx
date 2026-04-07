import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, Package, Truck, Users, Trash2, Pencil, X } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'
import { fmtElapsed } from '../utils/time'

export default function NaveCard({ nave, assignment, isWorker, isAdmin, providers, workers, naves, onFinish, onIncident, onDelete, onEdit }) {
  const [confirmAction, setConfirmAction] = useState(null)
  const [showEdit,      setShowEdit]      = useState(false)
  const [showDelConfirm, setShowDelConfirm] = useState(false)
  const elapsed = useTimer(assignment.id, assignment.startTime)

  const handleConfirm = () => {
    if (confirmAction === 'finish')   onFinish()
    if (confirmAction === 'incident') onIncident()
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
        {assignment.workers?.length > 0 && <InfoRow icon={<Users size={14} />} label="Personal" value={assignment.workers.join(', ')} />}
      </div>

      {!isWorker && (
        <div className="px-4 pb-4">
          {confirmAction ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
              <button onClick={handleConfirm} className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white ${confirmAction === 'finish' ? 'bg-[#ec4899]' : 'bg-[#dc2626]'}`}>
                {confirmAction === 'finish' ? 'Confirmar fin' : 'Confirmar incidencia'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction('incident')} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold border-2 border-[#dc2626] text-[#dc2626]">
                <AlertTriangle size={15} /> Incidencia
              </button>
              <button onClick={() => setConfirmAction('finish')} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white bg-[#ec4899]">
                <CheckCircle size={15} /> Finalizar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {showDelConfirm && (
        <ConfirmDeleteModal
          message={`Esta descarga está en progreso. ¿Seguro que quieres eliminarla? Esta acción no se puede deshacer.`}
          onConfirm={() => { onDelete(); setShowDelConfirm(false) }}
          onCancel={() => setShowDelConfirm(false)}
        />
      )}

      {/* Modal editar */}
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

function EditModal({ assignment, providers, workers, naves, onSave, onClose }) {
  const [provider,  setProvider]  = useState(assignment.provider  || '')
  const [product,   setProduct]   = useState(assignment.product   || '')
  const [po,        setPo]        = useState(assignment.po        || '')
  const [selWorkers, setSelWorkers] = useState(assignment.workers || [])
  const [naveId,    setNaveId]    = useState(assignment.naveId    || '')

  const toggleWorker = (name) => {
    setSelWorkers((prev) =>
      prev.includes(name) ? prev.filter((w) => w !== name) : [...prev, name]
    )
  }

  const handleSave = () => {
    const changes = { provider, product, po, workers: selWorkers, naveId }
    onSave(changes)
  }

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
                selWorkers.includes(w.name)
                  ? 'bg-[#1a3a8f] border-[#1a3a8f] text-white'
                  : 'border-[#8fa3b1]/40 text-[#8fa3b1]'
              }`}>
              {w.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-[#8fa3b1]/40 text-[#8fa3b1]">Cancelar</button>
          <button onClick={handleSave} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#1a3a8f]">Guardar</button>
        </div>
      </div>
    </div>
  )
}