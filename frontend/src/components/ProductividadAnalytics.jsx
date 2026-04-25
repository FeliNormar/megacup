/**
 * ProductividadAnalytics
 * Ranking con color por operador, desglose por día y por semana.
 */
import { useMemo, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { calcResumenWorker, medallaRanking, getCajasWorker, getFactorCarga } from '../utils/productividad'
import { esDiaOperativo } from '../config/operacion'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

// Paleta de colores — uno por operador, consistente en toda la vista
const PALETA = [
  '#3b82f6', // azul
  '#ec4899', // rosa
  '#10b981', // verde
  '#f59e0b', // amarillo
  '#8b5cf6', // violeta
  '#06b6d4', // cyan
  '#f97316', // naranja
  '#e11d48', // rojo
  '#84cc16', // lima
  '#a78bfa', // lavanda
]

/** Asigna un color fijo a cada operador por su índice en el ranking */
function buildColorMap(operadores) {
  const map = {}
  operadores.forEach((name, i) => {
    map[name.toLowerCase()] = PALETA[i % PALETA.length]
  })
  return map
}

/** Filtra records terminados en los últimos N días, solo días operativos */
function recordsUltimoDias(records, dias) {
  const desde = Date.now() - dias * 24 * 60 * 60 * 1000
  return records.filter(
    (r) => r.startTime >= desde && r.status === 'finished' && !r.deleted_at && esDiaOperativo(r.startTime)
  )
}

/** Genera los últimos N días como array de objetos {fecha, label} */
function generarDias(n) {
  const dias = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const fin = new Date(d)
    fin.setDate(fin.getDate() + 1)
    dias.push({
      label: d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      inicio: d.getTime(),
      fin: fin.getTime(),
    })
  }
  return dias
}

/** Genera las semanas que cubren los últimos N días */
function generarSemanas(records) {
  const semanaMap = {}
  records.forEach((r) => {
    const ws = startOfWeek(new Date(r.startTime), { weekStartsOn: 1 })
    const key = ws.toISOString()
    if (!semanaMap[key]) {
      const we = endOfWeek(ws, { weekStartsOn: 1 })
      semanaMap[key] = {
        label: `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM', { locale: es })}`,
        inicio: ws.getTime(),
        fin: we.getTime() + 86400000,
      }
    }
  })
  return Object.values(semanaMap).sort((a, b) => b.inicio - a.inicio)
}

/** Calcula cajas y puntos de un operador en un conjunto de records */
function calcWorkerEnRecords(recs, workerName, configPuntos) {
  let cajas = 0
  let puntos = 0
  recs.forEach((r) => {
    const allWorkers = [...new Set([...(r.descargadores ?? []), ...(r.estibadores ?? []), ...(r.workers ?? [])])]
    const esMiembro = allWorkers.some((w) => w.toLowerCase().trim() === workerName.toLowerCase().trim())
    if (!esMiembro) return
    const c = getCajasWorker(r, workerName)
    const f = getFactorCarga(r.tipo_carga || r.tipoCarga, configPuntos)
    cajas  += c
    puntos += c * f
  })
  return { cajas: Math.round(cajas), puntos: Math.round(puntos) }
}

export default function ProductividadAnalytics({ records = [], dark, assignments = [], configPuntos }) {
  const [rango,       setRango]       = useState('semana') // 'semana' | 'mes' | 'todo'
  const [vistaDetalle, setVistaDetalle] = useState('dia')  // 'dia' | 'semana'
  const [workerFocus, setWorkerFocus] = useState(null)

  const diasRango = rango === 'semana' ? 7 : rango === 'mes' ? 30 : 90

  const recordsFiltrados = useMemo(
    () => recordsUltimoDias(records, diasRango),
    [records, diasRango]
  )

  // Todos los operadores con actividad, ordenados por puntos
  const ranking = useMemo(() => {
    const operadores = [...new Set(recordsFiltrados.flatMap((r) => r.workers || []))]
    return operadores
      .map((name) => {
        const res = calcResumenWorker(recordsFiltrados, name, assignments, configPuntos)
        return { name, ...res }
      })
      .sort((a, b) => b.puntosTotales - a.puntosTotales)
  }, [recordsFiltrados, assignments, configPuntos])

  // Mapa de colores fijo por operador
  const colorMap = useMemo(() => buildColorMap(ranking.map((r) => r.name)), [ranking])
  const getColor = (name) => colorMap[name.toLowerCase()] ?? '#8fa3b1'

  // Máximo de puntos para barras proporcionales
  const maxPuntos = ranking[0]?.puntosTotales || 1

  // ── Desglose por día ──────────────────────────────────────────────────────
  const diasDetalle = useMemo(() => generarDias(diasRango), [diasRango])

  const desgloseDia = useMemo(() => {
    return diasDetalle.map((dia) => {
      const recsDelDia = recordsFiltrados.filter(
        (r) => r.startTime >= dia.inicio && r.startTime < dia.fin
      )
      if (recsDelDia.length === 0) return null
      const operadores = [...new Set(recsDelDia.flatMap((r) => r.workers || []))]
      const datos = operadores.map((name) => ({
        name,
        ...calcWorkerEnRecords(recsDelDia, name, configPuntos),
      })).sort((a, b) => b.puntos - a.puntos)
      return { ...dia, datos }
    }).filter(Boolean)
  }, [diasDetalle, recordsFiltrados, configPuntos])

  // ── Desglose por semana ───────────────────────────────────────────────────
  const semanasDetalle = useMemo(() => generarSemanas(recordsFiltrados), [recordsFiltrados])

  const desgloseSemana = useMemo(() => {
    return semanasDetalle.map((sem) => {
      const recsDelaSemana = recordsFiltrados.filter(
        (r) => r.startTime >= sem.inicio && r.startTime < sem.fin
      )
      const operadores = [...new Set(recsDelaSemana.flatMap((r) => r.workers || []))]
      const datos = operadores.map((name) => ({
        name,
        ...calcWorkerEnRecords(recsDelaSemana, name, configPuntos),
      })).sort((a, b) => b.puntos - a.puntos)
      return { ...sem, datos }
    })
  }, [semanasDetalle, recordsFiltrados, configPuntos])

  // ── Gráfica de tendencia pts/día ──────────────────────────────────────────
  const diasGrafica = useMemo(() => generarDias(14), [])

  const tendenciaData = useMemo(() => {
    const targets = workerFocus
      ? ranking.filter((r) => r.name === workerFocus)
      : ranking
    const dias14 = recordsUltimoDias(records, 14)
    return targets.map((w) => {
      const data = diasGrafica.map((dia) => {
        const recs = dias14.filter((r) => r.startTime >= dia.inicio && r.startTime < dia.fin)
        return calcWorkerEnRecords(recs, w.name, configPuntos).puntos
      })
      const color = getColor(w.name)
      return {
        label:           w.name,
        data,
        borderColor:     color,
        backgroundColor: color + '22',
        tension:         0.4,
        fill:            targets.length === 1,
        pointRadius:     3,
        borderWidth:     2,
      }
    })
  }, [records, ranking, workerFocus, diasGrafica, configPuntos])

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: dark ? '#d1d5db' : '#374151', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} pts`,
        },
      },
    },
    scales: {
      x: { ticks: { color: dark ? '#9ca3af' : '#6b7280', font: { size: 9 } }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
      y: { ticks: { color: dark ? '#9ca3af' : '#6b7280', font: { size: 9 } }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
    },
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-[#8fa3b1]">
        <div className="text-4xl mb-2">📊</div>
        <p>Sin datos de productividad en este rango</p>
        <p className="text-xs mt-1">Los registros necesitan cajas y tipo de carga para calcular puntos</p>
      </div>
    )
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

      {/* ── Ranking con color por operador ── */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#8fa3b1]/10"
          style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2563c4 100%)' }}>
          <p className="text-white font-black text-sm">🏆 Ranking de Productividad</p>
          <p className="text-white/70 text-xs">
            Puntos = Cajas × Factor de carga · {rango === 'semana' ? 'Últimos 7 días' : rango === 'mes' ? 'Últimos 30 días' : 'Últimos 90 días'} · solo días operativos
          </p>
        </div>

        <div className="divide-y divide-[#8fa3b1]/10">
          {ranking.map((item, idx) => {
            const color = getColor(item.name)
            const pct   = Math.round((item.puntosTotales / maxPuntos) * 100)
            return (
              <div key={item.name}
                className="px-4 py-3 cursor-pointer hover:bg-[#8fa3b1]/5 transition-colors"
                onClick={() => setWorkerFocus(workerFocus === item.name ? null : item.name)}>

                <div className="flex items-center gap-3">
                  {/* Medalla */}
                  <span className="text-lg w-7 text-center shrink-0">{medallaRanking(idx + 1)}</span>

                  {/* Chip de color + nombre */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{item.name}</p>
                    {workerFocus === item.name && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                        style={{ background: color + '33', color }}>
                        seleccionado
                      </span>
                    )}
                  </div>

                  {/* Puntos y cajas */}
                  <div className="flex gap-3 shrink-0 text-right">
                    <div>
                      <p className="font-black text-sm" style={{ color }}>{item.puntosTotales.toLocaleString()}</p>
                      <p className="text-[10px] text-[#8fa3b1]">pts</p>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700 dark:text-white">{item.cajasTotales.toLocaleString()}</p>
                      <p className="text-[10px] text-[#8fa3b1]">cajas</p>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#ec4899]">{item.ptsPorMin}</p>
                      <p className="text-[10px] text-[#8fa3b1]">pts/min</p>
                    </div>
                  </div>
                </div>

                {/* Barra proporcional con color del operador */}
                <div className="mt-2 ml-9">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8fa3b1] mt-0.5">
                    {item.descargas} descargas · {item.minutosTotales} min trabajados
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-2 bg-[#8fa3b1]/5 border-t border-[#8fa3b1]/10">
          <p className="text-[10px] text-[#8fa3b1]">Toca un operador para filtrar la gráfica de tendencia</p>
        </div>
      </div>

      {/* ── Gráfica de tendencia pts/día ── */}
      {tendenciaData.some((d) => d.data.some((v) => v > 0)) && (
        <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-white">
                Tendencia pts/día · últimos 14 días
              </p>
              {workerFocus && (
                <p className="text-xs text-[#8fa3b1]">
                  Mostrando: <span style={{ color: getColor(workerFocus) }}>{workerFocus}</span>
                  <button onClick={() => setWorkerFocus(null)} className="ml-2 text-[#ec4899] underline">ver todos</button>
                </p>
              )}
            </div>
          </div>
          <Line
            data={{ labels: diasGrafica.map((d) => d.label), datasets: tendenciaData }}
            options={lineOptions}
          />
        </div>
      )}

      {/* ── Desglose por día / semana ── */}
      <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
        {/* Header con selector */}
        <div className="px-4 py-3 border-b border-[#8fa3b1]/10 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f2460 0%, #1a3a8f 100%)' }}>
          <div>
            <p className="text-white font-black text-sm">📋 Desglose por operador</p>
            <p className="text-white/70 text-xs">Cajas y puntos individuales · días operativos</p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-white/20">
            <button
              onClick={() => setVistaDetalle('dia')}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                vistaDetalle === 'dia' ? 'bg-white text-[#1a3a8f]' : 'text-white/70'
              }`}>
              Por día
            </button>
            <button
              onClick={() => setVistaDetalle('semana')}
              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                vistaDetalle === 'semana' ? 'bg-white text-[#1a3a8f]' : 'text-white/70'
              }`}>
              Por semana
            </button>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="px-4 py-2 border-b border-[#8fa3b1]/10 flex flex-wrap gap-3">
          {ranking.map((w) => (
            <div key={w.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getColor(w.name) }} />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{w.name}</span>
            </div>
          ))}
        </div>

        {/* Contenido */}
        <div className="divide-y divide-[#8fa3b1]/10">
          {vistaDetalle === 'dia'
            ? desgloseDia.length === 0
              ? <p className="text-center py-6 text-[#8fa3b1] text-sm">Sin actividad en este rango</p>
              : desgloseDia.map((dia) => (
                  <DesglosePeriodo
                    key={dia.label}
                    titulo={dia.label}
                    datos={dia.datos}
                    getColor={getColor}
                  />
                ))
            : desgloseSemana.length === 0
              ? <p className="text-center py-6 text-[#8fa3b1] text-sm">Sin actividad en este rango</p>
              : desgloseSemana.map((sem) => (
                  <DesglosePeriodo
                    key={sem.label}
                    titulo={sem.label}
                    datos={sem.datos}
                    getColor={getColor}
                  />
                ))
          }
        </div>
      </div>

      {/* ── Factores de peso ── */}
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
                <span className="text-xs font-black text-[#ec4899] w-10 text-right">×{factor}</span>
                <span className="text-[10px] text-[#8fa3b1] w-32 shrink-0">
                  {factor === 1.0 ? '1 caja = 1 pto' : `1 caja = ${factor} pts`}
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

/** Bloque de un período (día o semana) con los datos de cada operador */
function DesglosePeriodo({ titulo, datos, getColor }) {
  const [expandido, setExpandido] = useState(false)
  const maxCajas = datos[0]?.cajas || 1

  return (
    <div className="px-4 py-3">
      {/* Título del período */}
      <button
        className="w-full flex items-center justify-between mb-2"
        onClick={() => setExpandido((v) => !v)}
      >
        <p className="font-bold text-xs text-slate-700 dark:text-white capitalize">{titulo}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8fa3b1]">{datos.length} operadores</span>
          <span className="text-[#8fa3b1] text-xs">{expandido ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Vista compacta — chips de color con puntos */}
      <div className="flex flex-wrap gap-2 mb-1">
        {datos.map((w) => (
          <div key={w.name}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ background: getColor(w.name) + '18', border: `1px solid ${getColor(w.name)}44` }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getColor(w.name) }} />
            <span style={{ color: getColor(w.name) }}>{w.name}</span>
            <span className="text-slate-600 dark:text-slate-300">{w.cajas} cajas</span>
            <span className="text-[#8fa3b1]">·</span>
            <span style={{ color: getColor(w.name) }}>{w.puntos} pts</span>
          </div>
        ))}
      </div>

      {/* Vista expandida — barras detalladas */}
      {expandido && (
        <div className="mt-3 space-y-2 pl-1">
          {datos.map((w) => (
            <div key={w.name}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(w.name) }} />
                  <span className="text-xs font-bold text-slate-700 dark:text-white">{w.name}</span>
                </div>
                <div className="flex gap-3 text-right">
                  <div>
                    <span className="text-xs font-black" style={{ color: getColor(w.name) }}>{w.puntos.toLocaleString()}</span>
                    <span className="text-[10px] text-[#8fa3b1] ml-0.5">pts</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{w.cajas.toLocaleString()}</span>
                    <span className="text-[10px] text-[#8fa3b1] ml-0.5">cajas</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (w.cajas / maxCajas) * 100)}%`,
                    background: getColor(w.name),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
