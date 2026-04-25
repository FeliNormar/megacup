/**
 * ProductividadAnalytics
 * Selector Semana 1-4 del mes actual.
 * Cada semana muestra podio + comparativa por día.
 * La última semana activa muestra el acumulado total del mes.
 */
import { useMemo, useState } from 'react'
import { getCajasWorker, getFactorCarga, medallaRanking, calcResumenWorker } from '../utils/productividad'
import { esDiaOperativo } from '../config/operacion'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, isAfter, isBefore, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

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
function gc(colorMap, name) {
  return colorMap[name?.toLowerCase().trim()] ?? '#8fa3b1'
}

/** Records terminados en un rango, solo días operativos */
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
  const fin = new Date(hasta)
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

/** Genera las 4 semanas del mes actual (igual que MonthlyAnalytics) */
function getSemanasDelMes() {
  const now      = new Date()
  const mesStart = startOfMonth(now)
  const mesEnd   = endOfMonth(now)
  const hoy      = now

  const semanas = []
  let cursor = mesStart

  while (isBefore(cursor, mesEnd) || cursor.getTime() === mesEnd.getTime()) {
    const semStart = semanas.length === 0 ? mesStart : startOfWeek(cursor, { weekStartsOn: 1 })
    const semEndRaw = endOfWeek(semStart, { weekStartsOn: 1 })
    const semEnd    = isAfter(semEndRaw, mesEnd) ? mesEnd : semEndRaw

    const isStarted   = !isAfter(semStart, hoy)
    const isCurrent   = !isAfter(semStart, hoy) && !isBefore(semEnd, hoy)
    const isCompleted = isBefore(semEnd, hoy) && !isToday(semEnd)

    semanas.push({
      num:         semanas.length + 1,
      label:       `Semana ${semanas.length + 1}`,
      sublabel:    `${format(semStart, 'd MMM', { locale: es })} – ${format(semEnd, 'd MMM', { locale: es })}`,
      start:       semStart,
      end:         semEnd,
      isStarted,
      isCurrent,
      isCompleted,
    })

    const nextDay = new Date(semEnd); nextDay.setDate(nextDay.getDate() + 1)
    cursor = nextDay
    if (semanas.length >= 4) break
  }
  return semanas
}

export default function ProductividadAnalytics({ records = [], assignments = [], configPuntos }) {
  const semanas = useMemo(() => getSemanasDelMes(), [])

  // Semana activa por defecto: la semana en curso, o la última iniciada
  const defaultSemana = useMemo(() => {
    const current = semanas.find((s) => s.isCurrent)
    if (current) return current.num
    const started = [...semanas].reverse().find((s) => s.isStarted)
    return started?.num ?? 1
  }, [semanas])

  const [semanaActiva, setSemanaActiva] = useState(defaultSemana)

  const semanaSeleccionada = semanas.find((s) => s.num === semanaActiva)

  // ¿Es la última semana iniciada? → mostrar acumulado del mes
  const ultimaSemanaIniciada = useMemo(() => {
    const started = semanas.filter((s) => s.isStarted)
    return started[started.length - 1]
  }, [semanas])

  const esSemanaFinal = semanaActiva === ultimaSemanaIniciada?.num

  // Records del período seleccionado
  // Si es la semana final → acumulado de todo el mes
  const mesStart = startOfMonth(new Date()).getTime()
  const mesEnd   = endOfMonth(new Date()).getTime()

  const recordsPeriodo = useMemo(() => {
    if (!semanaSeleccionada) return []
    if (esSemanaFinal) {
      // Acumulado del mes completo hasta hoy
      return filtrarRecords(records, mesStart, Date.now())
    }
    return filtrarRecords(records, semanaSeleccionada.start.getTime(), semanaSeleccionada.end.getTime())
  }, [records, semanaSeleccionada, esSemanaFinal, mesStart])

  // Ranking del período
  const ranking = useMemo(() => {
    const operadores = [...new Set(recordsPeriodo.flatMap((r) => r.workers || []))]
    return operadores
      .map((name) => {
        const res = calcResumenWorker(recordsPeriodo, name, assignments, configPuntos)
        return { name, ...res }
      })
      .sort((a, b) => b.puntosTotales - a.puntosTotales)
  }, [recordsPeriodo, assignments, configPuntos])

  const colorMap = useMemo(() => buildColorMap(ranking.map((r) => r.name)), [ranking])
  const getC = (name) => gc(colorMap, name)
  const maxPuntos = ranking[0]?.puntosTotales || 1

  // Comparativa por día del período
  const diasDetalle = useMemo(() => {
    if (!semanaSeleccionada) return []
    const desde = esSemanaFinal ? mesStart : semanaSeleccionada.start.getTime()
    const hasta  = esSemanaFinal ? Date.now() : semanaSeleccionada.end.getTime()
    return generarDiasEnRango(desde, hasta)
  }, [semanaSeleccionada, esSemanaFinal, mesStart])

  const comparativaDia = useMemo(() => {
    return diasDetalle.map((dia) => {
      const recs = recordsPeriodo.filter((r) => r.startTime >= dia.inicio && r.startTime < dia.fin)
      if (recs.length === 0) return null
      const datos = ranking.map((w) => ({ name: w.name, ...calcWorker(recs, w.name, configPuntos) }))
      if (!datos.some((d) => d.cajas > 0)) return null
      const ganador = [...datos].sort((a, b) => b.puntos - a.puntos)[0]?.name
      return { ...dia, datos, ganador }
    }).filter(Boolean)
  }, [diasDetalle, recordsPeriodo, ranking, configPuntos])

  const top3 = ranking.slice(0, 3)

  return (
    <div className="space-y-4">

      {/* ── Selector Semana 1-4 ── */}
      <div className="flex rounded-xl overflow-hidden border border-[#8fa3b1]/30">
        {semanas.map((s) => (
          <button
            key={s.num}
            onClick={() => s.isStarted && setSemanaActiva(s.num)}
            disabled={!s.isStarted}
            className={`flex-1 py-2 text-xs font-semibold transition-colors relative disabled:opacity-40 disabled:cursor-not-allowed ${
              semanaActiva === s.num ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'
            }`}>
            {s.label}
            {s.isCurrent && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />
            )}
          </button>
        ))}
      </div>

      {/* Subtítulo del período */}
      {semanaSeleccionada && (
        <div className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center justify-between ${
          esSemanaFinal
            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
            : semanaSeleccionada.isCurrent
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
        }`}>
          <span>
            {esSemanaFinal
              ? `🏁 Acumulado del mes · ${format(new Date(), 'MMMM yyyy', { locale: es })}`
              : semanaSeleccionada.isCurrent
                ? `⏳ En curso · ${semanaSeleccionada.sublabel}`
                : `✅ Completada · ${semanaSeleccionada.sublabel}`}
          </span>
          {esSemanaFinal && semanaSeleccionada.isCurrent && (
            <span className="text-[10px] opacity-70">Se actualiza al terminar cada descarga</span>
          )}
        </div>
      )}

      {ranking.length === 0 ? (
        <div className="text-center py-12 text-[#8fa3b1]">
          <div className="text-4xl mb-2">📊</div>
          <p>Sin actividad en {semanaSeleccionada?.label ?? 'este período'}</p>
          <p className="text-xs mt-1">{semanaSeleccionada?.sublabel}</p>
        </div>
      ) : (
        <>
          {/* ── PODIO ── */}
          <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
              style={{ background: esSemanaFinal
                ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
                : 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
              <p className="text-white font-black text-sm">
                {esSemanaFinal ? '🏁 Conteo Final' : '🏆 Podio'} — {semanaSeleccionada?.label}
              </p>
              <p className="text-white/70 text-xs capitalize">
                {esSemanaFinal
                  ? `Acumulado completo · ${format(new Date(), 'MMMM yyyy', { locale: es })}`
                  : semanaSeleccionada?.sublabel} · solo días operativos
              </p>
            </div>

            {/* Podio visual */}
            {top3.length >= 1 && (
              <div className="px-4 pt-5 pb-3">
                <div className="flex items-end justify-center gap-3">

                  {/* 2do */}
                  {top3[1] ? (
                    <div className="flex-1 text-center">
                      <div className="rounded-t-2xl pt-4 pb-3 px-2 border-2"
                        style={{ borderColor: getC(top3[1].name) + '60', background: getC(top3[1].name) + '12' }}>
                        <p className="text-2xl mb-1">🥈</p>
                        <p className="font-black text-sm truncate" style={{ color: getC(top3[1].name) }}>{top3[1].name}</p>
                        <p className="font-black text-xl text-slate-800 dark:text-white mt-1">{top3[1].puntosTotales.toLocaleString()}</p>
                        <p className="text-[10px] text-[#8fa3b1]">pts</p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{top3[1].cajasTotales.toLocaleString()} cajas</p>
                      </div>
                      <div className="h-8 rounded-b-sm" style={{ background: getC(top3[1].name) + '30' }} />
                    </div>
                  ) : <div className="flex-1" />}

                  {/* 1ro */}
                  <div className="flex-1 text-center">
                    <div className="rounded-t-2xl pt-4 pb-3 px-2 border-2"
                      style={{ borderColor: getC(top3[0].name), background: getC(top3[0].name) + '18' }}>
                      <p className="text-3xl mb-1">🥇</p>
                      <p className="font-black text-base truncate" style={{ color: getC(top3[0].name) }}>{top3[0].name}</p>
                      <p className="font-black text-2xl text-slate-800 dark:text-white mt-1">{top3[0].puntosTotales.toLocaleString()}</p>
                      <p className="text-[10px] text-[#8fa3b1]">pts</p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{top3[0].cajasTotales.toLocaleString()} cajas</p>
                    </div>
                    <div className="h-14 rounded-b-sm" style={{ background: getC(top3[0].name) + '30' }} />
                  </div>

                  {/* 3ro */}
                  {top3[2] ? (
                    <div className="flex-1 text-center">
                      <div className="rounded-t-2xl pt-4 pb-3 px-2 border-2"
                        style={{ borderColor: getC(top3[2].name) + '60', background: getC(top3[2].name) + '12' }}>
                        <p className="text-2xl mb-1">🥉</p>
                        <p className="font-black text-sm truncate" style={{ color: getC(top3[2].name) }}>{top3[2].name}</p>
                        <p className="font-black text-xl text-slate-800 dark:text-white mt-1">{top3[2].puntosTotales.toLocaleString()}</p>
                        <p className="text-[10px] text-[#8fa3b1]">pts</p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{top3[2].cajasTotales.toLocaleString()} cajas</p>
                      </div>
                      <div className="h-5 rounded-b-sm" style={{ background: getC(top3[2].name) + '30' }} />
                    </div>
                  ) : <div className="flex-1" />}

                </div>
              </div>
            )}

            {/* Lista completa con barras */}
            <div className="px-4 pb-4 space-y-3">
              {ranking.map((item, idx) => {
                const color = getC(item.name)
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

          {/* ── COMPARATIVA POR DÍA ── */}
          {comparativaDia.length > 0 && (
            <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
                style={{ background: 'linear-gradient(135deg, #0f2460 0%, #1a3a8f 100%)' }}>
                <p className="text-white font-black text-sm">📅 ¿En qué día te rebasaron?</p>
                <p className="text-white/70 text-xs">El 🏆 indica quién ganó ese día</p>
              </div>

              {/* Leyenda */}
              <div className="px-4 py-2 border-b border-[#8fa3b1]/10 flex flex-wrap gap-x-4 gap-y-1">
                {ranking.map((w) => (
                  <div key={w.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: getC(w.name) }} />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{w.name}</span>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-[#8fa3b1]/10">
                {comparativaDia.map((dia) => {
                  const maxPts = Math.max(...dia.datos.map((d) => d.puntos), 1)
                  return (
                    <div key={dia.label} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-xs text-slate-700 dark:text-white capitalize flex-1">{dia.label}</p>
                        {dia.ganador && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: getC(dia.ganador) + '20', color: getC(dia.ganador) }}>
                            <span>🏆</span><span>{dia.ganador}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dia.datos
                          .filter((d) => d.cajas > 0)
                          .sort((a, b) => b.puntos - a.puntos)
                          .map((d) => {
                            const color = getC(d.name)
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
                })}
              </div>
            </div>
          )}

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
        </>
      )}
    </div>
  )
}
