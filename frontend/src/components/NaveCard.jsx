import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, Package, Truck, Users } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'
import { fmtElapsed } from '../utils/time'

export default function NaveCard({ nave, assignment, isWorker, onFinish, onIncident }) {
  const [confirmAction, setConfirmAction] = useState(null)
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
        <div className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-1">
          <Clock size={14} className="text-white/80" />
          <span className="text-white font-mono font-bold text-sm">{fmtElapsed(elapsed)}</span>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <InfoRow icon={<Package size={14} />} label="Proveedor" value={assignment.provider} />
        <InfoRow icon={<Package size={14} />} label="Producto" value={assignment.product} />
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