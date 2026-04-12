import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { esDiaOperativo, diasActivosOrdenados } from '../config/operacion'
import { getCajasWorker, PESO_FACTORES, getFactorCarga } from '../utils/productividad'

const COLORES = { 1: '#1a3a8f', 2: '#2563c4', 3: '#0891b2', 4: '#0d9488', 5: '#16a34a', 6: '#f97316' }

function getWeekLabel(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end   = endOfWeek(date,   { weekStartsOn: 1 })
  return `${format(start, 'd MMM', { locale: es })}–${format(end, 'd MMM', { locale: es })}`
}

export default function WeeklyAnalytics({ records = [], dark, configPuntos }) {
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0)
  const dias = diasActivosOrdenados()

  // Filtrar solo registros operativos completados
  const operativos = useMemo(() =>
    records.filter((r) =>
      r.endTime && r.startTime && r.status === 'finished' &&
      !r.deleted_at && esDiaOperativo(r.startTime)
    ), [records])

  // Agrupar por semana
  const semanas = useMemo(() => {
    const map = {}
    operativos.forEach((r) => {
      const weekStart = startOfWeek(new Date(r.startTime), { weekStartsOn: 1 })
      const key = weekStart.toISOString()
      if (!map[key]) {
        map[key] = { weekStart, label: getWeekLabel(weekStart), totalCajas: 0, totalPuntos: 0, numDescargas: 0, dias: {} }
        dias.forEach((d) => { map[key].dias[d.dayIndex] = { label: d.label, cajas: 0, descargas: 0 } })
      }
      const cajasReales = r.cajas_reales || r.cajasReales || 0
      const factor      = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
      const dayIdx      = new Date(r.startTime).getDay()
      map[key].totalCajas   += cajasReales
      map[key].totalPuntos  += cajasReales * factor
      map[key].numDescargas += 1
      if (map[key].dias[dayIdx]) {
        map[key].dias[dayIdx].cajas     += cajasReales
        map[key].dias[dayIdx].descargas += 1
      }
    })
    return Object.values(map).sort((a, b) => b.weekStart - a.weekStart).slice(0, 8)
  }, [operativos])

  const diasOrdenados = useMemo(() => [
    { dayIndex: 1, label: 'Lun' },
    { dayIndex: 2, label: 'Mar' },
    { dayIndex: 3, label: 'Mié' },
    { dayIndex: 4, label: 'Jue' },
    { dayIndex: 5, label: 'Vie' },
    { dayIndex: 6, label: 'Sáb' },
  ], [])

  // Gráfica — cajas por semana y día
  const chartData = useMemo(() =>
    semanas.map((s) => {
      const row = { semana: s.label }
      diasOrdenados.forEach((d) => {
        row[d.label] = s.dias[d.dayIndex]?.cajas || 0
      })
      return row
    }).reverse()
  , [semanas, diasOrdenados])

  const semanaActual = semanas[selectedWeekOffset] || null

  // Métricas semana actual vs anterior
  const metrics = useMemo(() => {
    const cur  = semanas[0]
    const prev = semanas[1]
    if (!cur) return null
    const diasActivos = dias.filter((d) => cur.dias[d.dayIndex]?.descargas > 0).length
    const promCajas   = cur.numDescargas > 0 ? Math.round(cur.totalCajas / cur.numDescargas) : 0
    const deltaPuntos = prev ? Math.round(cur.totalPuntos - prev.totalPuntos) : null
    return {
      totalCajas:   cur.totalCajas,
      totalPuntos:  Math.round(cur.totalPuntos),
      promCajas,
      deltaPuntos,
      descargas:    cur.numDescargas,
      diasActivos,
      totalDias:    dias.length,
    }
  }, [semanas])

  // Ranking semanal por puntos normalizados
  const ranking = useMemo(() => {
    if (!semanaActual) return []
    const weekStart = semanaActual.weekStart
    const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 })
    const enSemana  = operativos.filter((r) => {
      const d = new Date(r.startTime)
      return d >= weekStart && d <= weekEnd
    })
    const workerMap = {}
    enSemana.forEach((r) => {
      const allWorkers = [...new Set([...(r.descargadores ?? []), ...(r.estibadores ?? []), ...(r.workers ?? [])])]
      allWorkers.forEach((name) => {
        const normalizedName = name.trim().toLowerCase()
        const existingKey = Object.keys(workerMap).find((k) => k.toLowerCase() === normalizedName) ?? name.trim()
        if (!workerMap[existingKey]) workerMap[existingKey] = { name: name.trim(), puntos: 0, cajas: 0, descargas: 0, minutos: 0 }
        const cajas        = getCajasWorker(r, name)
        const factor       = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
        const minutos      = (r.endTime - r.startTime) / 60000
        workerMap[existingKey].puntos    += cajas * factor
        workerMap[existingKey].cajas     += cajas
        workerMap[existingKey].descargas += 1
        workerMap[existingKey].minutos   += minutos
      })
    })
    return Object.values(workerMap)
      .map((w) => ({
        ...w,
        puntos:      Math.round(w.puntos),
        cajas:       Math.round(w.cajas),
        cajasXHora:  w.minutos > 0 ? Math.round((w.cajas / w.minutos) * 60) : 0,
      }))
      .sort((a, b) => b.puntos - a.puntos)
  }, [semanaActual, operativos])

  if (semanas.length === 0) {
    return (
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-6 shadow border border-[#8fa3b1]/20 text-center text-[#8fa3b1] text-sm">
        Sin datos operativos para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tarjetas de métricas */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-4 shadow text-white">
            <p className="text-xs text-indigo-200 mb-1">Puntos esta semana</p>
            <p className="font-black text-2xl">{metrics.totalPuntos.toLocaleString()}</p>
            <p className="text-xs text-indigo-200 mt-1">pts normalizados</p>
          </div>
          <MetricCard label="Cajas totales"       value={metrics.totalCajas.toLocaleString()} />
          <MetricCard label="Prom. cajas/descarga" value={metrics.promCajas} />
          <MetricCard
            label="vs semana anterior"
            value={metrics.deltaPuntos !== null
              ? `${metrics.deltaPuntos >= 0 ? '↑' : '↓'} ${Math.abs(metrics.deltaPuntos)} pts`
              : '—'}
            color={metrics.deltaPuntos !== null ? (metrics.deltaPuntos >= 0 ? 'text-green-500' : 'text-red-500') : ''}
          />
          <MetricCard label="Descargas"   value={metrics.descargas} />
          <MetricCard label="Días activos" value={`${metrics.diasActivos} de ${metrics.totalDias}`} />
        </div>
      )}

      {/* Gráfica semanal — cajas por día */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <p className="font-bold text-sm mb-3">Cajas por semana y día operativo</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const ordered = diasOrdenados.map((d) => {
                  const entry = payload.find((p) => p.dataKey === d.label)
                  return entry ? { ...entry, name: d.label } : { name: d.label, value: 0, color: COLORES[d.dayIndex] }
                })
                return (
                  <div style={{ background: dark ? '#162050' : '#fff', border: '1px solid #8fa3b1', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}</p>
                    {ordered.map((e) => (
                      <p key={e.name} style={{ color: e.color, margin: '2px 0' }}>
                        {e.name}: {e.value === 0 ? 'Sin actividad' : `${e.value} cajas`}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Legend
              content={() => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', fontSize: 11, marginTop: 4 }}>
                  {diasOrdenados.map((d) => (
                    <span key={d.dayIndex} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORES[d.dayIndex], display: 'inline-block' }} />
                      {d.label}
                    </span>
                  ))}
                </div>
              )}
            />
            {diasOrdenados.map((d) => (
              <Bar key={d.dayIndex} dataKey={d.label} fill={COLORES[d.dayIndex] || '#8fa3b1'} radius={[4,4,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-1">
          {semanas.slice(0, 4).map((s) => (
            <p key={s.label} className="text-xs text-[#8fa3b1]">
              {s.label}: <span className="font-semibold text-slate-700 dark:text-white">
                {s.totalCajas.toLocaleString()} cajas · {Math.round(s.totalPuntos).toLocaleString()} pts · {s.numDescargas} descargas
              </span>
            </p>
          ))}
        </div>
      </div>

      {/* Ranking semanal por puntos */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm">🏆 Ranking semanal</p>
          <select
            value={selectedWeekOffset}
            onChange={(e) => setSelectedWeekOffset(Number(e.target.value))}
            className="text-xs rounded-lg border border-[#8fa3b1]/30 bg-transparent px-2 py-1 outline-none"
          >
            {semanas.map((s, i) => (
              <option key={s.label} value={i}>{s.label}</option>
            ))}
          </select>
        </div>
        {ranking.length === 0
          ? <p className="text-[#8fa3b1] text-sm text-center py-3">Sin datos esta semana</p>
          : <div className="space-y-2">
              {ranking.map((w, i) => {
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div key={w.name} className={`rounded-xl border p-3 ${i === 0 ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10' : 'border-[#8fa3b1]/20'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{medals[i] || `#${i+1}`}</span>
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
        }
      </div>
    </div>
  )
}

function MetricCard({ label, value, color = '' }) {
  return (
    <div className="bg-white dark:bg-[#162050] rounded-2xl p-3 shadow border border-[#8fa3b1]/20">
      <p className="text-xs text-[#8fa3b1] mb-1">{label}</p>
      <p className={`font-bold text-base ${color || 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
  )
}
