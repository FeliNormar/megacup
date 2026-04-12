import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { startOfWeek, endOfWeek, format, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { getCajasWorker, PESO_FACTORES } from '../utils/productividad'

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

  // Agrupar por semana dentro de cada mes — cajas y puntos
  const monthData = useMemo(() => {
    return months.map((m) => {
      const weeks = eachWeekOfInterval({ start: m.start, end: m.end }, { weekStartsOn: 1 })

      // Ranking de operadores del mes
      const workerMap = {}
      const inMonth = records.filter((r) =>
        r.endTime && r.startTime && r.status === 'finished' &&
        new Date(r.startTime) >= m.start && new Date(r.startTime) <= m.end
      )
      inMonth.forEach((r) => {
        const allWorkers = [...new Set([...(r.descargadores ?? []), ...(r.estibadores ?? []), ...(r.workers ?? [])])]
        allWorkers.forEach((name) => {
          if (!workerMap[name]) workerMap[name] = { name, puntos: 0, cajas: 0, descargas: 0, minutos: 0 }
          const cajas   = getCajasWorker(r, name)
          const factor  = PESO_FACTORES[r.tipo_carga || r.tipoCarga] ?? 1.0
          const minutos = (r.endTime - r.startTime) / 60000
          workerMap[name].puntos    += cajas * factor
          workerMap[name].cajas     += cajas
          workerMap[name].descargas += 1
          workerMap[name].minutos   += minutos
        })
      })
      const rankingMes = Object.values(workerMap)
        .map((w) => ({
          ...w,
          puntos:     Math.round(w.puntos),
          cajas:      Math.round(w.cajas),
          cajasXHora: w.minutos > 0 ? Math.round((w.cajas / w.minutos) * 60) : 0,
        }))
        .sort((a, b) => b.puntos - a.puntos)

      // Totales del mes
      const totalCajas  = inMonth.reduce((acc, r) => acc + (r.cajas_reales || r.cajasReales || 0), 0)
      const totalPuntos = inMonth.reduce((acc, r) => {
        const factor = PESO_FACTORES[r.tipo_carga || r.tipoCarga] ?? 1.0
        return acc + (r.cajas_reales || r.cajasReales || 0) * factor
      }, 0)

      const weekData = weeks.map((wStart) => {
        const wEnd   = endOfWeek(wStart, { weekStartsOn: 1 })
        const inWeek = inMonth.filter((r) =>
          new Date(r.startTime) >= wStart && new Date(r.startTime) <= wEnd
        )
        const cajas  = inWeek.reduce((acc, r) => acc + (r.cajas_reales || r.cajasReales || 0), 0)
        const puntos = inWeek.reduce((acc, r) => {
          const factor = PESO_FACTORES[r.tipo_carga || r.tipoCarga] ?? 1.0
          return acc + (r.cajas_reales || r.cajasReales || 0) * factor
        }, 0)
        return {
          semana:    `${format(wStart, 'd MMM', { locale: es })}`,
          cajas,
          puntos:    Math.round(puntos),
          descargas: inWeek.length,
        }
      }).filter((w) => w.descargas > 0)

      return { ...m, weeks: weekData, rankingMes, totalCajas, totalPuntos: Math.round(totalPuntos), totalDescargas: inMonth.length }
    })
  }, [records, months])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-white dark:bg-[#162050] border border-[#8fa3b1]/30 rounded-xl p-3 text-xs shadow-lg">
        <p className="font-bold mb-1">Semana del {label}</p>
        <p>📦 {d?.cajas?.toLocaleString()} cajas</p>
        <p>⚡ {d?.puntos?.toLocaleString()} pts</p>
        <p>🔄 {d?.descargas} descargas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {monthData.map((m) => (
        <div key={m.label} className="space-y-3">
          {/* Header del mes con totales */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-3 text-white text-center">
              <p className="text-[10px] text-indigo-200 capitalize">{m.label}</p>
              <p className="font-black text-lg">{m.totalPuntos.toLocaleString()}</p>
              <p className="text-[10px] text-indigo-200">pts totales</p>
            </div>
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-3 shadow border border-[#8fa3b1]/20 text-center">
              <p className="text-[10px] text-[#8fa3b1]">Cajas</p>
              <p className="font-black text-lg text-slate-800 dark:text-white">{m.totalCajas.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-3 shadow border border-[#8fa3b1]/20 text-center">
              <p className="text-[10px] text-[#8fa3b1]">Descargas</p>
              <p className="font-black text-lg text-slate-800 dark:text-white">{m.totalDescargas}</p>
            </div>
          </div>

          {/* Gráfica de cajas por semana */}
          <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
            <p className="font-bold text-sm mb-3 capitalize">Cajas por semana — {m.label}</p>
            {m.weeks.length === 0
              ? <p className="text-[#8fa3b1] text-sm text-center py-4">Sin actividad este mes</p>
              : <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={m.weeks} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                      <XAxis dataKey="semana" tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: dark ? '#9ca3af' : '#6b7280' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cajas" fill="#1a3a8f" radius={[4,4,0,0]} name="Cajas" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1">
                    {m.weeks.map((w) => (
                      <p key={w.semana} className="text-xs text-[#8fa3b1]">
                        {w.semana}: <span className="font-semibold text-slate-700 dark:text-white">
                          {w.cajas.toLocaleString()} cajas · {w.puntos.toLocaleString()} pts · {w.descargas} desc.
                        </span>
                      </p>
                    ))}
                  </div>
                </>
            }
          </div>

          {/* Ranking del mes */}
          {m.rankingMes.length > 0 && (
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
              <p className="font-bold text-sm mb-3">🏆 Ranking del mes</p>
              <div className="space-y-2">
                {m.rankingMes.map((w, i) => {
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
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
