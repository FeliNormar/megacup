import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { avgMinutesByProvider, fmtTime, fmtDuration } from '../utils/time'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const PROVIDERS = ['Pactiv', 'Arero', 'Maver', 'Dart', 'Desola', 'Biodeli']

export default function Analytics({ records = [], dark }) {
  const now   = new Date()
  const curM  = now.getMonth()
  const curY  = now.getFullYear()
  const prevM = curM === 0 ? 11 : curM - 1
  const prevY = curM === 0 ? curY - 1 : curY

  const labels = PROVIDERS

  const dataCur  = useMemo(() => PROVIDERS.map((p) => avgMinutesByProvider(records, p, curM,  curY)),  [records])
  const dataPrev = useMemo(() => PROVIDERS.map((p) => avgMinutesByProvider(records, p, prevM, prevY)), [records])

  // Ranking de eficiencia por trabajador
  const workerRanking = useMemo(() => {
    const map = {}
    records.filter((r) => r.endTime && r.startTime).forEach((r) => {
      const mins = (r.endTime - r.startTime) / 60000
      ;(r.workers || []).forEach((w) => {
        if (!map[w]) map[w] = { total: 0, count: 0 }
        map[w].total += mins
        map[w].count += 1
      })
    })
    return Object.entries(map)
      .map(([name, { total, count }]) => ({ name, avg: Math.round(total / count), count }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 8)
  }, [records])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: dark ? '#d1d5db' : '#374151' } },
      title:  { display: true, text: 'Tiempo promedio de descarga (min)', color: dark ? '#f9fafb' : '#111827' }
    },
    scales: {
      x: { ticks: { color: dark ? '#9ca3af' : '#6b7280' }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
      y: { ticks: { color: dark ? '#9ca3af' : '#6b7280' }, grid: { color: dark ? '#374151' : '#e5e7eb' } }
    }
  }

  const chartData = {
    labels,
    datasets: [
      { label: 'Mes actual',   data: dataCur,  backgroundColor: '#1a3a8f' },
      { label: 'Mes anterior', data: dataPrev, backgroundColor: '#8fa3b1' }
    ]
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <h3 className="font-bold text-base mb-3">Ranking de Eficiencia</h3>
        {workerRanking.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">Sin datos suficientes</p>
          : <div className="space-y-2">
              {workerRanking.map((w, i) => (
                <div key={w.name} className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-gray-400 text-sm">#{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{w.name}</span>
                  <span className="text-xs text-gray-500">{w.count} descargas</span>
                  <span className={`text-sm font-bold ${i === 0 ? 'text-[#1a3a8f] dark:text-[#8fa3b1]' : 'text-gray-600 dark:text-gray-300'}`}>
                    {w.avg} min
                  </span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Historial de descargas */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
        <h3 className="font-bold text-base mb-3">Historial de Descargas</h3>
        {records.length === 0
          ? <p className="text-gray-400 text-sm text-center py-4">Sin registros</p>
          : <div className="space-y-2">
              {records.slice(0, 20).map((r) => (
                <div key={r.id} className="rounded-xl border border-[#8fa3b1]/20 p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#1a3a8f] dark:text-white">{r.naveName || r.naveId}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.status === 'finished' ? 'bg-pink-100 text-pink-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {r.status === 'finished' ? 'Terminado' : 'Incidencia'}
                    </span>
                  </div>
                  <p className="text-[#8fa3b1] text-xs">📅 Inicio: {fmtTime(r.startTime)}</p>
                  <p className="text-[#8fa3b1] text-xs">⏱ Duración: {fmtDuration(r.endTime - r.startTime)}</p>
                  <p className="text-[#8fa3b1] text-xs">🏭 {r.provider} — {r.product}</p>
                  {r.workers?.length > 0 && <p className="text-[#8fa3b1] text-xs">👷 {r.workers.join(', ')}</p>}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
