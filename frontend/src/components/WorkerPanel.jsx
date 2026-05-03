import { useMemo, useState } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, Home, Trophy, Calendar, LogOut } from 'lucide-react'
import { fmtTime, fmtDuration } from '../utils/time'
import {
  calcResumenWorker, calcRankingDia, recordsDeHoy,
  medallaRanking, PESO_FACTORES, calcPuntosRecord, getCajasWorker,
} from '../utils/productividad'
import { esDiaOperativo } from '../config/operacion'
import { startOfWeek, startOfMonth, endOfMonth } from 'date-fns'

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
  } catch (e) { console.warn(e) }
  window.location.reload()
}

function semanaDelMes(dia) {
  if (dia <= 7)  return 1
  if (dia <= 14) return 2
  if (dia <= 21) return 3
  return 4
}

function labelSemana(semana, year, month) {
  const diasEnMes = new Date(year, month, 0).getDate()
  const rangos = [
    'Semana 1 — 1 al 7',
    'Semana 2 — 8 al 14',
    'Semana 3 — 15 al 21',
    'Semana 4 — 22 al ' + diasEnMes,
  ]
  return rangos[semana - 1] || ('Semana ' + semana)
}

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function agruparPorMesYSemana(records) {
  const mapa = {}
  for (const r of records) {
    const d     = new Date(r.startTime)
    const year  = d.getFullYear()
    const month = d.getMonth() + 1
    const dia   = d.getDate()
    const sem   = semanaDelMes(dia)
    const mesKey = year + '-' + String(month).padStart(2,'0')
    if (!mapa[mesKey]) mapa[mesKey] = { year, month, semanas: {} }
    if (!mapa[mesKey].semanas[sem]) mapa[mesKey].semanas[sem] = []
    mapa[mesKey].semanas[sem].push(r)
  }
  return Object.entries(mapa)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { year, month, semanas }]) => ({
      key,
      label: MESES_ES[month - 1] + ' ' + year,
      year, month,
      semanas: Object.entries(semanas)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([sem, recs]) => ({
          semana: Number(sem),
          label:  labelSemana(Number(sem), year, month),
          records: [...recs].sort((a, b) => a.startTime - b.startTime),
        })),
    }))
}
export default function WorkerPanel({ records = [], workerName, trailersCierre = [], assignments = {}, configPuntos, onLogout }) {
  const [tab, setTab] = useState('inicio')
  const [showDetalle, setShowDetalle] = useState(false)
  const now = new Date()

  const descargaActiva = useMemo(() =>
    Object.values(assignments).find((a) => a.status === 'active' && a.workers?.includes(workerName)) ?? null
  , [assignments, workerName])

  const hoyInicio = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime() }, [])
  const semInicio = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }).getTime(), [])
  const mesInicio = useMemo(() => startOfMonth(now).getTime(), [])
  const mesFin    = useMemo(() => endOfMonth(now).getTime(), [])

  const myRecords = useMemo(() =>
    records.filter((r) => r.workers?.includes(workerName) && r.endTime && r.startTime && r.status === 'finished')
  , [records, workerName])

  const descargasHoy    = useMemo(() => myRecords.filter((r) => r.startTime >= hoyInicio).length, [myRecords, hoyInicio])
  const descargasSemana = useMemo(() => myRecords.filter((r) => r.startTime >= semInicio).length, [myRecords, semInicio])
  const descargasMes    = useMemo(() => myRecords.filter((r) => r.startTime >= mesInicio && r.startTime <= mesFin).length, [myRecords, mesInicio, mesFin])
  const cajasHoy        = useMemo(() => myRecords.filter((r) => r.startTime >= hoyInicio).reduce((acc, r) => acc + getCajasWorker(r, workerName), 0), [myRecords, hoyInicio, workerName])
  const cajasSemana     = useMemo(() => myRecords.filter((r) => r.startTime >= semInicio).reduce((acc, r) => acc + getCajasWorker(r, workerName), 0), [myRecords, semInicio, workerName])
  const cajasMes        = useMemo(() => myRecords.filter((r) => r.startTime >= mesInicio && r.startTime <= mesFin).reduce((acc, r) => acc + getCajasWorker(r, workerName), 0), [myRecords, mesInicio, mesFin, workerName])

  const resumenHoy = useMemo(() => calcResumenWorker(recordsDeHoy(records), workerName, Object.values(assignments), configPuntos), [records, workerName, assignments, configPuntos])
  const rankingHoy = useMemo(() => calcRankingDia(records, Object.values(assignments), configPuntos), [records, assignments, configPuntos])

  const puntosTrailerHoy = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return trailersCierre.filter((t) => t.timestamp >= hoy.getTime() && t.gruposActivos?.includes(workerName)).reduce((acc, t) => acc + (t.puntosXGrupo || 0), 0)
  }, [trailersCierre, workerName])

  const cajasTrailerHoy = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return trailersCierre.filter((t) => t.timestamp >= hoy.getTime() && t.gruposActivos?.includes(workerName)).reduce((acc, t) => acc + (t.cajasPorGrupo || 0), 0)
  }, [trailersCierre, workerName])

  const posicionHoy  = rankingHoy.findIndex((r) => r.workerName === workerName)
  const posDisplay   = posicionHoy >= 0 ? posicionHoy + 1 : null
  const totalEquipos = rankingHoy.length

  const recordsMes = useMemo(() =>
    records.filter((r) => r.status === 'finished' && !r.deleted_at && r.startTime >= mesInicio && r.startTime <= mesFin && esDiaOperativo(r.startTime))
  , [records, mesInicio, mesFin])

  const rankingMes = useMemo(() => {
    const ops = [...new Set(recordsMes.flatMap((r) => r.workers || []))]
    return ops.map((name) => ({ name, ...calcResumenWorker(recordsMes, name, [], configPuntos) }))
      .sort((a, b) => b.puntosTotales - a.puntosTotales)
  }, [recordsMes, configPuntos])

  const posicionMes = rankingMes.findIndex((r) => r.name === workerName)
  const miDatoMes   = rankingMes[posicionMes] ?? null

  const byDay = useMemo(() => {
    const map = {}
    ;[...myRecords].sort((a, b) => b.startTime - a.startTime).forEach((r) => {
      const day = new Date(r.startTime).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
      if (!map[day]) map[day] = []
      map[day].push(r)
    })
    return Object.entries(map)
  }, [myRecords])

  const historialMeses = useMemo(() => agruparPorMesYSemana(myRecords), [myRecords])
  return (
    <div className="space-y-4 pb-8">
      <div className="flex rounded-xl overflow-hidden border border-[#8fa3b1]/30">
        <button onClick={() => setTab('inicio')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${tab === 'inicio' ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'}`}>
          <Home size={13} /> Inicio
        </button>
        <button onClick={() => setTab('ranking')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${tab === 'ranking' ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'}`}>
          <Trophy size={13} /> Mi Ranking
        </button>
        <button onClick={() => setTab('historial')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${tab === 'historial' ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'}`}>
          <Calendar size={13} /> Historial
        </button>
      </div>

      {tab === 'inicio' && (
        <>
          {descargaActiva ? (
            <div className="rounded-2xl overflow-hidden shadow border-2 border-green-400/60"
              style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' }}>
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-300 font-black text-sm">Descarga en curso</p>
                  <p className="text-green-200/80 text-xs truncate">Nave {descargaActiva.naveName || descargaActiva.naveId} - {descargaActiva.provider}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-green-300 font-black text-base">{descargaActiva.cajas_asignadas ?? '--'}</p>
                  <p className="text-green-200/70 text-[10px]">cajas asig.</p>
                </div>
              </div>
              {descargaActiva.tipo_carga && (
                <div className="px-4 pb-3">
                  <span className="text-[10px] bg-green-400/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">{descargaActiva.tipo_carga}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl px-4 py-3 border border-[#8fa3b1]/20 bg-white dark:bg-[#162050] flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#8fa3b1]/40 shrink-0" />
              <p className="text-[#8fa3b1] text-sm">Sin descarga activa en este momento</p>
            </div>
          )}

          <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
              style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
              <p className="text-white font-black text-sm">Mis descargas</p>
              <p className="text-white/70 text-xs">Hola, {workerName}</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#8fa3b1]/10">
              <ContadorCell label="Hoy"         descargas={descargasHoy}    cajas={Math.round(cajasHoy)}    highlight={descargasHoy > 0} />
              <ContadorCell label="Esta semana" descargas={descargasSemana} cajas={Math.round(cajasSemana)} />
              <ContadorCell label="Este mes"    descargas={descargasMes}    cajas={Math.round(cajasMes)} />
            </div>
          </div>

          {resumenHoy.descargas > 0 && (
            <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
                <div>
                  <p className="text-white font-black text-base">Productividad Hoy</p>
                  <p className="text-white/70 text-xs">Carga normalizada por peso</p>
                </div>
                {posDisplay && (
                  <div className="text-center bg-white/15 rounded-xl px-3 py-1.5">
                    <p className="text-2xl leading-none">{medallaRanking(posDisplay)}</p>
                    <p className="text-white/80 text-[10px] mt-0.5">{posDisplay === 1 ? 'Lider!' : posDisplay + ' de ' + totalEquipos}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-0 divide-x divide-[#8fa3b1]/15">
                <MetricCell label="Pts totales" value={resumenHoy.puntosTotales + puntosTrailerHoy} />
                <MetricCell label="Pts/min"     value={resumenHoy.ptsPorMin} highlight />
                <MetricCell label="Cajas hoy"   value={resumenHoy.cajasTotales + cajasTrailerHoy} />
              </div>
              {puntosTrailerHoy > 0 && (
                <div className="px-4 py-2 border-t border-[#8fa3b1]/10 flex items-center justify-between text-xs">
                  <span className="text-[#8fa3b1]">Trailer incluido</span>
                  <span className="font-bold text-[#2563c4]">+{cajasTrailerHoy} cajas +{puntosTrailerHoy} pts</span>
                </div>
              )}
              {rankingHoy.length > 1 && (
                <div className="px-4 py-3 border-t border-[#8fa3b1]/10">
                  <p className="text-xs font-bold text-[#8fa3b1] uppercase tracking-wide mb-2">Ranking del dia</p>
                  <div className="space-y-1.5">
                    {rankingHoy.map((item, idx) => {
                      const esTu = item.workerName === workerName
                      return (
                        <div key={item.workerName}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${esTu ? 'bg-[#1a3a8f]/10 dark:bg-[#1a3a8f]/30 border border-[#1a3a8f]/30' : ''}`}>
                          <span className="w-6 text-center text-base">{medallaRanking(idx + 1)}</span>
                          <span className={`flex-1 font-semibold ${esTu ? 'text-[#1a3a8f] dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                            {item.workerName}{esTu ? ' (tu)' : ''}
                          </span>
                          <span className="font-bold text-[#2563c4] dark:text-[#8fa3b1] text-xs">{item.puntosTotales} pts</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="border-t border-[#8fa3b1]/10">
                <button onClick={() => setShowDetalle((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-[#8fa3b1] font-semibold hover:bg-[#8fa3b1]/5">
                  <span>Como se calculan estos numeros?</span>
                  {showDetalle ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showDetalle && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="rounded-xl overflow-hidden border border-[#8fa3b1]/20">
                      {Object.entries(PESO_FACTORES).map(([cat, factor]) => (
                        <div key={cat} className="flex items-center justify-between px-3 py-2 border-b border-[#8fa3b1]/10 last:border-0">
                          <span className="text-xs font-semibold text-slate-700 dark:text-white">{cat}</span>
                          <span className="text-xs font-bold text-[#2563c4]">x{factor}</span>
                        </div>
                      ))}
                    </div>
                    <DesgloseDia records={records} workerName={workerName} />
                  </div>
                )}
              </div>
            </div>
          )}

          {byDay.length === 0 ? (
            <div className="text-center py-12 text-[#8fa3b1]">
              <div className="text-4xl mb-2">📦</div>
              <p>Sin descargas registradas aun</p>
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
                    const rol     = esDesc && esEstib ? 'Desc + Estib' : esDesc ? 'Descargador' : esEstib ? 'Estibador' : 'Operador'
                    const cajas   = esDesc  && r.cajasXDescargador ? r.cajasXDescargador
                                  : esEstib && r.cajasXEstibador   ? r.cajasXEstibador
                                  : (!esDesc && !esEstib && r.cajas_reales && r.workers?.length > 0)
                                    ? Math.round(r.cajas_reales / r.workers.length) : null
                    return (
                      <div key={r.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-[#1a3a8f] dark:text-white">Nave {r.naveName || r.naveId}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-pink-100 text-pink-600">Terminado</span>
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
        </>
      )}
      {tab === 'ranking' && (
        <>
          <div className="rounded-2xl overflow-hidden shadow border border-[#8fa3b1]/20"
            style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="text-5xl">{posicionMes >= 0 ? medallaRanking(posicionMes + 1) : '--'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-lg truncate">{workerName}</p>
                <p className="text-white/70 text-xs">
                  {posicionMes >= 0
                    ? posicionMes === 0 ? 'Vas en primer lugar este mes!' : ('Lugar ' + (posicionMes + 1) + ' de ' + rankingMes.length + ' operadores')
                    : 'Sin actividad este mes aun'}
                </p>
              </div>
            </div>
            {miDatoMes && (
              <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
                <div className="py-3 text-center">
                  <p className="font-black text-white text-lg">{miDatoMes.puntosTotales.toLocaleString()}</p>
                  <p className="text-white/60 text-[10px]">pts del mes</p>
                </div>
                <div className="py-3 text-center">
                  <p className="font-black text-white text-lg">{miDatoMes.cajasTotales.toLocaleString()}</p>
                  <p className="text-white/60 text-[10px]">cajas del mes</p>
                </div>
                <div className="py-3 text-center">
                  <p className="font-black text-white text-lg">{miDatoMes.descargas}</p>
                  <p className="text-white/60 text-[10px]">descargas</p>
                </div>
              </div>
            )}
          </div>

          {rankingMes.length > 0 && (
            <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
                style={{ background: 'linear-gradient(135deg, #0f2460 0%, #1a3a8f 100%)' }}>
                <p className="text-white font-black text-sm">Ranking del mes</p>
                <p className="text-white/70 text-xs">Solo dias operativos - puntos normalizados</p>
              </div>
              <div className="divide-y divide-[#8fa3b1]/10">
                {rankingMes.map((item, idx) => {
                  const esTu   = item.name === workerName
                  const maxPts = rankingMes[0]?.puntosTotales || 1
                  const pct    = Math.round((item.puntosTotales / maxPts) * 100)
                  return (
                    <div key={item.name} className={`px-4 py-3 ${esTu ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg w-7 text-center shrink-0">{medallaRanking(idx + 1)}</span>
                        <span className={`font-bold text-sm flex-1 truncate ${esTu ? 'text-[#1a3a8f] dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>
                          {item.name}{esTu ? ' (tu)' : ''}
                        </span>
                        <span className={`font-black text-sm shrink-0 ${esTu ? 'text-[#1a3a8f] dark:text-indigo-300' : 'text-slate-700 dark:text-white'}`}>
                          {item.puntosTotales.toLocaleString()} pts
                        </span>
                        <span className="text-xs text-[#8fa3b1] shrink-0">{item.cajasTotales.toLocaleString()} cajas</span>
                      </div>
                      <div className="ml-9 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: pct + '%', background: esTu ? '#1a3a8f' : '#8fa3b1' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {rankingMes.length === 0 && (
            <div className="text-center py-12 text-[#8fa3b1]">
              <div className="text-4xl mb-2">📊</div>
              <p>Sin actividad registrada este mes</p>
            </div>
          )}
        </>
      )}

      {tab === 'historial' && (
        <>
          {historialMeses.length === 0 ? (
            <div className="text-center py-12 text-[#8fa3b1]">
              <div className="text-4xl mb-2">📅</div>
              <p>Sin historial disponible</p>
            </div>
          ) : (
            historialMeses.map((mes) => (
              <MesCard key={mes.key} mes={mes} workerName={workerName} />
            ))
          )}
        </>
      )}

      <button onClick={clearCacheAndReload}
        className="w-full rounded-xl border border-orange-400 text-orange-500 font-semibold text-sm flex items-center justify-center gap-2 py-3">
        <RefreshCw size={15} /> No ves tus datos? Limpiar cache
      </button>

      {onLogout && (
        <button onClick={onLogout}
          className="w-full rounded-xl border border-red-400 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 py-3">
          <LogOut size={15} /> Cerrar sesion
        </button>
      )}
    </div>
  )
}
function MesCard({ mes, workerName }) {
  const [semanasAbiertas, setSemanasAbiertas] = useState(() => {
    const set = new Set()
    if (mes.semanas.length > 0) set.add(mes.semanas[mes.semanas.length - 1].semana)
    return set
  })
  const toggleSemana = (sem) => {
    setSemanasAbiertas((prev) => {
      const next = new Set(prev)
      next.has(sem) ? next.delete(sem) : next.add(sem)
      return next
    })
  }
  const totalDescargas = mes.semanas.reduce((acc, s) => acc + s.records.length, 0)
  const totalCajas     = mes.semanas.reduce((acc, s) => acc + s.records.reduce((a, r) => a + (r.cajas_reales || r.cajasReales || 0), 0), 0)

  return (
    <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
        <div>
          <p className="text-white font-black text-base">{mes.label}</p>
          <p className="text-white/70 text-xs">{totalDescargas} descargas - {totalCajas.toLocaleString()} cajas</p>
        </div>
        <div className="text-white/60 text-xs text-right">
          <p className="font-semibold">{mes.semanas.length} semanas</p>
        </div>
      </div>
      <div className="divide-y divide-[#8fa3b1]/10">
        {mes.semanas.map((semana) => {
          const abierta    = semanasAbiertas.has(semana.semana)
          const cajasTotal = semana.records.reduce((a, r) => a + (r.cajas_reales || r.cajasReales || 0), 0)
          return (
            <div key={semana.semana}>
              <button onClick={() => toggleSemana(semana.semana)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#8fa3b1]/5 transition-colors">
                <span className="text-xs font-bold text-[#1a3a8f] dark:text-[#8fa3b1]">{semana.label}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#8fa3b1]">{semana.records.length} desc - {cajasTotal.toLocaleString()} cajas</span>
                  {abierta ? <ChevronUp size={14} className="text-[#8fa3b1]" /> : <ChevronDown size={14} className="text-[#8fa3b1]" />}
                </div>
              </button>
              {abierta && (
                <div className="divide-y divide-[#8fa3b1]/10 bg-slate-50 dark:bg-[#0d1b3e]/40">
                  {semana.records.map((r) => {
                    const fecha = new Date(r.startTime).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })
                    const hora  = fmtTime(r.startTime)
                    const cajas = r.cajas_reales || r.cajasReales || null
                    const po    = r.po || null
                    return (
                      <div key={r.id} className="px-4 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-[#1a3a8f] dark:text-white capitalize">{fecha}</span>
                              <span className="text-[10px] text-[#8fa3b1]">{hora}</span>
                              {po && (
                                <span className="text-[10px] bg-[#1a3a8f]/10 dark:bg-[#1a3a8f]/30 text-[#1a3a8f] dark:text-[#8fa3b1] px-1.5 py-0.5 rounded font-mono font-semibold">
                                  {po}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-[#8fa3b1]">Nave {r.naveName || r.naveId}</span>
                              {r.provider && <span className="text-[10px] text-[#8fa3b1]">- {r.provider}</span>}
                              {r.tipo_carga && <span className="text-[10px] text-[#8fa3b1]">- {r.tipo_carga}</span>}
                            </div>
                          </div>
                          {cajas != null && (
                            <div className="text-right shrink-0">
                              <p className="font-black text-sm text-[#ec4899]">{cajas.toLocaleString()}</p>
                              <p className="text-[9px] text-[#8fa3b1]">cajas</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ContadorCell({ label, descargas, cajas, highlight }) {
  return (
    <div className="py-3 px-2 text-center">
      <p className="text-[10px] text-[#8fa3b1] uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-black text-xl ${highlight ? 'text-[#1a3a8f] dark:text-indigo-300' : 'text-slate-800 dark:text-white'}`}>{descargas}</p>
      <p className="text-[10px] text-[#8fa3b1]">{descargas === 1 ? 'descarga' : 'descargas'}</p>
      {cajas > 0 && <p className="text-[11px] font-semibold text-[#ec4899] mt-0.5">{cajas} cajas</p>}
    </div>
  )
}

function MetricCell({ label, value, highlight }) {
  return (
    <div className="py-3 px-2 text-center">
      <p className="text-[10px] text-[#8fa3b1] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-black text-lg ${highlight ? 'text-[#ec4899]' : 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
  )
}

function DesgloseDia({ records, workerName }) {
  const hoy = useMemo(() =>
    recordsDeHoy(records).filter((r) => r.workers?.includes(workerName) && r.status === 'finished')
  , [records, workerName])
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
            <p className="text-[#8fa3b1] mt-0.5">{cajas} cajas x{factor} ({tipoCarga}) - {mins} min</p>
          </div>
        )
      })}
    </div>
  )
}