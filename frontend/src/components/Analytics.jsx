import { useMemo, useState, useRef } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Printer } from 'lucide-react'
import { avgMinutesByProvider } from '../utils/time'
import WeeklyAnalytics        from './WeeklyAnalytics'
import MonthlyAnalytics       from './MonthlyAnalytics'
import HistorialFilters       from './HistorialFilters'
import ProductividadAnalytics from './ProductividadAnalytics'
import InformeProductividad   from './InformeProductividad'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const PROVIDERS = ['Pactiv', 'Arero', 'Maver', 'Dart', 'Desola', 'Biodeli']

export default function Analytics({ records = [], dark, isAdmin, isAlmacenista, onDeleteRecord, onEditRecord, naves, workers, providers, defaultTab, recordsPage, recordsTotal, recordsPageSize, fetchRecordsPage, trailersCierre = [], categorias = [] }) {
  const [view, setView] = useState(defaultTab === 'history' ? 'history' : 'weekly')
  const [showInforme, setShowInforme] = useState(false)
  const printRef = useRef(null)

  const now   = new Date()
  const curM  = now.getMonth()
  const curY  = now.getFullYear()
  const prevM = curM === 0 ? 11 : curM - 1
  const prevY = curM === 0 ? curY - 1 : curY

  const dataCur  = useMemo(() => PROVIDERS.map((p) => avgMinutesByProvider(records, p, curM,  curY)),  [records])
  const dataPrev = useMemo(() => PROVIDERS.map((p) => avgMinutesByProvider(records, p, prevM, prevY)), [records])

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
      title:  { display: true, text: 'Tiempo promedio por proveedor (min)', color: dark ? '#f9fafb' : '#111827' }
    },
    scales: {
      x: { ticks: { color: dark ? '#9ca3af' : '#6b7280' }, grid: { color: dark ? '#374151' : '#e5e7eb' } },
      y: { ticks: { color: dark ? '#9ca3af' : '#6b7280' }, grid: { color: dark ? '#374151' : '#e5e7eb' } }
    }
  }

  const chartData = {
    labels: PROVIDERS,
    datasets: [
      { label: 'Mes actual',   data: dataCur,  backgroundColor: '#1a3a8f' },
      { label: 'Mes anterior', data: dataPrev, backgroundColor: '#8fa3b1' }
    ]
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>MEGA CUP — Analítica</title>
      <style>
        body { font-family: sans-serif; padding: 20px; color: #111; }
        h1 { color: #1a3a8f; font-size: 18px; margin-bottom: 4px; }
        p { font-size: 12px; color: #666; margin-bottom: 16px; }
        canvas { max-width: 100%; }
        .section { margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        .section h2 { font-size: 14px; color: #1a3a8f; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1a3a8f; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f5f7ff; }
      </style></head><body>
      <h1>MEGA CUP — Reporte de Analítica</h1>
      <p>Generado: ${new Date().toLocaleString('es-MX')}</p>
      ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  const tabs = [
    { id: 'weekly',        label: 'Semanal'       },
    { id: 'monthly',       label: 'Mensual'        },
    { id: 'productividad', label: '🏆 Productiv.' },
    { id: 'history',       label: 'Historial'      },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Tabs + botón imprimir */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl overflow-hidden border border-[#8fa3b1]/30">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setView(t.id)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                view === t.id ? 'bg-[#1a3a8f] text-white' : 'text-[#8fa3b1]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        {view !== 'history' && view !== 'productividad' && (
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a3a8f] text-white text-xs font-semibold">
            <Printer size={14} /> Imprimir
          </button>
        )}
      </div>

      {/* Contenido imprimible */}
      <div ref={printRef}>
        {view === 'weekly' && (
          <>
            <WeeklyAnalytics records={records} dark={dark} />
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20 mt-4">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20 mt-4">
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
          </>
        )}

        {view === 'monthly' && (
          <MonthlyAnalytics records={records} dark={dark} />
        )}
      </div>

      {view === 'productividad' && (
        <ProductividadAnalytics
          records={records}
          trailersCierre={trailersCierre}
          dark={dark}
          workers={workers}
        />
      )}

      {view === 'productividad' && (
        <button
          onClick={() => setShowInforme(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold border-2 border-[#1a3a8f]/40 text-[#1a3a8f] dark:text-[#8fa3b1] dark:border-[#8fa3b1]/30"
        >
          📋 Ver informe explicativo para el jefe de almacén
        </button>
      )}

      {showInforme && (
        <InformeProductividad onClose={() => setShowInforme(false)} />
      )}

      {view === 'history' && (
        <div className="bg-white dark:bg-[#162050] rounded-2xl p-4 shadow border border-[#8fa3b1]/20">
          <HistorialFilters
            records={records}
            naves={naves || []}
            workers={workers || []}
            providers={providers || []}
            isAdmin={isAdmin}
            isAlmacenista={isAlmacenista}
            onDelete={onDeleteRecord}
            onEditCajas={onEditRecord}
            categorias={categorias}
          />
          {/* Paginación */}
          {recordsTotal > recordsPageSize && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#8fa3b1]/20">
              <button
                onClick={() => fetchRecordsPage(recordsPage - 1)}
                disabled={recordsPage === 0}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#8fa3b1]/30 text-[#8fa3b1] disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-xs text-[#8fa3b1]">
                Página {recordsPage + 1} de {Math.ceil(recordsTotal / recordsPageSize)}
                {' '}· {recordsTotal} registros
              </span>
              <button
                onClick={() => fetchRecordsPage(recordsPage + 1)}
                disabled={(recordsPage + 1) * recordsPageSize >= recordsTotal}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#8fa3b1]/30 text-[#8fa3b1] disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
