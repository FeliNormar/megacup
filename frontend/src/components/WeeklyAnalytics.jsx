import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { esDiaOperativo, diasActivosOrdenados, labelDia } from '../config/operacion'

const COLORES = { 1: '#1a3a8f', 2: '#2563c4', 3: '#0891b2', 4: '#0d9488', 5: '#16a34a', 6: '#f97316' }

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

function getWeekLabel(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end   = endOfWeek(date,   { weekStartsOn: 1 })
  return `${format(start, 'd MMM', { locale: es })}–${format(end, 'd MMM', { locale: es })}`
}

export default function WeeklyAnalytics({ records = [], dark }) {
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
        map[key] = { weekStart, label: getWeekLabel(weekStart), totalSeg: 0, numDescargas: 0, dias: {} }
        dias.forEach((d) => { map[key].dias[d.dayIndex] = { label: d.label, segundos: 0, descargas: 0 } })
      }
      const seg = (r.endTime - r.startTime) / 1000
      const dayIdx = new Date(r.startTime).getDay()
      map[key].totalSeg += seg
      map[key].numDescargas += 1
      if (map[key].dias[dayIdx]) {
        map[key].dias[dayIdx].segundos  += seg
        map[key].dias[dayIdx].descargas += 1
      }
    })
    return Object.values(map).sort((a, b) => b.weekStart - a.weekStart).slice(0, 8)
  }, [operativos])

  // Datos para la gráfica — semanas en orden cronológico, días en orden Lun→Sáb
  const chartData = useMemo(() =>
    semanas.map((s) => {
      const row = { semana: s.label }
      // Ordenar explícitamente por dayIndex
      const diasOrdenados = [...dias].sort((a, b) => a.dayIndex - b.dayIndex)
      diasOrdenados.forEach((d) => {
        row[d.label] = parseFloat((s.dias[d.dayIndex]?.segundos / 3600 || 0).toFixed(2))
      })
      return row
    }).reverse()
  , [semanas, dias])

  // Semana seleccionada para ranking
  const semanaActual = semanas[selectedWeekOffset] || null

  // Métricas semana actual vs anterior
  const metrics = useMemo(() => {
    const cur  = semanas[0]
    const prev = semanas[1]
    if (!cur) return null
    const curH  = cur.totalSeg  / 3600
    const prevH = prev ? prev.totalSeg / 3600 : null
    const delta = prevH !== null ? curH - prevH : null
    const diasActivos = dias.filter((d) => cur.dias[d.dayIndex]?.descargas > 0).length
    return {
      horas:        formatDuration(cur.totalSeg),
      descargas:    cur.numDescargas,
      promedio:     cur.numDescargas > 0 ? formatDuration(cur.totalSeg / cur.numDescargas) : '—',
      delta,
      diasActivos,
      totalDias:    dias.length,
    }
  }, [semanas])

  // Ranking de operadores para semana seleccionada
  const ranking = useMemo(() => {
    if (!semanaActual) return []
    const weekStart = semanaActual.weekStart
    const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 })
    const enSemana  = operativos.filter((r) => {
      const d = new Date(r.startTime)
      return d >= weekStart && d <= weekEnd
    })
    const map = {}
    enSemana.forEach((r) => {
      const seg = (r.endTime - r.startTime) / 1000
      const dayIdx = new Date(r.startTime).getDay()
      ;(r.workers || []).forEach((w) => {
        if (!map[w]) map[w] = { name: w, totalSeg: 0, descargas: 0, incidencias: 0, diasSet: new Set() }
        map[w].totalSeg   += seg
        map[w].descargas  += 1
        map[w].diasSet.add(dayIdx)
        if (r.status === 'incident') map[w].incidencias += 1
      })
    })
    return Object.values(map)
      .map((w) => ({ ...w, diasTrabajados: w.diasSet.size }))
      .sort((a, b) => b.totalSeg - a.totalSeg)
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
          <MetricCard label="Horas esta semana"    value={metrics.horas} />
          <MetricCard label="Descargas"            value={metrics.descargas} />
          <MetricCard label="Promedio/descarga"    value={metrics.promedio} />
          <MetricCard
            label="vs semana anterior"
            value={metrics.delta !== null
              ? `${metrics.delta >= 0 ? '↑' : '↓'} ${formatDuration(Math.abs(metrics.delta * 3600))}`
              : '—'}
            color={metrics.delta !== null ? (metrics.delta >= 0 ? 'text-red-500' : 'text-green-500') : ''}
          />
          <MetricCard label="Días activos" value={`${metrics.diasActivos} de ${metrics.totalDias} días`} />
        </div>
      )}

      {/* Gráfica semanal */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <p className="font-bold text-sm mb-3">Horas por semana y día operativo</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
            <XAxis dataKey="semana" tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} unit="h" />
            <Tooltip
              formatter={(val, name) => [val === 0 ? 'Sin actividad' : `${val}h`, name]}
              contentStyle={{ background: dark ? '#162050' : '#fff', border: '1px solid #8fa3b1' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {[...dias].sort((a, b) => a.dayIndex - b.dayIndex).map((d) => (
              <Bar key={d.dayIndex} dataKey={d.label} fill={COLORES[d.dayIndex] || '#8fa3b1'} radius={[4,4,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {/* Subtotales */}
        <div className="mt-2 space-y-1">
          {semanas.slice(0, 4).map((s) => (
            <p key={s.label} className="text-xs text-[#8fa3b1]">
              {s.label}: <span className="font-semibold text-slate-700 dark:text-white">
                {formatDuration(s.totalSeg)} · {s.numDescargas} descargas
              </span>
            </p>
          ))}
        </div>
      </div>

      {/* Ranking semanal */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm">Ranking semanal</p>
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
          : <div className="space-y-3">
              {ranking.map((w, i) => (
                <div key={w.name} className="rounded-xl border border-[#8fa3b1]/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#8fa3b1]">#{i + 1}</span>
                    <span className="font-bold text-sm flex-1">{w.name}</span>
                    <span className="text-sm font-bold text-[#1a3a8f] dark:text-[#8fa3b1]">{formatDuration(w.totalSeg)}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#8fa3b1]">
                    <span>{w.descargas} descargas</span>
                    <span>Prom: {formatDuration(w.totalSeg / w.descargas)}</span>
                    {w.incidencias > 0 && <span className="text-red-400">{w.incidencias} incid.</span>}
                    <span>{w.diasTrabajados} de {dias.length} días</span>
                  </div>
                </div>
              ))}
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
