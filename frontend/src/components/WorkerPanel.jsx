import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { fmtTime, fmtDuration } from '../utils/time'

async function clearCacheAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    localStorage.removeItem('app_version')
  } catch (e) {
    console.warn(e)
  }
  window.location.reload()
}

export default function WorkerPanel({ records = [], workerName }) {
  // Solo registros donde participó este operador
  const myRecords = useMemo(() =>
    records
      .filter((r) => r.workers?.includes(workerName) && r.endTime && r.startTime)
      .sort((a, b) => b.startTime - a.startTime)
  , [records, workerName])

  // Agrupar por día
  const byDay = useMemo(() => {
    const map = {}
    myRecords.forEach((r) => {
      const day = new Date(r.startTime).toLocaleDateString('es-MX', {
        weekday: 'long', day: '2-digit', month: 'short', year: 'numeric'
      })
      if (!map[day]) map[day] = []
      map[day].push(r)
    })
    return Object.entries(map)
  }, [myRecords])

  const totalCajas = myRecords.reduce((acc, r) => {
    const esDesc  = r.descargadores?.includes(workerName)
    const esEstib = r.estibadores?.includes(workerName)
    if (esDesc  && r.cajasXDescargador) return acc + r.cajasXDescargador
    if (esEstib && r.cajasXEstibador)   return acc + r.cajasXEstibador
    // Fallback: si no tiene roles específicos pero tiene cajas reales, divide entre todos
    if (!esDesc && !esEstib && r.cajasReales && r.workers?.length > 0) {
      return acc + Math.round(r.cajasReales / r.workers.length)
    }
    return acc
  }, 0)

  const totalDescargas = myRecords.length
  const totalHoras     = myRecords.reduce((acc, r) => acc + (r.endTime - r.startTime), 0)

  return (
    <div className="space-y-4 pb-8">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Descargas" value={totalDescargas} />
        <StatCard label="Horas totales" value={fmtDuration(totalHoras)} />
        <StatCard label="Cajas totales" value={totalCajas || '—'} />
      </div>

      {byDay.length === 0 ? (
        <div className="text-center py-12 text-[#8fa3b1]">
          <div className="text-4xl mb-2">📦</div>
          <p>Sin descargas registradas aún</p>
        </div>
      ) : (
        byDay.map(([day, recs]) => (
          <div key={day} className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
            <div className="px-4 py-2 bg-[#1a3a8f]/10 dark:bg-[#1a3a8f]/20">
              <p className="text-xs font-bold text-[#1a3a8f] dark:text-[#8fa3b1] capitalize">{day}</p>
            </div>
            <div className="divide-y divide-[#8fa3b1]/10">
              {recs.map((r) => {
                const esDesc  = r.descargadores?.includes(workerName)
                const esEstib = r.estibadores?.includes(workerName)
                const rol     = esDesc && esEstib ? 'Desc + Estib'
                              : esDesc  ? 'Descargador'
                              : esEstib ? 'Estibador'
                              : 'Operador'
                const cajas   = esDesc  && r.cajasXDescargador ? r.cajasXDescargador
                              : esEstib && r.cajasXEstibador   ? r.cajasXEstibador
                              : (!esDesc && !esEstib && r.cajasReales && r.workers?.length > 0)
                                ? Math.round(r.cajasReales / r.workers.length)
                              : null

                return (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-[#1a3a8f] dark:text-white">
                        Nave {r.naveName || r.naveId}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        r.status === 'finished' ? 'bg-pink-100 text-pink-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {r.status === 'finished' ? 'Terminado' : 'Incidencia'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#8fa3b1]">
                      <span>🕐 {fmtTime(r.startTime)}</span>
                      <span>⏱ {fmtDuration(r.endTime - r.startTime)}</span>
                      <span>🏭 {r.provider}</span>
                      <span className="font-semibold text-[#2563c4]">🎯 {rol}</span>
                      {cajas && <span className="font-bold text-slate-700 dark:text-white">📦 {cajas} cajas</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Botón limpiar caché */}
      <button
        onClick={clearCacheAndReload}
        className="w-full rounded-xl border border-orange-400 text-orange-500 font-semibold text-sm flex items-center justify-center gap-2 py-3"
      >
        <RefreshCw size={15} /> ¿No ves tus datos? Limpiar caché
      </button>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-[#162050] rounded-2xl p-3 shadow border border-[#8fa3b1]/20 text-center">
      <p className="text-xs text-[#8fa3b1] mb-1">{label}</p>
      <p className="font-bold text-sm text-slate-800 dark:text-white">{value}</p>
    </div>
  )
}
