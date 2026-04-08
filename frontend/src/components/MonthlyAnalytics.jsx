import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { startOfWeek, endOfWeek, format, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'

function formatDuration(ms) {
  if (!ms || ms < 0) return '0 min'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

export default function MonthlyAnalytics({ records = [], dark }) {
  const now = new Date()

  // Últimos 2 meses
  const months = useMemo(() => {
    const result = []
    for (let i = 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      result.push({
        label: format(d, 'MMMM yyyy', { locale: es }),
        start: startOfMonth(d),
        end:   endOfMonth(d),
      })
    }
    return result
  }, [])

  // Agrupar por semana dentro de cada mes
  const monthData = useMemo(() => {
    return months.map((m) => {
      const weeks = eachWeekOfInterval({ start: m.start, end: m.end }, { weekStartsOn: 1 })
      const weekData = weeks.map((wStart) => {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 })
        const inWeek = records.filter((r) =>
          r.endTime && r.startTime && r.status === 'finished' &&
          new Date(r.startTime) >= wStart && new Date(r.startTime) <= wEnd
        )
        const totalMs = inWeek.reduce((acc, r) => acc + (r.endTime - r.startTime), 0)
        const workers = [...new Set(inWeek.flatMap((r) => r.workers || []))]
        return {
          semana:     `${format(wStart, 'd MMM', { locale: es })}`,
          horas:      parseFloat((totalMs / 3600000).toFixed(2)),
          descargas:  inWeek.length,
          duracion:   formatDuration(totalMs),
          equipo:     workers.join(', ') || '—',
        }
      }).filter((w) => w.descargas > 0)
      return { ...m, weeks: weekData }
    })
  }, [records, months])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-white dark:bg-[#162050] border border-[#8fa3b1]/30 rounded-xl p-3 text-xs shadow-lg max-w-xs">
        <p className="font-bold mb-1">Semana del {label}</p>
        <p>⏱ {d?.duracion}</p>
        <p>📦 {d?.descargas} descargas</p>
        <p className="text-[#8fa3b1] mt-1">👷 {d?.equipo}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {monthData.map((m) => (
        <div key={m.label} className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
          <p className="font-bold text-sm mb-3 capitalize">{m.label}</p>
          {m.weeks.length === 0
            ? <p className="text-[#8fa3b1] text-sm text-center py-4">Sin actividad este mes</p>
            : <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={m.weeks} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="semana" tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} unit="h" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="horas" fill="#1a3a8f" radius={[4,4,0,0]} name="Horas" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {m.weeks.map((w) => (
                    <div key={w.semana} className="flex items-start gap-2 text-xs text-[#8fa3b1]">
                      <span className="shrink-0 font-semibold text-slate-700 dark:text-white w-16">{w.semana}:</span>
                      <span>{w.duracion} · {w.descargas} desc.</span>
                      <span className="truncate">👷 {w.equipo}</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      ))}
    </div>
  )
}
