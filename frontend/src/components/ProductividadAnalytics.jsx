/**
 * ProductividadAnalytics
 * Vista de analítica de productividad normalizada para el admin.
 * Muestra ranking histórico por semana/mes y gráfica de tendencia pts/día por operador.
 */
import { useMemo, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import {
  calcResumenWorker,
  calcRankingDia,
  PESO_FACTORES,
  recordsDeHoy,
  medallaRanking,
  getPuntosTrailerWorker,
} from '../utils/productividad'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
)

const COLORES = ['#1a3a8f', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

/** Filtra records de los últimos N días */
function recordsUltimoDias(records, dias) {
  const desde = Date.now() - dias * 24 * 60 * 60 * 1000
  return records.filter((r) => r.startTime >= desde && r.status === 'finished')
}

/** Agrupa records por día (label dd/MM) */
function agruparPorDia(records, workerName, dias = 14) {
  const resultado = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const siguiente = new Date(d); siguiente.setDate(siguiente.getDate() + 1)
    const del_dia = records.filter(
      (r) => r.startTime >= d.getTime() && r.startTime < siguiente.getTime() && r.status === 'finished'
    )
    const res = calcResumenWorker(del_dia, workerName)
    resultado.push({
      label: d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
      pts:   res.puntosTotales,
      cajas: res.cajasTotales,
    })
  }
  return resultado
}

/** Ranking histórico para un rango de records */
function calcRankingHistorico(records, assignments = []) {
  const operadores = [...new Set(records.flatMap((r) => r.workers || []))]
  return operadores
    .map((name) => {
      const res = calcResumenWorker(records, name, assignments)
      return { workerName: name, ...res }
    })
    .sort((a, b) => b.puntosTotales - a.puntosTotales)
}

export default function ProductividadAnalytics({ records = [], trailersCierre = [], dark, workers = [], assignments = [], configPuntos }) {
  const [rango,        setRango]        = useState('semana')   // 'semana' | 'mes' | 'todo'
  const [workerFocus,  setWorkerFocus]  = useState(null)       // operador seleccionado para tendencia

  const diasRango = rango === 'semana' ? 7 : rango === 'mes' ? 30 : 90

  const recordsFiltrados = useMemo(
    () => recordsUltimoDias(records, diasRango),
    [records, diasRango]
  )

  const rankingHistorico = useMemo(
    () => calcRankingHistorico(recordsFiltrados, assignments),
    [recordsFiltrados, assignments]
  )

  // Operadores únicos con actividad en el rango
  const operadoresActivos = useMemo(
    () => [...new Set(recordsFiltrados.flatMap((r) => r.workers || []))],
    [recordsFiltrados]
  )

  // Gráfica de tendencia: pts por día para cada operador (últimos 14 días fijo)
  const tendenciaData = useMemo(() => {
    const targets = workerFocus ? [workerFocus] : operadoresActivos.slice(0, 4)
    const dias14  = recordsUltimoDias(records, 14)
    return targets.map((name, idx) => {
      const puntosPorDia = agruparPorDia(dias14, name, 14)
      return {
        label:           name,
        data:            puntosPorDia.map((d) => d.pts),
        labels:          puntosPorDia.map((d) => d.label),
        borderColor:     COLORES[idx % COLORES.length],
        backgroundColor: COLORES[idx % COLORES.length] + '22',
        tension:         0.4,
        fill:            targets.length === 1,
        pointRadius:     4,
      }
    })
  }, [records, operadoresActivos, workerFocus])

  const tendenciaLabels = useMemo(() => {
    if (!tendenciaData.length) return []
    return tendenciaData[0].labels
  }, [tendenciaData])

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: dark ? '#d1d5db' : '#374151', font: { size: 11 } } },
      title:  { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} pts` } },
    },
    scales: {
      x: { ticks: { color: dark ? '#9ca3af' : '#6b7280', font: { size: 10 } }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
      y: { ticks: { color: dark ? '#9ca3af' : '#6b7280', font: { size: 10 } }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
    },
  }

  // Gráfica de barras: comparativa de pts totales por operador en el rango
  const barData = {
    labels:   rankingHistorico.map((r) => r.workerName),
    datasets: [{
      label:           'Puntos totales',
      data:            rankingHistorico.map((r) => r.puntosTotales),
      backgroundColor: rankingHistorico.map((_, i) => COLORES[i % COLORES.length]),
      borderRadius:    8,
    }],
  }

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} pts` } },
    },
    scales: {
      x: { ticks: { color: dark ? '#9ca3af' : '#6b7280', font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { color: dark ? '#9ca3af' : '#6b7280', font: { size: 10 } }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
    },
  }

  return (
    <div className="space-y-4">

      {/* Selector de rango */}
      <div className="flex rounded-xl overflow-hidden border border-[#8fa3b1]/30">
        {[
          { id: 'semana', label: '7 días'  },
          { id: 'mes',    label: '30 días' },
          { id: 'todo',   label: '90 días' },
        ].map((r) => (
          <button key={r.id} onClick={() => setRango(r.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              rango === r.id ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {rankingHistorico.length === 0 ? (
        <div className="text-center py-12 text-[#8fa3b1]">
          <div className="text-4xl mb-2">📊</div>
          <p>Sin datos de productividad en este rango</p>
          <p className="text-xs mt-1">Los registros necesitan cajas y tipo de carga para calcular puntos</p>
        </div>
      ) : (
        <>
          {/* Ranking histórico */}
          <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
              style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
              <p className="text-white font-black text-sm">🏆 Ranking de Productividad</p>
              <p className="text-white/70 text-xs">Puntos normalizados por peso de carga · {rango === 'semana' ? 'Últimos 7 días' : rango === 'mes' ? 'Últimos 30 días' : 'Últimos 90 días'}</p>
            </div>
            <div className="divide-y divide-[#8fa3b1]/10">
              {rankingHistorico.map((item, idx) => (
                <div key={item.workerName}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#8fa3b1]/5 cursor-pointer"
                  onClick={() => setWorkerFocus(workerFocus === item.workerName ? null : item.workerName)}>
                  <span className="text-xl w-8 text-center">{medallaRanking(idx + 1)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{item.workerName}</p>
                    <p className="text-xs text-[#8fa3b1]">{item.descargas} descargas · {item.minutosTotales} min</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-base text-[#1a3a8f] dark:text-[#8fa3b1]">{item.puntosTotales}</p>
                    <p className="text-[10px] text-[#8fa3b1]">pts totales</p>
                  </div>
                  <div className="text-right shrink-0 min-w-[52px]">
                    <p className="font-bold text-sm text-[#ec4899]">{item.ptsPorMin}</p>
                    <p className="text-[10px] text-[#8fa3b1]">pts/min</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 bg-[#8fa3b1]/5 border-t border-[#8fa3b1]/10">
              <p className="text-[10px] text-[#8fa3b1]">
                Toca un operador para ver su tendencia individual en la gráfica
              </p>
            </div>
          </div>

          {/* Gráfica de barras comparativa */}
          {rankingHistorico.length > 1 && (
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
              <p className="font-bold text-sm text-slate-800 dark:text-white mb-3">Comparativa de puntos totales</p>
              <Bar data={barData} options={barOptions} />
            </div>
          )}

          {/* Gráfica de tendencia pts/día */}
          {tendenciaData.length > 0 && tendenciaData.some((d) => d.data.some((v) => v > 0)) && (
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">
                    Tendencia pts/día · últimos 14 días
                  </p>
                  {workerFocus && (
                    <p className="text-xs text-[#8fa3b1]">
                      Mostrando: {workerFocus}
                      <button onClick={() => setWorkerFocus(null)} className="ml-2 text-[#ec4899] underline">ver todos</button>
                    </p>
                  )}
                </div>
              </div>
              <Line
                data={{ labels: tendenciaLabels, datasets: tendenciaData }}
                options={lineOptions}
              />
            </div>
          )}

          {/* Tabla de factores de peso — lee de configPuntos si está disponible */}
          <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
            <p className="font-bold text-sm text-slate-800 dark:text-white mb-3">Factores de peso aplicados</p>
            <div className="space-y-2">
              {[
                { cat: 'Ligero',      factor: configPuntos?.ligero      ?? 1.0, max: configPuntos?.pesado ?? 4.0 },
                { cat: 'Semi pesado', factor: configPuntos?.semi_pesado ?? 2.5, max: configPuntos?.pesado ?? 4.0 },
                { cat: 'Pesado',      factor: configPuntos?.pesado      ?? 4.0, max: configPuntos?.pesado ?? 4.0 },
              ].map(({ cat, factor, max }) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1a3a8f]"
                      style={{ width: `${(factor / (max || 4)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-white w-24 shrink-0">{cat}</span>
                  <span className="text-xs font-black text-[#ec4899] w-8 text-right">×{factor}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8fa3b1] mt-3">
              Puntos = Cajas × Factor · Productividad = Puntos ÷ Minutos
            </p>
          </div>
        </>
      )}
    </div>
  )
}
