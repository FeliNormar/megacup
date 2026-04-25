import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  format, isAfter, isBefore, isToday
} from 'date-fns'
import { es } from 'date-fns/locale'
import { getCajasWorker, getFactorCarga } from '../utils/productividad'
import { esDiaOperativo } from '../config/operacion'

/**
 * Genera las 4 semanas del mes dado.
 * Cada semana tiene: label, start, end, isStarted, isCurrent, isCompleted
 */
function getSemanasDelMes(refDate) {
  const mesStart = startOfMonth(refDate)
  const mesEnd   = endOfMonth(refDate)
  const hoy      = new Date()

  const semanas = []
  let cursor = mesStart

  while (isBefore(cursor, mesEnd) || cursor.getTime() === mesEnd.getTime()) {
    const semStart = semanas.length === 0
      ? mesStart
      : startOfWeek(cursor, { weekStartsOn: 1 })

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

    const nextDay = new Date(semEnd)
    nextDay.setDate(nextDay.getDate() + 1)
    cursor = nextDay

    if (semanas.length >= 4) break
  }

  return semanas
}

/** Filtra records: terminados, en rango de fechas y en día operativo */
function filtrarOperativos(records, desde, hasta) {
  return records.filter((r) =>
    r.endTime && r.startTime && r.status === 'finished' &&
    !r.deleted_at &&
    new Date(r.startTime) >= desde &&
    new Date(r.startTime) <= hasta &&
    esDiaOperativo(r.startTime)
  )
}

export default function MonthlyAnalytics({ records = [], dark, configPuntos }) {
  const now = new Date()

  // Mes actual
  const mesActual = useMemo(() => ({
    label: format(now, 'MMMM yyyy', { locale: es }),
    start: startOfMonth(now),
    end:   endOfMonth(now),
  }), [])

  // Mes anterior
  const mesAnterior = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return {
      label: format(d, 'MMMM yyyy', { locale: es }),
      start: startOfMonth(d),
      end:   endOfMonth(d),
    }
  }, [])

  // Records operativos del mes actual
  const recordsMesActual = useMemo(() =>
    filtrarOperativos(records, mesActual.start, mesActual.end),
    [records, mesActual]
  )

  // Records operativos del mes anterior (solo para delta)
  const recordsMesAnterior = useMemo(() =>
    filtrarOperativos(records, mesAnterior.start, mesAnterior.end),
    [records, mesAnterior]
  )

  // Semanas del mes actual
  const semanas = useMemo(() => getSemanasDelMes(now), [])

  // Datos por semana — solo días operativos
  const semanasData = useMemo(() =>
    semanas.map((s) => {
      if (!s.isStarted) {
        return { ...s, cajas: 0, puntos: 0, descargas: 0, hasData: false }
      }
      const inWeek = filtrarOperativos(records, s.start, s.end)
      const cajas  = inWeek.reduce((acc, r) => acc + (r.cajas_reales || r.cajasReales || 0), 0)
      const puntos = inWeek.reduce((acc, r) => {
        const factor = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
        return acc + (r.cajas_reales || r.cajasReales || 0) * factor
      }, 0)
      return { ...s, cajas, puntos: Math.round(puntos), descargas: inWeek.length, hasData: inWeek.length > 0 }
    }),
    [semanas, records, configPuntos]
  )

  // Totales del mes actual
  const totalesMes = useMemo(() => {
    const cajas  = recordsMesActual.reduce((acc, r) => acc + (r.cajas_reales || r.cajasReales || 0), 0)
    const puntos = recordsMesActual.reduce((acc, r) => {
      const factor = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
      return acc + (r.cajas_reales || r.cajasReales || 0) * factor
    }, 0)
    return { cajas, puntos: Math.round(puntos), descargas: recordsMesActual.length }
  }, [recordsMesActual, configPuntos])

  // Delta vs mes anterior
  const totalesMesAnterior = useMemo(() => {
    const puntos = recordsMesAnterior.reduce((acc, r) => {
      const factor = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
      return acc + (r.cajas_reales || r.cajasReales || 0) * factor
    }, 0)
    return { puntos: Math.round(puntos) }
  }, [recordsMesAnterior, configPuntos])

  // Ranking del mes (por puntos) — para la sección "Ranking del mes"
  const rankingMes = useMemo(() => {
    const workerMap = {}
    recordsMesActual.forEach((r) => {
      const allWorkers = [...new Set([...(r.descargadores ?? []), ...(r.estibadores ?? []), ...(r.workers ?? [])])]
      allWorkers.forEach((name) => {
        const key = name.trim().toLowerCase()
        const existing = Object.keys(workerMap).find((k) => k === key) ?? key
        if (!workerMap[existing]) workerMap[existing] = { name: name.trim(), puntos: 0, cajas: 0, descargas: 0, minutos: 0 }
        const cajas   = getCajasWorker(r, name)
        const factor  = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
        const minutos = (r.endTime - r.startTime) / 60000
        workerMap[existing].puntos    += cajas * factor
        workerMap[existing].cajas     += cajas
        workerMap[existing].descargas += 1
        workerMap[existing].minutos   += minutos
      })
    })
    return Object.values(workerMap)
      .map((w) => ({
        ...w,
        puntos:     Math.round(w.puntos),
        cajas:      Math.round(w.cajas),
        cajasXHora: w.minutos > 0 ? Math.round((w.cajas / w.minutos) * 60) : 0,
      }))
      .sort((a, b) => b.puntos - a.puntos)
  }, [recordsMesActual, configPuntos])

  // Conteo Final — suma de las 4 semanas, ordenado por CAJAS (no puntos)
  // Solo días operativos, igual que todo lo demás
  const conteoFinal = useMemo(() => {
    const workerMap = {}
    recordsMesActual.forEach((r) => {
      const allWorkers = [...new Set([...(r.descargadores ?? []), ...(r.estibadores ?? []), ...(r.workers ?? [])])]
      allWorkers.forEach((name) => {
        const key = name.trim().toLowerCase()
        const existing = Object.keys(workerMap).find((k) => k === key) ?? key
        if (!workerMap[existing]) workerMap[existing] = { name: name.trim(), cajas: 0, puntos: 0, descargas: 0 }
        const cajas  = getCajasWorker(r, name)
        const factor = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
        workerMap[existing].cajas     += cajas
        workerMap[existing].puntos    += cajas * factor
        workerMap[existing].descargas += 1
      })
    })
    return Object.values(workerMap)
      .map((w) => ({
        ...w,
        cajas:  Math.round(w.cajas),
        puntos: Math.round(w.puntos),
      }))
      .sort((a, b) => b.cajas - a.cajas) // criterio: más cajas
  }, [recordsMesActual, configPuntos])

  // Datos para la gráfica — solo semanas iniciadas
  const chartData = useMemo(() =>
    semanasData
      .filter((s) => s.isStarted)
      .map((s) => ({ semana: s.label, cajas: s.cajas, puntos: s.puntos })),
    [semanasData]
  )

  const deltaPuntos = totalesMesAnterior.puntos > 0
    ? totalesMes.puntos - totalesMesAnterior.puntos
    : null

  // ¿El mes ya terminó?
  const mesTerminado = isBefore(mesActual.end, now) && !isToday(mesActual.end)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-white dark:bg-[#162050] border border-[#8fa3b1]/30 rounded-xl p-3 text-xs shadow-lg">
        <p className="font-bold mb-1">{label}</p>
        <p>📦 {d?.cajas?.toLocaleString()} cajas</p>
        <p>⚡ {d?.puntos?.toLocaleString()} pts</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header del mes con totales */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-3 text-white text-center">
          <p className="text-[10px] text-indigo-200 capitalize">{mesActual.label}</p>
          <p className="font-black text-lg">{totalesMes.puntos.toLocaleString()}</p>
          <p className="text-[10px] text-indigo-200">pts totales</p>
        </div>
        <div className="bg-white dark:bg-[#162050] rounded-2xl p-3 shadow border border-[#8fa3b1]/20 text-center">
          <p className="text-[10px] text-[#8fa3b1]">Cajas</p>
          <p className="font-black text-lg text-slate-800 dark:text-white">{totalesMes.cajas.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-[#162050] rounded-2xl p-3 shadow border border-[#8fa3b1]/20 text-center">
          <p className="text-[10px] text-[#8fa3b1]">Descargas</p>
          <p className="font-black text-lg text-slate-800 dark:text-white">{totalesMes.descargas}</p>
        </div>
      </div>

      {/* Delta vs mes anterior */}
      {deltaPuntos !== null && (
        <div className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 ${
          deltaPuntos >= 0
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          <span>{deltaPuntos >= 0 ? '↑' : '↓'}</span>
          <span>
            {Math.abs(deltaPuntos).toLocaleString()} pts {deltaPuntos >= 0 ? 'más' : 'menos'} que {mesAnterior.label}
          </span>
        </div>
      )}

      {/* 4 semanas del mes */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
          <p className="text-white font-black text-sm capitalize">📅 {mesActual.label}</p>
          <p className="text-white/70 text-xs">Progreso por semana · solo días operativos</p>
        </div>

        <div className="divide-y divide-[#8fa3b1]/10">
          {semanasData.map((s) => (
            <div key={s.num} className={`px-4 py-3 ${s.isCurrent ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
              <div className="flex items-center gap-3">
                {/* Indicador de estado */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  s.isCurrent   ? 'bg-indigo-500 animate-pulse' :
                  s.isCompleted ? 'bg-green-500' :
                  'bg-[#8fa3b1]/30'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold text-sm ${
                      s.isStarted ? 'text-slate-800 dark:text-white' : 'text-[#8fa3b1]'
                    }`}>
                      {s.label}
                    </p>
                    {s.isCurrent && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                        En curso
                      </span>
                    )}
                    {s.isCompleted && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                        Completada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8fa3b1]">{s.sublabel}</p>
                </div>

                {/* Datos — solo si la semana ya inició */}
                {s.isStarted ? (
                  <div className="flex gap-4 shrink-0 text-right">
                    <div>
                      <p className="font-black text-sm text-[#1a3a8f] dark:text-indigo-300">
                        {s.puntos.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[#8fa3b1]">pts</p>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700 dark:text-white">
                        {s.cajas.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[#8fa3b1]">cajas</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#8fa3b1]/50 shrink-0">Próximamente</p>
                )}
              </div>

              {/* Barra de progreso relativa — semana en curso */}
              {s.isCurrent && s.hasData && (
                <div className="mt-2 ml-5">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{
                        width: `${Math.min(100,
                          (s.cajas / Math.max(...semanasData.filter((x) => x.isStarted).map((x) => x.cajas), 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gráfica de cajas por semana — solo semanas iniciadas */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
          <p className="font-bold text-sm mb-3">Cajas por semana</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="semana" tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cajas" fill="#1a3a8f" radius={[4, 4, 0, 0]} name="Cajas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking del mes por puntos */}
      {rankingMes.length > 0 && (
        <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
          <p className="font-bold text-sm mb-3">🏆 Ranking del mes</p>
          <div className="space-y-2">
            {rankingMes.map((w, i) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={w.name} className={`rounded-xl border p-3 ${
                  i === 0
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
                    : 'border-[#8fa3b1]/20'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                    <span className="font-bold text-sm flex-1">{w.name}</span>
                    <span className="font-black text-base text-[#ec4899]">{w.puntos.toLocaleString()} pts</span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#8fa3b1] flex-wrap">
                    <span>📦 {w.cajas.toLocaleString()} cajas</span>
                    <span>⚡ {w.cajasXHora} cajas/h</span>
                    <span>🔄 {w.descargas} descargas</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Conteo Final ── */}
      {conteoFinal.length > 0 && (
        <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
          {/* Header */}
          <div
            className="px-4 py-3 border-b border-[#8fa3b1]/10"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-black text-sm capitalize">
                  🏁 Conteo Final — {mesActual.label}
                </p>
                <p className="text-white/70 text-xs">
                  Suma de las 4 semanas · días operativos · ordenado por cajas
                </p>
              </div>
              {!mesTerminado && (
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">
                  En curso
                </span>
              )}
            </div>
          </div>

          {/* Podio top 3 */}
          {conteoFinal.length >= 2 && (
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-end justify-center gap-3">
                {/* 2do lugar */}
                {conteoFinal[1] && (
                  <div className="flex-1 text-center">
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-t-xl pt-3 pb-2 px-2">
                      <p className="text-2xl mb-1">🥈</p>
                      <p className="font-bold text-xs text-slate-700 dark:text-white truncate">{conteoFinal[1].name}</p>
                      <p className="font-black text-base text-slate-800 dark:text-white">{conteoFinal[1].cajas.toLocaleString()}</p>
                      <p className="text-[10px] text-[#8fa3b1]">cajas</p>
                    </div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded-b-sm" />
                  </div>
                )}
                {/* 1er lugar */}
                <div className="flex-1 text-center">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-t-xl pt-3 pb-2 px-2">
                    <p className="text-2xl mb-1">🥇</p>
                    <p className="font-bold text-xs text-slate-700 dark:text-white truncate">{conteoFinal[0].name}</p>
                    <p className="font-black text-xl text-yellow-600 dark:text-yellow-400">{conteoFinal[0].cajas.toLocaleString()}</p>
                    <p className="text-[10px] text-[#8fa3b1]">cajas</p>
                  </div>
                  <div className="h-12 bg-yellow-200 dark:bg-yellow-800/40 rounded-b-sm" />
                </div>
                {/* 3er lugar */}
                {conteoFinal[2] && (
                  <div className="flex-1 text-center">
                    <div className="bg-orange-50 dark:bg-orange-900/10 rounded-t-xl pt-3 pb-2 px-2">
                      <p className="text-2xl mb-1">🥉</p>
                      <p className="font-bold text-xs text-slate-700 dark:text-white truncate">{conteoFinal[2].name}</p>
                      <p className="font-black text-base text-slate-800 dark:text-white">{conteoFinal[2].cajas.toLocaleString()}</p>
                      <p className="text-[10px] text-[#8fa3b1]">cajas</p>
                    </div>
                    <div className="h-5 bg-orange-200 dark:bg-orange-800/30 rounded-b-sm" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista completa */}
          <div className="divide-y divide-[#8fa3b1]/10 px-4 pb-3">
            {conteoFinal.map((w, i) => (
              <div key={w.name} className="flex items-center gap-3 py-2.5">
                <span className="text-base w-7 text-center shrink-0">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="font-bold text-sm flex-1 text-slate-800 dark:text-white truncate">{w.name}</span>
                <div className="flex gap-4 shrink-0 text-right">
                  <div>
                    <p className="font-black text-sm text-[#7c3aed] dark:text-purple-300">{w.cajas.toLocaleString()}</p>
                    <p className="text-[10px] text-[#8fa3b1]">cajas</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">{w.puntos.toLocaleString()}</p>
                    <p className="text-[10px] text-[#8fa3b1]">pts</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">{w.descargas}</p>
                    <p className="text-[10px] text-[#8fa3b1]">desc.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2 bg-[#8fa3b1]/5 border-t border-[#8fa3b1]/10">
            <p className="text-[10px] text-[#8fa3b1]">
              {mesTerminado
                ? `Conteo cerrado · ${mesActual.label}`
                : `Se actualiza automáticamente al terminar cada descarga · ${mesActual.label}`}
            </p>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {totalesMes.descargas === 0 && (
        <div className="text-center py-8 text-[#8fa3b1] text-sm">
          <div className="text-3xl mb-2">📅</div>
          <p>Sin actividad registrada este mes</p>
        </div>
      )}
    </div>
  )
}
