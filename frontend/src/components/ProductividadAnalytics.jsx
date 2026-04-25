/**
 * ProductividadAnalytics
 * Podio claro + ranking con barras + comparativa por día y semana con colores por operador.
 * El rango "Mes actual" usa exactamente el mismo período que MonthlyAnalytics.
 */
import { useMemo, useState } from 'react'
import { getCajasWorker, getFactorCarga, medallaRanking, calcResumenWorker } from '../utils/productividad'
import { esDiaOperativo } from '../config/operacion'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import { es } from 'date-fns/locale'

// Paleta fija — un color por operador, consistente en toda la vista
const PALETA = [
  '#3b82f6', '#ec4899', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#f97316', '#e11d48',
  '#84cc16', '#a78bfa',
]

function buildColorMap(operadores) {
  const map = {}
  operadores.forEach((name, i) => { map[name.toLowerCase().trim()] = PALETA[i % PALETA.length] })
  return map
}
function getColor(colorMap, name) {
  return colorMap[name.toLowerCase().trim()] ?? '#8fa3b1'
}

/** Records terminados en un rango de timestamps, solo días operativos */
function filtrarRecords(records, desde, hasta) {
  return records.filter(
    (r) => r.startTime >= desde && r.startTime <= hasta &&
           r.status === 'finished' && !r.deleted_at && esDiaOperativo(r.startTime)
  )
}

/** Cajas y puntos de un operador en un conjunto de records */
function calcWorker(recs, workerName, configPuntos) {
  let cajas = 0; let puntos = 0
  recs.forEach((r) => {
    const todos = [...new Set([...(r.descargadores ?? []), ...(r.estibadores ?? []), ...(r.workers ?? [])])]
    if (!todos.some((w) => w.toLowerCase().trim() === workerName.toLowerCase().trim())) return
    const c = getCajasWorker(r, workerName)
    const f = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
    cajas += c; puntos += c * f
  })
  return { cajas: Math.round(cajas), puntos: Math.round(puntos) }
}

/** Genera días entre dos timestamps */
function generarDiasEnRango(desde, hasta) {
  const dias = []
  const cursor = new Date(desde); cursor.setHours(0, 0, 0, 0)
  const fin    = new Date(hasta)
  while (cursor <= fin) {
    const siguiente = new Date(cursor); siguiente.setDate(siguiente.getDate() + 1)
    dias.push({
      label:  cursor.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      inicio: cursor.getTime(),
      fin:    siguiente.getTime(),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

/** Genera semanas que cubren los records dados */
function generarSemanas(records) {
  const map = {}
  records.forEach((r) => {
    const ws  = startOfWeek(new Date(r.startTime), { weekStartsOn: 1 })
    const key = ws.toISOString()
    if (!map[key]) {
      const we = endOfWeek(ws, { weekStartsOn: 1 })
      map[key] = {
        label:  `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM', { locale: es })}`,
        inicio: ws.getTime(),
        fin:    we.getTime() + 86400000,
      }
    }
  })
  return Object.values(map).sort((a, b) => b.inicio - a.inicio)
}

export default function ProductividadAnalytics({ records = [], assignments = [], configPuntos }) {
  const [rango,        setRango]        = useState('mes_actual')
  const [vistaDetalle, setVistaDetalle] = useState('semana')

  // Rango de fechas según selección
  const { desde, hasta, rangoLabel } = useMemo(() => {
    const now = new Date()
    if (rango === 'semana') return {
      desde: Date.now() - 7 * 24 * 60 * 60 * 1000,
      hasta: Date.now(),
      rangoLabel: 'Últimos 7 días',
    }
    if (rango === 'mes_actual') return {
      desde: startOfMonth(now).getTime(),
      hasta: endOfMonth(now).getTime(),
      rangoLabel: format(now, 'MMMM yyyy', { locale: es }),
    }
    if (rango === 'mes30') return {
      desde: Date.now() - 30 * 24 * 60 * 60 * 1000,
      hasta: Date.now(),
      rangoLabel: 'Últimos 30 días',
    }
    return {
      desde: Date.now() - 90 * 24 * 60 * 60 * 1000,
      hasta: Date.now(),
      rangoLabel: 'Últimos 90 días',
    }
  }, [rango])

  const recordsFiltrados = useMemo(
    () => filtrarRecords(records, desde, hasta),
    [records, desde, hasta]
  )

  // Ranking ordenado por puntos
  const ranking = useMemo(() => {
    const operadores = [...new Set(recordsFiltrados.flatMap((r) => r.workers || []))]
    return operadores
      .map((name) => {
        const res = calcResumenWorker(recordsFiltrados, name, assignments, configPuntos)
        return { name, ...res }
      })
      .sort((a, b) => b.puntosTotales - a.puntosTotales)
  }, [recordsFiltrados, assignments, configPuntos])

  const colorMap = useMemo(() => buildColorMap(ranking.map((r) => r.name)), [ranking])
  const gc = (name) => getColor(colorMap, name)
  const maxPuntos = ranking[0]?.puntosTotales || 1

  // Comparativa por día
  const diasDetalle = useMemo(() => generarDiasEnRango(desde, hasta), [desde, hasta])

  const comparativaDia = useMemo(() => {
    return diasDetalle.map((dia) => {
      const recs = recordsFiltrados.filter((r) => r.startTime >= dia.inicio && r.startTime < dia.fin)
      if (recs.length === 0) return null
      const datos = ranking.map((w) => ({ name: w.name, ...calcWorker(recs, w.name, configPuntos) }))
      if (!datos.some((d) => d.cajas > 0)) return null
      const ganador = [...datos].sort((a, b) => b.puntos - a.puntos)[0]?.name
      return { ...dia, datos, ganador }
    }).filter(Boolean)
  }, [diasDetalle, recordsFiltrados, ranking, configPuntos])

  // Comparativa por semana
  const semanasDetalle = useMemo(() => generarSemanas(recordsFiltrados), [recordsFiltrados])

  const comparativaSemana = useMemo(() => {
    return semanasDetalle.map((sem) => {
      const recs  = recordsFiltrados.filter((r) => r.startTime >= sem.inicio && r.startTime < sem.fin)
      const datos = ranking.map((w) => ({ name: w.name, ...calcWorker(recs, w.name, configPuntos) }))
      const ganador = [...datos].sort((a, b) => b.puntos - a.puntos)[0]?.name
      return { ...sem, datos, ganador }
    }).filter((s) => s.datos.some((d) => d.cajas > 0))
  }, [semanasDetalle, recordsFiltrados, ranking, configPuntos])

  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-[#8fa3b1]">
        <div className="text-4xl mb-2">📊</div>
        <p>Sin datos de productividad en este rango</p>
        <p className="text-xs mt-1">Los registros necesitan cajas y tipo de carga para calcular puntos</p>
      </div>
    )
  }

  const top3 = ranking.slice(0, 3)

  return (
    <div className="space-y-4">

      {/* ── Selector de rango ── */}
      <div className="flex rounded-xl overflow-hidden border border-[#8fa3b1]/30">
        {[
          { id: 'semana',     label: '7 días'      },
          { id: 'mes_actual', label: 'Mes actual'  },
          { id: 'mes30',      label: '30 días'     },
          { id: 'todo',       label: '90 días'     },
        ].map((r) => (
          <button key={r.id} onClick={() => setRango(r.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              rango === r.id ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* ── PODIO ── */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
          <p className="text-white font-black text-sm">🏆 Podio de Productividad</p>
          <p className="text-white/70 text-xs capitalize">{rangoLabel} · solo días operativos</p>
        </div>

        {top3.length >= 1 && (
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-end justify-center gap-3">

              {/* 2do lugar */}
              {top3[1] ? (
                <div className="flex-1 text-center">
                  <div className="rounded-t-2xl pt-4 pb-3 px-2 border-2"
                    style={{ borderColor: gc(top3[1].name) + '60', background: gc(top3[1].name) + '12' }}>
                    <p className="text-2xl mb-1">🥈</p>
                    <p className="font-black text-sm truncate" style={{ color: gc(top3[1].name) }}>{top3[1].name}</p>
                    <p className="font-black text-xl text-slate-800 dark:text-white mt-1">{top3[1].puntosTotales.toLocaleString()}</p>
                    <p className="text-[10px] text-[#8fa3b1]">pts</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{top3[1].cajasTotales.toLocaleString()} cajas</p>
                  </div>
                  <div className="h-8 rounded-b-sm" style={{ background: gc(top3[1].name) + '30' }} />
                </div>
              ) : <div className="flex-1" />}

              {/* 1er lugar */}
              <div className="flex-1 text-center">
                <div className="rounded-t-2xl pt-4 pb-3 px-2 border-2"
                  style={{ borderColor: gc(top3[0].name), background: gc(top3[0].name) + '18' }}>
                  <p className="text-3xl mb-1">🥇</p>
                  <p className="font-black text-base truncate" style={{ color: gc(top3[0].name) }}>{top3[0].name}</p>
                  <p className="font-black text-2xl text-slate-800 dark:text-white mt-1">{top3[0].puntosTotales.toLocaleString()}</p>
                  <p className="text-[10px] text-[#8fa3b1]">pts</p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{top3[0].cajasTotales.toLocaleString()} cajas</p>
                </div>
                <div className="h-14 rounded-b-sm" style={{ background: gc(top3[0].name) + '30' }} />
              </div>

              {/* 3er lugar */}
              {top3[2] ? (
                <div className="flex-1 text-center">
                  <div className="rounded-t-2xl pt-4 pb-3 px-2 border-2"
                    style={{ borderColor: gc(top3[2].name) + '60', background: gc(top3[2].name) + '12' }}>
                    <p className="text-2xl mb-1">🥉</p>
                    <p className="font-black text-sm truncate" style={{ color: gc(top3[2].name) }}>{top3[2].name}</p>
                    <p className="font-black text-xl text-slate-800 dark:text-white mt-1">{top3[2].puntosTotales.toLocaleString()}</p>
                    <p className="text-[10px] text-[#8fa3b1]">pts</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{top3[2].cajasTotales.toLocaleString()} cajas</p>
                  </div>
                  <div className="h-5 rounded-b-sm" style={{ background: gc(top3[2].name) + '30' }} />
                </div>
              ) : <div className="flex-1" />}

            </div>
          </div>
        )}

        {/* Lista completa con barras */}
        <div className="px-4 pb-4 space-y-3">
          {ranking.map((item, idx) => {
            const color = gc(item.name)
            const pct   = Math.round((item.puntosTotales / maxPuntos) * 100)
            return (
              <div key={item.name}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base w-6 text-center shrink-0">{medallaRanking(idx + 1)}</span>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                  <span className="font-bold text-sm flex-1 text-slate-800 dark:text-white truncate">{item.name}</span>
                  <span className="font-black text-sm shrink-0" style={{ color }}>{item.puntosTotales.toLocaleString()} pts</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{item.cajasTotales.toLocaleString()} cajas</span>
                </div>
                <div className="ml-11 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
                <p className="ml-11 text-[10px] text-[#8fa3b1] mt-0.5">
                  {item.descargas} descargas · {item.minutosTotales} min · {item.ptsPorMin} pts/min
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── COMPARATIVA POR DÍA / SEMANA ── */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#8fa3b1]/10 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f2460 0%, #1a3a8f 100%)' }}>
          <div>
            <p className="text-white font-black text-sm">📅 ¿En qué día te rebasaron?</p>
            <p className="text-white/70 text-xs">El 🏆 indica quién ganó ese período</p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-white/20 shrink-0">
            <button onClick={() => setVistaDetalle('dia')}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${vistaDetalle === 'dia' ? 'bg-white text-[#1a3a8f]' : 'text-white/70'}`}>
              Por día
            </button>
            <button onClick={() => setVistaDetalle('semana')}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${vistaDetalle === 'semana' ? 'bg-white text-[#1a3a8f]' : 'text-white/70'}`}>
              Por semana
            </button>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="px-4 py-2 border-b border-[#8fa3b1]/10 flex flex-wrap gap-x-4 gap-y-1">
          {ranking.map((w) => (
            <div key={w.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: gc(w.name) }} />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{w.name}</span>
            </div>
          ))}
        </div>

        {/* Tabla comparativa */}
        <div className="divide-y divide-[#8fa3b1]/10">
          {(vistaDetalle === 'dia' ? comparativaDia : comparativaSemana).length === 0 ? (
            <p className="text-center py-6 text-[#8fa3b1] text-sm">Sin actividad en este rango</p>
          ) : (
            (vistaDetalle === 'dia' ? comparativaDia : comparativaSemana).map((periodo) => {
              const maxPts = Math.max(...periodo.datos.map((d) => d.puntos), 1)
              return (
                <div key={periodo.label} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-xs text-slate-700 dark:text-white capitalize flex-1">{periodo.label}</p>
                    {periodo.ganador && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: gc(periodo.ganador) + '20', color: gc(periodo.ganador) }}>
                        <span>🏆</span>
                        <span>{periodo.ganador}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {periodo.datos
                      .filter((d) => d.cajas > 0)
                      .sort((a, b) => b.puntos - a.puntos)
                      .map((d) => {
                        const color = gc(d.name)
                        const pct   = Math.round((d.puntos / maxPts) * 100)
                        return (
                          <div key={d.name}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                              <span className="text-[11px] font-bold flex-1 truncate" style={{ color }}>{d.name}</span>
                              <span className="text-[11px] font-black shrink-0" style={{ color }}>{d.puntos.toLocaleString()} pts</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">{d.cajas} cajas</span>
                            </div>
                            <div className="ml-4 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Por qué difieren los puntos ── */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <p className="font-bold text-sm text-slate-800 dark:text-white mb-1">¿Por qué difieren los puntos?</p>
        <p className="text-xs text-[#8fa3b1] mb-3">
          No todas las cargas pesan igual. Los puntos se multiplican por el factor del tipo de carga para que sea justo comparar trailers ligeros vs pesados.
        </p>
        <div className="space-y-2">
          {[
            { cat: 'Ligero',      factor: configPuntos?.ligero      ?? 1.0 },
            { cat: 'Semi pesado', factor: configPuntos?.semi_pesado ?? 2.5 },
            { cat: 'Pesado',      factor: configPuntos?.pesado      ?? 4.0 },
          ].map(({ cat, factor }) => {
            const max = configPuntos?.pesado ?? 4.0
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-white w-24 shrink-0">{cat}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full bg-[#1a3a8f]" style={{ width: `${(factor / max) * 100}%` }} />
                </div>
                <span className="text-xs font-black text-[#ec4899] w-8 text-right">×{factor}</span>
                <span className="text-[10px] text-[#8fa3b1] w-28 shrink-0 text-right">
                  1 caja = {factor} {factor === 1 ? 'pto' : 'pts'}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-[#8fa3b1] mt-3 border-t border-[#8fa3b1]/10 pt-2">
          Fórmula: <span className="font-mono">Puntos = Cajas × Factor</span> · Los puntos se dividen equitativamente entre todos los operadores del trailer
        </p>
      </div>

    </div>
  )
}
