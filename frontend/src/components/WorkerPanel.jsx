import { useMemo, useState } from 'react'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { fmtTime, fmtDuration } from '../utils/time'
import {
  calcResumenWorker,
  calcRankingDia,
  recordsDeHoy,
  medallaRanking,
  PESO_FACTORES,
  calcPuntosRecord,
  getCajasWorker,
} from '../utils/productividad'

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

export default function WorkerPanel({ records = [], workerName, trailersCierre = [], assignments = [] }) {
  const [showMetricaDetalle, setShowMetricaDetalle] = useState(false)

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
    if (!esDesc && !esEstib && r.cajasReales && r.workers?.length > 0) {
      return acc + (r.cajasReales / r.workers.length)
    }
    return acc
  }, 0)

  const totalDescargas = myRecords.length
  const totalHoras     = myRecords.reduce((acc, r) => acc + (r.endTime - r.startTime), 0)

  // ── Métricas del día ──────────────────────────────────────────────────────
  const resumenHoy  = useMemo(() => calcResumenWorker(recordsDeHoy(records), workerName, Object.values(assignments)), [records, workerName, assignments])
  const rankingHoy  = useMemo(() => calcRankingDia(records, Object.values(assignments)), [records, assignments])

  // Puntos extra del trailer de hoy para este operador
  const puntosTrailerHoy = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return trailersCierre
      .filter((t) => t.timestamp >= hoy.getTime() && t.gruposActivos?.includes(workerName))
      .reduce((acc, t) => acc + (t.puntosXGrupo || 0), 0)
  }, [trailersCierre, workerName])

  const cajasTrailerHoy = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return trailersCierre
      .filter((t) => t.timestamp >= hoy.getTime() && t.gruposActivos?.includes(workerName))
      .reduce((acc, t) => acc + (t.cajasPorGrupo || 0), 0)
  }, [trailersCierre, workerName])

  const posicion    = rankingHoy.findIndex((r) => r.workerName === workerName)
  const posDisplay  = posicion >= 0 ? posicion + 1 : null
  const totalEquipos = rankingHoy.length

  return (
    <div className="space-y-4 pb-8">
      {/* Resumen histórico */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Descargas" value={totalDescargas} />
        <StatCard label="Horas totales" value={fmtDuration(totalHoras)} />
        <StatCard label="Cajas totales" value={totalCajas || '—'} />
      </div>

      {/* ── Panel de Productividad del Día ── */}
      {resumenHoy.descargas > 0 && (
        <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
            <div>
              <p className="text-white font-black text-base">📊 Productividad Hoy</p>
              <p className="text-white/70 text-xs">Basado en carga normalizada por peso</p>
            </div>
            {posDisplay && (
              <div className="text-center bg-white/15 rounded-xl px-3 py-1.5">
                <p className="text-2xl leading-none">{medallaRanking(posDisplay)}</p>
                <p className="text-white/80 text-[10px] mt-0.5">
                  {posDisplay === 1 ? '¡Líder!' : `${posDisplay} de ${totalEquipos}`}
                </p>
              </div>
            )}
          </div>

          {/* Métricas principales */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-[#8fa3b1]/15">
            <MetricCell label="Pts totales" value={resumenHoy.puntosTotales + puntosTrailerHoy} />
            <MetricCell label="Pts/min" value={resumenHoy.ptsPorMin} highlight />
            <MetricCell label="Cajas hoy" value={resumenHoy.cajasTotales + cajasTrailerHoy} />
          </div>

          {/* Trailer del día */}
          {puntosTrailerHoy > 0 && (
            <div className="px-4 py-2 border-t border-[#8fa3b1]/10 flex items-center justify-between text-xs">
              <span className="text-[#8fa3b1]">🚛 Trailer incluido</span>
              <span className="font-bold text-[#2563c4]">+{cajasTrailerHoy} cajas · +{puntosTrailerHoy} pts</span>
            </div>
          )}

          {/* Ranking del día */}
          {rankingHoy.length > 1 && (
            <div className="px-4 py-3 border-t border-[#8fa3b1]/10">
              <p className="text-xs font-bold text-[#8fa3b1] uppercase tracking-wide mb-2">Ranking del día</p>
              <div className="space-y-1.5">
                {rankingHoy.map((item, idx) => {
                  const esTu = item.workerName === workerName
                  return (
                    <div key={item.workerName}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                        esTu ? 'bg-[#1a3a8f]/10 dark:bg-[#1a3a8f]/30 border border-[#1a3a8f]/30' : ''
                      }`}>
                      <span className="w-6 text-center text-base">{medallaRanking(idx + 1)}</span>
                      <span className={`flex-1 font-semibold ${esTu ? 'text-[#1a3a8f] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                        {item.workerName}{esTu ? ' (tú)' : ''}
                      </span>
                      <div className="text-right">
                        <p className="font-bold text-[#2563c4] dark:text-[#8fa3b1] text-xs">
                          {item.puntosTotalesConTrailer} pts
                        </p>
                        {item.puntosTrailer > 0 && (
                          <p className="text-[10px] text-[#8fa3b1]">🚛 +{item.puntosTrailer}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detalle explicativo — colapsable */}
          <div className="border-t border-[#8fa3b1]/10">
            <button
              onClick={() => setShowMetricaDetalle((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-[#8fa3b1] font-semibold hover:bg-[#8fa3b1]/5"
            >
              <span>¿Cómo se calculan estos números?</span>
              {showMetricaDetalle ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showMetricaDetalle && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  No todas las cargas requieren el mismo esfuerzo. Para comparar equipos de forma justa,
                  cada categoría tiene un factor multiplicador:
                </p>
                <div className="rounded-xl overflow-hidden border border-[#8fa3b1]/20">
                  {Object.entries(PESO_FACTORES).map(([cat, factor]) => (
                    <div key={cat} className="flex items-center justify-between px-3 py-2 border-b border-[#8fa3b1]/10 last:border-0">
                      <span className="text-xs font-semibold text-slate-700 dark:text-white">{cat}</span>
                      <span className="text-xs font-bold text-[#2563c4]">×{factor}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-800 dark:text-white">Fórmula:</span>{' '}
                  Puntos = Cajas × Factor de peso<br />
                  Productividad = Puntos ÷ Minutos trabajados
                </p>
                {/* Desglose por descarga del día */}
                <DesgloseDia records={records} workerName={workerName} />
              </div>
            )}
          </div>
        </div>
      )}

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
                                ? (r.cajasReales / r.workers.length)
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

/** Celda de métrica en la grilla */
function MetricCell({ label, value, highlight }) {
  return (
    <div className="py-3 px-2 text-center">
      <p className="text-[10px] text-[#8fa3b1] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-black text-lg ${highlight ? 'text-[#ec4899]' : 'text-slate-800 dark:text-white'}`}>
        {value}
      </p>
    </div>
  )
}

/** Desglose por descarga del día con puntos explicados */
function DesgloseDia({ records, workerName }) {
  const hoy = useMemo(() => recordsDeHoy(records).filter(
    (r) => r.workers?.includes(workerName) && r.status === 'finished'
  ), [records, workerName])

  if (hoy.length === 0) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-[#8fa3b1] uppercase tracking-wide">Desglose de hoy</p>
      {hoy.map((r) => {
        const tipoCarga = r.tipoCarga || r.tipo_carga || 'Ligero'
        const factor    = PESO_FACTORES[tipoCarga] ?? 1.0
        const cajas     = getCajasWorker(r, workerName)
        const puntos    = calcPuntosRecord(r, workerName)
        const mins      = Math.round((r.endTime - r.startTime) / 60000)
        return (
          <div key={r.id} className="rounded-xl bg-slate-50 dark:bg-[#1a3a8f]/10 px-3 py-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700 dark:text-white">Nave {r.naveName || r.naveId}</span>
              <span className="font-bold text-[#ec4899]">{Math.round(puntos)} pts</span>
            </div>
            <p className="text-[#8fa3b1] mt-0.5">
              {cajas} cajas × {factor} ({tipoCarga}) · {mins} min
            </p>
          </div>
        )
      })}
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
