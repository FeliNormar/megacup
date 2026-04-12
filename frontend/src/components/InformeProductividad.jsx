/**
 * InformeProductividad
 * Explicación simple del sistema de productividad normalizada.
 * Diseñado para que el jefe de almacén entienda cómo se calculan los números.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { PESO_FACTORES } from '../utils/productividad'

const EJEMPLOS = [
  {
    equipo:    'Equipo A',
    categoria: 'Ligero',
    cajas:     1000,
    minutos:   60,
    color:     'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    colorText: 'text-blue-700 dark:text-blue-300',
  },
  {
    equipo:    'Equipo B',
    categoria: 'Semi pesado',
    cajas:     3000,
    minutos:   60,
    color:     'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
    colorText: 'text-amber-700 dark:text-amber-300',
  },
  {
    equipo:    'Equipo C',
    categoria: 'Pesado',
    cajas:     4000,
    minutos:   60,
    color:     'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
    colorText: 'text-red-700 dark:text-red-300',
  },
]

function Seccion({ titulo, emoji, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white dark:bg-[#162050] rounded-2xl shadow border border-[#8fa3b1]/20 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-bold text-base text-slate-800 dark:text-white">
          {emoji} {titulo}
        </span>
        {open ? <ChevronUp size={18} className="text-[#8fa3b1]" /> : <ChevronDown size={18} className="text-[#8fa3b1]" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-[#8fa3b1]/10">{children}</div>}
    </div>
  )
}

function Caja({ label, value, sub, color = 'bg-[#1a3a8f]' }) {
  return (
    <div className={`${color} rounded-xl p-3 text-center`}>
      <p className="text-white/70 text-xs mb-0.5">{label}</p>
      <p className="text-white font-black text-xl leading-none">{value}</p>
      {sub && <p className="text-white/60 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

export default function InformeProductividad({ onClose }) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#0d1b3e] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white dark:bg-[#162050] border-b border-[#8fa3b1]/20 shadow-sm">
        <div>
          <p className="font-black text-lg text-[#1a3a8f] dark:text-white">📋 Informe de Productividad</p>
          <p className="text-xs text-[#8fa3b1]">Cómo se mide el rendimiento de cada equipo</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a3a8f] text-white text-xs font-semibold">
            <Printer size={14} /> Imprimir
          </button>
          <button onClick={onClose}
            className="px-3 py-2 rounded-xl border border-[#8fa3b1]/40 text-[#8fa3b1] text-xs font-semibold">
            Cerrar
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-12">

        {/* El problema */}
        <Seccion titulo="El problema que resuelve este sistema" emoji="🤔" defaultOpen>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Antes, se medía la productividad solo por <span className="font-bold text-slate-800 dark:text-white">tiempo</span>.
            Pero eso no es justo: no es lo mismo descargar 1,000 charolas ligeras que 4,000 vasos pesados en el mismo tiempo.
          </p>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">Ejemplo del problema:</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Si el Equipo A descarga carga ligera en 45 min y el Equipo B descarga carga pesada en 60 min,
              el sistema antiguo diría que el Equipo A es mejor. Pero el Equipo B movió mucho más peso y esfuerzo.
            </p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            El nuevo sistema asigna un <span className="font-bold text-slate-800 dark:text-white">factor de peso</span> a cada categoría
            para que la comparación sea justa sin importar qué tipo de carga le tocó a cada equipo.
          </p>
        </Seccion>

        {/* Los factores */}
        <Seccion titulo="Factores de peso por categoría" emoji="⚖️" defaultOpen>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Cada categoría tiene un multiplicador. Cuanto más pesada la carga, más vale cada caja:
          </p>
          <div className="space-y-3">
            {Object.entries(PESO_FACTORES).map(([cat, factor], i) => {
              const colores = ['bg-blue-500', 'bg-amber-500', 'bg-red-500']
              const pct = (factor / 4) * 100
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 dark:text-white">{cat}</span>
                    <span className="text-sm font-black text-[#ec4899]">×{factor} por caja</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full ${colores[i]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-[#8fa3b1]">
                    {cat === 'Ligero'      && 'Charolas, tapas, bolsas — menor esfuerzo físico'}
                    {cat === 'Semi pesado' && 'Vasos medianos, contenedores — esfuerzo moderado'}
                    {cat === 'Pesado'      && 'Vasos grandes, cajas pesadas — mayor esfuerzo físico'}
                  </p>
                </div>
              )
            })}
          </div>
        </Seccion>

        {/* La fórmula */}
        <Seccion titulo="Cómo se calcula la productividad" emoji="🧮" defaultOpen>
          <p className="text-sm text-slate-600 dark:text-slate-300">Son dos pasos simples:</p>

          <div className="rounded-xl bg-[#1a3a8f]/5 dark:bg-[#1a3a8f]/20 border border-[#1a3a8f]/20 p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-[#8fa3b1] uppercase tracking-wide mb-1">Paso 1 — Calcular Puntos</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#1a3a8f] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Cajas descargadas</span>
                <span className="text-slate-500 font-bold">×</span>
                <span className="bg-[#ec4899] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Factor de peso</span>
                <span className="text-slate-500 font-bold">=</span>
                <span className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Puntos</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#8fa3b1] uppercase tracking-wide mb-1">Paso 2 — Calcular Productividad</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Puntos</span>
                <span className="text-slate-500 font-bold">÷</span>
                <span className="bg-slate-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Minutos trabajados</span>
                <span className="text-slate-500 font-bold">=</span>
                <span className="bg-[#1a3a8f] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Pts / min</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#8fa3b1]">
            El resultado "pts/min" es el número que se compara entre equipos. Más alto = más productivo.
          </p>
        </Seccion>

        {/* Ejemplo práctico */}
        <Seccion titulo="Ejemplo práctico — mismo tiempo, diferente carga" emoji="📦" defaultOpen>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Los tres equipos trabajaron <span className="font-bold text-slate-800 dark:text-white">60 minutos</span>.
            Con el sistema antiguo parecerían iguales. Con el nuevo, se ve quién realmente trabajó más:
          </p>

          <div className="space-y-3">
            {EJEMPLOS.map((e) => {
              const factor = PESO_FACTORES[e.categoria]
              const puntos = e.cajas * factor
              const ptsPorMin = (puntos / e.minutos).toFixed(1)
              return (
                <div key={e.equipo} className={`rounded-xl border p-4 ${e.color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-black text-base ${e.colorText}`}>{e.equipo}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 ${e.colorText}`}>
                      {e.categoria} ×{factor}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Cajas</p>
                      <p className={`font-black text-sm ${e.colorText}`}>{e.cajas.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Factor</p>
                      <p className={`font-black text-sm ${e.colorText}`}>×{factor}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Puntos</p>
                      <p className={`font-black text-sm ${e.colorText}`}>{puntos.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Pts/min</p>
                      <p className={`font-black text-sm ${e.colorText}`}>{ptsPorMin}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-3">
            <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
              <span className="font-bold">Conclusión:</span> Aunque los tres equipos trabajaron el mismo tiempo,
              el Equipo C (Pesado) generó más puntos porque su carga requiere más esfuerzo.
              El sistema reconoce ese esfuerzo y lo refleja en el ranking.
            </p>
          </div>
        </Seccion>

        {/* Las cajas del trailer */}
        <Seccion titulo="Las cajas del trailer al cierre del día" emoji="🚛">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Al final del día, el trailer descargado se divide equitativamente entre todos los grupos que trabajaron ese día.
          </p>
          <div className="rounded-xl bg-[#1a3a8f]/5 dark:bg-[#1a3a8f]/20 border border-[#1a3a8f]/20 p-4 space-y-2">
            <p className="text-xs font-bold text-[#8fa3b1] uppercase tracking-wide">Ejemplo:</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Trailer con <span className="font-bold text-slate-800 dark:text-white">400 cajas Pesado</span> · 4 grupos activos
            </p>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="bg-[#1a3a8f] text-white text-xs font-bold px-2 py-1 rounded-lg">400 cajas</span>
              <span className="text-slate-500">÷</span>
              <span className="bg-slate-500 text-white text-xs font-bold px-2 py-1 rounded-lg">4 grupos</span>
              <span className="text-slate-500">=</span>
              <span className="bg-[#ec4899] text-white text-xs font-bold px-2 py-1 rounded-lg">100 cajas por grupo</span>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="bg-[#ec4899] text-white text-xs font-bold px-2 py-1 rounded-lg">100 cajas</span>
              <span className="text-slate-500">×</span>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">×4.0 Pesado</span>
              <span className="text-slate-500">=</span>
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-lg">+400 pts por grupo</span>
            </div>
          </div>
          <p className="text-xs text-[#8fa3b1]">
            Estos puntos se suman al total del día de cada grupo y se reflejan en el ranking final.
          </p>
        </Seccion>

        {/* El ranking */}
        <Seccion titulo="Cómo se lee el ranking" emoji="🏆">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            El ranking ordena a los equipos de mayor a menor productividad normalizada.
            Un equipo puede estar en primer lugar aunque haya tardado más, si su carga era más pesada.
          </p>
          <div className="space-y-2">
            {[
              { pos: '🥇', nombre: 'Equipo C', pts: '266.7', nota: 'Carga Pesada — más puntos por caja' },
              { pos: '🥈', nombre: 'Equipo B', pts: '125.0', nota: 'Carga Semi pesada' },
              { pos: '🥉', nombre: 'Equipo A', pts: '16.7',  nota: 'Carga Ligera — menos puntos por caja' },
            ].map((item) => (
              <div key={item.nombre} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-[#1a3a8f]/10 px-4 py-3">
                <span className="text-2xl">{item.pos}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{item.nombre}</p>
                  <p className="text-xs text-[#8fa3b1]">{item.nota}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-base text-[#ec4899]">{item.pts}</p>
                  <p className="text-[10px] text-[#8fa3b1]">pts/min</p>
                </div>
              </div>
            ))}
          </div>
        </Seccion>

        {/* Resumen ejecutivo */}
        <div className="bg-[#1a3a8f] rounded-2xl p-5 space-y-3">
          <p className="text-white font-black text-base">📌 Resumen para el jefe de almacén</p>
          <ul className="space-y-2">
            {[
              'No todas las cargas son iguales — el sistema lo reconoce automáticamente',
              'Cada caja vale más o menos según su categoría de peso',
              'El ranking compara puntos por minuto, no solo tiempo o cantidad',
              'Las cajas del trailer se reparten igual entre todos los grupos del día',
              'Un equipo con carga pesada puede ganar el ranking aunque tarde más',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-[#ec4899] font-bold shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
